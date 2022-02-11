// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './ERC721EnumerableFlatten.sol';
import './roles.sol';

/**
 * @dev
 */
contract ERC721Scholarship is ERC721, ERC721Enumerable, Roles {
    uint8 internal constant TOKEN_DISTRIBUTOR = 1;

    mapping (uint256 => uint256) private _tokenCreationTimestamps; // tokenId => creation timestamp
    mapping (uint256 => uint256) private _tokenType; // tokenId => tokenTypeId
    mapping (uint256 => string) private _tokenURIs; // tokenId => uri

    constructor (
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

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
        uint256 tokenTypeId,
        string calldata tokenUri
    ) external hasRole(TOKEN_DISTRIBUTOR) returns (bool) {
        uint256 tokenId = totalSupply() + 1;
        _mint(to, tokenId);
        _tokenType[tokenId] = tokenTypeId;
        _tokenURIs[tokenId] = tokenUri;
        _tokenCreationTimestamps[tokenId] = block.timestamp;
        return true;
    }

    function getTokenTypeId (
        uint256 tokenId
    ) external view returns (uint256) {
        return _tokenType[tokenId];
    }

    function getTokenCreationTimestamp (
        uint256 tokenId
    ) external view returns (uint256) {
        return _tokenCreationTimestamps[tokenId];
    }
}