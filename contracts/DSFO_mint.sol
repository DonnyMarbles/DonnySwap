// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFeeManager {
    function handleOwnershipChange(address from, address to, uint256 amount) external;
}

contract DSFONFT is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    IERC20 public lpToken;
    uint256 public mintPrice;
    uint256 public totalSupply;
    address public feeManager;

    mapping(uint256 => address) public nftOwners;

    event Mint(address indexed minter, uint256 tokenId);
    event MintPriceUpdated(uint256 newPrice);
    event FeeManagerUpdated(address indexed newFeeManager);

    constructor(address _lpToken, uint256 _mintPrice) 
        ERC721("DonnySwap Fractional Ownership", "DSFO") 
        Ownable(msg.sender) // Pass msg.sender to the Ownable constructor
    {
        lpToken = IERC20(_lpToken);
        mintPrice = _mintPrice;
        totalSupply = 0;
    }

    function mintDSFONFT(uint256 quantity) external nonReentrant whenNotPaused {
        require(quantity > 0, "Quantity must be greater than zero");

        uint256 totalCost = mintPrice * quantity;
        require(lpToken.allowance(msg.sender, address(this)) >= totalCost, "Insufficient allowance for LP tokens");

        // Burn the required amount of LP tokens
        lpToken.transferFrom(msg.sender, address(0), totalCost);

        uint256 newTokenId = totalSupply;

        // Mint the requested number of DSFO NFTs
        for (uint256 i = 0; i < quantity; i++) {
            newTokenId += 1;
            _safeMint(msg.sender, newTokenId);
            _setTokenURI(newTokenId, "ipfs://QmRMq3psZ2vKUPM8djG3L3HpCKKucQEqXmHjMUgC6ZKx9y");
            nftOwners[newTokenId] = msg.sender;

            emit Mint(msg.sender, newTokenId);
        }

        totalSupply = newTokenId;
    }

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        mintPrice = _newPrice;
        emit MintPriceUpdated(_newPrice);
    }

    function setFeeManager(address _feeManager) external onlyOwner {
        feeManager = _feeManager;
        emit FeeManagerUpdated(_feeManager);
    }

    function burnNFT(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Caller is not the owner");
        _burn(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override(ERC721)
        returns (address)
    {
        address from = super._update(to, tokenId, auth);

        if (to == address(0)) {
            delete nftOwners[tokenId];
        } else {
            nftOwners[tokenId] = to;
        }

        if (feeManager != address(0) && from != to) {
            IFeeManager(feeManager).handleOwnershipChange(from, to, 1);
        }

        return from;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
