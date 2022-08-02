// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './AccessControl.sol';
import './ERC20Token.sol';
import 'hardhat/console.sol';

contract Deployer is AccessControl, Initializable {
    event ContractDeployed (address tokenAddress);
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
    address internal _feeContractAddress; // Syntrum token address
    address internal _feeReceiver;
    uint256 internal _feeAmountSimple;
    uint256 internal _feeAmountAdvanced;
    uint256 internal _feeDiscount; // Applied when payment in tokens is selected, % * 100 (1000 == 10%)
    uint256 internal constant DECIMALS = 10000;
    bytes32 internal constant MANAGER = keccak256(abi.encode('MANAGER'));

    function initialize (
        address newOwner,
        address feeContractAddress,
        address feeReceiver,
        uint256 feeAmountSimple,
        uint256 feeAmountAdvanced,
        uint256 feeDiscount
    ) public initializer returns (bool) {
        require(newOwner != address(0), 'Owner address can not be zero');
        require(feeReceiver != address(0), 'Fee receiver address can not be zero');
        _owner = newOwner;
        _grantRole(MANAGER, newOwner);
        _maxAllocationsNumber = 10;
        _maxVestingStagesNumber = 10;
        _feeContractAddress = feeContractAddress;
        _feeReceiver = feeReceiver;
        _feeAmountSimple = feeAmountSimple;
        _feeAmountAdvanced = feeAmountAdvanced;
        _feeDiscount = feeDiscount;
        return true;
    }

    /**
     * @dev Set fee currency address
     */
    function setFeeContractAddress (
        address feeContractAddress
    ) external hasRole(MANAGER) returns (bool) {
        _feeContractAddress = feeContractAddress;
        return true;
    }

    /**
     * @dev Set fee currency address
     */
    function setFeeReceiverAddress (
        address feeReceiver
    ) external hasRole(MANAGER) returns (bool) {
        require(feeReceiver != address(0), 'Fee receiver address can not be zero');
        _feeReceiver = feeReceiver;
        return true;
    }

    /**
     * @dev Set fee amount for simple token deployment
     */
    function setFeeAmountSimple (
        uint256 amount
    ) external hasRole(MANAGER) returns (bool) {
        _feeAmountSimple = amount;
        return true;
    }

    /**
     * @dev Set fee amount for advanced token deployment
     */
    function setFeeAmountAdvanced (
        uint256 amount
    ) external hasRole(MANAGER) returns (bool) {
        _feeAmountAdvanced = amount;
        return true;
    }

    /**
     * @dev Set fee discount for payment in tokens
     */
    function setFeeDiscount (
        uint256 feeDiscount
    ) external hasRole(MANAGER) returns (bool) {
        _feeDiscount = feeDiscount;
        return true;
    }

    /**
     * @dev Deploy token contract with lockup, stores its allocation and vesting data
     */
    function deploySimple (
        address receiver_,
        uint256 totalSupply_,
        uint8 decimals_,
        string memory name_,
        string memory symbol_,
        bool native_
    ) external payable returns (bool) {
        _takeFee(_feeAmountSimple, native_);
        ERC20Token token = new ERC20Token(
            receiver_,
            totalSupply_,
            address(0),
            0,
            decimals_,
            name_,
            symbol_
        );
        emit ContractDeployed(address(token));
        return true;
    }

    /**
     * @dev Deploy token contract with lockup, stores its allocation and vesting data
     */
    function deployAdvanced (
        uint8[] memory uint8Data_, // allocations number, vesting stages numbers
        uint256[] memory uint256Data_, // allocation amounts, vesting stage data (amount, timestamp)
        address[] memory addressData_, // allocation receivers
        string[] memory stringData_, // allocation names
        address receiver_,
        uint256 totalSupply_,
        uint8 decimals_,
        string memory name_,
        string memory symbol_,
        bool native_
    ) external payable returns (bool) {
        require(uint8Data_.length > 0, 'uint8Data_ bad parameters');
        require(uint8Data_.length == 1 + uint8Data_[0], 'uint8Data_ bad parameters');
        require(uint256Data_.length >= uint8Data_[0], 'uint256Data_ bad parameters');
        uint256 vestingsNumber;
        uint256 totalAllocated;
        for (uint256 i ; i < uint8Data_[0]; i ++) {
            vestingsNumber += uint8Data_[i + 1];
            totalAllocated += uint256Data_[i];
        }
        require(
            totalAllocated > 0,
            'uint256Data_ bad parameters: totalAllocated should be greater than zero'
        );
        require(
            totalAllocated <= totalSupply_,
            'uint256Data_ bad parameters: totalSupply exceeded'
        );
        require(
            uint256Data_.length == uint8Data_[0] + vestingsNumber * 2,
            'uint256Data_ bad parameters: array length'
        );
        require(addressData_.length == uint8Data_[0], 'addressData_ bad parameters');
        require(stringData_.length == uint8Data_[0], 'stringData_ bad parameters');
        _takeFee(_feeAmountAdvanced, native_);

        ERC20Token token = new ERC20Token(
            receiver_,
            totalSupply_,
            address(this),
            totalAllocated,
            decimals_,
            name_,
            symbol_
        );
        _register (
            uint8Data_,
            uint256Data_,
            addressData_,
            stringData_,
            address(token)
        );
        emit ContractDeployed(address(token));
        return true;
    }

    /**
      * @dev Register token contract, stores its allocation and vesting data
      */
    function _register (
        uint8[] memory uint8Data_, // allocations number, vesting stages numbers
        uint256[] memory uint256Data_, // allocation amounts, vesting timestamps, vesting amounts
        address[] memory addressData_, // allocation receivers
        string[] memory stringData_ ,// allocation names
        address tokenAddress_ // token address
    ) internal returns (bool) {
        require(
            uint8Data_[0] <= _maxAllocationsNumber,
            'Max allocations number exceeded'
        );
        uint8 vestingStagesTotalNumber;
        for (uint8 i; i < uint8Data_[0]; i ++) {
            _allocationsNumber ++;
            _allocations[_allocationsNumber].token = tokenAddress_;
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
            _userAllocationId[addressData_[i]][tokenAddress_] = _allocationsNumber;
            _tokenAllocationIds[tokenAddress_].push(_allocationsNumber);
        }
        return true;
    }

    function _takeFee (
        uint256 amount,
        bool native
    ) internal returns (bool) {
        if (amount == 0) return false;
        if (native || _feeContractAddress == address(0)) {
            require(msg.value == amount, 'Fee amount does not match');
            payable(_feeReceiver).transfer(amount);
        } else if (amount > 0) {
            if (_feeDiscount > 0) {
                amount = amount * (DECIMALS - _feeDiscount) / DECIMALS;
            }
            require(
                IERC20(_feeContractAddress).transferFrom(msg.sender, _feeReceiver, amount),
                    'Fee transfer failed'
            );
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
        _allocations[_userAllocationId[msg.sender][tokenAddress]]
            .withdrawnAmount += amount;
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

    /**
     * @dev Returns fee data (currency address and amount)
     */
    function getFeeData () external view returns (
        address feeContractAddress,
        address feeReceiver,
        uint256 feeAmountSimple,
        uint256 feeAmountAdvanced,
        uint256 feeDiscount
    ) {
        return (
            _feeContractAddress,
            _feeReceiver,
            _feeAmountSimple,
            _feeAmountAdvanced,
            _feeDiscount
        );
    }
}