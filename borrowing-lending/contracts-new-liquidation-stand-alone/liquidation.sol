// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';

interface IBorrowLending {
    function setLiquidationTime (
        address userAddress, uint256 newTime,
        bool shouldBeZero, bool shouldNotBeZero
    ) external returns (bool);
    function setCollateralLiquidationStatus (
        uint256 collateralIndex, bool liquidated
    ) external returns (bool);
    function liquidateNEtna (
        uint256 liquidationUsdAmount
    ) external returns (bool);
    function addNewCollateral (
        address userAddress, uint256 collateralProfileIndex,
        uint256 amount, uint256 prevCollateral
    ) external returns (bool);
    function finalizeLiquidation (
        address contractAddress, address liquidatorAddress,
        uint256 collateralProfileIndex, uint256 toBeSent, uint256 liquidatorsPart
    ) external returns (bool);
    function updateBorrowingForLiquidation (
        uint256 borrowingIndex
    ) external view returns (bool);
    function userLiquidation (
        address userAddress, bool margin
    ) external view returns (bool);
    function isLiquidator (
        address userAddress
    ) external view returns (bool);
    function getLiquidationManager () external view returns (address);
    function getLiquidationPeriod () external view returns (uint256);
    function getBorrowingProfilesNumber () external view returns (uint256);
    function getCollateralProfilesNumber () external view returns (uint256);
    function getBorrowing (
        uint256 borrowingIndex
    ) external view returns (
        address userAddress, uint256 borrowingProfileIndex,
        uint256 amount, uint256 accumulatedFee, bool liquidated
    );
    function getBorrowingProfile (
        uint256 borrowingProfileIndex
    ) external view returns (
        address contractAddress, uint256 usdRate, uint256 totalBorrowed,
        uint256 totalLent, uint256 totalLiquidated,
        uint256 totalReturned, bool active
    );
    function getUsersBorrowingIndex (
        address userAddress, uint256 borrowingProfileIndex
    ) external view returns (uint256);
    function getBorrowingFee (
        uint256 borrowingIndex
    ) external view returns (uint256);
    function getUsersCollateralIndex (
        address userAddress, uint256 collateralProfileIndex
    ) external view returns (uint256);
    function getCollateral (
        uint256 collateralIndex
    ) external view returns (
        address userAddress, uint256 collateralProfileIndex,
        uint256 amount, uint256 prevCollateral, bool liquidated
    );
    function getCollateralProfile (
        uint256 collateralProfileIndex
    ) external view returns (
        address contractAddress, uint256 usdRate, uint256 borrowingFactor,
        uint256 liquidationFactor, uint256 total, uint8 collateralType, bool active
    );
    function getLiquidationFee () external view returns (uint256);
    function getLiquidatorPercentage () external view returns (uint256);
    function isManager (
        address userAddress
    ) external view returns (bool);
    function getLiquidationTime (
        address userAddress
    ) external view returns (uint256);
    function liquidateBorrowings(
        address userAddress
    ) external returns (uint256);
}

