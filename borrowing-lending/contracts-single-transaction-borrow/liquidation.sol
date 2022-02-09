// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './storage.sol';

contract Liquidation is Storage {
    function flagBorrowingForLiquidation (
        uint256 borrowingIndex
    ) external onlyLiquidator returns (bool) {
        require(borrowingIndex > 0 && borrowingIndex
            <= _borrowingsNumber, 'Borrowing is not found');
        require(_isBorrowingLiquidation(borrowingIndex), 'Liquidation requirements is not met');
        _usersBorrowingsAtLiquidation[_borrowings[borrowingIndex].userAddress] ++;
        _borrowingAtLiquidation[borrowingIndex] = true;

        return true;
    }

    // view functions
    function isBorrowingLiquidation (
        uint256 borrowingIndex
    ) external view returns (bool) {
        return _isBorrowingLiquidation(borrowingIndex);
    }

    // view functions
    function _isBorrowingLiquidation (
        uint256 borrowingIndex
    ) internal view returns (bool) {
        if (borrowingIndex == 0 || borrowingIndex
            > _borrowingsNumber) return false;
        uint256 collateralProfileIndex = _collaterals
            [_borrowings[borrowingIndex].collateralIndex].collateralProfileIndex;

        return _collaterals[_borrowings[borrowingIndex].collateralIndex].amount // collateral amount
            <= _borrowings[borrowingIndex].amount // borrowing amount
                * _collateralProfiles[collateralProfileIndex].liquidationFactor;
    }
}