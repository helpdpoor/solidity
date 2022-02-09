// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import './ownable.sol';
import './utils.sol';

contract Storage is Ownable, Utils {
    modifier onlyManager() {
        require(_managers[_msgSender()], "caller is not the manager");
        _;
    }
    modifier onlyLiquidator() {
        require(_liquidators[_msgSender()], "caller is not the liquidator");
        _;
    }

    struct BorrowingProfile {
        address contractAddress;
        uint256 usdRate; // *= 10000
        uint256 borrowingMarketIndex;
        uint256 borrowingMarketIndexLastTime;
        uint256 lendingMarketIndex;
        uint256 lendingMarketIndexLastTime;
        uint256 totalBorrowed;
        uint256 totalLent;
        bool active;
    }
    struct CollateralProfile {
        address contractAddress;
        uint256 usdRate; // *= 10000
        uint256 borrowingFactor;
        uint256 liquidationFactor;
        uint256 total;
        bool noFee;
        bool active;
    }
    struct Borrowing {
        address userAddress;
        uint256 borrowingProfileIndex;
        uint256 collateralIndex;
        uint256 amount;
        uint256 lastMarketIndex;
        uint256 updatedAt; // timestamp, is resettled to block.timestamp when changed
        uint256 accumulatedFee; // used to store fee when changed
        uint256 fixedApr;
    }
    struct Collateral {
        uint256 collateralProfileIndex;
        uint256 borrowingIndex;
        uint256 amount;
    }
    struct Lending {
        address userAddress;
        uint256 borrowingProfileIndex;
        uint256 amount;
        uint256 unlock;
        uint256 lastMarketIndex;
        uint256 updatedAt; // timestamp, is resettled to block.timestamp when changed
        uint256 accumulatedYield; // used to store reward when changed
    }
    struct Liquidation {
        address userAddress;
        address liquidatorAddress;
        uint256 borrowingIndex;
    }
    mapping (uint256 => BorrowingProfile) _borrowingProfiles;
    mapping (uint256 => CollateralProfile) _collateralProfiles;
    mapping (uint256 => Borrowing) _borrowings;
    mapping (uint256 => Lending) _lendings;
    mapping (uint256 => Collateral) _collaterals;
    mapping (uint256 => Liquidation) _liquidations;
    mapping (uint256 => bool) _borrowingAtLiquidation; // borrowingIndex => is at liquidation
    mapping (address => uint256) _usersBorrowingsAtLiquidation;
    mapping (address => bool) _liquidators;
    mapping (address => bool) _managers;
    // userAddress => number of user's borrowings at liquidation
    mapping (address => mapping(uint256 => mapping(uint256 => uint256))) _usersBorrowingIndexes;
    // userAddress => borrowingProfileIndex => collateralProfileIndex => borrowingIndex
    mapping (uint256 => uint256) _collateralIndexes; // borrowingIndex => collateralIndex
    mapping (address => mapping(uint256 => uint256)) _usersLendingIndexes;
    // userAddress => borrowingProfileIndex => lendingIndex

    uint256 _borrowingProfilesNumber;
    uint256 _collateralProfilesNumber;
    uint256 _borrowingsNumber;
    uint256 _collateralsNumber;
    uint256 _lendingsNumber;
    uint256 _liquidationsNumber;
    uint256 _year = 365 * 24 * 3600;
    uint256 _marketIndexShift = 1 ether; // market index exponent shifting when calculation with decimals
    uint256 _percentShift = 10000; // percents exponent shifting when calculation with decimals
    uint256 _lockTime = 86400; // period when withdraw lending is prohibited
    uint16 _aprBorrowingMin; // % * 100
    uint16 _aprBorrowingMax; // % * 100
    uint16 _aprBorrowingFix; // % * 100
    uint16 _aprLendingMin; // % * 100
    uint16 _aprLendingMax; // % * 100

    // admin functions
    function addBorrowingProfile (
        address contractAddress,
        uint256 usdRate
    ) external onlyManager returns (bool) {
        require (contractAddress != address(0), 'Contract address should not be zero');
        BorrowingProfile memory profile = BorrowingProfile({
            contractAddress: contractAddress,
            usdRate: usdRate,
            borrowingMarketIndex: _marketIndexShift,
            borrowingMarketIndexLastTime: block.timestamp,
            lendingMarketIndex: _marketIndexShift,
            lendingMarketIndexLastTime: block.timestamp,
            totalBorrowed: 0,
            totalLent: 0,
            active: true
        });

        _borrowingProfilesNumber ++;
        _borrowingProfiles[_borrowingProfilesNumber] = profile;
        return true;
    }

    function addCollateralProfile (
        address contractAddress,
        uint256 usdRate,
        uint256 borrowingFactor,
        uint256 liquidationFactor,
        bool noFee
    ) external onlyManager returns (bool) {
        require (contractAddress != address(0), 'Contract address should not be zero');
        CollateralProfile memory profile = CollateralProfile({
            contractAddress: contractAddress,
            usdRate: usdRate,
            borrowingFactor: borrowingFactor,
            liquidationFactor: liquidationFactor,
            total: 0,
            noFee: noFee,
            active: true
        });
        _collateralProfilesNumber ++;
        _collateralProfiles[_collateralProfilesNumber] = profile;
        return true;
    }

    function setBorrowingProfileRate (
        uint256 borrowingProfileIndex, uint256 usdRate
    ) external onlyManager returns (bool) {
        require(borrowingProfileIndex > 0 && borrowingProfileIndex <= _borrowingProfilesNumber,
            'Borrowing profile is not found');
        _borrowingProfiles[borrowingProfileIndex].usdRate = usdRate;

        return true;
    }

    function setBorrowingProfileStatus (
        uint256 borrowingProfileIndex, bool active
    ) external onlyManager returns (bool) {
        require(borrowingProfileIndex > 0 && borrowingProfileIndex <= _borrowingProfilesNumber,
            'Borrowing profile is not found');
        _borrowingProfiles[borrowingProfileIndex].active = active;

        return true;
    }

    function setCollateralProfileRate (
        uint256 collateralProfileIndex, uint256 usdRate
    ) external onlyManager returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex <= _collateralProfilesNumber,
            'Collateral profile is not found');
        _collateralProfiles[collateralProfileIndex].usdRate = usdRate;

        return true;
    }

    function setCollateralProfileStatus (
        uint256 collateralProfileIndex, bool active
    ) external onlyManager returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex <= _collateralProfilesNumber,
            'Collateral profile is not found');
        _collateralProfiles[collateralProfileIndex].active = active;

        return true;
    }

    function setCollateralProfileBorrowingFactor (
        uint256 collateralProfileIndex, uint256 borrowingFactor
    ) external onlyManager returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex <= _collateralProfilesNumber,
            'Collateral profile is not found');
        _collateralProfiles[collateralProfileIndex].borrowingFactor = borrowingFactor;

        return true;
    }

    function setCollateralProfileLiquidationFactor (
        uint256 collateralProfileIndex, uint256 liquidationFactor
    ) external onlyManager returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex <= _collateralProfilesNumber,
            'Collateral profile is not found');
        _collateralProfiles[collateralProfileIndex].liquidationFactor = liquidationFactor;

        return true;
    }

    function setAprSettings (
        uint16 aprBorrowingMax,
        uint16 aprBorrowingMin,
        uint16 aprBorrowingFix,
        uint16 aprLendingMax,
        uint16 aprLendingMin
    ) external onlyManager returns (bool) {
        _aprBorrowingMin = aprBorrowingMin;
        _aprBorrowingMax = aprBorrowingMax;
        _aprBorrowingFix = aprBorrowingFix;
        _aprLendingMin = aprLendingMin;
        _aprLendingMax = aprLendingMax;

        return true;
    }

    function setLockTime (
        uint256 lockTime
    ) external onlyManager returns (bool) {
        _lockTime = lockTime;

        return true;
    }

    function addToLiquidators (
        address userAddress
    ) external onlyOwner returns (bool) {
        _liquidators[userAddress] = true;

        return true;
    }

    function removeFromLiquidators (
        address userAddress
    ) external onlyOwner returns (bool) {
        _liquidators[userAddress] = false;

        return true;
    }

    function addToManagers (
        address userAddress
    ) external onlyOwner returns (bool) {
        _managers[userAddress] = true;

        return true;
    }

    function removeFromManagers (
        address userAddress
    ) external onlyOwner returns (bool) {
        _managers[userAddress] = false;

        return true;
    }

    // view functions
    function getBorrowingsNumber () external view returns (uint256) {
        return _borrowingsNumber;
    }

    function getBorrowing (uint256 borrowingIndex) external view returns (
        address userAddress, uint256 borrowingProfileIndex, uint256 collateralIndex,
        uint256 amount, uint256 accumulatedFee
    ) {
        return (
            _borrowings[borrowingIndex].userAddress,
            _borrowings[borrowingIndex].borrowingProfileIndex,
            _borrowings[borrowingIndex].collateralIndex,
            _borrowings[borrowingIndex].amount,
            _borrowings[borrowingIndex].accumulatedFee
        );
    }

    function getBorrowingMarketIndex (uint256 borrowingIndex) external view returns (
        uint256 lastMarketIndex, uint256 updatedAt, uint256 fixedApr
    ) {
        return (
            _borrowings[borrowingIndex].lastMarketIndex,
            _borrowings[borrowingIndex].updatedAt,
            _borrowings[borrowingIndex].fixedApr
        );
    }

    function getLendingsNumber () external view returns (uint256) {
        return _lendingsNumber;
    }

    function getLending (uint256 lendingIndex) external view returns (
        address userAddress, uint256 borrowingProfileIndex, uint256 amount,
        uint256 unlock, uint256 accumulatedYield
    ) {
        return (
            _lendings[lendingIndex].userAddress,
            _lendings[lendingIndex].borrowingProfileIndex,
            _lendings[lendingIndex].amount,
            _lendings[lendingIndex].unlock,
            _lendings[lendingIndex].accumulatedYield
        );
    }

    function getLendingMarketIndex (uint256 lendingIndex) external view returns (
        uint256 lastMarketIndex, uint256 updatedAt
    ) {
        return (
            _lendings[lendingIndex].lastMarketIndex,
            _lendings[lendingIndex].updatedAt
        );
    }

    function getCollateralsNumber () external view returns (uint256) {
        return _collateralsNumber;
    }

    function getCollateral (uint256 collateralIndex) external view returns (
        uint256 collateralProfileIndex, uint256 borrowingIndex, uint256 amount
    ) {
        return (
            _collaterals[collateralIndex].collateralProfileIndex,
            _collaterals[collateralIndex].borrowingIndex,
            _collaterals[collateralIndex].amount
        );
    }

    function getLiquidationsNumber () external view returns (uint256) {
        return _liquidationsNumber;
    }

    function getLiquidation (uint256 liquidationIndex) external view returns (
        address userAddress, address liquidatorAddress, uint256 borrowingIndex
    ) {
        return (
            _liquidations[liquidationIndex].userAddress,
            _liquidations[liquidationIndex].liquidatorAddress,
            _liquidations[liquidationIndex].borrowingIndex
        );
    }

    function getBorrowingProfilesNumber () external view returns (uint256) {
        return _borrowingProfilesNumber;
    }

    function getBorrowingProfile (uint256 borrowingProfileIndex) external view returns (
        address contractAddress, uint256 usdRate, uint256 totalBorrowed,
        uint256 totalLent, bool active
    ) {
        return (
            _borrowingProfiles[borrowingProfileIndex].contractAddress,
            _borrowingProfiles[borrowingProfileIndex].usdRate,
            _borrowingProfiles[borrowingProfileIndex].totalBorrowed,
            _borrowingProfiles[borrowingProfileIndex].totalLent,
            _borrowingProfiles[borrowingProfileIndex].active
        );
    }

    function getBorrowingProfileMarketIndexes (
        uint256 borrowingProfileIndex
    ) external view returns (
        uint256 borrowingMarketIndex, uint256 borrowingMarketIndexLastTime,
        uint256 lendingMarketIndex, uint256 lendingMarketIndexLastTime
    ) {
        return (
            _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndex,
            _borrowingProfiles[borrowingProfileIndex].borrowingMarketIndexLastTime,
            _borrowingProfiles[borrowingProfileIndex].lendingMarketIndex,
            _borrowingProfiles[borrowingProfileIndex].lendingMarketIndexLastTime
        );
    }

    function getCollateralProfilesNumber () external view returns (uint256) {
        return _collateralProfilesNumber;
    }

    function getCollateralProfile (uint256 collateralProfileIndex) external view returns (
        address contractAddress, uint256 usdRate, uint256 borrowingFactor,
        uint256 liquidationFactor, uint256 total, bool noFee, bool active
    ) {
        return (
            _collateralProfiles[collateralProfileIndex].contractAddress,
            _collateralProfiles[collateralProfileIndex].usdRate,
            _collateralProfiles[collateralProfileIndex].borrowingFactor,
            _collateralProfiles[collateralProfileIndex].liquidationFactor,
            _collateralProfiles[collateralProfileIndex].total,
            _collateralProfiles[collateralProfileIndex].noFee,
            _collateralProfiles[collateralProfileIndex].active
        );
    }

    function getLockTime () external view returns (uint256) {
        return _lockTime;
    }

    function getAprSettings () external view returns (
        uint16 aprBorrowingMax, uint16 aprBorrowingMin, uint16 aprBorrowingFix,
        uint16 aprLendingMax, uint16 aprLendingMin
    ) {
        return (
            _aprBorrowingMax, _aprBorrowingMin, _aprBorrowingFix, _aprLendingMax, _aprLendingMin
        );
    }

    function getTokenBalance (
        address tokenContractAddress
    ) external view returns (uint256) {
        IERC20 tokenContract = IERC20(tokenContractAddress);
        return tokenContract.balanceOf(address(this));
    }
}