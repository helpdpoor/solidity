// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import './AccessControl.sol';
import "./ERC1155Implementation.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @dev Partial interface of the Rates contract.
 */
interface IRates {
    function getUsdRate (
        address contractAddress,
        bool realTime
    ) external view returns (uint256);
}

contract FactoryERC1155 is AccessControl, ReentrancyGuard {
    event ContractDeployed (address tokenAddress);

    IRates internal _ratesContract; // rates contract
    address immutable _tokenImplementation;
    address internal _feeTokenAddress; // token address for fee payment
    address internal _feeReceiver;
    uint256 internal _feeAmount;
    uint256 internal _feeDiscount; // Applied when payment in tokens is selected, % * 100 (1000 == 10%)
    uint256 internal constant DECIMALS = 10000;
    bytes32 internal constant MANAGER = keccak256(abi.encode('MANAGER'));
    bytes32 internal constant MINTER = keccak256(abi.encode('MINTER'));

    constructor(
        address newOwner,
        address ratesContractAddress,
        address feeTokenAddress,
        address feeReceiver,
        uint256 feeAmount,
        uint256 feeDiscount
    ) {
        _tokenImplementation = address(new ERC1155Implementation());
        require(newOwner != address(0), 'Owner address can not be zero');
        require(feeReceiver != address(0), 'Fee receiver address can not be zero');
        require(ratesContractAddress != address(0), 'Rates contract address can not be zero');
        _owner = newOwner;
        _grantRole(MANAGER, newOwner);
        _grantRole(MINTER, newOwner);
        _ratesContract = IRates(ratesContractAddress);
        _feeTokenAddress = feeTokenAddress;
        _feeReceiver = feeReceiver;
        _feeAmount = feeAmount;
        _feeDiscount = feeDiscount;
    }

    /**
     * @dev Set rates contract
     */
    function setRatesContract (
        address ratesContractAddress
    ) external hasRole(MANAGER) returns (bool) {
        _ratesContract = IRates(ratesContractAddress);
        return true;
    }

    /**
     * @dev Set fee currency address
     */
    function setFeeTokenAddress (
        address feeTokenAddress
    ) external hasRole(MANAGER) returns (bool) {
        _feeTokenAddress = feeTokenAddress;
        return true;
    }

    /**
     * @dev Set fee currency address
     */
    function setFeeReceiverAddress (
        address feeReceiver
    ) external hasRole(MANAGER) returns (bool) {
        require(feeReceiver != address(0), 'Fee receiver address can not be zero');
        _feeReceiver = feeReceiver;
        return true;
    }

    /**
     * @dev Set fee amount for advanced token deployment
     */
    function setFeeAmount (
        uint256 feeAmount
    ) external hasRole(MANAGER) returns (bool) {
        _feeAmount = feeAmount;
        return true;
    }

    /**
     * @dev Set fee discount for payment in tokens
     */
    function setFeeDiscount (
        uint256 feeDiscount
    ) external hasRole(MANAGER) returns (bool) {
        _feeDiscount = feeDiscount;
        return true;
    }

    function _takeFee (
        bool native
    ) internal nonReentrant returns (bool) {
        uint256 feeAmount = getFeeAmount(native);
        if (native || _feeTokenAddress == address(0)) {
            require(msg.value >= feeAmount, 'Not enough fee amount');
            payable(_feeReceiver).transfer(feeAmount);
            uint256 remains = msg.value - feeAmount;
            if (remains > 0) payable(msg.sender).transfer(remains);
        } else {
            require(msg.value == 0, 'Payment should be in tokens');
            if (_feeDiscount > 0) {
                feeAmount = feeAmount * (DECIMALS - _feeDiscount) / DECIMALS;
            }
            require(
                IERC20(_feeTokenAddress).transferFrom(msg.sender, _feeReceiver, feeAmount),
                'Fee transfer failed'
            );
        }
        return true;
    }

    function createToken (
        string calldata uri,
        bool native
    ) external payable returns (address) {
        _takeFee(native);
        address clone = Clones.clone(_tokenImplementation);
        emit ContractDeployed(clone);
        ERC1155Implementation(clone).initialize(msg.sender, uri);
        return clone;
    }

    /**
     * @dev Returns fee data (currency address and amount)
     */
    function getFeeData () external view returns (
        address ratesContractAddress,
        address feeTokenAddress,
        address feeReceiver,
        uint256 feeAmount,
        uint256 feeDiscount
    ) {
        return (
            address(_ratesContract),
            _feeTokenAddress,
            _feeReceiver,
            _feeAmount,
            _feeDiscount
        );
    }

    /**
     * @dev Returns fee amount for fee payment in native currency or in tokens
     */
    function getFeeAmount (
        bool native
    ) public view returns (uint256) {
        uint256 feeAmount = _feeAmount;
        if (native || _feeTokenAddress == address(0)) {
            uint256 usdRate = _ratesContract.getUsdRate(address(0), false);
            feeAmount = feeAmount * 1 ether / usdRate;
        } else {
            uint256 usdRate = _ratesContract.getUsdRate(_feeTokenAddress, false);
            feeAmount = feeAmount * 1 ether / usdRate;
        }
        return feeAmount;
    }

    /**
     * @dev Returns token implementation address
     */
    function getTokenImplementation () external view returns (address) {
        return _tokenImplementation;
    }
}