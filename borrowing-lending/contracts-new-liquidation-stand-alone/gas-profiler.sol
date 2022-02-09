// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GasProfiler {
    uint256 storage1;
    uint256 storage11;
    uint256 storage12;
    uint256 storage13;
    address storage2;
    address storage21;
    address storage22;
    address storage23;
    mapping (uint256 => address) storage3;
    mapping (address => uint256) storage4;
    struct Struct1 {
        address prop1;
        uint256 prop2;
    }
    Struct1 storage5;
    mapping (uint256 => Struct1) storage6;
    mapping (address => Struct1) storage7;
    mapping (address => mapping (uint256 => Struct1)) storage8;
    mapping (uint256 => mapping (address => Struct1)) storage9;

    function f01 (uint256 param1) external {
        storage1 = param1;
    }
    function f02 (uint256 param1) external {
        storage1 = param1;
        storage11 = param1;
        storage12 = param1;
        storage13 = param1;
    }
    function f03 (address param1) external {
        storage2 = param1;
    }
    function f04 (address param1) external {
        storage2 = param1;
        storage21 = param1;
        storage22 = param1;
        storage23 = param1;
    }
    function f05 (uint256 param1, address param2) external {
        storage1 = param1;
        storage2 = param2;
    }
    function f06 (uint256 param1, address param2) external returns (bool) {
        storage1 = param1;
        storage2 = param2;

        return true;
    }
    function f07 (uint256 param1, address param2) external {
        storage3[param1] = param2;
    }
    function f08 (uint256 param1, address param2) external {
        storage4[param2] = param1;
    }
    function f09 (uint256 param1, address param2) external {
        storage6[param1] = Struct1({
            prop1: param2,
            prop2: param1
        });
    }
    function f10 (uint256 param1, address param2) external {
        storage6[param1].prop1 = param2;
        storage6[param1].prop2 = param1;
    }
    function f11 (uint256 param1, address param2) external {
        storage7[param2].prop1 = param2;
        storage7[param2].prop2 = param1;
    }
    function f12 (uint256 param1, address param2) external {
        storage8[param2][param1].prop1 = param2;
        storage8[param2][param1].prop2 = param1;
    }
    function f13 (uint256 param1, address param2) external {
        storage9[param1][param2].prop1 = param2;
        storage9[param1][param2].prop2 = param1;
    }
    function f14 () external {
        if (storage2 == address(0)) storage1 = 10;
    }
    function f15 () external {
        address s1 = storage2;
        storage1 = 10;
    }
    function f16 () external {
        address s1 = storage2;
        address s2 = storage2;
        address s3 = storage2;
        address s4 = storage2;
        address s5 = storage2;
        storage1 = 10;
    }
    function f17 (address param1) external {
        address s1 = param1;
        address s2 = s1;
        address s3 = s2;
        address s4 = s3;
        address s5 = s4;
        storage2 = s5;
    }
    function f18 () external {
        storage1 = 10 + 10;
    }
    function f19 () external {
        storage1 = 10 * 10;
    }
    function f20 () external {
        storage1 = 10 / 5;
    }
    function f21 () external returns (uint256) {
        storage1 = 10 + 10;
        return storage1;
    }
    function f22 () external returns (uint256) {
        storage1 = 10 * 10;
        return storage1;
    }
    function f23 () external returns (uint256) {
        storage1 = 10 / 5;
        return storage1;
    }
}