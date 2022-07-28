// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import 'hardhat/console.sol';

interface ILockup {
    function register (
        uint8[] memory uint8Data,
        uint256[] memory uint256Data,
        address[] memory addressData,
        string[] memory stringData
    ) external returns (bool);
}

contract ERC20AdvancedToken is ERC20 {
    uint8 internal _decimals;

    constructor (
        uint8[] memory uint8Data_, // allocations number, vesting stages numbers
        uint256[] memory uint256Data_, // allocation amounts, vesting stage data (amount, timestamp)
        address[] memory addressData_, // allocation receivers
        string[] memory stringData_, // allocation names
        address lockup_,
        address receiver_,
        uint256 totalSupply_,
        uint8 decimals_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
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
            totalAllocated <= totalSupply_,
                'uint256Data_ bad parameters: totalSupply exceeded'
        );
        require(
            uint256Data_.length == uint8Data_[0] + vestingsNumber * 2,
                'uint256Data_ bad parameters: array length'
        );
        require(addressData_.length == uint8Data_[0], 'addressData_ bad parameters');
        require(stringData_.length == uint8Data_[0], 'stringData_ bad parameters');
        _decimals = decimals_;
        if (totalAllocated > 0) {
            ILockup(lockup_).register(
                uint8Data_,
                uint256Data_,
                addressData_,
                stringData_
            );
            _mint(lockup_, totalAllocated);
        }
        if (totalSupply_ > totalAllocated)
        _mint(receiver_, totalSupply_ - totalAllocated);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}