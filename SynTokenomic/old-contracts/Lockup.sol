// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import 'hardhat/console.sol';

contract Lockup is Ownable {
    struct VestingStage {
        uint256 amount;
        uint256 unlockTime;
    }
    struct VestingStages {
        uint8 number;
        VestingStage[] stages;
    }
    struct Allocation {
        address token;
        address receiver;
        uint256 amount;
        uint256 withdrawnAmount;
        VestingStages vestingStages;
        string name;
    }
    mapping(uint256 => Allocation) internal _allocations;
    // Allocation is defined by user address and token address pair
    // Each user address can have a single allocation for specific token
    uint256 internal _allocationsNumber;
    uint256 internal _maxAllocationsNumber; // allocations number limit
    uint256 internal _maxVestingStagesNumber; // vesting stages limit
    mapping(address => mapping(address => uint256)) internal _userAllocationId;
    // user address => token address => allocation Id
    mapping(address => uint256[]) internal _tokenAllocationIds;

    constructor (
        address newOwner_
    ) {
        transferOwnership(newOwner_);
        _maxAllocationsNumber = 10;
        _maxVestingStagesNumber = 10;
    }

    /**
     * @dev Register token contract, stores its allocation and vesting data
     */
    function register (
        uint8[] memory uint8Data_, // allocations number, vesting stages numbers
        uint256[] memory uint256Data_, // allocation amounts, vesting timestamps, vesting amounts
        address[] memory addressData_, // allocation receivers
        string[] memory stringData_ // allocation names
    ) external returns (bool) {
        require(
            _tokenAllocationIds[msg.sender].length == 0,
                'This contract is already registered'
        );
        require(
            uint8Data_[0] <= _maxAllocationsNumber,
                'Max allocations number exceeded'
        );
        uint8 vestingStagesTotalNumber;
        for (uint8 i; i < uint8Data_[0]; i ++) {
            _allocationsNumber ++;
            _allocations[_allocationsNumber].token = msg.sender;
            _allocations[_allocationsNumber].receiver = addressData_[i];
            _allocations[_allocationsNumber].amount = uint256Data_[i];
            _allocations[_allocationsNumber].name = stringData_[i];
            require(
                uint8Data_[i + 1] <= _maxVestingStagesNumber,
                    'Max vesting stages number exceeded'
            );
            uint8 vestingStagesNumber = uint8Data_[i + 1];
            _allocations[_allocationsNumber].vestingStages.number = vestingStagesNumber;
            for (uint8 j; j < vestingStagesNumber; j ++) {
                _allocations[_allocationsNumber].vestingStages.stages
                    .push(VestingStage(
                        uint256Data_[uint8Data_[0] + (vestingStagesTotalNumber + j) * 2],
                        uint256Data_[uint8Data_[0] + (vestingStagesTotalNumber + j) * 2 + 1]
                    ));
            }
            vestingStagesTotalNumber += vestingStagesNumber;
            _userAllocationId[addressData_[i]][msg.sender] = _allocationsNumber;
            _tokenAllocationIds[msg.sender].push(_allocationsNumber);
        }
        return true;
    }

    /**
     * @dev Let user withdraw available allocated tokens
     */
    function withdraw (
        address tokenAddress
    ) external returns (bool) {
        uint256 amount = getAvailable(msg.sender, tokenAddress);
        require(amount > 0, 'Nothing to withdraw');
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(amount <= balance, 'Not enough contract balance');
        _allocations[
            _userAllocationId[msg.sender][tokenAddress]
        ].withdrawnAmount += amount;
        require(IERC20(tokenAddress).transfer(msg.sender, amount));
        return true;
    }

    /**
     * @dev Calculate available allocated tokens
     */
    function getAvailable (
        address userAddress,
        address tokenAddress
    ) public view returns (uint256) {
        uint256 available;
        uint256 allocationId = _userAllocationId[userAddress][tokenAddress];
        if (_allocations[allocationId].vestingStages.number == 0) {
            return _allocations[allocationId].amount - _allocations[allocationId].withdrawnAmount;
        }
        for (uint8 i; i < _allocations[allocationId].vestingStages.number; i ++) {
            if (
                _allocations[allocationId].vestingStages.stages[i].unlockTime > block.timestamp
            ) continue;
            available += _allocations[allocationId].vestingStages.stages[i].amount;
            if (
                i == _allocations[allocationId].vestingStages.number - 1
                    && available < _allocations[allocationId].amount
            ) available = _allocations[allocationId].amount;
            if (
                available >= _allocations[allocationId].amount
            ) {
                available = _allocations[allocationId].amount;
                break;
            }
        }
        return available - _allocations[allocationId].withdrawnAmount;
    }

    /**
     * @dev Returns user's allocation Id for specific token (id start from 1)
     */
    function getUserAllocationId (
        address userAddress,
        address tokenAddress
    ) external view returns (uint256) {
        return _userAllocationId[userAddress][tokenAddress];
    }

    /**
     * @dev Returns all allocation Ids for specific token
     */
    function getTokenAllocationIds (
        address tokenAddress
    ) external view returns (uint256[] memory) {
        return _tokenAllocationIds[tokenAddress];
    }

    /**
     * @dev Returns allocation data by allocation Id (id start from 1)
     */
    function getAllocationData (
        uint256 allocationId
    ) external view returns (
        address token,
        address receiver,
        uint256 amount,
        uint256 withdrawnAmount,
        uint8 vestingStagesNumber,
        string memory name
    ) {
        return (
            _allocations[allocationId].token,
            _allocations[allocationId].receiver,
            _allocations[allocationId].amount,
            _allocations[allocationId].withdrawnAmount,
            _allocations[allocationId].vestingStages.number,
            _allocations[allocationId].name
        );
    }

    /**
     * @dev Returns vesting data by allocation Id (id start from 1)
     * and vesting index (array index, start from 0)
     */
    function getAllocationVestingData (
        uint256 allocationId,
        uint8 vestingIndex
    ) external view returns (
        uint256 amount,
        uint256 unlockTime
    ) {
        return (
            _allocations[allocationId].vestingStages.stages[vestingIndex].amount,
            _allocations[allocationId].vestingStages.stages[vestingIndex].unlockTime
        );
    }
}