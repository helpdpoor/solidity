// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
import './roles.sol';

/**
 * @dev Partial interface of the NFT contract according to the needs of the staking nft contract.
 */
interface INFT {
    function mint (
        address to,
        uint256 tokenTypeId,
        string calldata tokenUri
    ) external returns (bool);
    function ownerOf(uint256 tokenId) external returns (address);
    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external;
}

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, '80');

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}

contract Marketplace is Roles, ReentrancyGuard {
    struct NftProfile {
        uint256 id;
        uint256 price;
        uint256 tokenSold;
        uint256 inflation;
        uint256 limit;
        string tokenURI;
        bool ownInflation;
        bool active;
    }

    mapping (uint256 => NftProfile) internal _nftProfiles;
    mapping (bytes32 => uint256) internal _nftProfileIds;
        // token uri => nftProfileId

    INFT internal _nftContract;
    address internal _paymentAddress;
    address internal _buybackAddress;
    address internal _royaltyAddress;

    uint16 internal _paymentAddressRatio; // *= DECIMALS
    uint16 internal _buybackAddressRatio; // *= DECIMALS
    uint16 internal _royaltyAddressRatio; // *= DECIMALS
    uint16 internal constant DECIMALS = 10000;
        // used for exponent shifting when calculation with decimals
    uint256 internal _nftProfilesNumber;
    uint256 internal _inflation;

    constructor (
        address newOwner,
        address nftAddress,
        address paymentAddress,
        address buybackAddress,
        address royaltyAddress,
        uint16 paymentAddressRatio,
        uint16 buybackAddressRatio,
        uint256 inflation
    ) {
        require(
            newOwner != address(0), 'Owner address can not be zero'
        );
        require(
            nftAddress != address(0), 'Nft address can not be zero'
        );
        require(
            paymentAddress != address(0), 'Payment address can not be zero'
        );
        require(
            buybackAddress != address(0), 'Buyback address can not be zero'
        );
        require(
            paymentAddress != address(0), 'Owner address can not be zero'
        );
        require(
            paymentAddressRatio + buybackAddressRatio <= DECIMALS,
                'Ratio sum can not be greater than 1 * DECIMALS'
        );
        _nftContract = INFT(nftAddress);
        _paymentAddress = paymentAddress;
        _buybackAddress = buybackAddress;
        _royaltyAddress = royaltyAddress;
        _paymentAddressRatio = paymentAddressRatio;
        _buybackAddressRatio = buybackAddressRatio;
        _royaltyAddressRatio = DECIMALS - _paymentAddressRatio - _buybackAddressRatio;
        _inflation = inflation;
        addToManagers(newOwner);
        transferOwnership(newOwner);
    }

    function purchase (
        uint256 nftProfileId
    ) external payable nonReentrant returns (bool) {
        require(
            _nftProfiles[nftProfileId].active,
                'This Nft profile is disabled or does not exist'
        );
        require(
            _nftProfiles[nftProfileId].limit == 0
                || _nftProfiles[nftProfileId].tokenSold + 1
                    <= _nftProfiles[nftProfileId].limit
        );
        uint256 price = _nftProfiles[nftProfileId].price;

        uint256 remain = price;
        require(
            msg.value == price,
                'Amount paid does not match nft price'
        );
        _nftContract.mint(
            msg.sender,
            nftProfileId,
            _nftProfiles[nftProfileId].tokenURI
        );

        uint256 inflation = _inflation;
        if (_nftProfiles[nftProfileId].ownInflation)
            inflation = _nftProfiles[nftProfileId].inflation;
        _nftProfiles[nftProfileId].price += inflation;
        _nftProfiles[nftProfileId].tokenSold ++;

        if (_paymentAddressRatio > 0) {
            uint256 amount;
            if (
                _buybackAddressRatio == 0 && _royaltyAddressRatio == 0
            ) amount = remain;
            else amount = price * _paymentAddressRatio / DECIMALS;
            payable(_paymentAddress).transfer(amount);
            remain -= amount;
        }
        if (_buybackAddressRatio > 0) {
            uint256 amount;
            if (_royaltyAddressRatio == 0) amount = remain;
            else amount = price * _buybackAddressRatio / DECIMALS;
            payable(_buybackAddress).transfer(amount);
            remain -= amount;
        }
        if (remain > 0) {
            payable(_royaltyAddress).transfer(remain);
        }
        return true;
    }

    // manager functions
    function addNftProfile (
        uint256 price,
        uint256 inflation,
        uint256 limit,
        string calldata tokenURI,
        bool ownInflation,
        bool active
    ) external onlyManager returns (bool) {
        require(
            _nftProfileIds[keccak256(abi.encode(tokenURI))] == 0,
                'Profile with this tokenURI already exists'
        );
        _nftProfilesNumber ++;
        _nftProfileIds[keccak256(abi.encode(tokenURI))] = _nftProfilesNumber;
        _nftProfiles[_nftProfilesNumber].price = price;
        _nftProfiles[_nftProfilesNumber].inflation = inflation;
        _nftProfiles[_nftProfilesNumber].limit = limit;
        _nftProfiles[_nftProfilesNumber].tokenURI = tokenURI;
        _nftProfiles[_nftProfilesNumber].ownInflation = ownInflation;
        _nftProfiles[_nftProfilesNumber].active = active;
        return true;
    }

    function seNftProfilePrice (
        uint256 nftProfileId,
        uint256 price
    ) external onlyManager returns (bool) {
        require(
            nftProfileId > 0 && nftProfileId <= _nftProfilesNumber,
            'Nft profile is not found'
        );
        _nftProfiles[nftProfileId].price = price;
        return true;
    }

    function seNftProfileInflation (
        uint256 nftProfileId,
        uint256 inflation
    ) external onlyManager returns (bool) {
        require(
            nftProfileId > 0 && nftProfileId <= _nftProfilesNumber,
            'Nft profile is not found'
        );
        _nftProfiles[nftProfileId].inflation = inflation;
        return true;
    }

    function seNftProfileTokenURI (
        uint256 nftProfileId,
        string calldata tokenURI
    ) external onlyManager returns (bool) {
        require(
            nftProfileId > 0 && nftProfileId <= _nftProfilesNumber,
            'Nft profile is not found'
        );
        require(
            _nftProfileIds[keccak256(abi.encode(tokenURI))] == 0,
            'Profile with this tokenURI already exists'
        );
        _nftProfileIds[keccak256(abi.encode(_nftProfiles[nftProfileId].tokenURI))] = 0;
        _nftProfileIds[keccak256(abi.encode(tokenURI))] = nftProfileId;
        _nftProfiles[nftProfileId].tokenURI = tokenURI;
        return true;
    }

    function seNftProfileOwnInflation (
        uint256 nftProfileId,
        bool isTrue
    ) external onlyManager returns (bool) {
        require(
            nftProfileId > 0 && nftProfileId <= _nftProfilesNumber,
            'Nft profile is not found'
        );
        _nftProfiles[nftProfileId].ownInflation = isTrue;
        return true;
    }

    function seNftProfileStatus (
        uint256 nftProfileId,
        bool active
    ) external onlyManager returns (bool) {
        require(
            nftProfileId > 0 && nftProfileId <= _nftProfilesNumber,
            'Nft profile is not found'
        );
        _nftProfiles[nftProfileId].active = active;
        return true;
    }

    function setNftContractAddress (
        address nftAddress
    ) external onlyManager returns (bool) {
        require(
            nftAddress != address(0), 'Nft address can not be zero'
        );
        _nftContract = INFT(nftAddress);
        return true;
    }

    function setDistributionAddresses (
        address paymentAddress,
        address buybackAddress,
        address royaltyAddress
    ) external onlyManager returns (bool) {
        _paymentAddress = paymentAddress;
        _buybackAddress = buybackAddress;
        _royaltyAddress = royaltyAddress;
        return true;
    }

    function setDistributionRatio (
        uint16 paymentAddressRatio,
        uint16 buybackAddressRatio,
        uint16 royaltyAddressRatio
    ) external onlyManager returns (bool) {
        _paymentAddressRatio = paymentAddressRatio;
        _buybackAddressRatio = buybackAddressRatio;
        _royaltyAddressRatio = royaltyAddressRatio;
        return true;
    }

    function setInflation (
        uint256 inflation
    ) external onlyManager returns (bool) {
        _inflation = inflation;
        return true;
    }

    // view functions
    function getNftProfilesNumber () external view returns (uint256) {
        return _nftProfilesNumber;
    }

    function getNftProfile (
        uint256 nftProfileId
    ) external view returns (
        uint256 price,
        uint256 tokenSold,
        uint256 inflation,
        uint256 limit,
        string memory tokenURI,
        bool ownInflation,
        bool active
    ) {
        return (
            _nftProfiles[nftProfileId].price,
            _nftProfiles[nftProfileId].tokenSold,
            _nftProfiles[nftProfileId].inflation,
            _nftProfiles[nftProfileId].limit,
            _nftProfiles[nftProfileId].tokenURI,
            _nftProfiles[nftProfileId].ownInflation,
            _nftProfiles[nftProfileId].active
        );
    }

    function getNftAddress () external view returns (address) {
        return address(_nftContract);
    }

    function getDistributionAddresses () external view returns (
        address paymentAddress,
        address buybackAddress,
        address royaltyAddress
    ) {
        return (
            _paymentAddress,
            _buybackAddress,
            _royaltyAddress
        );
    }

    function getDistributionRatio () external view returns (
        uint16 paymentAddressRatio,
        uint16 buybackAddressRatio,
        uint16 royaltyAddressRatio
    ) {
        return (
            _paymentAddressRatio,
            _buybackAddressRatio,
            _royaltyAddressRatio
        );
    }

    function getInflation () external view returns (uint256) {
        return _inflation;
    }
}
