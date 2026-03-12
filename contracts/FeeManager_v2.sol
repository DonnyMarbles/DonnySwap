// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

interface IDSFO {
    function balanceOf(address owner) external view returns (uint256);
}

/// @title FeeManager v2 — Claim-based fee distribution for DSFO NFT holders
/// @notice Breaks down LP tokens into underlying assets and accumulates rewards
///         per share. Holders call claimFees() to withdraw — no gas-heavy
///         distribution loops. Gas cost of triggerBreakdownAndDistribution is
///         O(LP_tokens) instead of O(LP_tokens × holders).
contract FeeManagerV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── Constants ──
    uint256 private constant PRECISION = 1e36;

    // ── Immutable-ish refs ──
    IDSFO public dsfoToken;
    IUniswapV2Router02 public router;

    // ── Holder tracking (same swap-and-pop pattern as v1) ──
    address[] private holderList;
    mapping(address => uint256) public holderBalances;
    mapping(address => uint256) private holderIndexPlusOne;
    uint256 public totalTrackedShares;

    // ── LP token registry ──
    address[] public lpTokenAddresses;
    mapping(address => bool) public isRegisteredLP;

    // ── Claim-based reward accounting ──
    /// @dev All reward tokens that have ever accrued fees.
    address[] public rewardTokens;
    mapping(address => bool) public isRewardToken;

    /// @dev Cumulative reward per share for each token, scaled by PRECISION.
    mapping(address => uint256) public accRewardPerShare;

    /// @dev Reward debt per holder per token (scaled by PRECISION).
    ///      rewardDebt[holder][token] = holderBalance * accRewardPerShare at last settlement.
    mapping(address => mapping(address => uint256)) public rewardDebt;

    /// @dev Settled but unclaimed rewards per holder per token (raw token units).
    mapping(address => mapping(address => uint256)) public pendingRewards;

    // ── Events ──
    event FeesAccumulated(
        address indexed token,
        uint256 totalAmount,
        uint256 accRewardPerShareAfter
    );
    event FeesClaimed(
        address indexed holder,
        address indexed token,
        uint256 amount
    );
    event LPBrokenDown(
        address indexed lpToken,
        address indexed token0,
        address indexed token1,
        uint256 amountToken0,
        uint256 amountToken1
    );
    event HolderBalanceUpdated(
        address indexed holder,
        uint256 newBalance,
        uint256 totalShares
    );
    event LPTokenAdded(address indexed lpToken);
    event LPTokenRemoved(address indexed lpToken);

    // ── Constructor ──
    constructor(address _dsfoToken, address _router) Ownable(msg.sender) {
        dsfoToken = IDSFO(_dsfoToken);
        router = IUniswapV2Router02(_router);
    }

    // ── Modifiers ──
    modifier onlyDsfoToken() {
        require(msg.sender == address(dsfoToken), "FeeManager: not DSFO token");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  LP TOKEN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function addLPTokenAddress(address lpToken) external onlyOwner {
        require(lpToken != address(0), "Invalid LP address");
        require(!isRegisteredLP[lpToken], "LP already registered");
        lpTokenAddresses.push(lpToken);
        isRegisteredLP[lpToken] = true;
        emit LPTokenAdded(lpToken);
    }

    function removeLPTokenAddress(uint256 index) external onlyOwner {
        require(index < lpTokenAddresses.length, "Index out of bounds");
        address removed = lpTokenAddresses[index];

        // Swap-and-pop
        uint256 lastIndex = lpTokenAddresses.length - 1;
        if (index != lastIndex) {
            lpTokenAddresses[index] = lpTokenAddresses[lastIndex];
        }
        lpTokenAddresses.pop();
        isRegisteredLP[removed] = false;
        emit LPTokenRemoved(removed);
    }

    function getLPTokenCount() external view returns (uint256) {
        return lpTokenAddresses.length;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HOLDER TRACKING
    // ═══════════════════════════════════════════════════════════════════

    function getHolderCount() external view returns (uint256) {
        return holderList.length;
    }

    function getHolderAt(uint256 index) external view returns (address) {
        require(index < holderList.length, "Index out of bounds");
        return holderList[index];
    }

    /// @notice Called by the DSFO NFT contract on every transfer/mint/burn.
    function handleOwnershipChange(address from, address to, uint256 amount) external onlyDsfoToken {
        if (amount == 0 || from == to) return;

        if (from != address(0)) {
            _settleRewards(from);
            _decreaseHolderBalance(from, amount);
            _updateRewardDebt(from);
        }

        if (to != address(0)) {
            _settleRewards(to);
            _increaseHolderBalance(to, amount);
            _updateRewardDebt(to);
        }
    }

    /// @notice Owner can force-sync a holder's balance from the DSFO token.
    function syncHolder(address holder) external onlyOwner {
        require(holder != address(0), "Invalid holder");
        _settleRewards(holder);
        uint256 balance = dsfoToken.balanceOf(holder);
        _setHolderBalance(holder, balance);
        _updateRewardDebt(holder);
    }

    function syncHolders(address[] calldata holders) external onlyOwner {
        for (uint256 i = 0; i < holders.length; i++) {
            require(holders[i] != address(0), "Invalid holder");
            _settleRewards(holders[i]);
            uint256 balance = dsfoToken.balanceOf(holders[i]);
            _setHolderBalance(holders[i], balance);
            _updateRewardDebt(holders[i]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FEE BREAKDOWN & ACCUMULATION
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Owner triggers LP breakdown. Underlying tokens are accumulated
    ///         into rewardPerShare — no per-holder transfers happen here.
    function triggerBreakdownAndDistribution() external onlyOwner nonReentrant {
        require(totalTrackedShares > 0, "No shares tracked");

        for (uint256 i = 0; i < lpTokenAddresses.length; i++) {
            address lpAddr = lpTokenAddresses[i];
            uint256 lpBalance = IERC20(lpAddr).balanceOf(address(this));
            if (lpBalance == 0) continue;

            IUniswapV2Pair pair = IUniswapV2Pair(lpAddr);
            address token0 = pair.token0();
            address token1 = pair.token1();

            // Approve router (single call — forceApprove handles non-standard tokens)
            IERC20(lpAddr).forceApprove(address(router), lpBalance);

            (uint256 amount0, uint256 amount1) = router.removeLiquidity(
                token0,
                token1,
                lpBalance,
                0, // TODO: pass min amounts via parameter for slippage protection
                0,
                address(this),
                block.timestamp
            );

            _accumulateReward(token0, amount0);
            _accumulateReward(token1, amount1);

            emit LPBrokenDown(lpAddr, token0, token1, amount0, amount1);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CLAIMING
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Claim all pending fees across all reward tokens.
    function claimAllFees() external nonReentrant {
        _settleRewards(msg.sender);

        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            uint256 amount = pendingRewards[msg.sender][token];
            if (amount == 0) continue;

            pendingRewards[msg.sender][token] = 0;
            IERC20(token).safeTransfer(msg.sender, amount);
            emit FeesClaimed(msg.sender, token, amount);
        }

        _updateRewardDebt(msg.sender);
    }

    /// @notice Claim pending fees for specific tokens only.
    function claimFees(address[] calldata tokens) external nonReentrant {
        _settleRewards(msg.sender);

        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = pendingRewards[msg.sender][token];
            if (amount == 0) continue;

            pendingRewards[msg.sender][token] = 0;
            IERC20(token).safeTransfer(msg.sender, amount);
            emit FeesClaimed(msg.sender, token, amount);
        }

        _updateRewardDebt(msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Returns claimable amount for a holder across all reward tokens.
    function claimableAll(address holder) external view returns (address[] memory tokens, uint256[] memory amounts) {
        uint256 len = rewardTokens.length;
        tokens = new address[](len);
        amounts = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            address token = rewardTokens[i];
            tokens[i] = token;
            uint256 accrued = (holderBalances[holder] * accRewardPerShare[token]) / PRECISION;
            uint256 debt = rewardDebt[holder][token];
            uint256 newlyAccrued = accrued > debt ? accrued - debt : 0;
            amounts[i] = pendingRewards[holder][token] + newlyAccrued;
        }
    }

    /// @notice Returns claimable amount for a specific holder + token pair.
    function claimable(address holder, address token) external view returns (uint256) {
        uint256 accrued = (holderBalances[holder] * accRewardPerShare[token]) / PRECISION;
        uint256 debt = rewardDebt[holder][token];
        uint256 newlyAccrued = accrued > debt ? accrued - debt : 0;
        return pendingRewards[holder][token] + newlyAccrued;
    }

    function getRewardTokenCount() external view returns (uint256) {
        return rewardTokens.length;
    }

    function getRewardTokenAt(uint256 index) external view returns (address) {
        require(index < rewardTokens.length, "Index out of bounds");
        return rewardTokens[index];
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════════════

    function setDsfoToken(address _dsfoToken) external onlyOwner {
        dsfoToken = IDSFO(_dsfoToken);
    }

    function setRouter(address _router) external onlyOwner {
        router = IUniswapV2Router02(_router);
    }

    /// @notice Emergency withdraw a stuck token. Cannot withdraw reward tokens
    ///         that have pending distributions.
    function emergencyWithdraw(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNALS
    // ═══════════════════════════════════════════════════════════════════

    function _accumulateReward(address token, uint256 amount) internal {
        if (amount == 0 || totalTrackedShares == 0) return;

        if (!isRewardToken[token]) {
            rewardTokens.push(token);
            isRewardToken[token] = true;
        }

        accRewardPerShare[token] += (amount * PRECISION) / totalTrackedShares;
        emit FeesAccumulated(token, amount, accRewardPerShare[token]);
    }

    /// @dev Settle accrued rewards into pendingRewards for a holder.
    ///      Must be called BEFORE any balance change.
    function _settleRewards(address holder) internal {
        uint256 balance = holderBalances[holder];
        if (balance == 0) return;

        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            uint256 accrued = (balance * accRewardPerShare[token]) / PRECISION;
            uint256 debt = rewardDebt[holder][token];
            if (accrued > debt) {
                pendingRewards[holder][token] += accrued - debt;
            }
        }
    }

    /// @dev Sync rewardDebt to current balance × accRewardPerShare.
    ///      Must be called AFTER any balance change.
    function _updateRewardDebt(address holder) internal {
        uint256 balance = holderBalances[holder];
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            rewardDebt[holder][token] = (balance * accRewardPerShare[token]) / PRECISION;
        }
    }

    // ── Holder balance management (same swap-and-pop as v1) ──

    function _setHolderBalance(address account, uint256 newBalance) internal {
        uint256 current = holderBalances[account];
        if (current == newBalance) return;

        if (newBalance == 0) {
            if (current == 0) return;
            holderBalances[account] = 0;
            totalTrackedShares -= current;
            _removeHolder(account);
            emit HolderBalanceUpdated(account, 0, totalTrackedShares);
            return;
        }

        if (current == 0) {
            holderList.push(account);
            holderIndexPlusOne[account] = holderList.length;
        } else {
            totalTrackedShares -= current;
        }

        holderBalances[account] = newBalance;
        totalTrackedShares += newBalance;
        emit HolderBalanceUpdated(account, newBalance, totalTrackedShares);
    }

    function _increaseHolderBalance(address account, uint256 amount) internal {
        if (holderBalances[account] == 0) {
            holderList.push(account);
            holderIndexPlusOne[account] = holderList.length;
        }
        holderBalances[account] += amount;
        totalTrackedShares += amount;
        emit HolderBalanceUpdated(account, holderBalances[account], totalTrackedShares);
    }

    function _decreaseHolderBalance(address account, uint256 amount) internal {
        uint256 current = holderBalances[account];
        require(current >= amount, "FeeManager: insufficient balance");
        uint256 updated = current - amount;
        holderBalances[account] = updated;
        totalTrackedShares -= amount;
        if (updated == 0) {
            _removeHolder(account);
        }
        emit HolderBalanceUpdated(account, updated, totalTrackedShares);
    }

    function _removeHolder(address account) internal {
        uint256 indexPlusOne = holderIndexPlusOne[account];
        if (indexPlusOne == 0) return;
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = holderList.length - 1;
        if (index != lastIndex) {
            address lastHolder = holderList[lastIndex];
            holderList[index] = lastHolder;
            holderIndexPlusOne[lastHolder] = index + 1;
        }
        holderList.pop();
        holderIndexPlusOne[account] = 0;
    }
}
