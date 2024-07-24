pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/UniswapV2Factory.sol";

contract DonnySwapFactory is UniswapV2Factory {
    // Mapping of token addresses to their respective liquidity pools
    mapping(address => mapping(address => address)) public getPair;
    mapping(address => mapping(address => uint256)) public pairCodeHash;

    address public feeTo;
    address public feeToSetter;

    // Event emitted when a new liquidity pool is created
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    // Initialize the factory contract
    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    // Create a new liquidity pool
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "DonnySwap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "DonnySwap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "DonnySwap: PAIR_EXISTS"); // single check is sufficient

        bytes memory bytecode = type(DonnySwapPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        DonnySwapPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        pairCodeHash[token0][token1] = keccak256(abi.encodePacked(type(DonnySwapPair).creationCode));
        pairCodeHash[token1][token0] = keccak256(abi.encodePacked(type(DonnySwapPair).creationCode));
        emit PairCreated(token0, token1, pair, block.timestamp);
    }

    // Set the fee recipient
    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "DonnySwap: FORBIDDEN");
        feeTo = _feeTo;
    }

    // Set the fee setter
    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "DonnySwap: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}
