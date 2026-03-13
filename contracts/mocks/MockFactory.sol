// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Minimal mock for IUniswapV2Factory — only getPair needed.
contract MockFactory {
    mapping(address => mapping(address => address)) private _pairs;

    function setPair(address tokenA, address tokenB, address pair) external {
        _pairs[tokenA][tokenB] = pair;
        _pairs[tokenB][tokenA] = pair;
    }

    /// @dev Convenience: set pair where pair address == one of the tokens (for mock LP).
    function setPair(address token, address pair) external {
        _pairs[token][token] = pair;
    }

    function getPair(address tokenA, address tokenB) external view returns (address) {
        return _pairs[tokenA][tokenB];
    }

    function feeToSetter() external view returns (address) {
        return msg.sender;
    }
}
