// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LPVault — Protocol-owned MRBL-PEAQ liquidity vault
/// @notice Holds MRBL-PEAQ LP from FeeSplitter (30% of MRBL-PEAQ fees) and
///         DSFO minting (30% of each mint's LP). Provides:
///         - Time-weighted redemption for DSFO holders who burn their NFT
///         - Adaptive harvest distributing surplus to DSFO holders and treasury
///         - 20% reserve baked into pro-rata formula (deterministic)
contract LPVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Constants ──
    uint256 private constant BPS = 10000;
    uint256 private constant DAYS_365 = 365 days;

    // ── Immutable-ish refs ──
    IERC20 public mrblPeaqLP;
    address public dsfoToken;      // Only DSFO contract can call depositFromMint / notifyRedemption
    address public feeSplitter;    // Can deposit from fee routing
    address public feeManager;     // Receives DSFO bonus LP from harvest
    address public treasury;       // Receives treasury share from harvest

    // ── Redemption tracking ──
    /// @dev Stored per NFT token ID at mint time
    struct MintRecord {
        uint256 mintCostLP;    // LP tokens deposited for this NFT
        uint256 mintTimestamp; // Block timestamp at mint
    }
    mapping(uint256 => MintRecord) public mintRecords;

    /// @dev Sum of all active (non-redeemed) NFT mint costs — used for vault target
    uint256 public totalActiveMintCost;

    /// @dev 48-hour cooldown between redemptions per address
    mapping(address => uint256) public lastRedemptionTime;
    uint256 public redemptionCooldown = 48 hours;

    // ── Harvest config ──
    uint256 public lastHarvestTime;
    uint256 public harvestMinInterval = 7 days;
    uint256 public harvestBountyCap = 0.01 ether; // Max caller bounty in LP tokens
    uint256 public harvestBountyBps = 100;         // 1% of harvested amount

    // ── Adaptive harvest tiers (bps, must sum to 10000 each) ──
    // Above 80% of target
    uint256 public retainBpsHealthy = 6000;   // 60%
    uint256 public dsfoBonusBpsHealthy = 2500; // 25%
    uint256 public treasuryBpsHealthy = 1500;  // 15%

    // 50-80% of target
    uint256 public retainBpsMedium = 8000;    // 80%
    uint256 public dsfoBonusBpsMedium = 1200;  // 12%
    uint256 public treasuryBpsMedium = 800;    // 8%

    // Below 50% of target
    uint256 public retainBpsLow = 9500;       // 95%
    uint256 public dsfoBonusBpsLow = 300;      // 3%
    uint256 public treasuryBpsLow = 200;       // 2%

    // ── Events ──
    event DepositFromMint(uint256 indexed tokenId, uint256 lpAmount);
    event DepositFromFees(uint256 lpAmount);
    event Redemption(
        address indexed holder,
        uint256 indexed tokenId,
        uint256 lpReturned,
        uint256 feeCharged,
        uint256 feeToVault,
        uint256 feeBurned
    );
    event Harvest(
        uint256 retained,
        uint256 dsfoBonusSent,
        uint256 treasurySent,
        uint256 callerBounty,
        address indexed caller
    );
    event HarvestConfigUpdated(uint256 minInterval, uint256 bountyCap, uint256 bountyBps);
    event RedemptionCooldownUpdated(uint256 newCooldown);

    // ── Constructor ──
    constructor(
        address _mrblPeaqLP,
        address _dsfoToken,
        address _feeSplitter,
        address _feeManager,
        address _treasury
    ) Ownable(msg.sender) {
        require(_mrblPeaqLP != address(0), "Invalid LP");
        require(_dsfoToken != address(0), "Invalid DSFO");
        require(_feeManager != address(0), "Invalid FeeManager");
        require(_treasury != address(0), "Invalid treasury");

        mrblPeaqLP = IERC20(_mrblPeaqLP);
        dsfoToken = _dsfoToken;
        feeSplitter = _feeSplitter;
        feeManager = _feeManager;
        treasury = _treasury;
    }

    // ── Modifiers ──
    modifier onlyDsfoToken() {
        require(msg.sender == dsfoToken, "LPVault: not DSFO token");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DEPOSITS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Called by DSFO contract when minting. Records per-NFT mint cost.
    /// @dev DSFO contract must have already transferred LP to this vault.
    /// @param tokenId The NFT token ID being minted.
    /// @param lpAmount The 30% LP share deposited for this NFT.
    function depositFromMint(uint256 tokenId, uint256 lpAmount) external onlyDsfoToken {
        require(lpAmount > 0, "Zero deposit");
        require(mintRecords[tokenId].mintTimestamp == 0, "Already recorded");

        mintRecords[tokenId] = MintRecord({
            mintCostLP: lpAmount,
            mintTimestamp: block.timestamp
        });
        totalActiveMintCost += lpAmount;

        emit DepositFromMint(tokenId, lpAmount);
    }

    /// @notice Accept LP deposits from FeeSplitter (fee routing).
    ///         Permissionless — anyone can deposit LP into the vault.
    function depositFromFees(uint256 lpAmount) external {
        require(lpAmount > 0, "Zero deposit");
        mrblPeaqLP.safeTransferFrom(msg.sender, address(this), lpAmount);
        emit DepositFromFees(lpAmount);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  REDEMPTION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Called by DSFO contract when a holder burns their NFT to redeem LP.
    /// @param tokenId The NFT being burned.
    /// @param holder The address receiving LP tokens.
    /// @return lpReturned Amount of LP tokens sent to the holder.
    function processRedemption(uint256 tokenId, address holder)
        external
        onlyDsfoToken
        nonReentrant
        returns (uint256 lpReturned)
    {
        MintRecord memory record = mintRecords[tokenId];
        require(record.mintTimestamp > 0, "No mint record");
        require(
            block.timestamp >= lastRedemptionTime[holder] + redemptionCooldown,
            "Cooldown active"
        );

        uint256 currentBalance = mrblPeaqLP.balanceOf(address(this));

        // Time weight: linear 0% -> 80% over 365 days
        uint256 daysSinceMint = block.timestamp - record.mintTimestamp;
        uint256 timeWeightBps;
        if (daysSinceMint >= DAYS_365) {
            timeWeightBps = 8000; // 80%
        } else {
            timeWeightBps = (8000 * daysSinceMint) / DAYS_365;
        }

        uint256 timeWeightedAmount = (record.mintCostLP * timeWeightBps) / BPS;

        // Pro-rata with 20% reserve: vaultProRata = (vault * 0.8) * (mintCost / totalActiveMintCost)
        uint256 vaultProRata;
        if (totalActiveMintCost > 0) {
            vaultProRata = (currentBalance * 8000 * record.mintCostLP) / (BPS * totalActiveMintCost);
        }

        // Redemption amount = min(timeWeighted, vaultProRata)
        uint256 grossRedemption = timeWeightedAmount < vaultProRata
            ? timeWeightedAmount
            : vaultProRata;

        // Sliding fee: 20% at day 0 -> 3% at day 365+
        // fee = max(300, 2000 - (1700 * min(daysSinceMint, 365) / 365))
        uint256 feeBps;
        if (daysSinceMint >= DAYS_365) {
            feeBps = 300; // 3%
        } else {
            feeBps = 2000 - (1700 * daysSinceMint) / DAYS_365;
            if (feeBps < 300) feeBps = 300;
        }

        uint256 fee = (grossRedemption * feeBps) / BPS;
        lpReturned = grossRedemption - fee;

        // Fee split: 50% stays in vault (do nothing), 50% burned
        uint256 feeBurned = fee / 2;
        // feeToVault = fee - feeBurned (stays in vault, no transfer needed)
        uint256 feeToVault = fee - feeBurned;

        // Update state before transfers
        delete mintRecords[tokenId];
        totalActiveMintCost -= record.mintCostLP;
        lastRedemptionTime[holder] = block.timestamp;

        // Transfer LP to holder
        if (lpReturned > 0) {
            mrblPeaqLP.safeTransfer(holder, lpReturned);
        }

        // Burn LP (send to address(0) — permanently locks liquidity in pool)
        if (feeBurned > 0) {
            mrblPeaqLP.safeTransfer(address(0xdead), feeBurned);
        }

        emit Redemption(holder, tokenId, lpReturned, fee, feeToVault, feeBurned);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HARVEST (Permissionless)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Distribute vault surplus according to adaptive allocation.
    ///         Permissionless — anyone can call after minInterval. Caller gets bounty.
    function harvest() external nonReentrant {
        require(
            block.timestamp >= lastHarvestTime + harvestMinInterval,
            "Too soon"
        );

        uint256 currentBalance = mrblPeaqLP.balanceOf(address(this));
        uint256 target = _vaultTarget();

        // Only harvest surplus above the vault target
        // If vault is underfunded, skip — don't drain what's needed for redemptions
        if (currentBalance <= target) {
            lastHarvestTime = block.timestamp;
            return;
        }
        uint256 harvestable = currentBalance - target;

        if (harvestable == 0) {
            lastHarvestTime = block.timestamp;
            return;
        }

        // Determine tier based on vault health
        uint256 retainBps;
        uint256 dsfoBonusBps;
        uint256 treasuryBps;

        if (target == 0 || currentBalance >= (target * 8000) / BPS) {
            // Healthy: above 80%
            retainBps = retainBpsHealthy;
            dsfoBonusBps = dsfoBonusBpsHealthy;
            treasuryBps = treasuryBpsHealthy;
        } else if (currentBalance >= (target * 5000) / BPS) {
            // Medium: 50-80%
            retainBps = retainBpsMedium;
            dsfoBonusBps = dsfoBonusBpsMedium;
            treasuryBps = treasuryBpsMedium;
        } else {
            // Low: below 50%
            retainBps = retainBpsLow;
            dsfoBonusBps = dsfoBonusBpsLow;
            treasuryBps = treasuryBpsLow;
        }

        // Caller bounty (from the harvestable amount, before split)
        uint256 callerBounty = (harvestable * harvestBountyBps) / BPS;
        if (callerBounty > harvestBountyCap) {
            callerBounty = harvestBountyCap;
        }
        uint256 distributable = harvestable - callerBounty;

        // retained stays in vault (no transfer)
        uint256 dsfoBonusAmount = (distributable * dsfoBonusBps) / BPS;
        uint256 treasuryAmount = (distributable * treasuryBps) / BPS;
        // retained = distributable - dsfoBonusAmount - treasuryAmount (stays in vault)
        uint256 retained = distributable - dsfoBonusAmount - treasuryAmount;

        lastHarvestTime = block.timestamp;

        // Transfers
        if (dsfoBonusAmount > 0) {
            mrblPeaqLP.safeTransfer(feeManager, dsfoBonusAmount);
        }
        if (treasuryAmount > 0) {
            mrblPeaqLP.safeTransfer(treasury, treasuryAmount);
        }
        if (callerBounty > 0) {
            mrblPeaqLP.safeTransfer(msg.sender, callerBounty);
        }

        emit Harvest(retained, dsfoBonusAmount, treasuryAmount, callerBounty, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Current vault balance of MRBL-PEAQ LP.
    function vaultBalance() external view returns (uint256) {
        return mrblPeaqLP.balanceOf(address(this));
    }

    /// @notice Rolling vault target: 0.3 * sum(all active NFT mint costs).
    function vaultTarget() external view returns (uint256) {
        return _vaultTarget();
    }

    /// @notice Vault health ratio in bps (10000 = 100%).
    function vaultHealthBps() external view returns (uint256) {
        uint256 target = _vaultTarget();
        if (target == 0) return BPS;
        uint256 balance = mrblPeaqLP.balanceOf(address(this));
        return (balance * BPS) / target;
    }

    /// @notice Preview redemption for a given token ID.
    function previewRedemption(uint256 tokenId) external view returns (
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount,
        uint256 timeWeightBps,
        uint256 feeBps
    ) {
        MintRecord memory record = mintRecords[tokenId];
        if (record.mintTimestamp == 0) return (0, 0, 0, 0, 0);

        uint256 vaultBal = mrblPeaqLP.balanceOf(address(this));
        uint256 daysSinceMint = block.timestamp - record.mintTimestamp;

        // Time weight
        if (daysSinceMint >= DAYS_365) {
            timeWeightBps = 8000;
        } else {
            timeWeightBps = (8000 * daysSinceMint) / DAYS_365;
        }
        uint256 timeWeightedAmount = (record.mintCostLP * timeWeightBps) / BPS;

        // Pro-rata with 20% reserve
        uint256 vaultProRata;
        if (totalActiveMintCost > 0) {
            vaultProRata = (vaultBal * 8000 * record.mintCostLP) / (BPS * totalActiveMintCost);
        }

        grossAmount = timeWeightedAmount < vaultProRata ? timeWeightedAmount : vaultProRata;

        // Sliding fee
        if (daysSinceMint >= DAYS_365) {
            feeBps = 300;
        } else {
            feeBps = 2000 - (1700 * daysSinceMint) / DAYS_365;
            if (feeBps < 300) feeBps = 300;
        }

        fee = (grossAmount * feeBps) / BPS;
        netAmount = grossAmount - fee;
    }

    // ── Internal ──

    function _vaultTarget() internal view returns (uint256) {
        // Target = 0.3 * totalActiveMintCost = (3000 * totalActiveMintCost) / 10000
        return (3000 * totalActiveMintCost) / BPS;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN (behind timelock in production)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Emergency withdraw any ERC-20 token stuck in the vault.
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    function setDsfoToken(address _dsfoToken) external onlyOwner {
        require(_dsfoToken != address(0), "Invalid address");
        dsfoToken = _dsfoToken;
    }

    function setFeeSplitter(address _feeSplitter) external onlyOwner {
        feeSplitter = _feeSplitter;
    }

    function setFeeManager(address _feeManager) external onlyOwner {
        require(_feeManager != address(0), "Invalid address");
        feeManager = _feeManager;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }

    function setRedemptionCooldown(uint256 _cooldown) external onlyOwner {
        redemptionCooldown = _cooldown;
        emit RedemptionCooldownUpdated(_cooldown);
    }

    function setHarvestConfig(
        uint256 _minInterval,
        uint256 _bountyCap,
        uint256 _bountyBps
    ) external onlyOwner {
        require(_bountyBps <= 500, "Bounty too high"); // Max 5%
        harvestMinInterval = _minInterval;
        harvestBountyCap = _bountyCap;
        harvestBountyBps = _bountyBps;
        emit HarvestConfigUpdated(_minInterval, _bountyCap, _bountyBps);
    }

    function setHarvestTier(
        uint256 tier,
        uint256 _retainBps,
        uint256 _dsfoBonusBps,
        uint256 _treasuryBps
    ) external onlyOwner {
        require(_retainBps + _dsfoBonusBps + _treasuryBps == BPS, "Must sum to 10000");

        if (tier == 0) {
            retainBpsHealthy = _retainBps;
            dsfoBonusBpsHealthy = _dsfoBonusBps;
            treasuryBpsHealthy = _treasuryBps;
        } else if (tier == 1) {
            retainBpsMedium = _retainBps;
            dsfoBonusBpsMedium = _dsfoBonusBps;
            treasuryBpsMedium = _treasuryBps;
        } else if (tier == 2) {
            retainBpsLow = _retainBps;
            dsfoBonusBpsLow = _dsfoBonusBps;
            treasuryBpsLow = _treasuryBps;
        } else {
            revert("Invalid tier");
        }
    }
}
