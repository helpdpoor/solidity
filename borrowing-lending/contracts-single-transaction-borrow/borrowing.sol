// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './marketing-indexes.sol';

contract Borrowing is MarketingIndexes {
    function borrow (
        uint256 borrowingProfileIndex, uint256 collateralProfileIndex, uint256 amount,
        bool isFixedApr
    ) external returns (bool) {
        require(_usersBorrowingsAtLiquidation[msg.sender] == 0,
            'Message sender has borrowings flagged for liquidation');
        require(borrowingProfileIndex > 0 && borrowingProfileIndex
            <= _borrowingProfilesNumber, 'Borrowing profile is not found');
        require(collateralProfileIndex > 0 && collateralProfileIndex
            <= _collateralProfilesNumber, 'Collateral profile is not found');
        require(_borrowingProfiles[borrowingProfileIndex].totalLent > 0,
            'No assets to borrow');
        require(
            _borrowingProfiles[borrowingProfileIndex].totalBorrowed
            * _percentShift
            / _borrowingProfiles[borrowingProfileIndex].totalLent <= 9500,
            'Not enough assets to borrow'
        );

        uint256 collateralAmount = _getCollateralAmount(
            borrowingProfileIndex, collateralProfileIndex, amount
        );

        require(_takeToken(
            _collateralProfiles[collateralProfileIndex].contractAddress,
            msg.sender,
            collateralAmount
        ), 'Collateral sending error');

        _proceedMarketingIndexes(borrowingProfileIndex);

        uint256 fixedApr;
        if (isFixedApr) {
            fixedApr += _aprBorrowingFix;
            fixedApr += _getBorrowingApr(borrowingProfileIndex);
        }

        _borrowingProfiles[borrowingProfileIndex].totalBorrowed += amount;
        _collateralProfiles[collateralProfileIndex].total += collateralAmount;

        if (
            _usersBorrowingIndexes[msg.sender][borrowingProfileIndex]
                [collateralProfileIndex] == 0
        ) {
            _borrowingsNumber ++;
            _borrowings[_borrowingsNumber] = Borrowing({
                userAddress: msg.sender,
                borrowingProfileIndex: borrowingProfileIndex,
                collateralIndex: collateralProfileIndex,
                amount: amount,
                lastMarketIndex: _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndex,
                updatedAt: block.timestamp,
                accumulatedFee: 0,
                fixedApr: fixedApr
            });
            _collateralsNumber ++;
            _collaterals[_collateralsNumber] = Collateral({
                collateralProfileIndex: collateralProfileIndex,
                borrowingIndex: _borrowingsNumber,
                amount: collateralAmount
            });
            _usersBorrowingIndexes[msg.sender][borrowingProfileIndex]
                [collateralProfileIndex] = _borrowingsNumber;
            _collateralIndexes[_borrowingsNumber] = _collateralsNumber;
        } else {
            uint256 borrowingIndex = _usersBorrowingIndexes[msg.sender][borrowingProfileIndex]
                [collateralProfileIndex];
            uint256 collateralIndex = _collateralIndexes[borrowingIndex];
            _updateBorrowingFee(borrowingIndex);
            _borrowings[borrowingIndex].amount += amount;
            _borrowings[borrowingIndex].lastMarketIndex = _borrowingProfiles
                [borrowingProfileIndex].borrowingMarketIndex;
            _borrowings[borrowingIndex].updatedAt = block.timestamp;
            _collaterals[collateralIndex].amount += collateralAmount;
        }

        require(_sendToken(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        ), 'Borrowing sending error');

        return true;
    }

    function returnBorrowing (
        uint256 borrowingIndex, uint256 amount
    ) external returns (bool) {
        require(borrowingIndex > 0 && borrowingIndex
            <= _borrowingsNumber, 'Borrowing is not found');
        require(_borrowings[borrowingIndex].amount >= amount,
            'Amount can not be greater than borrowing amount');
        uint256 borrowingProfileIndex = _borrowings[borrowingIndex].borrowingProfileIndex;

        _proceedMarketingIndexes(borrowingProfileIndex);
        require(_takeToken(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        ), 'Borrowing sending error');

        _updateBorrowingFee(borrowingIndex);
        _borrowingProfiles[borrowingProfileIndex].totalBorrowed -= amount;
        _borrowings[borrowingIndex].amount -= amount;

        uint256 collateralAmount = _collaterals
            [_borrowings[borrowingIndex].collateralIndex].amount;
        uint256 collateralProfileIndex = _collaterals
            [_borrowings[borrowingIndex].collateralIndex].collateralProfileIndex;

        if (_borrowings[borrowingIndex].amount > 0) {
            uint256 remainingCollateralAmount = _getCollateralAmount(
                borrowingProfileIndex, collateralProfileIndex,
                _borrowings[borrowingIndex].amount
            );

            if (collateralAmount > remainingCollateralAmount) {
                collateralAmount -= remainingCollateralAmount;
            } else {
                collateralAmount = 0;
            }
        }

        if (collateralAmount > 0) {
            _collaterals
                [_borrowings[borrowingIndex].collateralIndex].amount -= collateralAmount;
            _collateralProfiles[collateralProfileIndex].total -= collateralAmount;
            require(_sendToken(
                _collateralProfiles[collateralProfileIndex].contractAddress,
                msg.sender,
                collateralAmount
            ), 'Collateral sending error');
        }
        return true;
    }

    function addCollateral (
        uint256 borrowingProfileIndex, uint256 collateralProfileIndex,
        uint256 collateralAmount
    ) external returns (bool) {
        uint256 borrowingIndex = _usersBorrowingIndexes[msg.sender][borrowingProfileIndex]
            [collateralProfileIndex];
        uint256 collateralIndex = _collateralIndexes[borrowingIndex];
        require(_takeToken(
                _collateralProfiles[collateralProfileIndex].contractAddress,
                msg.sender,
                collateralAmount
            ), 'Collateral sending error');

        _collaterals[collateralIndex].amount += collateralAmount;
        _collateralProfiles[collateralProfileIndex].total += collateralAmount;
        return true;
    }

    // internal functions
    function _updateBorrowingFee (uint256 borrowingIndex) internal returns (bool) {
        uint256 fee = _getBorrowingFee(borrowingIndex);
        _borrowings[borrowingIndex].accumulatedFee += fee;
        _borrowings[borrowingIndex].updatedAt = block.timestamp;
        _borrowings[borrowingIndex].lastMarketIndex =
            _borrowingProfiles[_borrowings[borrowingIndex].borrowingProfileIndex]
            .borrowingMarketIndex;

        return true;
    }

    function getBorrowingFee (uint256 borrowingIndex) external view returns (uint256) {
        return _getBorrowingFee(borrowingIndex);
    }

    function _getBorrowingFee (uint256 borrowingIndex) internal view returns (uint256) {
        if (borrowingIndex == 0 || borrowingIndex
            > _borrowingsNumber) return 0;
        uint256 collateralIndex = _borrowings[borrowingIndex].collateralIndex;
        uint256 collateralProfileIndex = _collaterals[collateralIndex].collateralProfileIndex;
        if (_collateralProfiles[collateralProfileIndex].noFee) return 0;
        if (_borrowings[borrowingIndex].fixedApr > 0) {
            return _getFixedFee(borrowingIndex);
        } else {
            return _getDynamicFee(borrowingIndex);
        }
    }

    function _getFixedFee (uint256 borrowingIndex) internal view returns (uint256) {
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
                _marketIndexShift * _getBorrowingApr(
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

    function getCollateralAmount (
        uint256 borrowingProfileIndex, uint256 collateralProfileIndex, uint256 amount
    ) external view returns (uint256) {
        return _getCollateralAmount(borrowingProfileIndex, collateralProfileIndex, amount);
    }

    function _getCollateralAmount (
        uint256 borrowingProfileIndex, uint256 collateralProfileIndex, uint256 amount
    ) internal view returns (uint256) {
        uint256 collateralAmount = amount
            * _borrowingProfiles[borrowingProfileIndex].usdRate
            * _percentShift
            / _collateralProfiles[collateralProfileIndex].usdRate
            / _collateralProfiles[collateralProfileIndex].borrowingFactor;

        return collateralAmount;
    }
}