// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import 'hardhat/console.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import './common/AccessControl.sol';
import './Storage.sol';

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the Staking contract.
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

contract Staking is Storage, AccessControl, Initializable {
    function initialize (
        address newOwner,
        address taxReceiverAddress,
        address ratesContractAddress
    ) public initializer returns (bool) {
        _taxReceiverAddress = taxReceiverAddress;
        require(newOwner != address(0), 'Owner address can not be zero');
        require(ratesContractAddress != address(0), 'Rates contract address can not be zero');
        _grantRole(MANAGER, newOwner);
        _owner = newOwner;
        _ratesContract = IRates(ratesContractAddress);
        return true;
    }

    function stake (
        uint256 amount, uint256 depositProfileId
    ) external returns (bool) {
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        require(amount > 0, 'Amount should be greater than zero');
        IERC20 depositTokenContract = IERC20(
            _depositProfiles[depositProfileId].depositContractAddress
        );
        depositTokenContract.transferFrom(msg.sender, address(this), amount);
        _addToDeposit(
            msg.sender,
            depositProfileId,
            amount,
            true
        );
        _depositProfiles[depositProfileId].tvl += amount;
        _totalDeposit[_depositProfiles[depositProfileId].depositContractAddress] += amount;

        return true;
    }

    function unStake (
        uint256 amount, uint256 depositProfileId
    ) external returns (bool) {
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        require(amount > 0, 'Amount should be greater than zero');
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        if (
            _depositProfiles[depositProfileId].depositProfileType != LP_FARMING
        ) {
            require(
                block.timestamp >= _deposits[depositId].unlock, 'Deposit is locked'
            );
        }
        _updateYield(depositId);
        require(_deposits[depositId].amount >= amount, 'Not enough amount at deposit');
        _deposits[depositId].amount -= amount;
        _depositProfiles[depositProfileId].tvl -= amount;
        _totalDeposit[_depositProfiles[depositProfileId].depositContractAddress] -= amount;
        IERC20 depositTokenContract =
            IERC20(_depositProfiles[depositProfileId].depositContractAddress);
        depositTokenContract.transfer(msg.sender, amount);

        return true;
    }

    function reStake (uint256 depositProfileId) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        require(
            restakeAvailable(depositProfileId),
            'Restaking is not available for this type of deposit'
        );
        _updateYield(depositId);
        uint256 yield = _deposits[depositId].accumulatedYield;
        _deposits[depositId].accumulatedYield = 0;
        _deposits[depositId].amount += yield;
        _depositProfiles[depositProfileId].tvl += yield;
        _totalDeposit[_depositProfiles[depositProfileId].depositContractAddress] += yield;
        return true;
    }

    function restakeAvailable (
        uint256 depositProfileId
    ) public view returns (bool) {
        return _depositProfiles[depositProfileId].depositContractAddress
            == _depositProfiles[depositProfileId].yieldContractAddress;
    }

    function upgrade (
        uint256 depositProfileId
    ) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        uint256 upgradeProfileId =
            _depositProfiles[depositProfileId].upgradeProfileId;
        require(
            upgradeProfileId > 0,
            'Upgrade for this deposit profile is not possible'
        );
        uint256 amount = _deposits[depositId].amount;
        require(
            amount > 0,
            'Deposit amount should be greater than zero for upgrade'
        );
        _updateYield(depositId);
        _deposits[depositId].amount = 0;
        _depositProfiles[depositProfileId].tvl -= amount;
        _depositProfiles[upgradeProfileId].tvl += amount;
        _addToDeposit(
            msg.sender,
            upgradeProfileId,
            amount,
            false
        );
        return true;
    }

    function downgrade (
        uint256 depositProfileId
    ) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        uint256 downgradeProfileId =
            _depositProfiles[depositProfileId].downgradeProfileId;
        require(
            downgradeProfileId > 0,
            'Upgrade for this deposit profile is not possible'
        );
        uint256 amount = _deposits[depositId].amount;
        uint256 taxAmount;
        if (_depositProfiles[depositProfileId].downgradeTax > 0) {
            taxAmount = amount
                * _depositProfiles[depositProfileId].downgradeTax / SHIFT_PERCENTS;
        }
        if (taxAmount > 0){
            amount -= taxAmount;
            IERC20 tokenContract =
                IERC20(_depositProfiles[depositProfileId].depositContractAddress);
            tokenContract.transfer(_taxReceiverAddress, taxAmount);
        }

        require(
            amount > 0,
            'Deposit amount should be greater than zero for downgrade'
        );
        _updateYield(depositId);
        _deposits[depositId].amount = 0;
        _depositProfiles[depositProfileId].tvl -= amount;
        _depositProfiles[downgradeProfileId].tvl += amount;
        _addToDeposit(
            msg.sender,
            downgradeProfileId,
            amount,
            false
        );
        return true;
    }

    function withdrawYield (
        uint256 amount, uint256 depositProfileId
    ) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        require(amount > 0, 'Amount should be greater than zero');
        _updateYield(depositId);
        require(
            _deposits[depositId].accumulatedYield >= amount, 'Not enough yield at deposit'
        );
        _deposits[depositId].accumulatedYield -= amount;
        uint256 amountWithRate = amount * getDepositProfileRate(depositProfileId) / SHIFT_18;
        uint256 taxAmount;
        if (
            _depositProfiles[depositProfileId].depositProfileType == LP_FARMING
        ) {
            taxAmount = amountWithRate * _depositProfiles[depositProfileId].withdrawYieldTax / SHIFT_PERCENTS;
        }
        IERC20 tokenContract = IERC20(_depositProfiles[depositProfileId].yieldContractAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(amountWithRate <= balance, 'Not enough contract balance');
        if (_safeMode) {
            require(balance - amountWithRate >= _totalDeposit[address(tokenContract)],
                'Not enough contract balance (safe mode)');
        }
        if (taxAmount > 0) {
            amountWithRate -= taxAmount;
            tokenContract.transfer(_taxReceiverAddress, taxAmount);
        }
        _depositProfiles[depositProfileId].yieldPaid += amountWithRate;
        tokenContract.transfer(msg.sender, amountWithRate);
        return true;
    }

    function withdrawYieldAll (
        uint256 depositProfileId
    ) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        _updateYield(depositId);
        uint256 amount = _deposits[depositId].accumulatedYield;
        require(amount > 0, 'Nothing to withdraw');
        _deposits[depositId].accumulatedYield = 0;
        uint256 amountWithRate = amount * getDepositProfileRate(depositProfileId) / SHIFT_18;
        uint256 taxAmount;
        if (
            _depositProfiles[depositProfileId].depositProfileType == LP_FARMING
        ) {
            taxAmount = amountWithRate * _depositProfiles[depositProfileId].withdrawYieldTax / SHIFT_PERCENTS;
        }
        IERC20 tokenContract = IERC20(_depositProfiles[depositProfileId].yieldContractAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(amountWithRate <= balance, 'Not enough contract balance');
        if (_safeMode) {
            require(balance - amountWithRate >= _totalDeposit[address(tokenContract)],
                'Not enough contract balance (safe mode)');
        }
        if (taxAmount > 0) {
            amountWithRate -= taxAmount;
            tokenContract.transfer(_taxReceiverAddress, taxAmount);
        }
        _depositProfiles[depositProfileId].yieldPaid += amountWithRate;
        tokenContract.transfer(msg.sender, amountWithRate);
        return true;
    }

    // manager functions
    function addDepositProfile (
        address depositContractAddress,
        address yieldContractAddress,
        uint8 depositProfileType,
        uint16 apr,
        uint16 withdrawYieldTax,
        uint16 downgradeTax,
        uint256 weight,
        uint256 lockTime
    ) external hasRole(MANAGER) returns (bool) {
        require(
            depositProfileType > 0 && depositProfileType <= LP_FARMING,
            'Deposit profile type is not valid'
        );
        require(withdrawYieldTax <= 9999, 'Not valid withdraw yield tax');
        require(downgradeTax <= 9999, 'Not valid downgrade tax');

        if (
            depositProfileType != LP_FARMING
        ) {
            withdrawYieldTax = 0;
        }
        _depositProfilesNumber ++;
        _depositProfiles[_depositProfilesNumber].depositContractAddress =
            depositContractAddress;
        _depositProfiles[_depositProfilesNumber].yieldContractAddress =
            yieldContractAddress;
        _depositProfiles[_depositProfilesNumber].depositProfileType = depositProfileType;
        _depositProfiles[_depositProfilesNumber].apr = apr;
        _depositProfiles[_depositProfilesNumber].withdrawYieldTax =
            withdrawYieldTax;
        _depositProfiles[_depositProfilesNumber].downgradeTax = downgradeTax;
        _depositProfiles[_depositProfilesNumber].weight = weight;
        _depositProfiles[_depositProfilesNumber].marketIndex = SHIFT_18;
        _depositProfiles[_depositProfilesNumber].marketIndexLastTime =
            block.timestamp;
        _depositProfiles[_depositProfilesNumber].lockTime = lockTime;
        return true;
    }

    function setDepositProfileData (
        uint256 depositProfileId,
        string calldata name,
        string calldata depositCurrency,
        string calldata yieldCurrency,
        string calldata link,
        bool active
    ) external hasRole(MANAGER) returns (bool) {
        require(
            depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found'
        );
        _depositProfiles[depositProfileId].name = name;
        _depositProfiles[depositProfileId].depositCurrency = depositCurrency;
        _depositProfiles[depositProfileId].yieldCurrency = yieldCurrency;
        _depositProfiles[depositProfileId].link = link;
        _depositProfiles[depositProfileId].active = active;
        return true;
    }

    function setDepositProfileApr (
        uint256 depositProfileId,
        uint16 apr
    ) external hasRole(MANAGER) returns (bool) {
        require(
            depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found'
        );
        _updateMarketIndexes(depositProfileId);
        _depositProfiles[depositProfileId].apr = apr;
        return true;
    }

    function setDepositProfileWithdrawYieldTax (
        uint256 depositProfileId,
        uint16 withdrawYieldTax
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(
            _depositProfiles[depositProfileId].depositProfileType == LP_FARMING,
            'Tax for yield withdrawal can be set for LP Farming vaults only'
        );
        require(withdrawYieldTax <= 9999, 'Not valid withdraw yield tax');
        _depositProfiles[depositProfileId].withdrawYieldTax = withdrawYieldTax;
        return true;
    }

    function setDepositProfileDowngradeTax (
        uint256 depositProfileId,
        uint16 downgradeTax
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(downgradeTax <= 9999, 'Not valid downgrade tax');
        _depositProfiles[depositProfileId].downgradeTax = downgradeTax;
        return true;
    }

    function setDepositProfileWeight (
        uint256 depositProfileId,
        uint256 weight
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].weight = weight;
        return true;
    }

    function setDepositProfileLockTime (
        uint256 depositProfileId,
        uint256 lockTime
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].lockTime = lockTime;
        return true;
    }

    function setDepositProfileName (
        uint256 depositProfileId,
        string calldata name
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].name = name;
        return true;
    }

    function setDepositProfileDepositCurrency (
        uint256 depositProfileId,
        string calldata depositCurrency
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].depositCurrency = depositCurrency;
        return true;
    }

    function setDepositProfileYieldCurrency (
        uint256 depositProfileId,
        string calldata yieldCurrency
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].yieldCurrency = yieldCurrency;
        return true;
    }

    function setDepositProfileLink (
        uint256 depositProfileId,
        string calldata link
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].link = link;
        return true;
    }

    function setDepositProfileStatus (
        uint256 depositProfileId,
        bool active
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].active = active;
        return true;
    }

    function setDepositProfileDowngradeProfileId (
        uint256 depositProfileId,
        uint256 downgradeProfileId
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(downgradeProfileId > 0 && downgradeProfileId <= _depositProfilesNumber,
            'Downgrade deposit profile is not found');
        require(depositProfileId != downgradeProfileId,
            'Downgrade deposit profile can not be same');
        require(
            _depositProfiles[depositProfileId].depositContractAddress ==
                _depositProfiles[downgradeProfileId].depositContractAddress,
            'Deposit contract addresses are different'
        );
        require(
            _depositProfiles[depositProfileId].yieldContractAddress ==
                _depositProfiles[downgradeProfileId].yieldContractAddress,
            'Yield contract addresses are different'
        );
        _depositProfiles[depositProfileId].downgradeProfileId = downgradeProfileId;
        return true;
    }

    function setDepositProfileUpgradeProfileId (
        uint256 depositProfileId,
        uint256 upgradeProfileId
    ) external hasRole(MANAGER) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(upgradeProfileId > 0 && upgradeProfileId <= _depositProfilesNumber,
            'Downgrade deposit profile is not found');
        require(depositProfileId != upgradeProfileId,
            'Upgrade deposit profile can not be same');
        require(
            _depositProfiles[depositProfileId].depositContractAddress ==
                _depositProfiles[upgradeProfileId].depositContractAddress,
            'Deposit contract addresses are different'
        );
        require(
            _depositProfiles[depositProfileId].yieldContractAddress ==
                _depositProfiles[upgradeProfileId].yieldContractAddress,
            'Yield contract addresses are different'
        );
        _depositProfiles[depositProfileId].upgradeProfileId = upgradeProfileId;
        return true;
    }

    function setSafeMode (bool safeMode) external hasRole(MANAGER) returns (bool) {
        _safeMode = safeMode;
        return true;
    }

    function setTaxReceiverAddress (
        address taxReceiverAddress
    ) external hasRole(MANAGER) returns (bool) {
        _taxReceiverAddress = taxReceiverAddress;
        return true;
    }

    function setRatesContract (
        address ratesContract
    ) external hasRole(MANAGER) returns (bool) {
        _ratesContract = IRates(ratesContract);
        return true;
    }

    // Migration functions
    function setUserDeposit (
        address userAddress,
        uint256 depositProfileId,
        uint256 amount,
        uint256 yieldAmount,
        uint256 unlock
    ) external hasRole(MANAGER) returns (bool) {
        require(
            _editMode, 'This function is available only in edit mode'
        );
        uint256 depositId = _usersDepositIndexes[userAddress][depositProfileId];
        if (depositId == 0) {
            return _addDeposit(userAddress, depositProfileId, amount, yieldAmount, unlock);
        }

        _depositProfiles[depositProfileId].tvl -= _deposits[depositId].amount;
        _totalDeposit[_depositProfiles[depositProfileId]
            .depositContractAddress] -= _deposits[depositId].amount;
        _deposits[depositId].amount = amount;
        _deposits[depositId].accumulatedYield = yieldAmount;
        _deposits[depositId].lastMarketIndex =
            _depositProfiles[depositProfileId].marketIndex;
        _deposits[depositId].updatedAt = block.timestamp;
        _deposits[depositId].unlock = unlock;
        _depositProfiles[depositProfileId].tvl += amount;
        _totalDeposit[_depositProfiles[depositProfileId].depositContractAddress] += amount;
        return true;
    }

    function setUserDepositMultiple (
        address[] calldata userAddresses,
        uint256[] calldata depositProfileIds,
        uint256[] calldata amounts,
        uint256[] calldata yieldAmounts,
        uint256[] calldata unlocks
    ) external hasRole(MANAGER) returns (bool) {
        require(
            _editMode, 'This function is available only in edit mode'
        );
        for (uint256 i; i < userAddresses.length; i ++) {
            if (
                i > 100
                    || depositProfileIds.length < i + 1
                    || amounts.length < i + 1
                    || yieldAmounts.length < i + 1
                    || unlocks.length < i + 1
            ) break;

            uint256 depositId = _usersDepositIndexes[userAddresses[i]][depositProfileIds[i]];
            if (depositId > 0) continue;
            _addDeposit(
                userAddresses[i],
                depositProfileIds[i],
                amounts[i],
                yieldAmounts[i],
                unlocks[i]
            );
        }
        return true;
    }

    function _addDeposit (
        address userAddress,
        uint256 depositProfileId,
        uint256 amount,
        uint256 yieldAmount,
        uint256 unlock
    ) internal hasRole(MANAGER) returns (bool) {
        require(
            _editMode, 'This function is available only in edit mode'
        );

        _depositsNumber ++;
        _depositProfiles[depositProfileId].stakers ++;
        uint256 depositId = _depositsNumber;
        _deposits[depositId].userAddress = userAddress;
        _deposits[depositId].depositProfileId = depositProfileId;
        _usersDepositIndexes[userAddress][depositProfileId] = depositId;
        _deposits[depositId].amount = amount;
        _deposits[depositId].accumulatedYield = yieldAmount;
        _deposits[depositId].lastMarketIndex = _depositProfiles[depositProfileId].marketIndex;
        _deposits[depositId].updatedAt = block.timestamp;
        _deposits[depositId].unlock = unlock;
        _depositProfiles[depositProfileId].tvl += amount;
        _totalDeposit[_depositProfiles[depositProfileId].depositContractAddress] += amount;
        return true;
    }

    // admin functions
    function adminWithdrawToken (
        uint256 amount, address tokenAddress
    ) external onlyOwner returns (bool) {
        require(tokenAddress != address(0), 'Token address can not be zero');
        IERC20 tokenContract = IERC20(tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(amount <= balance, 'Not enough contract balance');
        if (_safeMode) {
            require(balance - amount >= _totalDeposit[tokenAddress],
                'Not enough contract balance (safe mode)');
        }
        tokenContract.transfer(msg.sender, amount);
        return true;
    }

    function setEditMode (bool editMode) external onlyOwner returns (bool) {
        _editMode = editMode;
        return true;
    }

    // internal functions
    function _addToDeposit (
        address userAddress,
        uint256 depositProfileId,
        uint256 amount,
        bool updateYield
    ) internal returns (bool) {
        uint256 depositId = _usersDepositIndexes[userAddress][depositProfileId];
        if (depositId > 0) {
            if (updateYield) _updateYield(depositId);
            _deposits[depositId].amount += amount;
            _deposits[depositId].unlock =
                _depositProfiles[depositProfileId].lockTime + block.timestamp;
        } else {
            _depositsNumber ++;
            _depositProfiles[depositProfileId].stakers ++;
            depositId = _depositsNumber;
            _deposits[depositId].userAddress = userAddress;
            _deposits[depositId].depositProfileId = depositProfileId;
            _deposits[depositId].amount = amount;
            _deposits[depositId].unlock = _depositProfiles[depositProfileId].lockTime
                + block.timestamp;
            _deposits[depositId].lastMarketIndex =
                _depositProfiles[depositProfileId].marketIndex;
            _deposits[depositId].updatedAt = block.timestamp;
            _usersDepositIndexes[userAddress][depositProfileId] = depositId;
        }
        return true;
    }

    function _updateMarketIndexes (
        uint256 depositProfileId
    ) internal returns (bool) {
        uint256 period = block.timestamp - _depositProfiles[depositProfileId].marketIndexLastTime;
        uint256 marketFactor = SHIFT_18 + SHIFT_18
            * _depositProfiles[depositProfileId].apr
            * period
            / SHIFT_PERCENTS
            / YEAR;

        _depositProfiles[depositProfileId].marketIndex =
            _depositProfiles[depositProfileId].marketIndex * marketFactor / SHIFT_18;

        _depositProfiles[depositProfileId].marketIndexLastTime = block.timestamp;
        return true;
    }

    function _updateYield (uint256 depositId) internal returns (bool) {
        uint256 yield = calculateYield(depositId);
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        _deposits[depositId].accumulatedYield += yield;
        _deposits[depositId].updatedAt = block.timestamp;
        _deposits[depositId].lastMarketIndex =
            _depositProfiles[depositProfileId].marketIndex;
        return true;
    }

    // view functions
    function getDepositProfilesNumber () external view returns (uint256) {
        return _depositProfilesNumber;
    }

    function getDepositProfile (
        uint256 depositProfileId
    ) external view returns (
        address depositContractAddress,
        address yieldContractAddress,
        uint256 lockTime,
        uint256 tvl,
        bool active
    ) {
        return (
            _depositProfiles[depositProfileId].depositContractAddress,
            _depositProfiles[depositProfileId].yieldContractAddress,
            _depositProfiles[depositProfileId].lockTime,
            _depositProfiles[depositProfileId].tvl,
            _depositProfiles[depositProfileId].active
        );
    }

    function getDepositProfileExtra (
        uint256 depositProfileId
    ) external view returns (
        uint256 stakers,
        uint256 yieldPaid,
        uint256 weight,
        string memory name,
        string memory depositCurrency,
        string memory yieldCurrency,
        string memory link
    ) {
        return (
            _depositProfiles[depositProfileId].stakers,
            _depositProfiles[depositProfileId].yieldPaid,
            _depositProfiles[depositProfileId].weight,
            _depositProfiles[depositProfileId].name,
            _depositProfiles[depositProfileId].depositCurrency,
            _depositProfiles[depositProfileId].yieldCurrency,
            _depositProfiles[depositProfileId].link
        );
    }

    function getDepositProfileRateData (
        uint256 depositProfileId
    ) external view returns (
        uint8 depositProfileType,
        uint16 apr,
        uint16 withdrawYieldTax,
        uint16 downgradeTax,
        uint256 depositUsdRate,
        uint256 yieldUsdRate
    ) {
        return (
            _depositProfiles[depositProfileId].depositProfileType,
            _depositProfiles[depositProfileId].apr,
            _depositProfiles[depositProfileId].withdrawYieldTax,
            _depositProfiles[depositProfileId].downgradeTax,
            getDepositProfileDepositUsdRate(depositProfileId),
            getDepositProfileYieldUsdRate(depositProfileId)
        );
    }

    function getDepositProfileMarketData (
        uint256 depositProfileId
    ) external view returns (
        uint256 marketIndex,
        uint256 marketIndexLastTime
    ) {
        return (
            _depositProfiles[depositProfileId].marketIndex,
            _depositProfiles[depositProfileId].marketIndexLastTime
        );
    }

    function getDepositProfileDowngradeProfileId (
        uint256 depositProfileId
    ) external view returns (uint256) {
        return _depositProfiles[depositProfileId].downgradeProfileId;
    }

    function getDepositProfileUpgradeProfileId (
        uint256 depositProfileId
    ) external view returns (uint256) {
        return _depositProfiles[depositProfileId].upgradeProfileId;
    }

    function getDepositsNumber () external view returns (uint256) {
        return _depositsNumber;
    }

    function getDeposit (
        uint256 depositId
    ) external view returns (
        address userAddress,
        uint256 depositProfileId,
        uint256 amount,
        uint256 unlock,
        uint256 updatedAt,
        uint256 accumulatedYield,
        uint256 lastMarketIndex
    ) {
        return (
            _deposits[depositId].userAddress,
            _deposits[depositId].depositProfileId,
            _deposits[depositId].amount,
            _deposits[depositId].unlock,
            _deposits[depositId].updatedAt,
            _deposits[depositId].accumulatedYield,
            _deposits[depositId].lastMarketIndex
        );
    }

    function getUserDeposit (
        address userAddress, uint256 depositProfileId
    ) external view returns (
        uint256 depositIndex,
        uint256 amount,
        uint256 unlock,
        uint256 updatedAt,
        uint256 accumulatedYield,
        uint256 lastMarketIndex
    ) {
        uint256 depositId = _usersDepositIndexes[userAddress][depositProfileId];
        return (
            depositId,
            _deposits[depositId].amount,
            _deposits[depositId].unlock,
            _deposits[depositId].updatedAt,
            _deposits[depositId].accumulatedYield,
            _deposits[depositId].lastMarketIndex
        );
    }

    function getTokenBalance (
        address tokenAddress
    ) external view returns (uint256) {
        IERC20 tokenContract = IERC20(tokenAddress);
        return tokenContract.balanceOf(address(this));
    }

    function getSafeMode () external view returns (bool) {
        return _safeMode;
    }

    function getEditMode () external view returns (bool) {
        return _editMode;
    }

    function getTaxReceiverAddress () external view returns (address) {
        return _taxReceiverAddress;
    }

    function getTotalDeposit (
        address depositContractAddress
    ) external view returns (uint256) {
        return _totalDeposit[depositContractAddress];
    }

    function calculateYield (
        uint256 depositId
    ) public view returns (uint256) {
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        if (depositProfileId == 0) return 0;
        uint256 marketIndex =
            _depositProfiles[depositProfileId].marketIndex;
        uint256 extraPeriodStartTime
            = _depositProfiles[depositProfileId].marketIndexLastTime;
        if (extraPeriodStartTime < _deposits[depositId].updatedAt) {
            extraPeriodStartTime = _deposits[depositId].updatedAt;
        }
        uint256 extraPeriod = block.timestamp - extraPeriodStartTime;

        if (extraPeriod > 0) {
            uint256 marketFactor = SHIFT_18 + SHIFT_18
                * _depositProfiles[depositProfileId].apr
                * extraPeriod
                / SHIFT_PERCENTS
                / YEAR;
            marketIndex = marketIndex * marketFactor / SHIFT_18;
        }

        uint256 newAmount = _deposits[depositId].amount
            * marketIndex
            / _deposits[depositId].lastMarketIndex;

        uint256 yield = (newAmount - _deposits[depositId].amount);

        return yield;
    }

    function getDepositYield (
        uint256 depositId,
        bool withRates
    ) external view returns (uint256) {
        if (_deposits[depositId].depositProfileId == 0) return 0;
        uint256 yield = calculateYield(depositId) + _deposits[depositId].accumulatedYield;
        if (withRates) {
            return yield * getDepositProfileRate(_deposits[depositId].depositProfileId) / SHIFT_18;
        }
        return yield;
    }

    function getTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function getDepositProfileDepositUsdRate (
        uint256 depositProfileId
    ) public view returns (uint256) {
        if (
            depositProfileId == 0 || depositProfileId > _depositProfilesNumber
        ) {
            return 0;
        }
        return _ratesContract.getUsdRate(_depositProfiles[depositProfileId].depositContractAddress);
    }

    function getDepositProfileYieldUsdRate (
        uint256 depositProfileId
    ) public view returns (uint256) {
        if (
            depositProfileId == 0 || depositProfileId > _depositProfilesNumber
        ) {
            return 0;
        }
        return _ratesContract.getUsdRate(_depositProfiles[depositProfileId].yieldContractAddress);
    }

    function getDepositProfileRate (
        uint256 depositProfileId
    ) public view returns (uint256) {
        if (
            depositProfileId == 0 || depositProfileId > _depositProfilesNumber
        ) {
            return 0;
        }
        uint256 depositRate = getDepositProfileDepositUsdRate(depositProfileId);
        uint256 yieldRate = getDepositProfileYieldUsdRate(depositProfileId);
        require(
            depositRate > 0 && yieldRate > 0, 'Rates error'
        );
        return SHIFT_18
            * getDepositProfileDepositUsdRate(depositProfileId)
            / getDepositProfileYieldUsdRate(depositProfileId);
    }

    function getRatesContract () external view returns (address) {
        return address(_ratesContract);
    }
}
