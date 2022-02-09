// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import './storage.sol';

contract MarketingIndexes is Storage {
    function _proceedMarketingIndexes (
        uint256 borrowingProfileIndex
    ) internal returns (bool) {
        uint256 borrowingPeriod = block.timestamp
            - _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndexLastTime;
        uint256 borrowingMarketFactor = _marketIndexShift;
        if (_borrowingProfiles[borrowingProfileIndex].totalLent > 0) {
            borrowingMarketFactor += _marketIndexShift * _getBorrowingApr(borrowingProfileIndex)
            * borrowingPeriod / _percentShift / _year;
        }
        _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndex *= borrowingMarketFactor;
        _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndex /= _marketIndexShift;
        _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndexLastTime = block.timestamp;

        uint256 lendingPeriod = block.timestamp
            - _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime;
        uint256 lendingMarketFactor = _marketIndexShift + (
            _marketIndexShift * _getLendingApr(borrowingProfileIndex)
            * lendingPeriod / _percentShift / _year
        );

        _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex *= lendingMarketFactor;
        _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex /= _marketIndexShift;
        _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime = block.timestamp;

        return true;
    }

    function getBorrowingApr (
        uint256 borrowingProfileIndex
    ) external view returns (uint256) {
        return _getBorrowingApr(borrowingProfileIndex);
    }

    function _getBorrowingApr (
        uint256 borrowingProfileIndex
    ) internal view returns (uint256) {
        require(
            _borrowingProfiles[borrowingProfileIndex].totalLent > 0,
            'Borrowing apr can not be calculated when nothing is lent'
        );
        uint256 borrowingPercentage = _borrowingProfiles[borrowingProfileIndex].totalBorrowed
        * _percentShift
        / _borrowingProfiles[borrowingProfileIndex].totalLent;
        require(borrowingPercentage <= 9500,
            'Borrowing apr can not be calculated when not enough assets to borrow'
        );
        return _aprBorrowingMin + (
        borrowingPercentage * (_aprBorrowingMax - _aprBorrowingMin) / 9500
        );
    }

    function getLendingApr (
        uint256 borrowingProfileIndex
    ) external view returns (uint256) {
        return _getLendingApr(borrowingProfileIndex);
    }

    function _getLendingApr (uint256 borrowingProfileIndex) internal view returns (uint256) {
        uint256 lendingApr = _aprLendingMin;
        if (_borrowingProfiles[borrowingProfileIndex].totalLent > 0) {
            uint256 borrowingPercentage = _borrowingProfiles[borrowingProfileIndex].totalBorrowed
            * _percentShift
            / _borrowingProfiles[borrowingProfileIndex].totalLent;
            if (borrowingPercentage < 9500) {
                lendingApr = _aprLendingMin + (
                borrowingPercentage * (_aprLendingMax - _aprLendingMin) / 9500
                );
            }
        }
        return lendingApr;
    }
}