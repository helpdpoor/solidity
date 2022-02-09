// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import './storage.sol';

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
contract Admin is Storage {
    // Zero contract address should be used for native currency withdrawing
    function adminWithdraw (
        address tokenAddress, uint256 amount
    ) external onlyOwner returns (bool) {
        _sendAsset(tokenAddress, msg.sender, amount);
        _adminWithdraw[tokenAddress] += amount;
        return true;
    }

    // Zero contract address should be used for native currency replenishing
    function adminReplenish (
        address tokenAddress, uint256 amount
    ) external payable onlyOwner returns (bool) {
        if (tokenAddress != address(0)) {
            require(msg.value == 0, '4');
            require(amount > 0, '5');
            _takeAsset(tokenAddress, msg.sender, amount);
        } else {
            amount = msg.value;
            require(amount > 0, '6');
        }
        _adminReplenish[tokenAddress] += amount;
        return true;
    }
}