// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import './common/AccessControl.sol';
import './common/Utils.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the Rates contract.
 */
interface IRates {
    function getUsdRate (
        address contractAddress
    ) external view returns (uint256);
}

/**
 * @dev Sale contract,
 * functions names are self explanatory
 */
contract Payments is AccessControl, Utils {
    using ECDSA for bytes32;

    event Purchase(
        address indexed userAddress,
        address indexed paymentToken,
        uint256 orderId,
        uint256 paidAmount,
        uint256 usdPaidAmount
    );

    struct PaymentProfile {
        address contractAddress; // if == zero payments are in the native currency
        uint256 weight; // sorting order at UI (asc from left to right)
        string name;
        string currency;
        bool active;
    }

    mapping (uint8 => PaymentProfile) internal _paymentProfiles;
    mapping(address => uint256) internal _innerRates;
    mapping(uint256 => bool) internal _orderPaid;
    
    IRates internal _rates;
    address internal _receiver;
    uint8 internal _paymentProfilesNumber;
    bytes32 internal constant MANAGER = keccak256(abi.encode('MANAGER'));
    bytes32 internal constant SIGNER = keccak256(abi.encode('SIGNER'));
    uint256 internal constant SHIFT_18 = 10 ** 18;

    /**
     * @dev constructor
     */
    constructor (
        address ownerAddress,
        address managerAddress,
        address signerAddress,
        address ratesAddress,
        address receiverAddress
    ) {
        require(ownerAddress != address(0), 'ownerAddress can not be zero');
        require(managerAddress != address(0), 'managerAddress can not be zero');
        require(signerAddress != address(0), 'signerAddress can not be zero');
        require(ratesAddress != address(0), 'ratesAddress can not be zero');
        require(receiverAddress != address(0), 'receiverAddress can not be zero');
        _owner = ownerAddress;
        _grantRole(MANAGER, managerAddress);
        _grantRole(SIGNER, signerAddress);
        _rates =  IRates(ratesAddress);
        _receiver = receiverAddress;
    }

    function verifySignature (
        uint256 orderId,
        uint256 usdAmount,
        bytes memory signature
    ) public view returns (bool) {
        require(signature.length > 0, "Signature is not valid");
        bytes memory message = abi.encode(orderId, usdAmount);
        address signer = keccak256(message)
            .toEthSignedMessageHash()
            .recover(signature);
        require(_checkRole(SIGNER, signer), "Signature is not valid");
        return true;
    }
    
    function getRatesContract () external view returns (address) {
        return address(_rates);
    }

    function setRatesContract (
        address ratesAddress
    ) external hasRole(MANAGER) returns (bool) {
        require(ratesAddress != address(0), 'ratesAddress can not be zero');
        _rates =  IRates(ratesAddress);
        return true;
    }

    function getReceiver () external view returns (address) {
        return _receiver;
    }

    function setReceiver (
        address receiverAddress
    ) external onlyOwner returns (bool) {
        require(receiverAddress != address(0), 'receiverAddress can not be zero');
        _receiver =  receiverAddress;
        return true;
    }

    function getRate (
        address tokenAddress
    ) public view returns (uint256) {
        if (_innerRates[tokenAddress] > 0) {
            return _innerRates[tokenAddress];
        }
        uint256 rate = _rates.getUsdRate(tokenAddress);
        require(rate > 0, 'Rate calculation error');
        return rate;
    }

    function getInnerRate (
        address tokenAddress
    ) external view returns (uint256) {
        return _innerRates[tokenAddress];
    }

    function setInnerRate (
        address tokenAddress,
        uint256 rate
    ) external hasRole(MANAGER) returns (bool) {
        _innerRates[tokenAddress] = rate;
        return true;
    }

    /**
     * @dev Function accepts payments for syntrum services in predefined erc20 tokens
     */
    function pay (
        uint8 paymentProfileIndex,
        uint256 orderId,
        uint256 usdAmount, // multiplied by 10 ** 18
        bytes memory signature
    ) external returns (bool) {
        require(!_orderPaid[orderId], 'Order is already paid');
        require(
            _paymentProfiles[paymentProfileIndex].active,
                'Payment profile is not active or does not exist'
        );
        require(usdAmount > 0, 'usdAmount should be greater than zero');
        verifySignature(orderId, usdAmount, signature);
        uint256 paymentAmount = getPaymentAmount(
            paymentProfileIndex, usdAmount
        );

        _takeAsset(
            _paymentProfiles[paymentProfileIndex].contractAddress,
            msg.sender,
            paymentAmount
        );
        _sendAsset(
            _paymentProfiles[paymentProfileIndex].contractAddress,
            _receiver,
            paymentAmount
        );
        _orderPaid[orderId] = true;

        emit Purchase(
            msg.sender,
            _paymentProfiles[paymentProfileIndex].contractAddress,
            orderId,
            paymentAmount,
            usdAmount
        );
        return true;
    }

    function getPaymentAmount (
        uint8 paymentProfileIndex,
        uint256 usdAmount
    ) public view returns (uint256) {
        uint256 usdPaymentRate = getRate(
            _paymentProfiles[paymentProfileIndex].contractAddress
        );
        return usdAmount * SHIFT_18 / usdPaymentRate;
    }

    // manager functions
    function addPaymentProfile (
        address contractAddress,
        uint256 usdPaymentRate,
        uint256 weight,
        string memory name,
        string memory currency
    ) external hasRole(MANAGER) returns (bool) {
        if (usdPaymentRate == 0) {
            require(
                _rates.getUsdRate(contractAddress) > 0,
                    'Token rate can not be zero'
            );
        } else {
            _innerRates[contractAddress] = usdPaymentRate;
        }
        _paymentProfilesNumber ++;
        _paymentProfiles[_paymentProfilesNumber].contractAddress = contractAddress;
        _paymentProfiles[_paymentProfilesNumber].weight = weight;
        _paymentProfiles[_paymentProfilesNumber].name = name;
        _paymentProfiles[_paymentProfilesNumber].currency = currency;
        _paymentProfiles[_paymentProfilesNumber].active = true;
        return true;
    }

    function setPaymentProfileWeight (
        uint8 paymentProfileIndex,
        uint256 weight
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].weight = weight;
        return true;
    }

    function setPaymentProfileName (
        uint8 paymentProfileIndex,
        string calldata name
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].name = name;
        return true;
    }

    function setPaymentProfileCurrency (
        uint8 paymentProfileIndex,
        string calldata currency
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].currency = currency;
        return true;
    }

    function setPaymentProfileStatus (
        uint8 paymentProfileIndex,
        bool active
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].active = active;
        return true;
    }

    function getPaymentProfile (
        uint8 paymentProfileIndex
    ) external view returns (
        address contractAddress,
        uint256 weight,
        string memory name,
        string memory currency,
        bool active
    ) {
        return (
            _paymentProfiles[paymentProfileIndex].contractAddress,
            _paymentProfiles[paymentProfileIndex].weight,
            _paymentProfiles[paymentProfileIndex].name,
            _paymentProfiles[paymentProfileIndex].currency,
            _paymentProfiles[paymentProfileIndex].active
        );
    }

    function getPaymentProfilesNumber () external view returns (uint256) {
        return _paymentProfilesNumber;
    }

    function getOrderPaid (
        uint256 orderId
    ) external view returns (bool) {
        return _orderPaid[orderId];
    }
}
