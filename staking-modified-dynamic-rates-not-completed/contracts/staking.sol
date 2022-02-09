// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
import 'hardhat/console.sol';
import './roles.sol';

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
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
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20_LP {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function getReserves() external view returns (uint112, uint112, uint32);
}

contract Staking is Roles {
    struct DepositProfile {
        address depositContractAddress;
        address yieldContractAddress;
        uint8 depositType;
        uint16 apr; // apr (% * 100, 2501 means 25.01%)
        uint16 compoundIndex; // additional factor for compound yield calculation * 10000
        uint16 withdrawYieldTax; // tax (% * 100, 2501 means 25.01%),
        // for depositType LP_TOKEN tax will be applied before lockTime end
        // when withdraw yield
        uint16 downgradeTax; // tax (% * 100, 2501 means 25.01%)
        uint256 depositUsdRate; // deposit currency rate in USD * 10000
        uint256 yieldUsdRate; // yield currency rate in USD * 10000
        uint256 weight; // sorting order at UI (asc from left to right)
        uint256 marketIndex; // market index to treat possible APR changes
        uint256 marketIndexLastTime;
        // timestamp when market index was changed last time
        uint256 lastUsdFactor; // depositUsdRate / yieldUsdRate * SHIFT
        uint256 tvl;  // total amount of tokens deposited in a pool
        uint256 lockTime;
        // lock period for erc20 or taxed withdraw period for LP tokens in seconds
        uint256 upgradeProfileId;
        uint256 downgradeProfileId;
        string name;
        string depositCurrency;
        string yieldCurrency;
        string link;
        bool active;
    }

    mapping (uint256 => DepositProfile) internal _depositProfiles;

    struct Deposit {
        address userAddress;
        uint256 depositProfileId;
        uint256 amount;
        uint256 unlock;
        uint256 lastMarketIndex;
        uint256 initialUsdFactor; // depositUsdRate / yieldUsdRate * SHIFT
        uint256 updatedAt; // timestamp, is resettled to block.timestamp when changed
        uint256 accumulatedYield; // used to store reward when changed
    }
    mapping (uint256 => Deposit) internal _deposits;
    mapping (address => mapping(uint256 => uint256)) internal _usersDepositIndexes;
    mapping (address => bool) _managers;
    mapping (address => bool) _rateManagers;

    address internal _taxReceiverAddress; // address for sending tax tokens
    uint256 internal _depositProfilesNumber;
    uint256 internal _depositsNumber;
    uint256 internal constant YEAR = 365 * 24 * 3600;
    uint256 internal constant SHIFT = 1 ether;
    // used for exponent shifting when calculation market index
    uint256 internal constant DECIMALS = 10000;
    // used for exponent shifting when calculation with decimals
    uint8 internal constant ERC20_TOKEN = 1;
    uint8 internal constant LP_TOKEN = 2;
    uint8 internal constant RATE_MANAGER_ROLE = 1;
    mapping (address => uint256) internal _totalDeposit;
    bool internal _safeMode;

    constructor (
        address newOwner,
        address taxReceiverAddress
    ) {
        _taxReceiverAddress = taxReceiverAddress;
        require(newOwner != address(0), 'Owner address can not be zero');
        addToManagers(newOwner);
        addRole(newOwner, RATE_MANAGER_ROLE);
        transferOwnership(newOwner);
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
            amount
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
        if (_depositProfiles[depositProfileId].depositType == ERC20_TOKEN) {
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
            amount
        );
        return true;
    }

    function downgrade (
        uint256 depositProfileId
    ) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
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
                * _depositProfiles[depositProfileId].downgradeTax / DECIMALS;
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
            amount
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
        uint256 taxAmount;
        IERC20 tokenContract = IERC20(_depositProfiles[depositProfileId].yieldContractAddress);
        if (
            _depositProfiles[depositProfileId].depositType == LP_TOKEN
                && block.timestamp < _deposits[depositId].unlock
        ) {
            taxAmount = amount * _depositProfiles[depositProfileId].withdrawYieldTax / DECIMALS;
        }
        _deposits[depositId].accumulatedYield -= amount;
        uint256 balance = tokenContract.balanceOf(address(this));
        require(amount <= balance, 'Not enough contract balance');
        if (_safeMode) {
            require(balance - amount >= _totalDeposit[address(tokenContract)],
                'Not enough contract balance (safe mode)');
        }
        if (taxAmount > 0){
            amount -= taxAmount;
            tokenContract.transfer(_taxReceiverAddress, taxAmount);
        }
        tokenContract.transfer(msg.sender, amount);
        return true;
    }

    // admin functions
    function addDepositProfile (
        address depositContractAddress,
        address yieldContractAddress,
        uint8 depositType,
        uint16 apr,
        uint16 compoundIndex,
        uint16 withdrawYieldTax,
        uint16 downgradeTax,
        uint256 depositUsdRate,
        uint256 yieldUsdRate,
        uint256 weight,
        uint256 lockTime
    ) external onlyManager returns (bool) {
        require(depositType > 0 && depositType <= LP_TOKEN, 'Unknown type');
        require(withdrawYieldTax <= 9999, 'Not valid withdraw yield tax');
        require(downgradeTax <= 9999, 'Not valid downgrade tax');
        if (compoundIndex < 10000) compoundIndex = 10000;

        _depositProfilesNumber ++;
        require(depositUsdRate > 0, 'Usd rate should be greater than zero');
        require(yieldUsdRate > 0, 'Usd rate should be greater than zero');
        if (depositType != LP_TOKEN) {
            withdrawYieldTax = 0;
        }
        IERC20 token = IERC20(depositContractAddress);
        require(token.decimals() == 18, 'Only for tokens with decimals 18');
        token = IERC20(yieldContractAddress);
        require(token.decimals() == 18, 'Only for tokens with decimals 18');
        _depositProfiles[_depositProfilesNumber].depositContractAddress =
            depositContractAddress;
        _depositProfiles[_depositProfilesNumber].yieldContractAddress =
            yieldContractAddress;
        _depositProfiles[_depositProfilesNumber].depositType = depositType;
        _depositProfiles[_depositProfilesNumber].apr = apr;
        _depositProfiles[_depositProfilesNumber].compoundIndex = compoundIndex;
        _depositProfiles[_depositProfilesNumber].withdrawYieldTax =
            withdrawYieldTax;
        _depositProfiles[_depositProfilesNumber].downgradeTax = downgradeTax;
        _depositProfiles[_depositProfilesNumber].depositUsdRate = depositUsdRate;
        _depositProfiles[_depositProfilesNumber].yieldUsdRate = yieldUsdRate;
        _depositProfiles[_depositProfilesNumber].weight = weight;
        _depositProfiles[_depositProfilesNumber].marketIndex = SHIFT;
        _depositProfiles[_depositProfilesNumber].marketIndexLastTime =
            block.timestamp;
        _depositProfiles[_depositProfilesNumber].lastUsdFactor = SHIFT
            * depositUsdRate
            / yieldUsdRate;
        _depositProfiles[_depositProfilesNumber].lockTime = lockTime;
        return true;
    }

    function setDepositProfileData (
        string calldata name,
        string calldata depositCurrency,
        string calldata yieldCurrency,
        string calldata link,
        bool active
    ) external onlyManager returns (bool) {
        _depositProfiles[_depositProfilesNumber].name = name;
        _depositProfiles[_depositProfilesNumber].depositCurrency = depositCurrency;
        _depositProfiles[_depositProfilesNumber].yieldCurrency = yieldCurrency;
        _depositProfiles[_depositProfilesNumber].link = link;
        _depositProfiles[_depositProfilesNumber].active = active;
        return true;
    }

    function setDepositProfileApr (
        uint256 depositProfileId,
        uint16 apr,
        uint16 compoundIndex
    ) external onlyManager returns (bool) {
        require(
            depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found'
        );
        if (compoundIndex < 10000) compoundIndex = 10000;
        _updateMarketIndexes(depositProfileId);
        _depositProfiles[depositProfileId].apr = apr;
        _depositProfiles[depositProfileId].compoundIndex = compoundIndex;
        return true;
    }

    function setDepositProfileWithdrawYieldTax (
        uint256 depositProfileId,
        uint16 withdrawYieldTax
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(
            _depositProfiles[depositProfileId].depositType == LP_TOKEN,
            'Tax for yield withdrawal can be set for LP vaults only'
        );
        require(withdrawYieldTax <= 9999, 'Not valid withdraw yield tax');
        _depositProfiles[depositProfileId].withdrawYieldTax = withdrawYieldTax;
        return true;
    }

    function setDepositProfileDowngradeTax (
        uint256 depositProfileId,
        uint16 downgradeTax
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(downgradeTax <= 9999, 'Not valid downgrade tax');
        _depositProfiles[depositProfileId].downgradeTax = downgradeTax;
        return true;
    }

    function setDepositProfileDepositUsdRate (
        uint256 depositProfileId,
        uint256 depositUsdRate
    ) external hasRole(RATE_MANAGER_ROLE) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(depositUsdRate > 0, 'Deposit usd rate should be greater than zero');
        _updateMarketIndexes(depositProfileId);
        _depositProfiles[depositProfileId].lastUsdFactor =
            SHIFT
                * _depositProfiles[depositProfileId].depositUsdRate
                / _depositProfiles[depositProfileId].yieldUsdRate;
        _depositProfiles[depositProfileId].depositUsdRate = depositUsdRate;
        return true;
    }

    function setDepositProfileYieldUsdRate (
        uint256 depositProfileId,
        uint256 yieldUsdRate
    ) external hasRole(RATE_MANAGER_ROLE) returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(yieldUsdRate > 0, 'Yield usd rate should be greater than zero');
        _updateMarketIndexes(depositProfileId);
        _depositProfiles[depositProfileId].lastUsdFactor =
            SHIFT
                * _depositProfiles[depositProfileId].depositUsdRate
                / _depositProfiles[depositProfileId].yieldUsdRate;
        _depositProfiles[depositProfileId].yieldUsdRate = yieldUsdRate;
        return true;
    }

    function setDepositProfileWeight (
        uint256 depositProfileId,
        uint256 weight
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].weight = weight;
        return true;
    }

    function setDepositProfileLockTime (
        uint256 depositProfileId,
        uint256 lockTime
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].lockTime = lockTime;

        return true;
    }

    function setDepositProfileName (
        uint256 depositProfileId,
        string calldata name
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].name = name;
        return true;
    }

    function setDepositProfileDepositCurrency (
        uint256 depositProfileId,
        string calldata depositCurrency
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].depositCurrency = depositCurrency;
        return true;
    }

    function setDepositProfileYieldCurrency (
        uint256 depositProfileId,
        string calldata yieldCurrency
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].yieldCurrency = yieldCurrency;
        return true;
    }

    function setDepositProfileLink (
        uint256 depositProfileId,
        string calldata link
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].link = link;
        return true;
    }

    function setDepositProfileStatus (
        uint256 depositProfileId,
        bool active
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].active = active;
        return true;
    }

    function setDepositProfileDowngradeProfileId (
        uint256 depositProfileId,
        uint256 downgradeProfileId
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(downgradeProfileId > 0 && downgradeProfileId <= _depositProfilesNumber,
            'Downgrade deposit profile is not found');
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
    ) external onlyManager returns (bool) {
        require(depositProfileId > 0 && depositProfileId <= _depositProfilesNumber,
            'Deposit profile is not found');
        require(upgradeProfileId > 0 && upgradeProfileId <= _depositProfilesNumber,
            'Downgrade deposit profile is not found');
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

    function setSafeMode (bool safeMode) external onlyManager returns (bool) {
        _safeMode = safeMode;
        return true;
    }

    function setTaxReceiverAddress (
        address taxReceiverAddress
    ) external onlyManager returns (bool) {
        _taxReceiverAddress = taxReceiverAddress;
        return true;
    }

    // admin functions
    function adminWithdrawToken (
        uint256 amount, address tokenAddress
    ) external onlyOwner
    returns (bool) {
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

    // internal functions
    function _addToDeposit (
        address userAddress,
        uint256 depositProfileId,
        uint256 amount
    ) internal returns (bool) {
        uint256 depositId = _usersDepositIndexes[userAddress][depositProfileId];
        if (depositId > 0) {
            _updateYield(depositId);
            _deposits[depositId].amount += amount;
            _deposits[depositId].unlock =
                _depositProfiles[depositProfileId].lockTime + block.timestamp;
        } else {
            _depositsNumber ++;
            depositId = _depositsNumber;
            _deposits[depositId].userAddress = userAddress;
            _deposits[depositId].depositProfileId = depositProfileId;
            _deposits[depositId].amount = amount;
            _deposits[depositId].unlock = _depositProfiles[depositProfileId].lockTime
                + block.timestamp;
            _deposits[depositId].lastMarketIndex =
                _depositProfiles[depositProfileId].marketIndex;
            _deposits[depositId].initialUsdFactor =
                _depositProfiles[depositProfileId].lastUsdFactor;
            _deposits[depositId].updatedAt = block.timestamp;
            _usersDepositIndexes[userAddress][depositProfileId] = depositId;
        }
        return true;
    }

    function _updateMarketIndexes (
        uint256 depositProfileId
    ) internal returns (bool) {
        uint256 period = block.timestamp - _depositProfiles[depositProfileId].marketIndexLastTime;
        uint256 marketFactor = SHIFT + SHIFT
            * _depositProfiles[depositProfileId].apr
            * period
            * _depositProfiles[depositProfileId].depositUsdRate
            * SHIFT
            / _depositProfiles[depositProfileId].lastUsdFactor
            / _depositProfiles[depositProfileId].yieldUsdRate
            / DECIMALS
            / YEAR;
        console.log('---updateMarketIndex--start---');
        console.log('marketIndex 1', _depositProfiles[depositProfileId].marketIndex);
        console.log('apr', _depositProfiles[depositProfileId].apr);
        console.log('period', period);
        console.log('depositUsdRate', _depositProfiles[depositProfileId].depositUsdRate);
        console.log('lastUsdFactor', _depositProfiles[depositProfileId].lastUsdFactor);
        console.log('yieldUsdRate', _depositProfiles[depositProfileId].yieldUsdRate);
        console.log('marketFactor', marketFactor);

        _depositProfiles[depositProfileId].marketIndex =
            _depositProfiles[depositProfileId].marketIndex * marketFactor / SHIFT;

        console.log('marketIndex', _depositProfiles[depositProfileId].marketIndex);
        console.log('---updateMarketIndex--end---');
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
        uint8 depositType,
        uint256 lockTime,
        uint256 tvl,
        bool active
    ) {
        return (
            _depositProfiles[depositProfileId].depositContractAddress,
            _depositProfiles[depositProfileId].yieldContractAddress,
            _depositProfiles[depositProfileId].depositType,
            _depositProfiles[depositProfileId].lockTime,
            _depositProfiles[depositProfileId].tvl,
            _depositProfiles[depositProfileId].active
        );
    }

    // view functions
    function getDepositProfileExtra (
        uint256 depositProfileId
    ) external view returns (
        uint256 weight,
        string memory name,
        string memory depositCurrency,
        string memory yieldCurrency,
        string memory link
    ) {
        return (
            _depositProfiles[depositProfileId].weight,
            _depositProfiles[depositProfileId].name,
            _depositProfiles[depositProfileId].depositCurrency,
            _depositProfiles[depositProfileId].yieldCurrency,
            _depositProfiles[depositProfileId].link
        );
    }

    function getDepositProfileRates (
        uint256 depositProfileId
    ) external view returns (
        uint16 apr,
        uint16 compoundIndex,
        uint16 withdrawYieldTax,
        uint16 downgradeTax,
        uint256 depositUsdRate,
        uint256 yieldUsdRate
    ) {
        return (
            _depositProfiles[depositProfileId].apr,
            _depositProfiles[depositProfileId].compoundIndex,
            _depositProfiles[depositProfileId].withdrawYieldTax,
            _depositProfiles[depositProfileId].downgradeTax,
            _depositProfiles[depositProfileId].depositUsdRate,
            _depositProfiles[depositProfileId].yieldUsdRate
        );
    }

    function getDepositProfileMarketData (
        uint256 depositProfileId
    ) external view returns (
        uint256 marketIndex,
        uint256 marketIndexLastTime,
        uint256 lastUsdFactor
    ) {
        return (
            _depositProfiles[depositProfileId].marketIndex,
            _depositProfiles[depositProfileId].marketIndexLastTime,
            _depositProfiles[depositProfileId].lastUsdFactor
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
        address userAddress, uint256 depositProfileId, uint256 amount,
        uint256 unlock, uint256 updatedAt, uint256 accumulatedYield
    ) {
        return (
            _deposits[depositId].userAddress,
            _deposits[depositId].depositProfileId,
            _deposits[depositId].amount,
            _deposits[depositId].unlock,
            _deposits[depositId].updatedAt,
            _deposits[depositId].accumulatedYield
        );
    }

    function getDepositMarketData (
        uint256 depositId
    ) external view returns (
        uint256 lastMarketIndex,
        uint256 initialUsdFactor
    ) {
        return (
            _deposits[depositId].lastMarketIndex,
            _deposits[depositId].initialUsdFactor
        );
    }

    function getUserDeposit (
        address userAddress, uint256 depositProfileId
    ) external view returns (
        uint256 depositIndex, uint256 amount, uint256 unlock,
        uint256 updatedAt, uint256 accumulatedYield
    ) {
        uint256 depositId = _usersDepositIndexes[userAddress][depositProfileId];
        return (
            depositId,
            _deposits[depositId].amount,
            _deposits[depositId].unlock,
            _deposits[depositId].updatedAt,
            _deposits[depositId].accumulatedYield
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

        uint256 yield =
            _deposits[depositId].amount
                * _deposits[depositId].initialUsdFactor
                * marketIndex
                / SHIFT
                / _deposits[depositId].lastMarketIndex
            -
            _deposits[depositId].amount
                * _deposits[depositId].initialUsdFactor
                / SHIFT;

        console.log('---calculateYield--start---');

        console.log('amount', _deposits[depositId].amount);
        console.log('initialUsdFactor', _deposits[depositId].initialUsdFactor);
        console.log('marketIndex', marketIndex);
        console.log('lastMarketIndex', _deposits[depositId].lastMarketIndex);
        console.log('yield', yield);
        if (extraPeriod > 0) {
            yield += _calculateExtraYield(
                depositId, extraPeriod
            );
        }
        console.log('final yield', yield);
        console.log('---calculateYield--end---');

        return yield;
    }

    function _calculateExtraYield (
        uint256 depositId,
        uint256 extraPeriod
    ) internal view returns (uint256) {
        console.log('---extra yield---');
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        uint256 extraYield = _deposits[depositId].amount
            * _depositProfiles[depositProfileId].apr
            * _depositProfiles[depositProfileId].compoundIndex
            * extraPeriod
            * _depositProfiles[depositProfileId].depositUsdRate
            / _depositProfiles[depositProfileId].yieldUsdRate
            / DECIMALS
            / DECIMALS
            / YEAR;
        console.log('apr', _depositProfiles[depositProfileId].apr);
        console.log('compoundIndex', _depositProfiles[depositProfileId].compoundIndex);
        console.log('extraPeriod', extraPeriod);
        console.log('depositUsdRate', _depositProfiles[depositProfileId].depositUsdRate);
        console.log('extraYield', extraYield);
        return extraYield;
    }

    function getDepositYield (
        uint256 depositId
    ) external view returns (uint256) {
        if (_deposits[depositId].depositProfileId == 0) return 0;
        return calculateYield(depositId) + _deposits[depositId].accumulatedYield;
    }

    function getTimestamp() external view returns (uint256) {
        return block.timestamp;
    }
}