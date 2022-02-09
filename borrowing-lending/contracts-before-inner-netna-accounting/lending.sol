// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './marketing-indexes.sol';

contract Lending is MarketingIndexes {
    function lend (
        uint256 borrowingProfileIndex, uint256 amount
    ) external returns (bool) {
        require(_liquidationTime[msg.sender] == 0,
            'Message sender is flagged for liquidation');
        require(borrowingProfileIndex > 0 && borrowingProfileIndex <= _borrowingProfilesNumber,
            'Borrowing profile is not found');
        if (!_isUser[msg.sender]) {
            _totalUsers ++;
            _isUser[msg.sender] = true;
        }

        _proceedMarketingIndexes(borrowingProfileIndex);

        if (_usersLendingIndexes[msg.sender][borrowingProfileIndex] == 0) {
            _lendingsNumber ++;
            _lendings[_lendingsNumber] = Lending({
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
            uint256 lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
            _updateLendingYield(lendingIndex);
            _lendings[lendingIndex].amount += amount;
            if (_lendings[lendingIndex].unlock > block.timestamp){
                _lendings[lendingIndex].unlock = block.timestamp + _lockTime;
            }
            _lendings[lendingIndex].lastMarketIndex = _borrowingProfiles
                [borrowingProfileIndex].lendingMarketIndex;
            _lendings[lendingIndex].updatedAt = block.timestamp;
        }
        _borrowingProfiles[borrowingProfileIndex].totalLent += amount;

        _takeAsset(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    function withdrawLending (
        uint256 borrowingProfileIndex, uint256 amount
    ) external returns (bool) {
        require(_liquidationTime[msg.sender] == 0,
            'Message sender is flagged for liquidation');
        uint256 lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
        require(lendingIndex > 0, 'Lending is not found');

        require(_borrowingProfiles[borrowingProfileIndex].contractAddress != address(0),
            'Borrowing profile is not found');
        require(amount > 0, 'Amount should be greater than zero');
        _proceedMarketingIndexes(borrowingProfileIndex);
        _updateLendingYield(lendingIndex);
        require(_lendings[lendingIndex].amount >= amount, 'Not enough lending amount');

        _lendings[lendingIndex].amount -= amount;
        _borrowingProfiles[borrowingProfileIndex].totalLent -= amount;

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
        require(_liquidationTime[msg.sender] == 0,
            'Message sender is flagged for liquidation');
        uint256 lendingIndex = _usersLendingIndexes[msg.sender][borrowingProfileIndex];
        require(lendingIndex > 0, 'Lending is not found');

        require(_borrowingProfiles[borrowingProfileIndex].contractAddress != address(0),
            'Borrowing profile is not found');
        require(amount > 0, 'Amount should be greater than zero');
        _updateLendingYield(lendingIndex);
        require(_lendings[lendingIndex].accumulatedYield >= amount, 'Not enough yield');

        _lendings[lendingIndex].accumulatedYield -= amount;

        _sendAsset(
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    // internal functions
    function _updateLendingYield (uint256 lendingIndex) internal returns (bool) {
        uint256 yield = _getLendingYield(lendingIndex);
        _lendings[lendingIndex].accumulatedYield += yield;
        _lendings[lendingIndex].updatedAt = block.timestamp;
        _lendings[lendingIndex].lastMarketIndex =
            _borrowingProfiles[_lendings[lendingIndex].borrowingProfileIndex].lendingMarketIndex;

        return true;
    }

    // view functions
    function getLendingYield (uint256 lendingIndex) external view returns (uint256) {
        return _getLendingYield(lendingIndex) + _lendings[lendingIndex].accumulatedYield;
    }

    // internal view functions
    function _getLendingYield (uint256 lendingIndex) internal view returns (uint256) {
        uint256 borrowingProfileIndex = _lendings[lendingIndex].borrowingProfileIndex;

        uint256 marketIndex = _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex;

        uint256 extraPeriodStartTime =
            _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime;
        if (extraPeriodStartTime < _lendings[lendingIndex].updatedAt) {
            extraPeriodStartTime = _lendings[lendingIndex].updatedAt;
        }
        uint256 extraPeriod = block.timestamp - extraPeriodStartTime;

        if (extraPeriod > 0) {
            uint256 marketFactor = _marketIndexShift +
                _marketIndexShift * _getLendingApr(borrowingProfileIndex)
                * extraPeriod / _percentShift / _year;
            marketIndex = marketIndex * marketFactor / _marketIndexShift;
        }

        uint256 newAmount = _lendings[lendingIndex].amount
            * marketIndex
            / _lendings[lendingIndex].lastMarketIndex;

        return newAmount - _lendings[lendingIndex].amount;
    }
}