// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './ERC721EnumerableFlatten.sol';
import './roles.sol';

/**
 * @dev Scholarsip NFT contract for p2e fast game
 */
contract Nft is ERC721, ERC721Enumerable, Roles {
    uint8 private constant TOKEN_DISTRIBUTOR = 1;
    uint256 private _initialIdShift;

    mapping (uint256 => uint256) private _nftProfileIds; // tokenId => nftProfileId
    mapping (uint256 => string) private _tokenURIs; // tokenId => uri

    constructor (
        string memory name,
        string memory symbol,
        uint256 initialIdShift
    ) ERC721(name, symbol) {
        _initialIdShift = initialIdShift; // for fixed inflation should be 6000000
        addToManagers(owner());
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }

        return super.tokenURI(tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) hasRole(TOKEN_DISTRIBUTOR) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     */
    function mint(
        address to,
        uint256 nftProfileId,
        string calldata tokenUri
    ) external hasRole(TOKEN_DISTRIBUTOR) returns (bool) {
        uint256 tokenId = totalSupply() + _initialIdShift + 1;
        _mint(to, tokenId);
        _nftProfileIds[tokenId] = nftProfileId;
        _tokenURIs[tokenId] = tokenUri;
        return true;
    }

    function getNftProfileId (
        uint256 tokenId
    ) external view returns (uint256) {
        return _nftProfileIds[tokenId];
    }
}