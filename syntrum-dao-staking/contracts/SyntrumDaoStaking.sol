// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import './common/AccessControl.sol';
import './common/Utils.sol';
import 'hardhat/console.sol';

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

contract SyntrumDaoStaking is AccessControl, Utils {
    struct DepositProfile {
        address depositContractAddress;
        address rewardContractAddress;
        uint256 apr;
        uint256 maxStakedAmount;
        uint256 totalRewardAmount;
        uint256 rewardPerToken; // service variable, total accrued reward per token
        uint256 lastRewardUpdate; // service variable
        // block timestamp when rewardPerToken was changed last time
        uint256 startTime;
        uint256 endTime;
        uint256 lockupStartTime;
        uint256 lockupEndTime;
        uint256 tvs; // total staked amount of tokens
        uint256 tvl; // total locked amount of tokens
        uint256 totalYield; // total yield estimation based on current staked amount
        bool active;
        bool lockupRewardAvailable;
    }

    mapping (uint256 => DepositProfile) internal _depositProfiles;
// todo add lockup activation
// todo add lockup user function
    struct Deposit {
        address userAddress;
        uint256 depositProfileId;
        uint256 stakedAmount;
        uint256 lockedAmount;
        uint256 updatedAt; // is resettled to block.timestamp when changed
        uint256 accumulatedYield; // service variable
        uint256 accumulatedLockupReward; // service variable
        uint256 rewardPerTokenOffset; // service variable
    }
    mapping (uint256 => Deposit) internal _deposits;
    mapping (address => mapping(uint256 => uint256)) internal _usersDepositIndexes;
    // userAddress => depositProfileId => depositId
    mapping (address => uint256) internal _totalDeposited;
    uint256 internal _depositProfilesNumber;
    uint256 internal _depositsNumber;
    uint256 internal constant SHIFT_18 = 10 ** 18;
    uint256 internal constant SHIFT_4 = 10 ** 4;
    uint256 internal constant YEAR = 365 * 24 * 3600;
    bytes32 internal constant MANAGER = keccak256(abi.encode('MANAGER'));

    constructor (
        address ownerAddress,
        address managerAddress
    ) {
        require(ownerAddress != address(0), 'Owner address can not be zero');
        require(managerAddress != address(0), 'Manager address can not be zero');
        _owner = ownerAddress;
        _grantRole(MANAGER, managerAddress);
    }

//    function initialize (
//        address ownerAddress,
//        address managerAddress
//    ) public initializer returns (bool) {
//        require(ownerAddress != address(0), 'Owner address can not be zero');
//        require(managerAddress != address(0), 'Manager address can not be zero');
//        _owner = ownerAddress;
//        _grantRole(MANAGER, managerAddress);
//        return bool;
//    }

    function stake (
        uint256 amount, uint256 depositProfileId
    ) external returns (bool) {
        require(
            _depositProfiles[depositProfileId].active, 'This vault is disabled'
        );
        require(
            _depositProfiles[depositProfileId].startTime < block.timestamp,
                'This pool is not started yet'
        );
        require(
            _depositProfiles[depositProfileId].endTime > block.timestamp,
                'This pool is expired'
        );

        require(amount > 0, 'Amount should be greater than zero');
        uint256 tvl = _depositProfiles[depositProfileId].tvl + amount;

        require(
            tvl <= _depositProfiles[depositProfileId].maxStakedAmount,
                'Pool size exceeded'
        );
        uint256 period = _depositProfiles[depositProfileId].endTime - block.timestamp;
        _depositProfiles[depositProfileId].totalYield += amount * period *
            _depositProfiles[depositProfileId].apr / SHIFT_4 / YEAR;
        require(
            _takeAsset(
                _depositProfiles[depositProfileId].depositContractAddress,
                msg.sender,
                amount
            )
        );
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        if (depositId > 0) {
            _updateUserEarnings(depositId);
            _deposits[depositId].stakedAmount += amount;
        } else {
            _depositsNumber ++;
            depositId = _depositsNumber;
            _deposits[depositId].userAddress = msg.sender;
            _deposits[depositId].depositProfileId = depositProfileId;
            _deposits[depositId].stakedAmount = amount;
            _deposits[depositId].updatedAt = block.timestamp;
            _usersDepositIndexes[msg.sender][depositProfileId] = depositId;
        }
        _updateTotalReward(depositProfileId);
        _totalDeposited[
            _depositProfiles[depositProfileId].depositContractAddress
        ] += amount;
        _depositProfiles[depositProfileId].tvl = tvl;
        return true;
    }

    function reStake (
        uint256 depositProfileId
    ) external returns (bool) {
        require(
            _depositProfiles[depositProfileId].active, 'This vault is disabled'
        );
        require(
            _depositProfiles[depositProfileId].startTime < block.timestamp,
                'This pool is not started yet'
        );
        require(
            _depositProfiles[depositProfileId].endTime > block.timestamp,
            'This pool is expired'
        );
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        _updateUserEarnings(depositId);
        uint256 amount = _deposits[depositId].accumulatedYield;
        _deposits[depositId].accumulatedYield = 0;
        require(amount > 0, 'Nothing to restake');
        uint256 tvl = _depositProfiles[depositProfileId].tvl + amount;
        if (_depositProfiles[depositProfileId].apr > 0) {
            require(
                tvl <= _depositProfiles[depositProfileId].maxStakedAmount,
                    'Pool size exceeded'
            );
            uint256 period = _depositProfiles[depositProfileId].endTime - block.timestamp;
            _depositProfiles[depositProfileId].totalYield += amount * period *
                _depositProfiles[depositProfileId].apr / SHIFT_4 / YEAR;
        }

        _deposits[depositId].stakedAmount += amount;
        _updateTotalReward(depositProfileId);
        _totalDeposited[
            _depositProfiles[depositProfileId].depositContractAddress
        ] += amount;
        _depositProfiles[depositProfileId].tvl = tvl;

        return true;
    }

    function unStake (
        uint256 amount, uint256 depositProfileId
    ) external returns (bool) {
        require(amount > 0, 'Amount should be greater than zero');
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');

        if (_depositProfiles[depositProfileId].endTime > block.timestamp) {
            uint256 period = _depositProfiles[depositProfileId].endTime
                - block.timestamp;
            _depositProfiles[depositProfileId].totalYield -= amount * period *
                _depositProfiles[depositProfileId].apr / SHIFT_4 / YEAR;
        }

        _updateUserEarnings(depositId);
        _updateTotalReward(depositProfileId);
        uint256 lockedAmount;
        if (
            block.timestamp > _depositProfiles[depositProfileId].lockupStartTime
                && block.timestamp < _depositProfiles[depositProfileId].lockupEndTime
        ) {
            lockedAmount = _deposits[depositId].lockedAmount;
        }

        require(
            _deposits[depositId].stakedAmount - lockedAmount >= amount,
                    'Not enough available staked amount'
        );

        _deposits[depositId].stakedAmount -= amount;
        _totalDeposited[
            _depositProfiles[depositProfileId].depositContractAddress
        ] -= amount;
        _depositProfiles[depositProfileId].tvl -= amount;
        require(
            _sendAsset(
                _depositProfiles[depositProfileId].depositContractAddress,
                msg.sender,
                amount
            )
        );
        return true;
    }

    function withdrawYield (
        uint256 depositProfileId, bool needUpdate
    ) public returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        IERC20 tokenContract = IERC20(
            _depositProfiles[depositProfileId].depositContractAddress
        );
        uint256 balance = tokenContract.balanceOf(address(this));
        uint256 totalDeposited = _totalDeposited[
            _depositProfiles[depositProfileId].depositContractAddress
        ];
        uint256 available;
        if (balance > totalDeposited) {
            available = balance - totalDeposited;
        }
        if (needUpdate) _updateUserEarnings(depositId);
        uint256 amount = _deposits[depositId].accumulatedYield;
        require(amount > 0, 'No yield to withdraw');
        if (amount > available) amount = available;
        require(amount > 0, 'Yield withdrawal is not possible');
        _deposits[depositId].accumulatedYield -= amount;
        require(
            _sendAsset(
                _depositProfiles[depositProfileId].depositContractAddress,
                msg.sender,
                amount
            )
        );
        return true;
    }

    function withdrawReward (
        uint256 depositProfileId, bool needUpdate
    ) public returns (bool) {
        require(_depositProfiles[depositProfileId].lockupRewardAvailable);
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        IERC20 tokenContract = IERC20(
            _depositProfiles[depositProfileId].rewardContractAddress
        );
        uint256 available = tokenContract.balanceOf(address(this));
        if (needUpdate) _updateUserEarnings(depositId);
        uint256 amount = _deposits[depositId].accumulatedLockupReward;
        if (amount == 0) return false;
        _updateTotalReward(depositProfileId);
        _deposits[depositId].accumulatedLockupReward -= amount;
        require(
            _sendAsset(
                _depositProfiles[depositProfileId].depositContractAddress,
                msg.sender,
                amount
            )
        );
        return true;
    }

    function withdrawEarnings (
        uint256 depositProfileId
    ) external returns (bool) {
        uint256 depositId = _usersDepositIndexes[msg.sender][depositProfileId];
        require(depositId > 0, 'Deposit is not found');
        _updateUserEarnings(depositId);
        withdrawYield(depositProfileId, false);
        withdrawReward(depositProfileId, false);
        return true;
    }

    function addDepositProfile (
        uint256 apr,
        uint256 maxStakedAmount,
        uint256 startTime,
        uint256 endTime,
        address depositContractAddress,
        address rewardContractAddress
    ) external hasRole(MANAGER) returns (bool) {
        require(endTime > startTime, 'Invalid time');
        uint duration = endTime - startTime;

        _depositProfilesNumber ++;
        uint256 depositProfileId = _depositProfilesNumber;
        _depositProfiles[depositProfileId].depositContractAddress =
            depositContractAddress;
        _depositProfiles[depositProfileId].rewardContractAddress =
            rewardContractAddress;
        _depositProfiles[depositProfileId].maxStakedAmount = maxStakedAmount;
        _depositProfiles[depositProfileId].apr = apr;
        _depositProfiles[depositProfileId].startTime = startTime;
        _depositProfiles[depositProfileId].endTime = endTime;
        _depositProfiles[depositProfileId].lastRewardUpdate =
            block.timestamp;
        _depositProfiles[depositProfileId].active = true;

        return true;
    }

    function adminWithdraw (
        uint256 amount, address tokenAddress
    ) external onlyOwner returns (bool) {
        _sendAsset(
           tokenAddress, _owner, amount
        );
        return true;
    }

    function _updateTotalReward (
        uint256 depositProfileId
    ) internal returns (bool) {
        if (
            _depositProfiles[depositProfileId].totalRewardAmount == 0
                || _depositProfiles[depositProfileId].tvl == 0
        ) return false;
        uint256 rewardPeriodEndTime = block.timestamp;
        if (
            rewardPeriodEndTime > _depositProfiles[depositProfileId].lockupEndTime
        ) {
            rewardPeriodEndTime = _depositProfiles[depositProfileId].lockupEndTime;
        }
        if (
            _depositProfiles[depositProfileId].lastRewardUpdate >= rewardPeriodEndTime
        ) return false;
        uint256 period = rewardPeriodEndTime
            - _depositProfiles[depositProfileId].lastRewardUpdate;

        uint256 duration = _depositProfiles[depositProfileId].lockupEndTime
            - _depositProfiles[depositProfileId].lockupStartTime;

        _depositProfiles[depositProfileId].rewardPerToken += SHIFT_18
            * period
            * _depositProfiles[depositProfileId].totalRewardAmount
            / duration
            / _depositProfiles[depositProfileId].tvl;

        _depositProfiles[depositProfileId].lastRewardUpdate = rewardPeriodEndTime;
        return true;
    }

    function _updateUserEarnings (uint256 depositId) internal returns (bool) {
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        if (depositProfileId == 0) return false;
        _deposits[depositId].accumulatedYield += calculateYield(depositId);
        _deposits[depositId].accumulatedLockupReward += calculateLockupReward(depositId);
        _deposits[depositId].rewardPerTokenOffset
            = _depositProfiles[depositProfileId].rewardPerToken;
        _deposits[depositId].updatedAt = block.timestamp;
        return true;
    }

    function getYieldRemains (
        uint256 depositProfileId
    ) public view returns (uint256) {
        uint256 duration = _depositProfiles[depositProfileId].lockupEndTime
        - _depositProfiles[depositProfileId].lockupStartTime;
        uint256 yieldMaxAmount = _depositProfiles[depositProfileId].maxStakedAmount
            * _depositProfiles[depositProfileId].apr
            * duration
            / SHIFT_4
            / YEAR;
        return yieldMaxAmount - _depositProfiles[depositProfileId].totalYield;
    }

    function getDepositProfilesNumber () external view returns (uint256) {
        return _depositProfilesNumber;
    }

    function getDepositProfile (
        uint256 depositProfileId
    ) external view returns ( DepositProfile memory ) {
        return _depositProfiles[depositProfileId];
    }

    function getDepositsNumber () external view returns (uint256) {
        return _depositsNumber;
    }

    function getDeposit (
        uint256 depositId
    ) external view returns ( Deposit memory ) {
        return _deposits[depositId];
    }

    function getUserDepositId (
        address userAddress, uint256 depositProfileId
    ) external view returns ( uint256 depositId ) {
        return _usersDepositIndexes[userAddress][depositProfileId];
    }

    function calculateYield (
        uint256 depositId
    ) public view returns (uint256) {
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        if (depositProfileId == 0) return 0;
        if (_deposits[depositId].stakedAmount == 0) return 0;
        uint256 endTime = block.timestamp;
        if (
            _depositProfiles[depositProfileId].endTime > 0
                && endTime > _depositProfiles[depositProfileId].endTime
        ) {
            endTime = _depositProfiles[depositProfileId].endTime;
        }
        if (_deposits[depositId].updatedAt >= endTime) return 0;
        uint256 period = endTime - _deposits[depositId].updatedAt;
        return _deposits[depositId].stakedAmount
            * period
            * _depositProfiles[depositProfileId].apr
            / SHIFT_4
            / YEAR;
    }

    function calculateLockupReward (
        uint256 depositId
    ) public view returns (uint256) {
        uint256 depositProfileId = _deposits[depositId].depositProfileId;
        if (depositProfileId == 0) return 0;

        uint256 extraPeriodStartTime
            = _depositProfiles[depositProfileId].lastRewardUpdate;
        if (extraPeriodStartTime < _deposits[depositId].updatedAt) {
            extraPeriodStartTime = _deposits[depositId].updatedAt;
        }
        uint256 _extraPeriodEndTime = block.timestamp;
        if (
            _depositProfiles[depositProfileId].endTime > 0
                && _extraPeriodEndTime > _depositProfiles[depositProfileId].endTime
        ) {
            _extraPeriodEndTime = _depositProfiles[depositProfileId].endTime;
        }
        uint256 extraPeriod;
        if (_extraPeriodEndTime > extraPeriodStartTime) {
            extraPeriod = _extraPeriodEndTime - extraPeriodStartTime;
        }
        uint256 rewardPerToken = _depositProfiles[depositProfileId].rewardPerToken;
        if (extraPeriod > 0) {
            uint256 duration = _depositProfiles[depositProfileId].lockupEndTime
                - _depositProfiles[depositProfileId].lockupStartTime;

            rewardPerToken += SHIFT_18
                * extraPeriod
                * _depositProfiles[depositProfileId].totalRewardAmount
                / duration
                / _depositProfiles[depositProfileId].tvl;
        }
        if (_deposits[depositId].rewardPerTokenOffset >= rewardPerToken) return 0;
        uint256 reward = (rewardPerToken - _deposits[depositId].rewardPerTokenOffset)
            * _deposits[depositId].lockedAmount / SHIFT_18;
        return reward;
    }

    function getMaxYieldAmount (
        uint256 depositProfileId
    ) public view returns (uint256) {
        uint256 duration = _depositProfiles[depositProfileId].lockupEndTime
            - _depositProfiles[depositProfileId].lockupStartTime;
        return _depositProfiles[depositProfileId].maxStakedAmount
            * _depositProfiles[depositProfileId].apr
            * duration
            / YEAR
            / SHIFT_4;
    }

    function getDepositYield (
        uint256 depositId
    ) public view returns (uint256) {
        return calculateYield(depositId)
            + _deposits[depositId].accumulatedYield;
    }

    function getDepositReward (
        uint256 depositId
    ) public view returns (uint256) {
        return calculateLockupReward(depositId)
            + _deposits[depositId].accumulatedLockupReward;
    }

    function getDepositEarnings (
        uint256 depositId
    ) public view returns (uint256) {
        return getDepositYield(depositId) + getDepositReward(depositId);
    }
}
