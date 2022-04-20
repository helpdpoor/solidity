// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
import './access-control.sol';

/**
 * @dev Access control contract,
 * functions names are self explanatory
 */
abstract contract Roles is AccessControl {
    modifier hasRole(uint8 _role) {
        require(_roles[_role][msg.sender], 'Caller is not authorized');
        _;
    }

    mapping (uint8 => mapping (address => bool)) private _roles;

    function addRole (
        address userAddress,
        uint8 role
    ) public onlyManager returns (bool) {
        _roles[role][userAddress] = true;
        return true;
    }

    function removeRole (
        address userAddress,
        uint8 role
    ) public onlyManager returns (bool) {
        _roles[role][userAddress] = false;
        return true;
    }

    function checkRole (
        address userAddress,
        uint8 role
    ) public view returns (bool) {
        return _roles[role][userAddress];
    }
}