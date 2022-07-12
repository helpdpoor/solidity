// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import './Storage.sol';

/**
 * @dev Implementation of the marketing indexes calculation
 * in order to calculate fees and yield with dynamically changed APR
 */
contract MarketingIndexes is Storage {
    function _proceedMarketingIndexes (
        uint256 borrowingProfileIndex
    ) internal returns (bool) {
        uint256 borrowingPeriod = block.timestamp
            - _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndexLastTime;
        uint256 borrowingMarketFactor = _SHIFT_18;
        if (_borrowingProfiles[borrowingProfileIndex].totalLent > 0) {
            borrowingMarketFactor += _SHIFT_18 * getBorrowingApr(borrowingProfileIndex)
            * borrowingPeriod / _SHIFT_4 / _YEAR;
        }
        _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndex *= borrowingMarketFactor;
        _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndex /= _SHIFT_18;
        _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndexLastTime = block.timestamp;

        uint256 lendingPeriod = block.timestamp
            - _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime;
        uint256 lendingMarketFactor = _SHIFT_18 + (
            _SHIFT_18 * getLendingApr(borrowingProfileIndex)
            * lendingPeriod / _SHIFT_4 / _YEAR
        );

        _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex *= lendingMarketFactor;
        _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex /= _SHIFT_18;
        _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime = block.timestamp;

        return true;
    }

    function setAprSettings (
        uint16 aprBorrowingMin,
        uint16 aprBorrowingMax,
        uint16 aprBorrowingFixed,
        uint16 aprLendingMin,
        uint16 aprLendingMax
    ) external onlyManager returns (bool) {
        for (uint256 i; i < _borrowingProfilesNumber; i ++) {
            _proceedMarketingIndexes(i + 1);
        }
        _aprBorrowingMin = aprBorrowingMin;
        _aprBorrowingMax = aprBorrowingMax;
        _aprBorrowingFixed = aprBorrowingFixed;
        _aprLendingMin = aprLendingMin;
        _aprLendingMax = aprLendingMax;
        return true;
    }

    function getBorrowingApr (
        uint256 borrowingProfileIndex
    ) public view returns (uint256) {
        if (_borrowingProfiles[borrowingProfileIndex].totalLent == 0) return 0;
        uint256 borrowingPercentage = _borrowingProfiles[borrowingProfileIndex].totalBorrowed
            * _SHIFT_4
            / _borrowingProfiles[borrowingProfileIndex].totalLent;
        if (borrowingPercentage > 9500) return _aprBorrowingMax;
        return _aprBorrowingMin + (
            borrowingPercentage * (_aprBorrowingMax - _aprBorrowingMin) / 9500
        );
    }

    function getLendingApr (uint256 borrowingProfileIndex) public view returns (uint256) {
        uint256 lendingApr = _aprLendingMin;
        if (_borrowingProfiles[borrowingProfileIndex].totalLent > 0) {
            uint256 borrowingPercentage = _borrowingProfiles[borrowingProfileIndex].totalBorrowed
                * _SHIFT_4
                / _borrowingProfiles[borrowingProfileIndex].totalLent;
            if (borrowingPercentage < 9500) {
                lendingApr = _aprLendingMin + (
                    borrowingPercentage * (_aprLendingMax - _aprLendingMin) / 9500
                );
            }
        }
        return lendingApr;
    }

    function updateMarketingIndexes () external onlyManager returns (bool) {
        for (uint256 i = 1; i <= _borrowingProfilesNumber; i ++) {
            _proceedMarketingIndexes(i);
        }
        return true;
    }
}