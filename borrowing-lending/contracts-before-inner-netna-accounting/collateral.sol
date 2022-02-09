// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';
import './storage.sol';
import './borrowing-fee.sol';

contract Collateral is Storage, BorrowingFee {
    function depositCollateral (
        uint256 collateralProfileIndex, uint256 amount
    ) external payable returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex
            <= _collateralProfilesNumber, 'Collateral profile is not found');
        require(_collateralProfiles[collateralProfileIndex].active,
            'Collateral profile is blocked');
        if (!_isUser[msg.sender]) {
            _totalUsers ++;
            _isUser[msg.sender] = true;
        }

        if (
            _collateralProfiles[collateralProfileIndex].contractAddress == address(0)
        ) {
            amount = msg.value;
            require(amount > 0, 'Message value should be greater than zero');
        } else {
            require(msg.value == 0, 'Message value should be zero for an ERC20 collateral');
            require(amount > 0, 'Amount should be greater than zero');
            _takeAsset(
                _collateralProfiles[collateralProfileIndex].contractAddress,
                msg.sender,
                amount
            );
        }
        _collateralProfiles[collateralProfileIndex].total += amount;
        uint256 collateralIndex = _usersCollateralIndexes[msg.sender][collateralProfileIndex];
        if (collateralIndex == 0 || _collaterals[collateralIndex].liquidated) {
            _addNewCollateral(msg.sender, collateralProfileIndex, amount, 0);
        } else {
            _collaterals[collateralIndex].amount += amount;
        }
        if (
            _liquidationTime[msg.sender] > 0 && !_userLiquidation(msg.sender, true)
        ) delete _liquidationTime[msg.sender];

        return true;
    }

    function withdrawCollateral (
        uint256 collateralProfileIndex, uint256 amount
    ) external returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex
            <= _collateralProfilesNumber, 'Collateral profile is not found');
        require(_collateralProfiles[collateralProfileIndex].active,
            'Collateral profile is blocked');
        require(_getAvailableCollateralAmount(msg.sender, collateralProfileIndex) >= amount,
            'Not enough available to withdraw collateral');

        _collateralProfiles[collateralProfileIndex].total -= amount;
        uint256 collateralIndex = _usersCollateralIndexes[msg.sender][collateralProfileIndex];
        require(!_collaterals[collateralIndex].liquidated, 'This collateral is liquidated');
        _collaterals[collateralIndex].amount -= amount;

        _sendAsset(
            _collateralProfiles[collateralProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    function withdrawWholeCollateral (
        uint256 collateralProfileIndex
    ) external returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex
            <= _collateralProfilesNumber, 'Collateral profile is not found');
        require(_collateralProfiles[collateralProfileIndex].active,
            'Collateral profile is blocked');
        uint256 amount = _getAvailableCollateralAmount(msg.sender, collateralProfileIndex);

        uint256 collateralIndex = _usersCollateralIndexes[msg.sender][collateralProfileIndex];
        require(!_collaterals[collateralIndex].liquidated, 'This collateral is liquidated');
        _collateralProfiles[collateralProfileIndex].total -= amount;
        _collaterals[collateralIndex].amount -= amount;

        _sendAsset(
            _collateralProfiles[collateralProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    function getCollateralIndex (
        address userAddress, uint256 collateralProfileIndex
    ) external view returns (uint256) {
        return _usersCollateralIndexes[userAddress][collateralProfileIndex];
    }

    function getCollateralAmount (
        uint256 collateralIndex
    ) external view returns (uint256) {
        return _getCollateralAmount(collateralIndex);
    }

    function _getCollateralAmount (
        uint256 collateralIndex
    ) internal view returns (uint256) {
        if (_collaterals[collateralIndex].liquidated) return 0;
        return _collaterals[collateralIndex].amount;
    }

    function getCollateralUsdAmount (
        uint256 collateralIndex
    ) external view returns (uint256) {
        return _getCollateralUsdAmount(collateralIndex);
    }

    function _getCollateralUsdAmount (
        uint256 collateralIndex
    ) internal view returns (uint256) {
        if (
            collateralIndex == 0 || _collaterals[collateralIndex].liquidated
        ) return 0;
        uint256 collateralProfileIndex = _collaterals[collateralIndex].collateralProfileIndex;
        return _collaterals[collateralIndex].amount
            * _collateralProfiles[collateralProfileIndex].usdRate;
    }

    function getDepositedCollateralUsdAmount (
        address userAddress
    ) external view returns (uint256) {
        uint256 depositedCollateralUsdAmount;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            if (!_collateralProfiles[i].active) continue;
            depositedCollateralUsdAmount += _getCollateralUsdAmount(
                _usersCollateralIndexes[userAddress][i]
            );
        }
        return depositedCollateralUsdAmount;
    }

    function getAvailableCollateralAmount (
        address userAddress, uint256 collateralProfileIndex
    ) external view returns (uint256) {
        return _getAvailableCollateralAmount(userAddress, collateralProfileIndex);
    }

    function _getAvailableCollateralAmount (
        address userAddress, uint256 collateralProfileIndex
    ) internal view returns (uint256) {
        if (!_collateralProfiles[collateralProfileIndex].active) return 0;
        uint256 borrowedUsdAmount = _getBorrowedUsdAmount(userAddress);

        uint256 collateralUsdAmount;
        uint256 availableCollateralUsdAmount;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            if (!_collateralProfiles[i].active) continue;
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            if (collateralIndex == 0) continue;
            uint256 amount = _collaterals[collateralIndex].amount
                * _collateralProfiles[i].usdRate * _collateralProfiles[i].borrowingFactor
                / _percentShift;
            collateralUsdAmount += amount;
            if (i == collateralProfileIndex) availableCollateralUsdAmount = amount;
        }

        if (collateralUsdAmount <= borrowedUsdAmount) return 0;
        uint256 diff = collateralUsdAmount - borrowedUsdAmount;

        if (availableCollateralUsdAmount > diff) availableCollateralUsdAmount = diff;

        return availableCollateralUsdAmount
            * _percentShift
            / _collateralProfiles[collateralProfileIndex].usdRate
            / _collateralProfiles[collateralProfileIndex].borrowingFactor;
    }

    function _addNewCollateral (
        address userAddress, uint256 collateralProfileIndex, uint256 amount, uint256 prevCollateral
    ) internal returns (bool) {
        _collateralsNumber ++;
        _collaterals[_collateralsNumber].userAddress = userAddress;
        _collaterals[_collateralsNumber].collateralProfileIndex = collateralProfileIndex;
        _collaterals[_collateralsNumber].amount = amount;
        _collaterals[_collateralsNumber].prevCollateral = prevCollateral;
        _usersCollateralIndexes[userAddress][collateralProfileIndex] = _collateralsNumber;

        return true;
    }
}