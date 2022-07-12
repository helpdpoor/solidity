// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract Staking {
    mapping(address => mapping(uint256 => uint256)) amounts;

    function setUserDeposit (
        address userAddress, uint256 depositProfileId, uint256 amount
    ) external returns (bool) {
        amounts[userAddress][depositProfileId] = amount;
        return true;
    }

    function getUserDeposit (
        address userAddress, uint256 depositProfileId
    ) external view returns (
        uint256 depositIndex, uint256 amount, uint256 unlock,
        uint256 updatedAt, uint256 accumulatedYield,
        uint256 lastMarketIndex
    ) {
        return (0, amounts[userAddress][depositProfileId], 0, 0, 0, 0);
    }
}