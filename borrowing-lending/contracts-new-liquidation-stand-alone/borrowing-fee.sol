// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './marketing-indexes.sol';

contract BorrowingFee is MarketingIndexes {
    // view functions
    function getBorrowedUsdAmount (address userAddress) public view returns (uint256) {
        uint256 borrowedUsdAmount;
        for (uint256 i = 1; i <= _borrowingProfilesNumber; i ++) {
            uint256 borrowingIndex = _usersBorrowingIndexes[userAddress][i];
            borrowedUsdAmount += getBorrowingUsdAmount(borrowingIndex);
        }

        return borrowedUsdAmount;
    }

    function getBorrowingUsdAmount (uint256 borrowingIndex) public view returns (uint256) {
        if (
            borrowingIndex == 0 || _borrowings[borrowingIndex].liquidated
            || _borrowings[borrowingIndex].amount == 0
        ) return 0;
        uint256 borrowingProfileIndex = _borrowings[borrowingIndex].borrowingProfileIndex;

        return (
            _borrowings[borrowingIndex].amount + _borrowings[borrowingIndex].accumulatedFee
            + getBorrowingFee(borrowingIndex)
        ) * _borrowingProfiles[borrowingProfileIndex].usdRate;
    }

    function userLiquidation (
        address userAddress, bool margin
    ) public view returns (bool) {
        uint256 borrowedUsdAmount = getBorrowedUsdAmount(userAddress);
        if (borrowedUsdAmount == 0) return false;
        uint256 collateralLiquidationUsdAmount;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                collateralIndex == 0 || _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            uint256 factor = _percentShift + _collateralProfiles[i].liquidationFactor;
            if (margin) factor += _liquidationFlagMargin;
            collateralLiquidationUsdAmount += _collaterals[collateralIndex].amount
                * _collateralProfiles[i].usdRate * _percentShift / factor;
        }

        return collateralLiquidationUsdAmount <= borrowedUsdAmount;
    }

    function _updateBorrowingFee (uint256 borrowingIndex) internal returns (bool) {
        if (_borrowings[borrowingIndex].liquidated) return false;
        uint256 fee = getBorrowingFee(borrowingIndex);
        _borrowings[borrowingIndex].accumulatedFee += fee;
        _borrowings[borrowingIndex].updatedAt = block.timestamp;
        _borrowings[borrowingIndex].lastMarketIndex =
            _borrowingProfiles[_borrowings[borrowingIndex].borrowingProfileIndex]
            .borrowingMarketIndex;
        return true;
    }

    function getBorrowingFee (uint256 borrowingIndex) public view returns (uint256) {
        if (
            borrowingIndex == 0 || borrowingIndex > _borrowingsNumber
            || _borrowings[borrowingIndex].liquidated
        ) return 0;

        uint256 totalCollateralUsdAmount;
        uint256 feeCollateralUsdAmount;
        address userAddress = _borrowings[borrowingIndex].userAddress;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                collateralIndex == 0 || _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            totalCollateralUsdAmount += _collaterals[collateralIndex].amount
                * _collateralProfiles[i].usdRate;
            if (!_noFee[_collateralProfiles[i].collateralType]) {
                feeCollateralUsdAmount += _collaterals[collateralIndex].amount
                    * _collateralProfiles[i].usdRate;
            }
        }
        if (feeCollateralUsdAmount == 0) return 0;

        if (_borrowings[borrowingIndex].fixedApr > 0) {
            return _getFixedFee(borrowingIndex) * feeCollateralUsdAmount
                / totalCollateralUsdAmount;
        } else {
            return _getDynamicFee(borrowingIndex) * feeCollateralUsdAmount
                / totalCollateralUsdAmount;
        }
    }

    function _getFixedFee (uint256 borrowingIndex) internal view returns (uint256) {
        if (_borrowings[borrowingIndex].liquidated) return 0;
        uint256 period = block.timestamp - _borrowings[borrowingIndex].updatedAt;
        uint256 fee = _borrowings[borrowingIndex].amount
            * _borrowings[borrowingIndex].fixedApr
            * period
            / _marketIndexShift
            / _year;
        return fee;
    }

    function _getDynamicFee (
        uint256 borrowingIndex
    ) internal view returns (uint256) {
        if (_borrowings[borrowingIndex].liquidated) return 0;
        uint256 profileIndex = _borrowings[borrowingIndex].borrowingProfileIndex;
        uint256 marketIndex = _borrowingProfiles[profileIndex].borrowingMarketIndex;
        uint256 extraPeriodStartTime =
            _borrowingProfiles[profileIndex].borrowingMarketIndexLastTime;
        if (extraPeriodStartTime < _borrowings[borrowingIndex].updatedAt) {
            extraPeriodStartTime = _borrowings[borrowingIndex].updatedAt;
        }
        uint256 extraPeriod = block.timestamp - extraPeriodStartTime;

        if (extraPeriod > 0) {
            uint256 marketFactor = _marketIndexShift +
                _marketIndexShift * getBorrowingApr(
                    _borrowings[borrowingIndex].borrowingProfileIndex
                )
                * extraPeriod / _percentShift / _year;
            marketIndex = marketIndex * marketFactor / _marketIndexShift;
        }

        uint256 newAmount = _borrowings[borrowingIndex].amount
            * marketIndex
            / _borrowings[borrowingIndex].lastMarketIndex;

        return newAmount - _borrowings[borrowingIndex].amount;
    }
}