contract Liquidation {
    /**
     * Error messages:
     * 1 - Caller is not the liquidation manager
     * 2 - Caller is not the liquidator
     * 3 - borrowLendingContractAddress should not be zero
     * 4 - Liquidation requirements is not met
     * 5 - User is at liquidation
     * 6 - User was not flagged for a liquidation
     * 7 - Liquidation period is not over yet
     * 8 - Liquidation requirements is not met
     * 9 - Caller is not the manager
     * 10 - Nothing to liquidate
     */

    modifier onlyLiquidationManager() {
        require(
            _borrowLendingContract.getLiquidationManager() == msg.sender, '1'
        );
        _;
    }
    modifier onlyLiquidator() {
        require(
            _borrowLendingContract.isLiquidator(msg.sender), '2'
        );
        _;
    }
    modifier onlyManager() {
        require(
            _borrowLendingContract.isManager(msg.sender), '9'
        );
        _;
    }

    event CollateralLiquidation (
        address indexed userAddress, address indexed liquidatorAddress,
        uint256 collateralIndex, uint256 timestamp
    );

    struct LiquidationData {
        uint8 collateralType;
        uint256 collateralIndex;
        uint256 amount;
        uint256 usdRate;
        address contractAddress;
    }

    uint256 _percentShift = 10000; // percents exponent shifting when calculation with decimals
    IBorrowLending _borrowLendingContract;

    constructor (address borrowLendingContractAddress) {
        require(borrowLendingContractAddress != address(0), '3');
        _borrowLendingContract = IBorrowLending(borrowLendingContractAddress);
    }

    function addFlagForLiquidation (
        address userAddress
    ) external onlyLiquidationManager returns (bool) {
        require(_borrowLendingContract.userLiquidation(userAddress, false), '4');
        _borrowLendingContract.setLiquidationTime(
            userAddress,
            block.timestamp + _borrowLendingContract.getLiquidationPeriod(),
            true, false
        );
        return true;
    }

    function removeFlagForLiquidation (
        address userAddress
    ) external onlyLiquidationManager returns (bool) {
        require(!_borrowLendingContract.userLiquidation(userAddress, true), '5');
        _borrowLendingContract.setLiquidationTime(
            userAddress, 0, false, true
        );
        return true;
    }

    function liquidate (
        address userAddress
    ) external onlyLiquidator returns (uint256) {
        uint256 liquidationTime = _borrowLendingContract
            .getLiquidationTime(userAddress);
        uint256 collateralProfilesNumber = _borrowLendingContract
            .getCollateralProfilesNumber();
        require(liquidationTime > 0, '6');
        require(liquidationTime < block.timestamp, '7');

        LiquidationData[] memory liquidationData =
            new LiquidationData[](collateralProfilesNumber);

        uint256[] memory collateralIndexes = new uint256[](4);
        uint256[] memory erc20CollateralIndexes =
            new uint256[](collateralProfilesNumber);
        uint256 erc20CollateralsNumber;

        uint256 borrowedUsdAmount = _borrowLendingContract.liquidateBorrowings(userAddress);
        require(borrowedUsdAmount > 0, '10');

        uint256 collateralUsdAmount;
        for (uint256 i = 1; i <= collateralProfilesNumber; i ++) {
            uint256 collateralIndex =
                _borrowLendingContract.getUsersCollateralIndex(userAddress, i);
            if (collateralIndex == 0) continue;
            (,, uint256 amount,, bool liquidated) =
                _borrowLendingContract.getCollateral(collateralIndex);
            if (liquidated || amount == 0) continue;
            (address contractAddress, uint256 usdRate,, uint256 liquidationFactor,, uint8 collateralType,) =
                _borrowLendingContract.getCollateralProfile(i);
            
            liquidationData[i - 1] = LiquidationData({
                collateralType: collateralType,
                collateralIndex: collateralIndex,
                amount: amount,
                usdRate: usdRate,
                contractAddress: contractAddress
            });

            if (collateralType != 1) {
                collateralIndexes[collateralType] = i;
            } else {
                erc20CollateralIndexes[erc20CollateralsNumber] = i;
                erc20CollateralsNumber ++;
            }
            collateralUsdAmount += amount
                * usdRate * _percentShift
                / (_percentShift + liquidationFactor);
        }
        require(
            borrowedUsdAmount > 0 && collateralUsdAmount <= borrowedUsdAmount,
            '8'
        );
        uint256 liquidationUsdAmount = borrowedUsdAmount * (
            _percentShift + _borrowLendingContract.getLiquidationFee()
        ) / _percentShift;

        if (collateralIndexes[0] > 0) {
            liquidationUsdAmount = _proceedCollateralLiquidation(
                userAddress,
                liquidationData[collateralIndexes[0] - 1].contractAddress,
                liquidationData[collateralIndexes[0] - 1].collateralIndex,
                collateralIndexes[0],
                liquidationData[collateralIndexes[0] - 1].amount,
                liquidationData[collateralIndexes[0] - 1].usdRate,
                liquidationUsdAmount
            );
        }
        if (liquidationUsdAmount > 0 && erc20CollateralsNumber > 0) {
            for (uint256 i = 0; i < erc20CollateralsNumber; i ++) {
                if (erc20CollateralIndexes[i] == 0) continue;
                if (liquidationUsdAmount == 0) break;
                liquidationUsdAmount = _proceedCollateralLiquidation(
                    userAddress,
                    liquidationData[erc20CollateralIndexes[i] - 1].contractAddress,
                    liquidationData[erc20CollateralIndexes[i] - 1].collateralIndex,
                    erc20CollateralIndexes[i],
                    liquidationData[erc20CollateralIndexes[i] - 1].amount,
                    liquidationData[erc20CollateralIndexes[i] - 1].usdRate,
                    liquidationUsdAmount
                );
            }
        }
        if (liquidationUsdAmount > 0 && collateralIndexes[2] > 0) {
            liquidationUsdAmount = _proceedCollateralLiquidation(
                userAddress,
                liquidationData[collateralIndexes[2] - 1].contractAddress,
                liquidationData[collateralIndexes[2] - 1].collateralIndex,
                collateralIndexes[2],
                liquidationData[collateralIndexes[2] - 1].amount,
                liquidationData[collateralIndexes[2] - 1].usdRate,
                liquidationUsdAmount
            );
        }

        if (liquidationUsdAmount > 0 && collateralIndexes[3] > 0) {
            _borrowLendingContract.setCollateralLiquidationStatus(collateralIndexes[3], true);
            _borrowLendingContract.liquidateNEtna(liquidationUsdAmount);

            liquidationUsdAmount = 0;
        }
        _borrowLendingContract.setLiquidationTime(
            userAddress, 0, false, false
        );

        return liquidationUsdAmount;
    }

    function _proceedCollateralLiquidation (
        address userAddress,
        address contractAddress,
        uint256 collateralIndex,
        uint256 collateralProfileIndex,
        uint256 amount,
        uint256 usdRate,
        uint256 liquidationUsdAmount
    ) internal returns (uint256) {
        uint256 toBeSent;
        uint256 liquidatorsPart;
        uint256 liquidationAmount = liquidationUsdAmount / usdRate;

        _borrowLendingContract.setCollateralLiquidationStatus(collateralIndex, true);

        if (liquidationAmount >= amount) {
            toBeSent = amount;
            liquidationUsdAmount -= toBeSent * usdRate;
        } else {
            _borrowLendingContract.addNewCollateral(
                userAddress, collateralProfileIndex,
                amount - liquidationAmount, collateralIndex
            );
            toBeSent = amount;
            liquidationUsdAmount = 0;
        }
        liquidatorsPart = toBeSent
            * _borrowLendingContract.getLiquidatorPercentage()
            / _percentShift;
        _borrowLendingContract.finalizeLiquidation(
            contractAddress, msg.sender,
            collateralProfileIndex, toBeSent, liquidatorsPart
        );

        emit CollateralLiquidation(
            userAddress, msg.sender, collateralIndex, block.timestamp
        );

        return liquidationUsdAmount;
    }

    function setBorrowLendingContract (
        address borrowLendingContractAddress
    ) external onlyManager returns (bool) {
        require(borrowLendingContractAddress != address(0), '1');
        _borrowLendingContract = IBorrowLending(borrowLendingContractAddress);
        return true;
    }

    function getBorrowLendingContract () external view returns (address) {
        return address(_borrowLendingContract);
    }
}