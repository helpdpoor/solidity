// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import './AccessControl.sol';
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

contract ERC721Implementation is ERC721URIStorageUpgradeable, AccessControl {
    bytes32 internal constant MINTER = keccak256(abi.encode('MINTER'));

    function mint (
        address to,
        uint256 tokenId,
        string memory tokenUri
    ) external hasRole(MINTER) returns (bool) {
        _safeMint(to, tokenId, '');
        _setTokenURI(tokenId, tokenUri);
        return true;
    }

    function initialize(
        address ownerAddress,
        string memory name,
        string memory symbol
    ) public initializer {
        require(ownerAddress != address(0), 'Owner address can not be zero');
        _owner = ownerAddress;
        _grantRole(MINTER, _owner);
        __ERC721_init_unchained(name, symbol);
    }
}