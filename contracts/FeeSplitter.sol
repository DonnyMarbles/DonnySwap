// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

/// @title FeeSplitter — Pair-aware LP fee router
/// @notice Sits at Factory.feeTo. Receives protocol fee LP tokens from all pairs.
///         - MRBL-PEAQ LP: 70% -> FeeManager, 30% -> LPVault
///         - All other LP:  100% -> FeeManager
/// @dev Mandatory and ubypassable — V2 Pair._mintFee sends LP here regardless
///      of which router or interface traders use.
contract FeeSplitter is Ownable {
    using SafeERC20 for IERC20;

    // ── State ──
    IUniswapV2Factory public factory;
    address public feeManager;
    address public lpVault;
    address public mrblPeaqPair; // The MRBL-PEAQ pair address

    /// @dev Split ratio for MRBL-PEAQ LP. feeManagerBps + lpVaultBps = 10000.
    uint256 public feeManagerBps = 7000; // 70%
    uint256 public lpVaultBps = 3000;    // 30%
    uint256 private constant BPS_DENOMINATOR = 10000;

    // ── Events ──
    event Split(
        address indexed lpToken,
        uint256 toFeeManager,
        uint256 toLPVault
    );
    event SplitRatioUpdated(uint256 feeManagerBps, uint256 lpVaultBps);
    event FeeManagerUpdated(address indexed newFeeManager);
    event LPVaultUpdated(address indexed newLPVault);
    event MrblPeaqPairUpdated(address indexed newPair);

    // ── Constructor ──
    constructor(
        address _factory,
        address _feeManager,
        address _lpVault,
        address _mrblPeaqPair
    ) Ownable(msg.sender) {
        require(_factory != address(0), "Invalid factory");
        require(_feeManager != address(0), "Invalid feeManager");
        require(_lpVault != address(0), "Invalid lpVault");
        require(_mrblPeaqPair != address(0), "Invalid mrblPeaqPair");

        factory = IUniswapV2Factory(_factory);
        feeManager = _feeManager;
        lpVault = _lpVault;
        mrblPeaqPair = _mrblPeaqPair;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CORE: DISTRIBUTE LP TOKENS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Distribute accumulated LP tokens for a specific pair.
    ///         Permissionless — anyone can call.
    /// @param lpToken The V2 Pair address whose LP tokens to distribute.
    function distribute(address lpToken) external {
        uint256 balance = IERC20(lpToken).balanceOf(address(this));
        if (balance == 0) return;

        if (lpToken == mrblPeaqPair) {
            // MRBL-PEAQ pair: split 70/30
            uint256 toFeeManager = (balance * feeManagerBps) / BPS_DENOMINATOR;
            uint256 toLPVault = balance - toFeeManager; // Remainder avoids rounding dust loss

            IERC20(lpToken).safeTransfer(feeManager, toFeeManager);
            IERC20(lpToken).safeTransfer(lpVault, toLPVault);

            emit Split(lpToken, toFeeManager, toLPVault);
        } else {
            // All other pairs: 100% to FeeManager
            IERC20(lpToken).safeTransfer(feeManager, balance);

            emit Split(lpToken, balance, 0);
        }
    }

    /// @notice Batch distribute for multiple pairs in one tx.
    function distributeBatch(address[] calldata lpTokens) external {
        for (uint256 i = 0; i < lpTokens.length; i++) {
            uint256 balance = IERC20(lpTokens[i]).balanceOf(address(this));
            if (balance == 0) continue;

            if (lpTokens[i] == mrblPeaqPair) {
                uint256 toFeeManager = (balance * feeManagerBps) / BPS_DENOMINATOR;
                uint256 toLPVault = balance - toFeeManager;

                IERC20(lpTokens[i]).safeTransfer(feeManager, toFeeManager);
                IERC20(lpTokens[i]).safeTransfer(lpVault, toLPVault);

                emit Split(lpTokens[i], toFeeManager, toLPVault);
            } else {
                IERC20(lpTokens[i]).safeTransfer(feeManager, balance);

                emit Split(lpTokens[i], balance, 0);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN (behind timelock in production)
    // ═══════════════════════════════════════════════════════════════════

    function setSplitRatio(uint256 _feeManagerBps, uint256 _lpVaultBps) external onlyOwner {
        require(_feeManagerBps + _lpVaultBps == BPS_DENOMINATOR, "Must sum to 10000");
        feeManagerBps = _feeManagerBps;
        lpVaultBps = _lpVaultBps;
        emit SplitRatioUpdated(_feeManagerBps, _lpVaultBps);
    }

    function setFeeManager(address _feeManager) external onlyOwner {
        require(_feeManager != address(0), "Invalid address");
        feeManager = _feeManager;
        emit FeeManagerUpdated(_feeManager);
    }

    function setLPVault(address _lpVault) external onlyOwner {
        require(_lpVault != address(0), "Invalid address");
        lpVault = _lpVault;
        emit LPVaultUpdated(_lpVault);
    }

    function setMrblPeaqPair(address _pair) external onlyOwner {
        require(_pair != address(0), "Invalid address");
        mrblPeaqPair = _pair;
        emit MrblPeaqPairUpdated(_pair);
    }
}
