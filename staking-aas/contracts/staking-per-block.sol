// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
import 'hardhat/console.sol';
import './access-control.sol';

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

contract Staking is AccessControl {
    struct LockProfile {
        address contractAddress;
        uint256 amount;
        bool active;
    }
    mapping (uint256 => LockProfile) internal _lockProfiles;

    struct DepositProfile {
        address poolOwnerAddress;
        address depositContractAddress;
        address yieldContractAddress;
        address lockContractAddress;
        uint256 lockedAmount;
        uint256 apr;
        uint256 poolSize;
        uint256 period;
        uint256 yieldPerToken; // total accrued yield per token
        uint256 lastTimestamp;
        // block timestamp when yieldPerToken was changed last time
        uint256 endTime;
        uint256 tvl; // total amount of tokens deposited in a pool
        uint256 stakers;
        uint256 yieldPaid;
        string name;
        string depositCurrency;
        string yieldCurrency;
        string link;
        bool active;
    }

    mapping (uint256 => DepositProfile) internal _depositProfiles;
    mapping (address => uint256) internal _userDepositProfilesNumber;
    mapping (address => mapping (uint256 => uint256)) internal _userDepositProfileIds;

    struct Deposit {
        address userAddress;
        uint256 depositProfileId;
        uint256 amount;
        uint256 updatedAt; // is resettled to block.timestamp when changed
        uint256 accumulatedYield; // used to store reward when changed
        uint256 yieldPerTokenOffset; // used to take into account accrued total yield
    }
    mapping (uint256 => Deposit) internal _deposits;
    mapping (address => mapping(uint256 => uint256)) internal _usersDepositIndexes;
    // userAddress => depositProfileId => depositId
    mapping (address => bool) internal _tokenInUse;
    // tokenAddress => is in use as a deposit or yield contract
    address internal _taxReceiverAddress; // address for sending tax tokens
    uint256 internal _tax;
    uint256 internal _blockTime; // in milliseconds
    uint256 internal _lockProfilesNumber;
    uint256 internal _depositProfilesNumber;
    uint256 internal _depositsNumber;
    uint256 internal constant SHIFT = 1 ether;
    uint256 internal constant YEAR = 365 * 24 * 3600;
    // used for exponent shifting for yieldPerToken calculation
    uint256 internal constant DECIMALS = 10000;
    // used for exponent shifting when calculation with decimals

    constructor (
        address newOwner,
        address taxReceiverAddress,
        uint256 tax,
        uint256 blockTime
    ) {
        _taxReceiverAddress = taxReceiverAddress;
        require(newOwner != address(0), 'Owner address can not be zero');
        require(blockTime > 0, 'Block time should be greater than zero');
        addToManagers(newOwner);
        transferOwnership(newOwner);
        _tax = tax;
        _blockTime = blockTime;
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
        if (_depositProfiles[_depositProfilesNumber].endTime == 0) {
            _depositProfiles[_depositProfilesNumber].endTime =
                block.timestamp + _depositProfiles[_depositProfilesNumber].period;
        }
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
        _updateUserYield(depositId);
        _updateTotalYield(depositProfileId);
        require(_deposits[depositId].amount >= amount, 'Not enough amount at deposit');
        _deposits[depositId].amount -= amount;
        _depositProfiles[depositProfileId].tvl -= amount;
        if (_depositProfiles[depositProfileId].apr == 0) {
            _deposits[depositId].yieldPerTokenOffset
                = _depositProfiles[depositProfileId].yieldPerToken;
        }
        IERC20 depositTokenContract =
            IERC20(_depositProfiles[depositProfileId].depositContractAddress);
        depositTokenContract.transfer(msg.sender, amount);
        return true;
    }

    function withdrawYield (
        uint256 amount, uint256 depositProfileId, bool updated
    ) public returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        require(
            _depositProfiles[depositProfileId].active, 'This deposit profile is disabled'
        );
        IERC20 tokenContract = IERC20(_depositProfiles[depositProfileId].yieldContractAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        if (amount > balance) amount = balance;
        require(amount > 0, 'Amount should be greater than zero');
        if (!updated) _updateUserYield(depositId);
        _updateTotalYield(depositProfileId);
        require(
            _deposits[depositId].accumulatedYield >= amount,
                'Not enough yield at deposit'
        );
        _deposits[depositId].accumulatedYield -= amount;
        _depositProfiles[depositProfileId].yieldPaid += amount;
        if (_depositProfiles[depositProfileId].apr == 0) {
            _deposits[depositId].yieldPerTokenOffset
            = _depositProfiles[depositProfileId].yieldPerToken;
        }
        tokenContract.transfer(msg.sender, amount);
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
        _updateUserYield(depositId);
        uint256 amount = _deposits[depositId].accumulatedYield;
        require(amount > 0, 'Nothing to withdraw');
        return withdrawYield(amount, depositProfileId, true);
    }

    function withdrawLockedAssets (
        uint256 depositProfileSerialNumber
    ) external returns (bool) {
        uint256 depositProfileId =
            _userDepositProfileIds[msg.sender][depositProfileSerialNumber];
        require(depositProfileId > 0,
            'Deposit profile is not found');
        require(
            _depositProfiles[depositProfileId].endTime <= block.timestamp,
                'Locked assets can not be withdrawn at the moment'
        );
        require(
            _depositProfiles[depositProfileId].lockedAmount > 0,
                'Locked assets are already withdrawn'
        );
        IERC20 lockedTokenContract = IERC20(
            _depositProfiles[depositProfileId].lockContractAddress
        );
        uint256 amount = _depositProfiles[depositProfileId].lockedAmount;
        uint256 taxAmount = amount * _tax / DECIMALS;
        _depositProfiles[depositProfileId].lockedAmount = 0;
        lockedTokenContract.transfer(_taxReceiverAddress, taxAmount);
        lockedTokenContract.transfer(msg.sender, amount - taxAmount);
        return true;
    }

    function addDepositProfile (
        uint256 lockProfileId,
        address depositContractAddress,
        address yieldContractAddress,
        uint256 poolSize,
        uint256 period,
        uint256 apr
    ) external returns (bool) {
        require(
            lockProfileId > 0 && lockProfileId <= _lockProfilesNumber,
                'Lock profile is not found'
        );
        require(
            !_tokenInUse[depositContractAddress],
                'Deposit contract address is in use'
        );
        require(
            !_tokenInUse[yieldContractAddress],
                'Yield contract address is in use'
        );
        IERC20 token = IERC20(yieldContractAddress);
        _tokenInUse[depositContractAddress] = true;
        _tokenInUse[yieldContractAddress] = true;
        uint256 yieldMaxAmount;
        if (apr > 0) {
            yieldMaxAmount = poolSize * apr * period / YEAR / DECIMALS;
        } else {
            yieldMaxAmount = poolSize;
        }
        token.transferFrom(
            msg.sender, address(this), yieldMaxAmount
        );
        token = IERC20(_lockProfiles[lockProfileId].contractAddress);
        token.transferFrom(
            msg.sender, address(this), _lockProfiles[lockProfileId].amount
        );

        _depositProfilesNumber ++;
        _depositProfiles[_depositProfilesNumber].lockContractAddress =
            _lockProfiles[lockProfileId].contractAddress;
        _depositProfiles[_depositProfilesNumber].lockedAmount =
            _lockProfiles[lockProfileId].amount;
        _depositProfiles[_depositProfilesNumber].poolOwnerAddress = msg.sender;
        _depositProfiles[_depositProfilesNumber].depositContractAddress =
            depositContractAddress;
        _depositProfiles[_depositProfilesNumber].yieldContractAddress =
            yieldContractAddress;
        _depositProfiles[_depositProfilesNumber].poolSize = poolSize;
        _depositProfiles[_depositProfilesNumber].apr = apr;
        _depositProfiles[_depositProfilesNumber].period = period;
        _depositProfiles[_depositProfilesNumber].lastTimestamp =
            block.timestamp;
        _userDepositProfilesNumber[msg.sender] ++;
        _userDepositProfileIds[msg.sender][
            _userDepositProfilesNumber[msg.sender]
        ] = _depositProfilesNumber;
        return true;
    }

    // manager functions
    function addLockProfile (
        address contractAddress,
        uint256 amount,
        bool active
    ) external onlyManager returns (bool) {
        require(
            !_tokenInUse[contractAddress],
                'This token address is in use already'
        );
        _tokenInUse[contractAddress] = true;
        _lockProfilesNumber ++;
        IERC20 token = IERC20(contractAddress);
        require(token.decimals() == 18, 'Only for tokens with decimals 18');
        _lockProfiles[_lockProfilesNumber].contractAddress = contractAddress;
        _lockProfiles[_lockProfilesNumber].amount = amount;
        _lockProfiles[_lockProfilesNumber].active = active;
        return true;
    }

    function setLockProfileAmount (
        uint256 lockProfileId,
        uint256 amount
    ) external onlyManager returns (bool) {
        require(lockProfileId > 0 && lockProfileId <= _lockProfilesNumber,
            'Lock profile is not found');
        _lockProfiles[lockProfileId].amount = amount;
        return true;
    }

    function setLockProfileStatus (
        uint256 lockProfileId,
        bool active
    ) external onlyManager returns (bool) {
        require(lockProfileId > 0 && lockProfileId <= _lockProfilesNumber,
            'Lock profile is not found');
        _lockProfiles[lockProfileId].active = active;
        return true;
    }


    function setDepositProfileExtra (
        uint256 depositProfileSerialNumber,
        string calldata name,
        string calldata depositCurrency,
        string calldata yieldCurrency,
        string calldata link,
        bool active
    ) external returns (bool) {
        uint256 depositProfileId =
            _userDepositProfileIds[msg.sender][depositProfileSerialNumber];
        require(depositProfileId > 0,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].name = name;
        _depositProfiles[depositProfileId].depositCurrency = depositCurrency;
        _depositProfiles[depositProfileId].yieldCurrency = yieldCurrency;
        _depositProfiles[depositProfileId].link = link;
        _depositProfiles[depositProfileId].active = active;
        return true;
    }

    function setDepositProfileStatus (
        uint256 depositProfileSerialNumber,
        bool active
    ) external returns (bool) {
        uint256 depositProfileId =
            _userDepositProfileIds[msg.sender][depositProfileSerialNumber];
        require(depositProfileId > 0,
            'Deposit profile is not found');
        _depositProfiles[depositProfileId].active = active;
        return true;
    }

    function setTaxReceiverAddress (
        address taxReceiverAddress
    ) external onlyManager returns (bool) {
        _taxReceiverAddress = taxReceiverAddress;
        return true;
    }

    function setTax (
        uint256 tax
    ) external onlyManager returns (bool) {
        _tax = tax;
        return true;
    }

    function setBlockTime (
        uint256 blockTime
    ) external onlyManager returns (bool) {
        require(blockTime > 0, 'Block time should be greater than zero');
        _blockTime = blockTime;
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
            _updateUserYield(depositId);
            _deposits[depositId].amount += amount;
        } else {
            _depositsNumber ++;
            _depositProfiles[depositProfileId].stakers ++;
            depositId = _depositsNumber;
            _deposits[depositId].userAddress = userAddress;
            _deposits[depositId].depositProfileId = depositProfileId;
            _deposits[depositId].amount = amount;
            _deposits[depositId].updatedAt = block.timestamp;
            _usersDepositIndexes[userAddress][depositProfileId] = depositId;
        }
        _updateTotalYield(depositProfileId);
        if (_depositProfiles[depositProfileId].apr == 0) {
            _deposits[depositId].yieldPerTokenOffset
                = _depositProfiles[depositProfileId].yieldPerToken;
        }
        return true;
    }

    function _updateTotalYield (
        uint256 depositProfileId
    ) internal returns (bool) {
        if (_depositProfiles[depositProfileId].apr > 0) return false;
        uint256 endTime = block.timestamp;
        if (
            _depositProfiles[depositProfileId].endTime > 0
                && endTime > _depositProfiles[depositProfileId].endTime
        ) {
            endTime = _depositProfiles[depositProfileId].endTime;
        }
        uint256 period = endTime
            - _depositProfiles[depositProfileId].lastTimestamp;
        if (period == 0) return false;
        if (_depositProfiles[depositProfileId].tvl > 0) {
            _depositProfiles[depositProfileId].yieldPerToken += SHIFT
                * period
                * _depositProfiles[depositProfileId].poolSize
                / _depositProfiles[depositProfileId].period
                / _depositProfiles[depositProfileId].tvl;
        }
        _depositProfiles[depositProfileId].lastTimestamp = endTime;
        return true;
    }

    function _updateUserYield (uint256 depositId) internal returns (bool) {
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        if (depositProfileId == 0) return false;
        uint256 yield = calculateYield(depositId);
        _deposits[depositId].accumulatedYield += yield;
        if (_depositProfiles[depositProfileId].apr == 0) {
            _deposits[depositId].yieldPerTokenOffset
            = _depositProfiles[depositProfileId].yieldPerToken;
        }
        _deposits[depositId].updatedAt = block.timestamp;
        return true;
    }

    // view functions
    function getLockProfilesNumber () external view returns (uint256) {
        return _lockProfilesNumber;
    }

    function getLockProfile (
        uint256 lockProfileId
    ) external view returns (
        address contractAddress,
        uint256 amount,
        bool active
    ) {
        return (
            _lockProfiles[lockProfileId].contractAddress,
            _lockProfiles[lockProfileId].amount,
            _lockProfiles[lockProfileId].active
        );
    }

    function getDepositProfilesNumber () external view returns (uint256) {
        return _depositProfilesNumber;
    }

    function getDepositProfile (
        uint256 depositProfileId
    ) external view returns (
        address depositContractAddress,
        address yieldContractAddress,
        address lockContractAddress,
        uint256 poolSize,
        uint256 period,
        uint256 tvl,
        bool active
    ) {
        return (
            _depositProfiles[depositProfileId].depositContractAddress,
            _depositProfiles[depositProfileId].yieldContractAddress,
            _depositProfiles[depositProfileId].lockContractAddress,
            _depositProfiles[depositProfileId].poolSize,
            _depositProfiles[depositProfileId].period,
            _depositProfiles[depositProfileId].tvl,
            _depositProfiles[depositProfileId].active
        );
    }

    function getDepositProfileExtra (
        uint256 depositProfileId
    ) external view returns (
        address poolOwnerAddress,
        string memory name,
        string memory depositCurrency,
        string memory yieldCurrency,
        string memory link,
        uint256 lastTimestamp,
        uint256 endTime
    ) {
        return (
            _depositProfiles[depositProfileId].poolOwnerAddress,
            _depositProfiles[depositProfileId].name,
            _depositProfiles[depositProfileId].depositCurrency,
            _depositProfiles[depositProfileId].yieldCurrency,
            _depositProfiles[depositProfileId].link,
            _depositProfiles[depositProfileId].lastTimestamp,
            _depositProfiles[depositProfileId].endTime
        );
    }

    function getDepositProfileData (
        uint256 depositProfileId
    ) external view returns (
        uint256 apr,
        uint256 lockedAmount,
        uint256 tvl,
        uint256 stakers,
        uint256 yieldPaid,
        uint256 yieldPerToken
    ) {
        return (
            _depositProfiles[depositProfileId].apr,
            _depositProfiles[depositProfileId].lockedAmount,
            _depositProfiles[depositProfileId].tvl,
            _depositProfiles[depositProfileId].stakers,
            _depositProfiles[depositProfileId].yieldPaid,
            _depositProfiles[depositProfileId].yieldPerToken
        );
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
        uint256 updatedAt,
        uint256 accumulatedYield,
        uint256 yieldPerTokenOffset
    ) {
        return (
            _deposits[depositId].userAddress,
            _deposits[depositId].depositProfileId,
            _deposits[depositId].amount,
            _deposits[depositId].updatedAt,
            _deposits[depositId].accumulatedYield,
            _deposits[depositId].yieldPerTokenOffset
        );
    }

    function getUserDeposit (
        address userAddress, uint256 depositProfileId
    ) external view returns (
        uint256 depositIndex,
        uint256 amount,
        uint256 updatedAt,
        uint256 accumulatedYield
    ) {
        uint256 depositId = _usersDepositIndexes[userAddress][depositProfileId];
        return (
            depositId,
            _deposits[depositId].amount,
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

    function getTokenInUse (
        address tokenAddress
    ) external view returns (bool) {
        return _tokenInUse[tokenAddress];
    }

    function getTaxReceiverAddress () external view returns (address) {
        return _taxReceiverAddress;
    }

    function getTax () external view returns (uint256) {
        return _tax;
    }

    function calculateYield (
        uint256 depositId
    ) public view returns (uint256) {
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        if (depositProfileId == 0) return 0;
        if (_depositProfiles[depositProfileId].apr == 0) {
            return _calculateDynamicYield(depositId, depositProfileId);
        } else {
           return _calculateFixedYield(depositId, depositProfileId);
        }
    }

    function _calculateFixedYield (
        uint256 depositId,
        uint256 depositProfileId
    ) internal view returns (uint256) {
        if (_deposits[depositId].amount == 0) return 0;
        uint256 endTime = block.timestamp;
        if (
            _depositProfiles[depositProfileId].endTime > 0
                && endTime > _depositProfiles[depositProfileId].endTime
        ) {
            endTime = _depositProfiles[depositProfileId].endTime;
        }
        uint256 period = endTime - _deposits[depositId].updatedAt;
        return _deposits[depositId].amount
            * period
            * _depositProfiles[depositProfileId].apr
            / DECIMALS
            / YEAR;
    }

    function _calculateDynamicYield (
        uint256 depositId,
        uint256 depositProfileId
    ) internal view returns (uint256) {
        uint256 extraPeriodStartTime
            = _depositProfiles[depositProfileId].lastTimestamp;
        if (extraPeriodStartTime < _deposits[depositId].updatedAt) {
            extraPeriodStartTime = _deposits[depositId].updatedAt;
        }
        uint256 endTime = block.timestamp;
        if (
            _depositProfiles[depositProfileId].endTime > 0
                && endTime > _depositProfiles[depositProfileId].endTime
        ) {
            endTime = _depositProfiles[depositProfileId].endTime;
        }
        uint256 extraPeriod;
        if (endTime > extraPeriodStartTime) {
            extraPeriod = endTime - extraPeriodStartTime;
        }
        uint256 yieldPerToken = _depositProfiles[depositProfileId].yieldPerToken;
        if (extraPeriod > 0) {
            yieldPerToken += SHIFT
                * extraPeriod
                * _depositProfiles[depositProfileId].poolSize
                / _depositProfiles[depositProfileId].period
                / _depositProfiles[depositProfileId].tvl;
        }
        uint256 yield = (yieldPerToken - _deposits[depositId].yieldPerTokenOffset)
            * _deposits[depositId].amount / SHIFT;
        return yield;
    }

    function getDepositYield (
        uint256 depositId
    ) external view returns (uint256) {
        if (_deposits[depositId].depositProfileId == 0) return 0;
        return calculateYield(depositId)
            + _deposits[depositId].accumulatedYield;
    }

    function getBlockTime() external view returns (uint256) {
        return _blockTime;
    }

    function getTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function getUserDepositProfilesNumber(
        address userAddress
    ) external view returns (uint256) {
        return _userDepositProfilesNumber[userAddress];
    }

    function getUserDepositProfileId(
        address userAddress,
        uint256 serialNumber
    ) external view returns (uint256) {
        return _userDepositProfileIds[userAddress][serialNumber];
    }
}
