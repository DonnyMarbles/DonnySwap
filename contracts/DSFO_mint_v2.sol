// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IFeeManager {
    function handleOwnershipChange(address from, address to, uint256 amount) external;
}

contract DSFONFT is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    using Strings for uint256;

    IERC20 public lpToken;
    uint256 public mintPrice;
    uint256 public totalSupply;
    address public feeManager;

    // Base URI used for new mints. When set, new tokens get baseTokenURI + tokenId.
    // When empty, falls back to the per-token URI set via _setTokenURI.
    string private _baseTokenURI;

    mapping(uint256 => address) public nftOwners;

    event Mint(address indexed minter, uint256 tokenId);
    event MintPriceUpdated(uint256 newPrice);
    event FeeManagerUpdated(address indexed newFeeManager);
    event BaseTokenURIUpdated(string newBaseURI);
    event TokenURIUpdated(uint256 indexed tokenId, string newURI);

    constructor(address _lpToken, uint256 _mintPrice)
        ERC721("DonnySwap Fractional Ownership", "DSFO")
        Ownable(msg.sender)
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

        for (uint256 i = 0; i < quantity; i++) {
            newTokenId += 1;
            _safeMint(msg.sender, newTokenId);

            // If baseTokenURI is set, use it; otherwise fall back to per-token URI
            if (bytes(_baseTokenURI).length > 0) {
                _setTokenURI(newTokenId, string.concat(_baseTokenURI, newTokenId.toString()));
            } else {
                _setTokenURI(newTokenId, "ipfs://QmRMq3psZ2vKUPM8djG3L3HpCKKucQEqXmHjMUgC6ZKx9y");
            }
            nftOwners[newTokenId] = msg.sender;

            emit Mint(msg.sender, newTokenId);
        }

        totalSupply = newTokenId;
    }

    /// @notice Update the URI for a specific token. Owner only.
    function setTokenURI(uint256 tokenId, string calldata newURI) external onlyOwner {
        require(bytes(newURI).length > 0, "URI cannot be empty");
        _setTokenURI(tokenId, newURI);
        emit TokenURIUpdated(tokenId, newURI);
    }

    /// @notice Batch-update URIs for multiple tokens. Owner only.
    function setTokenURIBatch(uint256[] calldata tokenIds, string[] calldata newURIs) external onlyOwner {
        require(tokenIds.length == newURIs.length, "Array length mismatch");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(bytes(newURIs[i]).length > 0, "URI cannot be empty");
            _setTokenURI(tokenIds[i], newURIs[i]);
            emit TokenURIUpdated(tokenIds[i], newURIs[i]);
        }
    }

    /// @notice Set the base URI used for new mints. Owner only.
    /// @dev Set to empty string to revert to per-token IPFS URIs.
    ///      Example: "https://donnyswap.xyz/api/nft/metadata/"
    ///      Token 5 would resolve to "https://donnyswap.xyz/api/nft/metadata/5"
    function setBaseTokenURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseTokenURIUpdated(newBaseURI);
    }

    /// @notice Batch-update all existing tokens to use baseTokenURI + tokenId.
    ///         Useful after changing the base URI to migrate all tokens at once.
    function migrateAllTokenURIs() external onlyOwner {
        require(bytes(_baseTokenURI).length > 0, "Base URI not set");
        for (uint256 i = 1; i <= totalSupply; i++) {
            string memory newURI = string.concat(_baseTokenURI, i.toString());
            _setTokenURI(i, newURI);
            emit TokenURIUpdated(i, newURI);
        }
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

    function baseTokenURI() external view returns (string memory) {
        return _baseTokenURI;
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
