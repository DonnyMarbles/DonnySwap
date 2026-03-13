// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Minimal mock for IUniswapV2Router02 — removeLiquidity burns LP and returns underlying.
contract MockRouter {
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 /* amountAMin */,
        uint256 /* amountBMin */,
        address to,
        uint256 /* deadline */
    ) external returns (uint256 amountA, uint256 amountB) {
        // Burn the LP tokens from the caller
        IERC20(msg.sender).transferFrom(msg.sender, address(this), 0); // no-op, just for interface

        // Return half of liquidity as each underlying token
        amountA = liquidity / 2;
        amountB = liquidity / 2;

        // Actually transfer tokens to recipient
        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
    }
}
