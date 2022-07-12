// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import './MarketingIndexes.sol';

/**
 * @dev Implementation of the lending treating functional,
 * functions names are self explanatory
 */
contract Lending is MarketingIndexes {
    function lend (
        uint256 borrowingProfileIndex, uint256 amount
    ) external returns (bool) {
        require(borrowingProfileIndex > 0 && borrowingProfileIndex <= _borrowingProfilesNumber,
            '42');
        if (!_isUser[msg.sender]) {
            _totalUsers ++;
            _isUser[msg.sender] = true;
        }

        _proceedMarketingIndexes(borrowingProfileIndex);
        uint256 lendingIndex;
        if (_usersLendingIndexes[msg.sender][borrowingProfileIndex] == 0) {
            _lendingsNumber ++;
            lendingIndex = _lendingsNumber;
            _lendings[lendingIndex] = Lending({
                userAddress: msg.sender,
                borrowingProfileIndex: borrowingProfileIndex,
                amount: amount,
                unlock: block.timestamp + _lockTime,
                lastMarketIndex: _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex,
                updatedAt: block.timestamp,
                accumulatedYield: 0
            });

            _usersLendingIndexes[msg.sender][borrowingProfileIndex] = _lendingsNumber;
        } else {
            lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
            _updateLendingYield(lendingIndex);
            _addToLending(lendingIndex, borrowingProfileIndex, amount);
        }
        _borrowingProfiles[borrowingProfileIndex].totalLent += amount;
        if (address(_rewardContract) != address(0)) {
            uint256 rate = getUsdRate(_borrowingProfiles[borrowingProfileIndex].contractAddress, false);
            _rewardContract.updateRewardData(
                msg.sender,
                borrowingProfileIndex,
                _lendings[lendingIndex].amount
                    * rate
                    / _SHIFT_18,
                _borrowingProfiles[borrowingProfileIndex].totalLent
                    * rate
                    / _SHIFT_18
            );
        }
        _takeAsset(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    /**
     * @dev Lend accumulated yield to the contract
     */
    function compound (uint256 borrowingProfileIndex) external returns (bool) {
        require(borrowingProfileIndex > 0 && borrowingProfileIndex <= _borrowingProfilesNumber,
            '42');
        uint256 lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
        require(lendingIndex > 0, '44');

        _proceedMarketingIndexes(borrowingProfileIndex);
        _updateLendingYield(lendingIndex);

        uint256 yield = _lendings[lendingIndex].accumulatedYield;
        _lendings[lendingIndex].accumulatedYield = 0;
        _addToLending(lendingIndex, borrowingProfileIndex, yield);
        _borrowingProfiles[borrowingProfileIndex].totalLent += yield;
        if (address(_rewardContract) != address(0)) {
            uint256 rate = getUsdRate(_borrowingProfiles[borrowingProfileIndex].contractAddress, false);
            _rewardContract.updateRewardData(
                msg.sender,
                borrowingProfileIndex,
                _lendings[lendingIndex].amount
                    * rate
                    / _SHIFT_18,
                _borrowingProfiles[borrowingProfileIndex].totalLent
                    * rate
                    / _SHIFT_18
            );
        }
        return true;
    }

    function withdrawLending (
        uint256 borrowingProfileIndex, uint256 amount
    ) external returns (bool) {
        require(borrowingProfileIndex > 0 && borrowingProfileIndex <= _borrowingProfilesNumber,
            '42');
        uint256 lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
        require(lendingIndex > 0, '44');

        require(_borrowingProfiles[borrowingProfileIndex].contractAddress != address(0),
            '45');
        require(amount > 0, '46');
        _proceedMarketingIndexes(borrowingProfileIndex);
        _updateLendingYield(lendingIndex);
        require(_lendings[lendingIndex].amount >= amount, '47');
        if (_borrowingProfiles[borrowingProfileIndex].totalLent == amount) {
            require(
                _borrowingProfiles[borrowingProfileIndex].totalBorrowed == 0,
                    '47.1'
            );
        } else {
            require(
                _borrowingProfiles[borrowingProfileIndex].totalBorrowed * _SHIFT_4
                    / (_borrowingProfiles[borrowingProfileIndex].totalLent - amount)
                        <= 9500,
                            '47.1'
            );
        }
        _lendings[lendingIndex].amount -= amount;
        _borrowingProfiles[borrowingProfileIndex].totalLent -= amount;
        if (address(_rewardContract) != address(0)) {
            uint256 rate = getUsdRate(_borrowingProfiles[borrowingProfileIndex].contractAddress, false);
            _rewardContract.updateRewardData(
                msg.sender,
                borrowingProfileIndex,
                _lendings[lendingIndex].amount
                    * rate
                    / _SHIFT_18,
                _borrowingProfiles[borrowingProfileIndex].totalLent
                    * rate
                    / _SHIFT_18
            );
        }
        _sendAsset(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    function withdrawLendingYield (
        uint256 borrowingProfileIndex, uint256 amount
    ) external returns (bool) {
        uint256 lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
        require(lendingIndex > 0, '49');

        require(_borrowingProfiles[borrowingProfileIndex].contractAddress != address(0),
            '50');
        require(amount > 0, '51');
        _proceedMarketingIndexes(borrowingProfileIndex);
        _updateLendingYield(lendingIndex);
        require(_lendings[lendingIndex].accumulatedYield >= amount, '52');

        _lendings[lendingIndex].accumulatedYield -= amount;

        _sendAsset(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    function _addToLending (
        uint256 lendingIndex,
        uint256 borrowingProfileIndex,
        uint256 amount
    ) internal returns (bool) {
        _lendings[lendingIndex].amount += amount;
        if (_lendings[lendingIndex].unlock > block.timestamp){
            _lendings[lendingIndex].unlock = block.timestamp + _lockTime;
        }
        _lendings[lendingIndex].lastMarketIndex = _borrowingProfiles
            [borrowingProfileIndex].lendingMarketIndex;
        _lendings[lendingIndex].updatedAt = block.timestamp;
        return true;
    }

    function _updateLendingYield (
        uint256 lendingIndex
    ) internal returns (bool) {
        uint256 yield = _getLendingYield(lendingIndex);
        _lendings[lendingIndex].accumulatedYield += yield;
        _lendings[lendingIndex].updatedAt = block.timestamp;
        _lendings[lendingIndex].lastMarketIndex =
            _borrowingProfiles[_lendings[lendingIndex].borrowingProfileIndex].lendingMarketIndex;

        return true;
    }

    function getLendingYield (
        uint256 lendingIndex, bool addAccumulated
    ) external view returns (uint256) {
        uint256 lendingYield = _getLendingYield(lendingIndex);
        if (addAccumulated) lendingYield += _lendings[lendingIndex].accumulatedYield;
        return lendingYield;
    }

    function _getLendingYield (
        uint256 lendingIndex
    ) internal view returns (uint256) {
        uint256 borrowingProfileIndex = _lendings[lendingIndex].borrowingProfileIndex;
        uint256 marketIndex = _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex;

        uint256 extraPeriodStartTime =
            _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime;
        if (extraPeriodStartTime < _lendings[lendingIndex].updatedAt) {
            extraPeriodStartTime = _lendings[lendingIndex].updatedAt;
        }
        uint256 extraPeriod = block.timestamp - extraPeriodStartTime;

        if (extraPeriod > 0) {
            uint256 marketFactor = _SHIFT_18 +
                _SHIFT_18 * getLendingApr(borrowingProfileIndex)
                * extraPeriod / _SHIFT_4 / _YEAR;
            marketIndex = marketIndex * marketFactor / _SHIFT_18;
        }

        uint256 newAmount = _lendings[lendingIndex].amount
            * marketIndex
            / _lendings[lendingIndex].lastMarketIndex;

        return newAmount - _lendings[lendingIndex].amount;
    }

    function getTotalLent (
        uint256 borrowingProfileIndex
    ) external view returns (uint256) {
        if (
            !_borrowingProfiles[borrowingProfileIndex].active
        ) return 0;
        return _borrowingProfiles[borrowingProfileIndex].totalLent
            * getUsdRate(_borrowingProfiles[borrowingProfileIndex].contractAddress, false)
            / _SHIFT_18;
    }

    function getUserProfileLent (
        address userAddress, uint256 borrowingProfileIndex
    ) external view returns (uint256) {
        if (
            !_borrowingProfiles[borrowingProfileIndex].active
        ) return 0;
        return _lendings[
            _usersLendingIndexes[userAddress][borrowingProfileIndex]
        ].amount
            * getUsdRate(_borrowingProfiles[borrowingProfileIndex].contractAddress, false)
            / _SHIFT_18;
    }
}