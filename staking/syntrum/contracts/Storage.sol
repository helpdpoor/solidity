// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/**
 * @dev Partial interface of the Rates contract
 */
interface IRates {
    function getUsdRate(address contractAddress) external view returns (uint256);
}

contract Storage {
    struct DepositProfile {
        address depositContractAddress;
        address yieldContractAddress;
        uint8 depositProfileType;  // 1 - ERC20 token, 3 - LP farming
        uint16 apr; // apr (% * 100, 2501 means 25.01%)
        uint16 withdrawYieldTax; // tax (% * 100, 2501 means 25.01%),
        // for depositRateType LP_ETNA and LP_MTB tax will be applied before lockTime end
        // when withdraw yield
        uint16 downgradeTax; // tax (% * 100, 2501 means 25.01%)
        uint256 weight; // sorting order at UI (asc from left to right)
        uint256 marketIndex; // market index to treat possible APR changes
        uint256 marketIndexLastTime;
        // timestamp when market index was changed last time
        uint256 tvl; // total amount of tokens deposited in a pool
        uint256 lockTime;
        // lock period for erc20 or taxed withdraw period for LP tokens in seconds
        uint256 upgradeProfileId;
        uint256 downgradeProfileId;
        uint256 stakers;
        uint256 yieldPaid;
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
        uint256 updatedAt; // timestamp, is resettled to block.timestamp when changed
        uint256 accumulatedYield; // used to store reward when changed
    }
    mapping (uint256 => Deposit) internal _deposits;
    mapping (address => mapping(uint256 => uint256)) internal _usersDepositIndexes;
    // user address => deposit profile id => deposit id
    mapping (address => uint256) internal _totalDeposit;
    bool internal _safeMode;
    bool internal _editMode = true;
    IRates internal _ratesContract;
    address internal _taxReceiverAddress; // address for sending tax tokens
    uint256 internal _depositProfilesNumber;
    uint256 internal _depositsNumber;
    uint256 internal constant YEAR = 365 * 24 * 3600;
    uint256 internal constant SHIFT_18 = 1 ether;
    // used for exponent shifting when calculation market index
    uint256 internal constant SHIFT_PERCENTS = 10000;
    // used for exponent shifting when calculation with decimals
    uint8 internal constant ERC20_TOKEN = 1;
    uint8 internal constant LP_FARMING = 2;
}
