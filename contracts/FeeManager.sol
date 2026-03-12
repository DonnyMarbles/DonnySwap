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

contract FeeManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IDSFO public dsfoToken;
    IUniswapV2Router02 public router;

    address[] private holderList;
    address[] public lpTokenAddresses;
    mapping(address => uint256) public holderBalances;
    mapping(address => uint256) private holderIndexPlusOne;
    uint256 public totalTrackedShares;

    event FeesReceived(address indexed lpToken, uint256 amount);
    event LPBrokenDown(address indexed lpToken, address indexed token0, address indexed token1, uint256 amountToken0, uint256 amountToken1);
    event FeesDistributed(address indexed token, uint256 totalAmount);
    event HolderBalanceUpdated(address indexed holder, uint256 newBalance, uint256 totalShares);

    constructor(
        address _dsfoToken,
        address _router
    ) Ownable(msg.sender) {
        dsfoToken = IDSFO(_dsfoToken);
        router = IUniswapV2Router02(_router);
    }

    modifier onlyDsfoToken() {
        require(msg.sender == address(dsfoToken), "FeeManager: not DSFO token");
        _;
    }

    function getHolderCount() external view returns (uint256) {
        return holderList.length;
    }

    function getHolderAt(uint256 index) external view returns (address) {
        require(index < holderList.length, "Index out of bounds");
        return holderList[index];
    }

    function syncHolder(address holder) external onlyOwner {
        require(holder != address(0), "Invalid holder");
        uint256 balance = dsfoToken.balanceOf(holder);
        _setHolderBalance(holder, balance);
    }

    function syncHolders(address[] calldata holders) external onlyOwner {
        for (uint256 i = 0; i < holders.length; i++) {
            require(holders[i] != address(0), "Invalid holder");
            uint256 balance = dsfoToken.balanceOf(holders[i]);
            _setHolderBalance(holders[i], balance);
        }
    }

    function handleOwnershipChange(address from, address to, uint256 amount) external onlyDsfoToken {
        if (amount == 0 || from == to) {
            return;
        }

        if (from != address(0)) {
            _decreaseHolderBalance(from, amount);
        }

        if (to != address(0)) {
            _increaseHolderBalance(to, amount);
        }
    }

    function breakDownAndDistributeAll() internal {
        for (uint256 i = 0; i < lpTokenAddresses.length; i++) {
            address lpTokenAddress = lpTokenAddresses[i];
            IERC20 lpToken = IERC20(lpTokenAddress);
            uint256 lpAmount = lpToken.balanceOf(address(this)); // Directly check the balance

            if (lpAmount > 0) {
                // Get the pair and tokens
                IUniswapV2Pair pair = IUniswapV2Pair(lpTokenAddress);
                address token0 = pair.token0();
                address token1 = pair.token1();

                // Approve the router to spend the LP tokens (forceApprove handles non-standard ERC20s)
                lpToken.forceApprove(address(router), 0);
                lpToken.forceApprove(address(router), lpAmount);

                // Break down the LP tokens into the underlying assets
                (uint256 amountToken0, uint256 amountToken1) = router.removeLiquidity(
                    token0,
                    token1,
                    lpAmount,
                    0, // accept any amount of token0
                    0, // accept any amount of token1
                    address(this),
                    block.timestamp
                );

                // Distribute each of the tokens to DSFO holders
                distributeFees(token0, amountToken0);
                distributeFees(token1, amountToken1);

                emit LPBrokenDown(lpTokenAddress, token0, token1, amountToken0, amountToken1);
            }
        }
    }

    // Function to distribute broken down fees to DSFO NFT holders
    function distributeFees(address token, uint256 totalAmount) internal {
        uint256 supply = totalTrackedShares;
        require(supply > 0, "No DSFO NFTs to distribute to");

        uint256 holdersLength = holderList.length;
        uint256 distributed;

        for (uint256 i = 0; i < holdersLength; i++) {
            address holder = holderList[i];
            uint256 balance = holderBalances[holder];
            if (balance == 0) {
                continue;
            }

            uint256 share = (totalAmount * balance) / supply;
            if (share == 0) {
                continue;
            }

            distributed += share;
            IERC20(token).safeTransfer(holder, share);
        }

        uint256 remainder = totalAmount - distributed;
        if (remainder > 0 && holdersLength > 0) {
            address lastHolder = holderList[holdersLength - 1];
            IERC20(token).safeTransfer(lastHolder, remainder);
            distributed += remainder;
        }

        emit FeesDistributed(token, distributed);
    }

    // Owner can manually trigger the breakdown and distribution
    function triggerBreakdownAndDistribution() external onlyOwner nonReentrant {
        breakDownAndDistributeAll();
    }

    // Function to add a new LP token to track
    function addLPTokenAddress(address lpTokenAddress) external onlyOwner {
        lpTokenAddresses.push(lpTokenAddress);
    }

    function _setHolderBalance(address account, uint256 newBalance) internal {
        uint256 current = holderBalances[account];
        if (current == newBalance) {
            return;
        }

        if (newBalance == 0) {
            if (current == 0) {
                return;
            }
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
        if (indexPlusOne == 0) {
            return;
        }

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
