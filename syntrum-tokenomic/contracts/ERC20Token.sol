// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (token/ERC20/ERC20.sol)

pragma solidity 0.8.2;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract ERC20Token is ERC20 {
    uint8 internal _decimals;
    constructor (
        address receiver_,
        uint256 totalSupply_,
        address lockupContract_,
        uint256 lockupAmount_,
        uint8 decimals_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        require(receiver_ != address(0), 'Receiver address can not be zero');
        _decimals = decimals_;
        if (lockupAmount_ > 0 && lockupContract_ != address(0)) {
            require(
                lockupAmount_ <= totalSupply_,
                    'Lockup amount can not be greater than total supply'
            );
            _mint(lockupContract_, lockupAmount_);
            totalSupply_ -= lockupAmount_;
        }
        if (totalSupply_ > 0) {
            _mint(receiver_, totalSupply_);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}