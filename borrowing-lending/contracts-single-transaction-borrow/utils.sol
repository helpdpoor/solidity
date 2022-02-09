// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract Utils {
    function _takeToken (
        address tokenAddress, address fromAddress, uint256 amount
    ) internal returns (bool) {
        IERC20 tokenContract = IERC20(tokenAddress);
        tokenContract.transferFrom(fromAddress, address(this), amount);

        return true;
    }

    function _sendToken (
        address tokenAddress, address toAddress, uint256 amount
    ) internal returns (bool) {
        IERC20 tokenContract = IERC20(tokenAddress);
        tokenContract.transfer(toAddress, amount);

        return true;
    }
}