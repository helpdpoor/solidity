// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './borrowing.sol';
import './lending.sol';
import './liquidation.sol';

contract BorrowingLending is Borrowing, Lending, Liquidation {
    constructor (
        address newOwner,
        uint16 aprBorrowingMin,
        uint16 aprBorrowingMax,
        uint16 aprBorrowingFix,
        uint16 aprLendingMin,
        uint16 aprLendingMax
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        require(aprBorrowingMax >= aprBorrowingMin, 'Max APR should be greater than min APR');
        require(aprLendingMax >= aprLendingMin, 'Max APR should be greater than min APR');

        transferOwnership(newOwner);
        _aprBorrowingMin = aprBorrowingMin;
        _aprBorrowingMax = aprBorrowingMax;
        _aprBorrowingFix = aprBorrowingFix;
        _aprLendingMin = aprLendingMin;
        _aprLendingMax = aprLendingMax;
    }
}