// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IFeeManager {
    function handleOwnershipChange(address from, address to, uint256 amount) external;
}

interface ILPVault {
    function depositFromMint(uint256 tokenId, uint256 lpAmount) external;
    function processRedemption(uint256 tokenId, address holder) external returns (uint256);
}

/// @title DSFO NFT v3 — Soulbound fractional ownership with linear pricing and redemption
/// @notice ERC-5192 soulbound NFTs. No transfers — only mint or redeem (burn).
///         Price = basePrice + (activeSupply * priceStep), tracking living NFTs.
///         70% of LP burned permanently, 30% deposited to LPVault.
///         Holders burn their NFT to redeem LP from the vault.
contract DSFONFTv3 is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    // ── ERC-5192 Soulbound interface ──
    // https://eips.ethereum.org/EIPS/eip-5192
    event Locked(uint256 tokenId);

    // ── State ──
    IERC20 public lpToken;         // MRBL-PEAQ LP token
    IFeeManager public feeManager;
    ILPVault public lpVault;

    uint256 public basePrice;      // Base mint cost in LP tokens (wei)
    uint256 public priceStep;      // Price increment per active NFT (wei)
    uint256 public activeSupply;   // Count of living (non-redeemed) NFTs
    uint256 public nextTokenId;    // Monotonically increasing token ID counter

    /// @dev LP burn/lock split. burnBps + vaultBps = 10000.
    uint256 public burnBps = 7000;  // 70% burned
    uint256 public vaultBps = 3000; // 30% to LPVault
    uint256 private constant BPS = 10000;

    /// @dev Per-address mint cap. 0 = unlimited. Owner is always exempt.
    uint256 public maxMintsPerAddress;
    mapping(address => uint256) public mintCount;

    string private _baseTokenURI;

    // ── Events ──
    event Mint(address indexed minter, uint256 indexed tokenId, uint256 lpCost, uint256 lpBurned, uint256 lpToVault);
    event Redeem(address indexed holder, uint256 indexed tokenId, uint256 lpReturned);
    event PricingUpdated(uint256 basePrice, uint256 priceStep);
    event BurnVaultSplitUpdated(uint256 burnBps, uint256 vaultBps);
    event FeeManagerUpdated(address indexed newFeeManager);
    event LPVaultUpdated(address indexed newLPVault);
    event BaseTokenURIUpdated(string newBaseURI);
    event MaxMintsPerAddressUpdated(uint256 newMax);

    // ── Constructor ──
    constructor(
        address _lpToken,
        address _feeManager,
        address _lpVault,
        uint256 _basePrice,
        uint256 _priceStep
    )
        ERC721("DonnySwap Fractional Ownership", "DSFO")
        Ownable(msg.sender)
    {
        require(_lpToken != address(0), "Invalid LP token");
        require(_lpVault != address(0), "Invalid LPVault");
        require(_basePrice > 0, "Base price must be > 0");

        lpToken = IERC20(_lpToken);
        feeManager = IFeeManager(_feeManager);
        lpVault = ILPVault(_lpVault);
        basePrice = _basePrice;
        priceStep = _priceStep;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ERC-5192 SOULBOUND
    // ═══════════════════════════════════════════════════════════════════

    /// @notice All tokens are permanently locked (soulbound).
    function locked(uint256 tokenId) external view returns (bool) {
        // Reverts if token doesn't exist (ownerOf check)
        ownerOf(tokenId);
        return true;
    }

    /// @dev ERC-165: declare support for ERC-5192
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        // ERC-5192 interface ID = 0xb45a3c0e
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  MINTING
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Current mint price for one NFT.
    function currentMintPrice() public view returns (uint256) {
        return basePrice + (activeSupply * priceStep);
    }

    /// @notice Mint price for a batch of `quantity` NFTs (sum of sequential prices).
    function batchMintPrice(uint256 quantity) public view returns (uint256) {
        uint256 total = 0;
        uint256 supply = activeSupply;
        for (uint256 i = 0; i < quantity; i++) {
            total += basePrice + (supply * priceStep);
            supply++;
        }
        return total;
    }

    /// @notice Mint one or more soulbound DSFO NFTs.
    /// @param quantity Number of NFTs to mint.
    function mint(uint256 quantity) external nonReentrant whenNotPaused {
        require(quantity > 0 && quantity <= 50, "Invalid quantity");

        // Per-address cap (owner exempt — for founder bootstrap minting)
        if (maxMintsPerAddress > 0 && msg.sender != owner()) {
            require(
                mintCount[msg.sender] + quantity <= maxMintsPerAddress,
                "Exceeds per-address mint cap"
            );
        }

        uint256 totalCost = batchMintPrice(quantity);
        require(
            lpToken.allowance(msg.sender, address(this)) >= totalCost,
            "Insufficient LP allowance"
        );

        // Pull LP from minter
        lpToken.safeTransferFrom(msg.sender, address(this), totalCost);

        // Split: 70% burn, 30% to LPVault
        uint256 totalBurn = (totalCost * burnBps) / BPS;
        uint256 totalVault = totalCost - totalBurn;

        // Burn LP (permanently locks liquidity in the pool)
        if (totalBurn > 0) {
            lpToken.safeTransfer(address(0xdead), totalBurn);
        }

        // Approve and deposit to LPVault
        if (totalVault > 0) {
            lpToken.forceApprove(address(lpVault), totalVault);
            // Transfer LP to vault first
            lpToken.safeTransfer(address(lpVault), totalVault);
        }

        // Mint NFTs and register with vault
        uint256 perNftVault = totalVault / quantity;
        uint256 vaultRemainder = totalVault - (perNftVault * quantity);

        for (uint256 i = 0; i < quantity; i++) {
            nextTokenId++;
            uint256 tokenId = nextTokenId;

            _safeMint(msg.sender, tokenId);

            // Set URI
            if (bytes(_baseTokenURI).length > 0) {
                _setTokenURI(tokenId, string.concat(_baseTokenURI, tokenId.toString()));
            }

            // Register mint in LPVault (per-NFT vault deposit)
            uint256 vaultForThis = perNftVault;
            if (i == quantity - 1) {
                vaultForThis += vaultRemainder; // Last NFT gets rounding dust
            }
            if (vaultForThis > 0) {
                lpVault.depositFromMint(tokenId, vaultForThis);
            }

            activeSupply++;

            // Emit ERC-5192 Locked event
            emit Locked(tokenId);
            emit Mint(msg.sender, tokenId, basePrice + ((activeSupply - 1) * priceStep), totalBurn / quantity, vaultForThis);
        }

        mintCount[msg.sender] += quantity;

        // Notify FeeManager of balance change (batch: `quantity` NFTs)
        if (address(feeManager) != address(0)) {
            feeManager.handleOwnershipChange(address(0), msg.sender, quantity);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  REDEMPTION (Soulbound Exit)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Burn a DSFO NFT to redeem LP tokens from the vault.
    /// @param tokenId The NFT to burn and redeem.
    function redeem(uint256 tokenId) external nonReentrant whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        // Burn the NFT (triggers _update -> FeeManager notification)
        _burn(tokenId);
        activeSupply--;

        // Process redemption in LPVault
        uint256 lpReturned = lpVault.processRedemption(tokenId, msg.sender);

        emit Redeem(msg.sender, tokenId, lpReturned);
    }

    /// @notice Batch redeem multiple NFTs.
    function redeemBatch(uint256[] calldata tokenIds) external nonReentrant whenNotPaused {
        require(tokenIds.length > 0 && tokenIds.length <= 50, "Invalid batch size");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(ownerOf(tokenIds[i]) == msg.sender, "Not owner");
            _burn(tokenIds[i]);
            activeSupply--;
            uint256 lpReturned = lpVault.processRedemption(tokenIds[i], msg.sender);
            emit Redeem(msg.sender, tokenIds[i], lpReturned);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SOULBOUND ENFORCEMENT
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Override _update to block all transfers except mint and burn.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = super._update(to, tokenId, auth);

        // Allow mint (from == 0) and burn (to == 0), block everything else
        if (from != address(0) && to != address(0)) {
            revert("DSFO: soulbound, transfers disabled");
        }

        // Notify FeeManager of mint/burn
        // For mint: handled in mint() as a batch notification
        // For burn: notify here (1 NFT at a time)
        if (address(feeManager) != address(0) && to == address(0) && from != address(0)) {
            feeManager.handleOwnershipChange(from, address(0), 1);
        }

        return from;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function totalActiveSupply() external view returns (uint256) {
        return activeSupply;
    }

    function totalMinted() external view returns (uint256) {
        return nextTokenId;
    }

    function baseTokenURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN (behind timelock in production)
    // ═══════════════════════════════════════════════════════════════════

    function setPricing(uint256 _basePrice, uint256 _priceStep) external onlyOwner {
        require(_basePrice > 0, "Base price must be > 0");
        basePrice = _basePrice;
        priceStep = _priceStep;
        emit PricingUpdated(_basePrice, _priceStep);
    }

    function setBurnVaultSplit(uint256 _burnBps, uint256 _vaultBps) external onlyOwner {
        require(_burnBps + _vaultBps == BPS, "Must sum to 10000");
        burnBps = _burnBps;
        vaultBps = _vaultBps;
        emit BurnVaultSplitUpdated(_burnBps, _vaultBps);
    }

    function setFeeManager(address _feeManager) external onlyOwner {
        feeManager = IFeeManager(_feeManager);
        emit FeeManagerUpdated(_feeManager);
    }

    function setLPVault(address _lpVault) external onlyOwner {
        require(_lpVault != address(0), "Invalid address");
        lpVault = ILPVault(_lpVault);
        emit LPVaultUpdated(_lpVault);
    }

    function setMaxMintsPerAddress(uint256 _max) external onlyOwner {
        maxMintsPerAddress = _max;
        emit MaxMintsPerAddressUpdated(_max);
    }

    function setBaseTokenURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseTokenURIUpdated(newBaseURI);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
