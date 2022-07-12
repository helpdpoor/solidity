// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '../common/TransferHelper.sol';

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(
        address recipient, uint256 amount
    ) external returns (bool);
    function transferFrom(
        address sender, address recipient, uint256 amount
    ) external returns (bool);
    function allowance(
        address owner, address spender
    ) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @dev Partial interface of the NftCollateral contract.
 */
interface INftCollateral {
    function setToLiquidation (
        address userAddress
    ) external returns (bool);
}

/**
 * @dev Partial interface of the NftCollateral contract.
 */
interface IBorrowingLending {
    function getBorrowedUsdAmount (
        address userAddress
    ) external view returns (uint256);

    function updateUsersList (
        address userAddress
    ) external returns (bool);

    function updateAllBorrowingFees (
        address userAddress
    ) external returns (bool);

    function liquidateBorrowing (
        address userAddress
    ) external returns (uint256);
}

/**
 * @dev Partial interface of the Rates contract.
 */
interface IRates {
    function getUsdRate (
        address contractAddress,
        bool realTime
    ) external view returns (uint256);
}

/**
 * @dev Implementation of the collateral treating functional,
 * functions names are self explanatory
 */
contract Collateral is Initializable {
    /**
     * Error messages:
     * borrowing-lending.sol
     * 1 - Owner address can not be zero
     * 2 - Token contract address can not be zero
     * 3 - Max APR should be greater or equal than min APR
     * admin.sol
     * 4 - Message value should be zero for an ERC20 replenish
     * 5 - Amount should be greater than zero
     * 6 - Message value should be greater than zero
     * borrowing.sol
     * 7 - Borrowing profile is not found
     * 8 - Borrowing profile is blocked
     * 9 - Message sender is flagged for liquidation
     * 10 - No assets to borrow
     * 11 - Not enough assets to borrow
     * 12 - Not enough collateral
     * 13 - Borrowing is not found
     * 14 - Amount can not be greater than borrowing amount
     * 15 - This borrowing is liquidated
     * 16 - Borrowing profile is blocked
     * 16.1 - Sender is not the Borrowing owner
     * collateral.sol
     * 17 - Collateral profile is not found
     * 18 - Collateral profile is blocked
     * 19 - For this type of collateral only internal transfers available
     * 20 - Message value should be greater than zero
     * 21 - Message value should be zero for an ERC20 collateral
     * 22 - Amount should be greater than zero
     * 23 - Wrong collateral profile
     * 27 - Collateral profile is not found
     * 28 - Collateral profile is blocked
     * 29 - Not enough NETNA to withdraw
     * 30 - Not enough available to withdraw collateral
     * 31 - This collateral is liquidated
     * lending.sol
     * 41 - Message sender is flagged for liquidation
     * 42 - Borrowing profile is not found
     * 43 - Message sender is flagged for liquidation
     * 44 - Lending is not found
     * 45 - Borrowing profile is not found
     * 46 - Amount should be greater than zero
     * 47 - Not enough lending amount
     * 47.1 - This lending can not be withdrawn at the moment
     * 48 - Message sender is flagged for liquidation
     * 49 - Lending is not found
     * 50 - Borrowing profile is not found
     * 51 - Amount should be greater than zero
     * 52 - Not enough yield
     * liquidation.sol
     * 53 - Liquidation requirements is not met
     * 54 - User is already flagged for liquidation
     * 55 - User is at liquidation
     * 56 - User is not flagged for liquidation
     * 57 - User was not flagged for a liquidation
     * 58 - Liquidation period is not over yet
     * 59 - Liquidation requirements is not met
     * marketing-indexes.sol
     * 60 - Borrowing apr can not be calculated when nothing is lent
     * 61 - Borrowing apr can not be calculated when not enough assets to borrow
     * storage.sol
     * 62 - caller is not the owner
     * 63 - caller is not the manager
     * 631 - caller is neither the manager nor liquidation contract
     * 64 - Contract address should not be zero
     * 65 - Borrowing profile is not found
     * 66 - Collateral record is not found
     * 67 - Borrowing record is not found
     * 68 - Borrowing profile is not found
     * 69 - Collateral profile is not found
     * 70 - Collateral profile is not found
     * 71 - Collateral profile is not found
     * 72 - Collateral profile is not found
     * 73 - Token contract address can not be zero
     * 74 - Token contract address can not be zero
     * 75 - Token contract address can not be zero
     * 76 - Liquidation manager address can not be zero
     * 77 - caller is not the liquidation manager
     * 78 - caller is not the liquidator
     * 79 - caller is not the nft collateral contract
     * utils.sol
     * 80 - ReentrancyGuard: reentrant call
     * 81 - Token address should not be zero
     * 82 - Not enough contract balance
     */
    event CollateralLiquidation (
        address indexed userAddress, address indexed liquidatorAddress,
        uint256 collateralIndex, uint256 timestamp
    );
    modifier onlyOwner() {
        require(msg.sender == _owner, '62');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], '63');
        _;
    }
    modifier onlyNftCollateralContract() {
        require(msg.sender == address(_nftCollateralContract), '79');
        _;
    }
    modifier onlyBorrowingLendingContract() {
        require(msg.sender == address(_borrowingLendingContract), '79');
        _;
    }
    modifier onlyLiquidationManager() {
        require(msg.sender == _liquidationManager, '77');
        _;
    }
    modifier onlyLiquidator() {
        require(_liquidators[msg.sender], '78');
        _;
    }
    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, '80');
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }
    struct CollateralProfile {
        address contractAddress;
        uint256 borrowingFactor;
        uint256 total;
        uint256 usersNumber;
        uint8 order;
        bool active;
    }
    struct Collateral {
        address userAddress;
        uint256 collateralProfileIndex;
        uint256 amount;
        uint256 prevCollateral;
        bool liquidated;
    }
    struct UsdRate {
        uint256 rate;
        uint256 updatedAt;
        bool externalRate;
    }
    mapping (uint256 => CollateralProfile) internal _collateralProfiles;
    mapping (uint256 => Collateral) internal _collaterals;
    mapping (address => mapping(uint256 => uint256)) internal _usersCollateralIndexes;
    // userAddress => collateralProfileIndex => collateralIndex
    mapping (address => mapping(uint256 => bool)) internal _userHasCollateral;
    // userAddress => collateralProfileIndex => had deposited collateral ever
    mapping (address => bool) internal _managers;
    mapping (address => bool) internal _noFee;
    mapping (address => bool) internal _liquidators;
    mapping (uint8 => bool) internal _orders;
    mapping (address => uint256) internal _adminWithdraw;
    mapping (address => uint256) internal _adminReplenish;

    IERC20 internal _nftERC20Contract;
    INftCollateral internal _nftCollateralContract;
    IBorrowingLending internal _borrowingLendingContract;
    IRates _ratesContract;
    address internal _owner;
    address internal _liquidationManager;
    uint256 internal _collateralProfilesNumber;
    uint256 internal _collateralsNumber;
    uint256 internal constant _YEAR = 365 * 24 * 3600;
    uint256 internal constant _SHIFT_18 = 1 ether;
    // market index exponent shifting when calculation with decimals
    uint256 internal constant _SHIFT_4 = 10000;
    // percents exponent shifting when calculation with decimals
    uint256 internal _liquidationFactor;
    // percentage for detecting loan availability for liquidation
    uint256 internal _liquidationFee; // fee that will be paid for liquidation (% * 100)
    uint256 internal _liquidatorPercentage;
    // part of the liquidation fee that will be paid to liquidators (the rest to admin)
    // (% * 100)
    uint256 internal _liquidationRMin;
    // factor to determine if loan is flagged for a liquidation
    uint256 internal _liquidationRMax;
    // factor to determine if loan is in a fair (not good) state
    uint256 internal _nftProfileIndex;
    uint8 internal _maxOrder;
    uint8 internal constant _NOT_ENTERED = 1; // reentrancy service constant
    uint8 internal constant _ENTERED = 2; // reentrancy service constant
    uint8 internal _reentrancyStatus; // reentrancy indicator

    function initialize (
        address newOwner,
        address nftERC20Address,
        address borrowingLendingContractAddress
    ) public initializer returns (bool) {
        require(nftERC20Address != address(0), '2');
        require(newOwner != address(0), '1');
        require(borrowingLendingContractAddress != address(0), '75');
        _borrowingLendingContract = IBorrowingLending(borrowingLendingContractAddress);
        _nftERC20Contract = IERC20(nftERC20Address);
        _owner = newOwner;
        _managers[newOwner] = true;
        _liquidationManager = newOwner;
        _liquidationFactor = 1500;
        _liquidationFee = 1000;
        _liquidatorPercentage = 4000;
        _liquidationRMin = 2000;
        _liquidationRMax = 2500;
        return true;
    }

    // Admin functions
    /**
     * @dev Function for withdrawing assets, both native currency and erc20 tokens.
     */
    function adminWithdraw (
        address tokenAddress, uint256 amount
    ) external onlyOwner returns (bool) {
        _sendAsset(tokenAddress, msg.sender, amount);
        _adminWithdraw[tokenAddress] += amount;
        return true;
    }

    /**
     * @dev Function for replenishing assets balance, both native currency and erc20 tokens.
     */
    function adminReplenish (
        address tokenAddress, uint256 amount
    ) external payable onlyOwner returns (bool) {
        if (tokenAddress != address(0)) {
            require(msg.value == 0, '4');
            require(amount > 0, '5');
            _takeAsset(tokenAddress, msg.sender, amount);
        } else {
            amount = msg.value;
            require(amount > 0, '6');
        }
        _adminReplenish[tokenAddress] += amount;
        return true;
    }

    function transferOwnership(address newOwner) public onlyOwner returns (bool) {
        require(newOwner != address(0), 'newOwner should not be zero address');
        _owner = newOwner;
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

    function addCollateralProfile (
        address contractAddress,
        uint256 borrowingFactor,
        uint8 order,
        bool noFee
    ) external onlyManager returns (bool) {
        require(
            !_orders[order],
            'Profile with this order already exists'
        );
        _orders[order] = true;
        if (order > _maxOrder) _maxOrder = order;
        _collateralProfilesNumber ++;
        _collateralProfiles[_collateralProfilesNumber].contractAddress = contractAddress;
        _collateralProfiles[_collateralProfilesNumber].borrowingFactor = borrowingFactor;
        _collateralProfiles[_collateralProfilesNumber].order = order;
        _noFee[contractAddress] = noFee;
        _collateralProfiles[_collateralProfilesNumber].active = true;
        if (contractAddress == address(_nftERC20Contract)) {
            _nftProfileIndex = _collateralProfilesNumber;
        }
        return true;
    }

    function setNoFee (address contractAddress, bool noFee) external onlyManager returns (bool) {
        _noFee[contractAddress] = noFee;
        return true;
    }

    /**
     * @dev Helper function that allows manager to change liquidation status manually
     */
    function setCollateralLiquidationStatus (
        uint256 collateralIndex, bool liquidated
    ) external onlyManager returns (bool) {
        require(collateralIndex > 0 && collateralIndex <= _collateralsNumber,
            '66');
        _collaterals[collateralIndex].liquidated = liquidated;
        return true;
    }

    function setCollateralProfileData (
        uint256 collateralProfileIndex,
        uint256 borrowingFactor,
        bool active
    ) external onlyManager returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex <= _collateralProfilesNumber,
            '69');
        _collateralProfiles[collateralProfileIndex].borrowingFactor = borrowingFactor;
        _collateralProfiles[collateralProfileIndex].active = active;
        return true;
    }

    function setRatesContract (
        address ratesContractAddress
    ) external onlyManager returns (bool) {
        _ratesContract = IRates(ratesContractAddress);
        return true;
    }

    function setNftERC20Contract (
        address nftERC20Address
    ) external onlyManager returns (bool) {
        require(nftERC20Address != address(0), '74');
        _nftERC20Contract = IERC20(nftERC20Address);
        _collateralProfiles[_nftProfileIndex].contractAddress = nftERC20Address;
        return true;
    }

    function setNftCollateralContract (
        address nftCollateralContractAddress
    ) external onlyManager returns (bool) {
        require(nftCollateralContractAddress != address(0), '75');
        _nftCollateralContract = INftCollateral(nftCollateralContractAddress);
        return true;
    }

    function setBorrowingLendingContract (
        address borrowingLendingContractAddress
    ) external onlyManager returns (bool) {
        require(borrowingLendingContractAddress != address(0), '75');
        _borrowingLendingContract = IBorrowingLending(borrowingLendingContractAddress);
        return true;
    }

    function getCollateralsNumber () external view returns (uint256) {
        return _collateralsNumber;
    }

    function getCollateral (uint256 collateralIndex) external view returns (
        address userAddress,
        uint256 collateralProfileIndex,
        uint256 amount,
        uint256 prevCollateral,
        bool liquidated
    ) {
        return (
        _collaterals[collateralIndex].userAddress,
        _collaterals[collateralIndex].collateralProfileIndex,
        _collaterals[collateralIndex].amount,
        _collaterals[collateralIndex].prevCollateral,
        _collaterals[collateralIndex].liquidated
        );
    }

    function getUsersCollateralIndex (
        address userAddress, uint256 collateralProfileIndex
    ) public view returns (uint256) {
        if (
            _collaterals[
            _usersCollateralIndexes[userAddress][collateralProfileIndex]
            ].liquidated
        ) return 0;
        return _usersCollateralIndexes[userAddress][collateralProfileIndex];
    }

    function getCollateralProfilesNumber () external view returns (uint256) {
        return _collateralProfilesNumber;
    }

    function getCollateralProfile (
        uint256 collateralProfileIndex
    ) external view returns (
        address contractAddress,
        uint256 borrowingFactor,
        uint256 total,
        uint8 order,
        bool active
    ) {
        return (
        _collateralProfiles[collateralProfileIndex].contractAddress,
        _collateralProfiles[collateralProfileIndex].borrowingFactor,
        _collateralProfiles[collateralProfileIndex].total,
        _collateralProfiles[collateralProfileIndex].order,
        _collateralProfiles[collateralProfileIndex].active
        );
    }

    function getCollateralProfileStat (uint256 collateralProfileIndex) external view returns (
        uint256 total, uint256 usersNumber
    ) {
        return (
        _collateralProfiles[collateralProfileIndex].total,
        _collateralProfiles[collateralProfileIndex].usersNumber
        );
    }

    /**
     * Function returns liquidation buffer
     */
    function getBuffer (
        address userAddress
    ) external view returns (
        uint256 buffer,
        bool negative
    ) {
        uint256 borrowedUsdAmount = _borrowingLendingContract
        .getBorrowedUsdAmount(userAddress);
        if (borrowedUsdAmount == 0) return (0, false);
        uint256 collateralUsdAmount = getUserCollateralUsdAmount(userAddress, false);
        uint256 borrowedLiquidationUsdAmount = borrowedUsdAmount
        * (_SHIFT_4 + _liquidationFactor) / _SHIFT_4;
        if (collateralUsdAmount < borrowedLiquidationUsdAmount) {
            return (
            borrowedLiquidationUsdAmount - collateralUsdAmount,
            true
            );
        }
        return (
        collateralUsdAmount - borrowedLiquidationUsdAmount,
        false
        );
    }

    /**
      * Returns parameter that defines loan health
      * 1 - loan health is good,
      * 2 - loan health is fair
      * 3 - loan is flagged for a liquidation,
      * 4 - loan is available for a liquidation
      */
    function getLoanHealth (
        address userAddress
    ) external view returns (uint8 loanHealth) {
        uint256 borrowedUsdAmount = _borrowingLendingContract.getBorrowedUsdAmount(userAddress);
        if (borrowedUsdAmount == 0) return 1;
        uint256 collateralUsdAmount = getUserCollateralUsdAmount(userAddress, false);
        uint256 borrowedLiquidationUsdAmount = borrowedUsdAmount
        * (_SHIFT_4 + _liquidationFactor) / _SHIFT_4;
        if (collateralUsdAmount > borrowedLiquidationUsdAmount
        * (_SHIFT_4 + _liquidationRMax) / _SHIFT_4
        ) return 1;
        if (
            collateralUsdAmount > borrowedLiquidationUsdAmount
        * (_SHIFT_4 + _liquidationRMin) / _SHIFT_4
        ) return 2;
        if (
            collateralUsdAmount >= borrowedLiquidationUsdAmount
        ) return 3;
        return 4;
    }

    function depositCollateral (
        uint256 collateralProfileIndex, uint256 amount
    ) external payable returns (bool) {
        require(collateralProfileIndex > 0 && collateralProfileIndex
        <= _collateralProfilesNumber, '17');
        require(_collateralProfiles[collateralProfileIndex].active,
            '18');
        require(!isNftProfile(collateralProfileIndex), '19');
        _borrowingLendingContract.updateUsersList(msg.sender);

        if (
            _collateralProfiles[collateralProfileIndex].contractAddress == address(0)
        ) {
            amount = msg.value;
            require(amount > 0, '20');
        } else {
            require(msg.value == 0, '21');
            require(amount > 0, '22');
            _takeAsset(
                _collateralProfiles[collateralProfileIndex].contractAddress,
                msg.sender,
                amount
            );
        }
        _borrowingLendingContract.updateAllBorrowingFees(msg.sender);

        _collateralProfiles[collateralProfileIndex].total += amount;
        uint256 collateralIndex = _usersCollateralIndexes[msg.sender][collateralProfileIndex];
        if (collateralIndex == 0 || _collaterals[collateralIndex].liquidated) {
            _addNewCollateral(msg.sender, collateralProfileIndex, amount, 0);
        } else {
            _collaterals[collateralIndex].amount += amount;
        }

        return true;
    }

    function withdrawCollateral (
        uint256 collateralProfileIndex, uint256 amount
    ) public returns (bool) {
        require(amount > 0, '22');
        require(collateralProfileIndex > 0 && collateralProfileIndex
        <= _collateralProfilesNumber, '27');
        require(!isNftProfile(collateralProfileIndex), '19');
        require(getAvailableCollateralAmount(msg.sender, collateralProfileIndex) >= amount,
            '30');
        uint256 collateralIndex = _usersCollateralIndexes[msg.sender][collateralProfileIndex];
        require(!_collaterals[collateralIndex].liquidated, '31');
        _borrowingLendingContract.updateAllBorrowingFees(msg.sender);
        _collateralProfiles[collateralProfileIndex].total -= amount;
        _collaterals[collateralIndex].amount -= amount;

        _sendAsset(
            _collateralProfiles[collateralProfileIndex].contractAddress,
            msg.sender,
            amount
        );

        return true;
    }

    function withdrawCollateralAvailable (
        uint256 collateralProfileIndex
    ) external returns (bool) {
        uint256 amount = getAvailableCollateralAmount(
            msg.sender, collateralProfileIndex
        );
        return withdrawCollateral(collateralProfileIndex, amount);
    }

    function depositNftERC20 (
        address userAddress, uint256 amount
    ) external onlyNftCollateralContract returns (bool) {
        uint256 collateralIndex = getUsersCollateralIndex(userAddress, _nftProfileIndex);
        if (collateralIndex > 0) {
            _collaterals[collateralIndex].amount += amount;
        } else {
            _addNewCollateral(userAddress, _nftProfileIndex, amount, 0);
        }
        _collateralProfiles[_nftProfileIndex].total += amount;
        return true;
    }

    function withdrawNftERC20 (
        address userAddress, uint256 amount
    ) external onlyNftCollateralContract returns (bool) {
        require(
            getAvailableCollateralAmount(userAddress, _nftProfileIndex) >= amount,
            '30'
        );
        uint256 collateralIndex = getUsersCollateralIndex(userAddress, _nftProfileIndex);
        require(collateralIndex > 0, '66');
        require(_collaterals[collateralIndex].amount >= amount, '29');
        _collaterals[collateralIndex].amount -= amount;
        _collateralProfiles[_nftProfileIndex].total -= amount;
        _sendAsset(
            address(_nftERC20Contract),
            address(_nftCollateralContract),
            amount
        );
        return true;
    }

    /**
     * @dev helper function to get paid in Erc20 tokens
     */
    function _takeAsset (
        address tokenAddress, address fromAddress, uint256 amount
    ) internal returns (bool) {
        require(tokenAddress != address(0), '81');
        TransferHelper.safeTransferFrom(
            tokenAddress, fromAddress, address(this), amount
        );
        return true;
    }

    /**
    * @dev Assets sending, both native currency (when tokenAddreess is set to zero) and erc20 tokens
    */
    function _sendAsset (
        address tokenAddress, address toAddress, uint256 amount
    ) internal nonReentrant returns (bool) {
        if (tokenAddress == address(0)) {
            require(address(this).balance >= amount, '82');
            payable(toAddress).transfer(amount);
        } else {
            TransferHelper.safeTransfer(tokenAddress, toAddress, amount);
        }
        return true;
    }

    function _addNewCollateral (
        address userAddress,
        uint256 collateralProfileIndex,
        uint256 amount,
        uint256 prevCollateral
    ) internal returns (bool) {
        _collateralsNumber ++;
        _collaterals[_collateralsNumber].userAddress = userAddress;
        _collaterals[_collateralsNumber].collateralProfileIndex = collateralProfileIndex;
        _collaterals[_collateralsNumber].amount = amount;
        _collaterals[_collateralsNumber].prevCollateral = prevCollateral;
        _usersCollateralIndexes[userAddress][collateralProfileIndex] = _collateralsNumber;
        if (!_userHasCollateral[userAddress][collateralProfileIndex]) {
            _collateralProfiles[collateralProfileIndex].usersNumber ++;
            _userHasCollateral[userAddress][collateralProfileIndex] = true;
        }
        return true;
    }

    function setLiquidationData (
        uint256 liquidationFee,
        uint256 liquidatorPercentage,
        uint256 liquidationRMin,
        uint256 liquidationRMax
    ) external onlyManager returns (bool) {
        _liquidationFee = liquidationFee;
        _liquidatorPercentage = liquidatorPercentage;
        _liquidationRMin = liquidationRMin;
        _liquidationRMax = liquidationRMax;
        return true;
    }

    function addToLiquidators (
        address userAddress
    ) external onlyManager returns (bool) {
        _liquidators[userAddress] = true;
        return true;
    }

    function removeFromLiquidators (
        address userAddress
    ) external onlyManager returns (bool) {
        _liquidators[userAddress] = false;
        return true;
    }

    function setLiquidationManager (
        address userAddress
    ) external onlyManager returns (bool) {
        require(userAddress != address(0), '76');
        _liquidationManager = userAddress;
        return true;
    }

    function setLiquidationFactor (
        uint256 liquidationFactor
    ) external onlyManager returns (bool) {
        _liquidationFactor = liquidationFactor;
        return true;
    }

    function liquidate (
        address userAddress
    ) external onlyLiquidator returns (uint256) {
        uint256[] memory collateralIndexes = new uint256[](_maxOrder + 1);
        uint256 borrowedUsdAmount = _borrowingLendingContract.liquidateBorrowing(userAddress);

        uint256 collateralUsdAmount;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                collateralIndex == 0 || _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            uint256 collateralProfileIndex = _collaterals[collateralIndex]
            .collateralProfileIndex;
            collateralIndexes[
            _collateralProfiles[collateralProfileIndex].order
            ] = collateralIndex;

            collateralUsdAmount += _collaterals[collateralIndex].amount
            * _getUsdRate(_collateralProfiles[collateralProfileIndex].contractAddress, true)
            / _SHIFT_18;
            emit CollateralLiquidation(
                userAddress, msg.sender, collateralIndex, block.timestamp
            );
        }
        require(
            collateralUsdAmount < borrowedUsdAmount
        * (_SHIFT_4 + _liquidationFactor) / _SHIFT_4,
            '59'
        );
        uint256 liquidationUsdAmount = borrowedUsdAmount
        * (_SHIFT_4 + _liquidationFee) / _SHIFT_4;
        for (uint256 i = 0; i < _maxOrder + 1; i ++) {
            if (collateralIndexes[i] == 0) continue;
            if (liquidationUsdAmount == 0) continue;
            if (
                isNftProfile(
                    _collaterals[collateralIndexes[i]].collateralProfileIndex
                )
            ) {
                _collaterals[collateralIndexes[i]].liquidated = true;
                _sendAsset(
                    address(_nftERC20Contract),
                    address(_nftCollateralContract),
                    _collaterals[collateralIndexes[i]].amount
                );
                _nftCollateralContract.setToLiquidation(userAddress);
                liquidationUsdAmount = 0;
                break;
            }
            liquidationUsdAmount = _proceedCollateralLiquidation(
                userAddress, msg.sender, collateralIndexes[i], liquidationUsdAmount
            );
        }

        return liquidationUsdAmount;
    }

    function _proceedCollateralLiquidation (
        address userAddress,
        address liquidatorAddress,
        uint256 collateralIndex,
        uint256 liquidationUsdAmount
    ) internal returns (uint256) {
        uint256 toBeSent;
        uint256 liquidatorsPart;
        uint256 collateralProfileIndex = _collaterals[collateralIndex]
        .collateralProfileIndex;
        uint256 usdRate = _getUsdRate(_collateralProfiles[collateralProfileIndex].contractAddress, true);
        uint256 amount = liquidationUsdAmount * _SHIFT_18 / usdRate;
        address contractAddress = _collateralProfiles[collateralProfileIndex].contractAddress;
        _collaterals[collateralIndex].liquidated = true;
        if (amount >= _collaterals[collateralIndex].amount) {
            toBeSent = _collaterals[collateralIndex].amount;
            liquidationUsdAmount -= toBeSent * usdRate / _SHIFT_18;
        } else {
            _addNewCollateral(
                userAddress,
                collateralProfileIndex,
                _collaterals[collateralIndex].amount - amount,
                collateralIndex
            );
            toBeSent = amount;
            liquidationUsdAmount = 0;
        }
        liquidatorsPart = toBeSent * _liquidatorPercentage / _SHIFT_4;
        _collateralProfiles[collateralProfileIndex].total -= toBeSent;
        _sendAsset(contractAddress, liquidatorAddress, liquidatorsPart);
        _sendAsset(contractAddress, _liquidationManager, toBeSent - liquidatorsPart);

        return liquidationUsdAmount;
    }

    function getLiquidationManager () external view returns (address) {
        return _liquidationManager;
    }

    function getLiquidationFactor () external view returns (uint256) {
        return _liquidationFactor;
    }

    function getLiquidationData () external view returns (
        uint256 liquidationFee,
        uint256 liquidatorPercentage,
        uint256 liquidationRMin,
        uint256 liquidationRMax
    ) {
        return (
        _liquidationFee,
        _liquidatorPercentage,
        _liquidationRMin,
        _liquidationRMax
        );
    }

    function isLiquidator (
        address userAddress
    ) external view returns (bool) {
        return _liquidators[userAddress];
    }

    function getAdminReplenish (address tokenAddress) external view returns (uint256) {
        return _adminReplenish[tokenAddress];
    }

    function getAdminWithdraw (address tokenAddress) external view returns (uint256) {
        return _adminWithdraw[tokenAddress];
    }

    /**
    * Migrating collaterals data from another contract
    * uint256 values collected into a single array "number" with
    * length 3 times greater than "userAddresses" array
    * Data in "number" array ordered as follows
    * 1 borrowingProfileIndexes
    * 2 amounts
    * 3 prevCollaterals
    * 4 liquidated (if > 0 -> true)
    */
    function migrateCollaterals (
        address[] calldata userAddresses,
        uint256[] calldata numbers
    ) external onlyManager returns (bool) {
        uint256[] memory totalDeposited = new uint256[](_collateralProfilesNumber);
        require(
            userAddresses.length * 4 == numbers.length,
            'numbers array length mismatch'
        );
        for (uint256 i; i < userAddresses.length; i ++) {
            if (i > 100) break;
            if (!_userHasCollateral[userAddresses[i]][numbers[i]]) {
                _collateralProfiles[numbers[i]].usersNumber ++;
                _userHasCollateral[userAddresses[i]][numbers[i]] = true;
            }
            if (
                _usersCollateralIndexes[userAddresses[i]]
                [numbers[i]] > 0
            ) continue;
            _collateralsNumber ++;
            _collaterals[_collateralsNumber].userAddress = userAddresses[i];
            _collaterals[_collateralsNumber].collateralProfileIndex =
            numbers[i];
            _collaterals[_collateralsNumber].amount =
            numbers[i + userAddresses.length];
            _collaterals[_collateralsNumber].prevCollateral =
            numbers[i + userAddresses.length * 2];
            _collaterals[_collateralsNumber].liquidated =
            numbers[i + userAddresses.length * 3] > 0;
            _usersCollateralIndexes[userAddresses[i]]
            [numbers[i]] = _collateralsNumber;
            totalDeposited[numbers[i] - 1] += numbers[i + userAddresses.length];
        }
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            if (totalDeposited[i - 1] == 0) continue;
            _collateralProfiles[i].total += totalDeposited[i - 1];
        }
        return true;
    }

    // view functions
    function getCollateralIndex (
        address userAddress, uint256 collateralProfileIndex
    ) external view returns (uint256) {
        return _usersCollateralIndexes[userAddress][collateralProfileIndex];
    }

    function getCollateralUsdAmount (
        uint256 collateralIndex
    ) public view returns (uint256) {
        if (
            collateralIndex == 0
            || _collaterals[collateralIndex].liquidated
            || _collaterals[collateralIndex].amount == 0
        ) return 0;
        uint256 collateralProfileIndex =
        _collaterals[collateralIndex].collateralProfileIndex;
        return _collaterals[collateralIndex].amount
        * _getUsdRate(_collateralProfiles[collateralProfileIndex].contractAddress, false)
        / _SHIFT_18;
    }

    function getUserCollateralUsdAmount (
        address userAddress,
        bool borrowingPower
    ) public view returns (uint256) {
        uint256 depositedCollateralUsdAmount;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                collateralIndex == 0
                || _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            uint256 amount = getCollateralUsdAmount(collateralIndex);
            if (borrowingPower) {
                amount *= _collateralProfiles[i].borrowingFactor;
                amount /= _SHIFT_4;
            }
            depositedCollateralUsdAmount += amount;
        }
        return depositedCollateralUsdAmount;
    }

    function getAvailableCollateralAmount (
        address userAddress, uint256 collateralProfileIndex
    ) public view returns (uint256) {
        uint256 borrowedUsdAmount = _borrowingLendingContract.getBorrowedUsdAmount(userAddress);
        if (borrowedUsdAmount == 0) {
            return _collaterals[
            _usersCollateralIndexes[userAddress][collateralProfileIndex]
            ].amount;
        }
        uint256 collateralUsdAmount;
        uint256 availableCollateralAmount;
        uint256 availableCollateralUsdAmount;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            if (collateralIndex == 0) continue;
            uint256 amount = _collaterals[collateralIndex].amount
            * _getUsdRate(_collateralProfiles[i].contractAddress, false)
            * _collateralProfiles[i].borrowingFactor
            / _SHIFT_18
            / _SHIFT_4;
            collateralUsdAmount += amount;
            if (i == collateralProfileIndex) {
                availableCollateralUsdAmount = amount;
                availableCollateralAmount = _collaterals[collateralIndex].amount;
            }
        }

        if (collateralUsdAmount <= borrowedUsdAmount) return 0;
        uint256 diff = collateralUsdAmount - borrowedUsdAmount;

        if (availableCollateralUsdAmount > diff) availableCollateralUsdAmount = diff;
        else return availableCollateralAmount;

        return availableCollateralUsdAmount
        * _SHIFT_18
        * _SHIFT_4
        / _getUsdRate(_collateralProfiles[collateralProfileIndex].contractAddress, false)
        / _collateralProfiles[collateralProfileIndex].borrowingFactor;
    }

    function getTokenBalance (
        address tokenContractAddress
    ) external view returns (uint256) {
        IERC20 tokenContract = IERC20(tokenContractAddress);
        return tokenContract.balanceOf(address(this));
    }

    function getNftERC20Contract () external view returns (address) {
        return address(_nftERC20Contract);
    }

    function getNftProfileIndex () external view returns (uint256) {
        return _nftProfileIndex;
    }

    function getNftCollateralContract () external view returns (address) {
        return address(_nftCollateralContract);
    }

    function getBorrowingLendingContract () external view returns (address) {
        return address(_borrowingLendingContract);
    }

    function getRatesContractAddress () external view returns (address) {
        return address(_ratesContract);
    }

    function _getUsdRate (
        address contractAddress,
        bool realTime
    ) internal view returns (uint256) {
        return _ratesContract.getUsdRate(contractAddress, realTime);
    }

    function getUsdRate (
        address contractAddress
    ) external view returns (uint256) {
        return _getUsdRate(contractAddress, false);
    }

    function getTotalCollateralUsdAmounts (
        address userAddress
    ) external view returns (
        uint256 totalCollateralUsdAmount,
        uint256 feeCollateralUsdAmount
    ) {
        uint256 totalCollateralUsdAmount_;
        uint256 feeCollateralUsdAmount_;
        for (uint256 i = 1; i <= _collateralProfilesNumber; i ++) {
            uint256 collateralIndex = _usersCollateralIndexes[userAddress][i];
            if (
                collateralIndex == 0
                || _collaterals[collateralIndex].liquidated
                || _collaterals[collateralIndex].amount == 0
            ) continue;
            uint256 usdRate = _getUsdRate(_collateralProfiles[i].contractAddress, false);
            totalCollateralUsdAmount_ += _collaterals[collateralIndex].amount
            * usdRate
            / _SHIFT_18;
            if (!_noFee[_collateralProfiles[i].contractAddress]) {
                feeCollateralUsdAmount_ += _collaterals[collateralIndex].amount
                * usdRate
                / _SHIFT_18;
            }
        }
        return (totalCollateralUsdAmount_, feeCollateralUsdAmount_);
    }

    function getMinimalUsdRepayment (
        address userAddress
    ) external view returns (uint256) {
        uint256 borrowedUsdAmount = _borrowingLendingContract
        .getBorrowedUsdAmount(userAddress);
        if (borrowedUsdAmount == 0) return 0;
        uint256 collateralUsdAmount = getUserCollateralUsdAmount(userAddress, false);
        uint256 borrowedLiquidationUsdAmount = borrowedUsdAmount
        * (_SHIFT_4 + _liquidationFactor) / _SHIFT_4;
        uint256 borrowingRmaxUsdAmount = borrowedLiquidationUsdAmount
        * (_SHIFT_4 + _liquidationRMax) / _SHIFT_4;

        if (collateralUsdAmount > borrowingRmaxUsdAmount) return 0;
        return borrowingRmaxUsdAmount - collateralUsdAmount;
    }

    function getNoFee (address contractAddress) external view returns (bool) {
        return _noFee[contractAddress];
    }

    function isManager (
        address userAddress
    ) external view returns (bool) {
        return _managers[userAddress];
    }

    function isNftProfile (
        uint256 collateralProfileIndex
    ) public view returns (bool) {
        return collateralProfileIndex == _nftProfileIndex;
    }

    function owner() external view returns (address) {
        return _owner;
    }
}