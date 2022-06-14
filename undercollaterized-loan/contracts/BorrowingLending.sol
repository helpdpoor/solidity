// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import './Utils.sol';

contract BorrowingLending is Utils {
    mapping(uint256 => address) tokens;

    constructor (
        address token1,
        address token2
    ) {
       tokens[1] = token1;
       tokens[2] = token2;
    }
    function accessVaultWithdraw(
        uint256 borrowingProfileIndex,
        uint256 amount
    ) external returns (bool) {
        _sendAsset(
            tokens[borrowingProfileIndex],
            msg.sender,
            amount
        );
        return true;
    }

    function accessVaultReplenish(
        uint256 borrowingProfileIndex,
        uint256 amount
    ) external returns (bool) {
        _takeAsset(
            tokens[borrowingProfileIndex],
            msg.sender,
            amount
        );
        return true;
    }
}