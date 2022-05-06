// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function transfer(
        address recipient, uint256 amount
    ) external returns (bool);
}

/**
 * @dev Partial interface of the Access vault contract.
 */
interface IAccessVault {
    function borrow() external returns (bool);
    function getExchangeRouter() external view returns (address);
    function getBaaOwner() external view returns (address);
}

/**
 * @dev Partial interface of the Exchange router contract.
 */
interface IExchangeRouter {
    function swapTokens() external returns (bool);
}

contract Baa {
    modifier onlyAccessVault() {
        require(msg.sender == _accessVault, '792');
        _;
    }
    modifier onlyOwner() {
        require(
            msg.sender == _accessVault.getBaaOwner(address(this)),
                'Caller is not the owner'
        );
        _;
    }

    IAccessVault private _accessVault;
    bool private _reentrancyFlag;

    constructor (
        address accessVaultAddress
    ) {
        require(accessVaultAddress != address(0), 'Access vault address can not be zero');
        _accessVault = IAccessVault(accessVaultAddress);
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function borrow (
        address tokenAddress,
        uint256 amount
    ) external onlyOwner returns (bool) {
        _accessVault.borrow(tokenAddress, amount);
        return true;
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function swapTokens (
        address tokenAddressA,
        address tokenAddressB,
        uint256 amount
    ) external onlyOwner returns (bool) {
        IExchangeRouter _exchangeRouter
            = IExchangeRouter(_accessVault.getExchangeRouter());
        _exchangeRouter.swapTokens(
            tokenAddressA,
            tokenAddressB,
            amount
        );
        return true;
    }

    function setAccessVault (
        address accessVaultAddress
    ) external onlyAccessVault returns (bool) {
        require(accessVaultAddress != address(0), 'Access vault address can not be zero');
        _accessVault = IAccessVault(accessVaultAddress);
        return true;
    }

    function getAccessVault () external view returns (address) {
        return address(_accessVault);
    }
    
    /**
     * @dev Function for withdrawing assets, both native currency and erc20 tokens.
     */
    function withdraw (
        address tokenAddress, uint256 amount
    ) external onlyAccessVault returns (bool) {
        require(
            !_reentrancyFlag, 'Reentrancy not allowed'
        );
        _reentrancyFlag = true;
        
        if (tokenAddress == address(0)) {
            payable(_accessVault).transfer(amount);
        } else {
            IERC20 tokenContract = IERC20(tokenAddress);
            require(tokenContract.transfer(_accessVault, amount));
        }
        
        return true;
    }
}