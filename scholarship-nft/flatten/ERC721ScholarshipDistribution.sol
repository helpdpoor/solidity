// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @dev Access control contract,
 * functions names are self explanatory
 */
abstract contract AccessControl {
    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], 'Caller is not the manager');
        _;
    }

    mapping (address => bool) private _managers;
    address private _owner;

    constructor () {
        _owner = msg.sender;
        _managers[_owner] = true;
    }

    // admin functions
    function transferOwnership(address newOwner) public onlyOwner returns (bool) {
        require(newOwner != address(0), 'newOwner should not be zero address');
        _owner = newOwner;
        return true;
    }

    function addToManagers (
        address userAddress
    ) public onlyOwner returns (bool) {
        _managers[userAddress] = true;
        return true;
    }

    function removeFromManagers (
        address userAddress
    ) public onlyOwner returns (bool) {
        _managers[userAddress] = false;
        return true;
    }

    /**
     * @dev If true - user has manager role
     */
    function isManager (
        address userAddress
    ) external view returns (bool) {
        return _managers[userAddress];
    }

    /**
     * @dev Owner address getter
     */
    function owner() public view returns (address) {
        return _owner;
    }
}

/**
 * @dev Partial interface of the ERC721Scholarship contract.
 */
interface IERC721Scholarship {
    function mint(
        address to,
        uint256 tokenId,
        string calldata tokenUri
    ) external returns (bool);
    function totalSupply() external view returns (uint256);
    function getTokenTypeId (
        uint256 tokenId
    ) external view returns (uint256);
    function getTokenCreationTimestamp (
        uint256 tokenId
    ) external view returns (uint256);
}


/**
 * @dev
 */
contract ERC721ScholarshipDistribution is AccessControl {
    IERC721Scholarship _nftContract;
    uint256 private _batchLimit = 100;
    uint256 private _mintingBatchLimit = 50;
    mapping(uint256 => string) private _tokenTypeURIs; // tokenTypeId => uri
    mapping(address => uint256) private _userTokensNumber;
    mapping(address => mapping(uint256 => uint256)) private _userTokenTypeIds;
    // userAddress => serialNumber => tokenType
    mapping(address => mapping(uint256 => bool)) private _userTokenMinted;
    // userAddress => serialNumber => minted
    mapping (uint256 => uint256) _tokenTypeMetabolism; // tokenTypeId => metabolism value

    constructor (
        address nftContractAddress
    ) {
        require(
            nftContractAddress != address(0),
            'nftContractAddress should not be zero'
        );
        _nftContract = IERC721Scholarship(nftContractAddress);
    }

    function mintAirdrop (
        uint256 index
    ) public returns (bool) {
        require(
            _userTokenTypeIds[msg.sender][index] > 0,
            'Index is not valid'
        );
        require(
            !_userTokenMinted[msg.sender][index],
            'Token with this index has already been minted'
        );
        _userTokenMinted[msg.sender][index] = true;
        _nftContract.mint(
            msg.sender,
            _userTokenTypeIds[msg.sender][index],
            _tokenTypeURIs[
                _userTokenTypeIds[msg.sender][index]
            ]
        );
        return true;
    }

    function mintAirdropAll () external returns (bool) {
        for (uint256 i = 1; i <= _userTokensNumber[msg.sender]; i ++) {
            if (i > _mintingBatchLimit) break;
            if (_userTokenMinted[msg.sender][i]) continue;
            mintAirdrop(i);
        }
        return true;
    }

    function setTokenTypeURI (
        uint256 tokenTypeId,
        string calldata uri
    ) external onlyManager returns (bool) {
        _tokenTypeURIs[tokenTypeId] = uri;
        return true;
    }

    function setBatchLimit (
        uint256 batchLimit
    ) external onlyManager returns (bool) {
        _batchLimit = batchLimit;
        return true;
    }

    function setMintingBatchLimit (
        uint256 mintingBatchLimit
    ) external onlyManager returns (bool) {
        _mintingBatchLimit = mintingBatchLimit;
        return true;
    }

    function setNftContractAddress (
        address nftContractAddress
    ) external onlyManager returns (bool) {
        require(
            nftContractAddress != address(0),
            'nftContractAddress should not be zero'
        );
        _nftContract = IERC721Scholarship(nftContractAddress);
        return true;
    }

    function setTokenTypeMetabolism (
        uint256 tokenTypeId,
        uint256 metabolism
    ) external onlyManager returns (bool) {
        _tokenTypeMetabolism[tokenTypeId] = metabolism;
        return true;
    }

    function proceedAirdrop (
        address[] calldata userAddresses,
        uint256[] calldata tokenTypeIds
    ) external onlyManager returns (bool) {
        require(
            userAddresses.length == tokenTypeIds.length,
            'Arrays should be of the same length'
        );
        require(
            userAddresses.length <= _batchLimit,
            'Arrays length exceeded batch limit'
        );
        for (uint256 i; i < userAddresses.length; i ++) {
            _userTokensNumber[userAddresses[i]] ++;
            _userTokenTypeIds[userAddresses[i]][
                _userTokensNumber[userAddresses[i]]
            ] = tokenTypeIds[i];
        }
        return true;
    }

    function getTokenTypeURI (
        uint256 tokenTypeId
    ) external view returns (string memory) {
        return _tokenTypeURIs[tokenTypeId];
    }

    function getBatchLimit () external view returns (uint256) {
        return _batchLimit;
    }

    function getMintingBatchLimit () external view returns (uint256) {
        return _mintingBatchLimit;
    }

    function getNftContractAddress () external view returns (address) {
        return address(_nftContract);
    }

    function getTokensNumber (
        address userAddress
    ) external view returns (uint256) {
        return _userTokensNumber[userAddress];
    }

    function getTokenDetails (
        address userAddress,
        uint256 index
    ) external view returns (
        uint256 tokenTypeId,
        string memory tokenURI,
        bool minted
    ) {
        return (
            _userTokenTypeIds[userAddress][index],
            _tokenTypeURIs[
                _userTokenTypeIds[userAddress][index]
            ],
            _userTokenMinted[userAddress][index]
        );
    }

    function getTokenTypeMetabolism (
        uint256 tokenTypeId
    ) external view returns (uint256) {
        return _tokenTypeMetabolism[tokenTypeId];
    }

    function getTokenTypeId (
        uint256 tokenId
    ) external view returns (uint256) {
        return _nftContract.getTokenTypeId(tokenId);
    }

    function getTokenMetabolism (
        uint256 tokenId
    ) external view returns (uint256) {
        uint256 tokenTypeId = _nftContract.getTokenTypeId(tokenId);
        return _tokenTypeMetabolism[tokenTypeId];
    }

    function getTokenCreationTimestamp (
        uint256 tokenId
    ) external view returns (uint256) {
        return _nftContract.getTokenCreationTimestamp(tokenId);
    }

    function getTimestamp () external view returns (uint256) {
        return block.timestamp;
    }
}
