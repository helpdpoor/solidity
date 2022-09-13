// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function allowance(
        address owner, address spender
    ) external view returns (uint256);
}

/**
 * @dev Partial interface of the BorrowingLending contract.
 */
interface IBorrowingLending {
    function accessVaultWithdraw(
        uint256 borrowingProfileIndex,
        uint256 amount
    ) external returns (bool);
    function accessVaultReplenish(
        uint256 borrowingProfileIndex,
        uint256 amount
    ) external returns (bool);
}

/**
 * @dev Partial interface of the BorrowingPower contract.
 */
interface IBorrowingPower {
    function getUserBorrowingPower (
        address userAddress
    ) external view returns (uint256);
}

/**
 * @dev Partial interface of the ExchangeRouterImplementation Contract.
 */
interface IExchangeRouterImplementation {
    function swapTokens (
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256);
    function getSwapRate(
        address tokenInAddress,
        address tokenOutAddress
    ) external view returns (uint256);
    function getSwapAmount (
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn
    ) external view returns (uint256);
}

contract Storage {
    /**
     * Error codes
     * 1.1 - Caller is not the manager
     * 1.2 - Caller is not the BAA contract
     * 2.1 - Owner address can not be zero
     * 2.2 - BorrowingLending contract address can not be zero
     * 2.3 - BorrowingPower contract address can not be zero
     * 3.1 - This stablecoin is not available for borrowing
     * 3.2 - This token is not available for trading
     * 3.3 - BAA contract is already deployed
     * 4.1 - Amount should be greater than zero
     * 4.2 - BAA address is not valid
     * 5.1 - Amount should be greater than zero
     * 5.2 - Amount can not be greater than owed amount
     * 5.3 - BAA address is not valid
     * 5.4 - Not enough BAA balance
     * 5.5 - Loan returning is unavailable because of outstanding balance
     * 5.6 - An error occurred
     * 5.7 - withdraw request to the BAA failed
     * 6.1 - No outstanding balance for this stablecoin
     * 7.1 - BAA address is not valid
     * 8.1 - newOwner should not be zero address
     * 9.1 - This token is not available for borrowing
     * 9.2 - Withdraw failed
     * 10.1 - This token is not available for borrowing
     * 10.2 - Amount can not be greater than withdrawn amount
     * 10.3 - Withdraw failed
     * 11.1 - Token address can not be zero
     * 12.1 - baaAddress is not a BAA contract
     * 12.2 - withdraw request (adminWithdrawBaa) to the BAA failed
     * 13.1 - msg.value should be equal to the marginSwapFee
     * 13.2 - BAA contract does not exist
     * 13.3 - Amount can not be greater than loan amount
     * 14.1 - Caller has outstanding balance
     * 14.2 - Nothing to withdraw
     * 15.1 - Margin swap record not found or not active
     * 15.2 - Fee should be paid first
     * 15.3 - swap request to the BAA failed
     * 17.1 - Borrowing lending contract address can not be zero
     * 18.1 - BorrowingPower contract address can not be zero
     * 19.1 - Exchange router contract address can not be zero
     * 20.1 - Baa beacon contract address can not be zero
     * 21.1 - Fee owner factor should be less than 10000
     * 22.1 - baaAddress is not a BAA contract
     * 22.2 - Liquidation requirements are not met
     * 22.3 - swap request to the BAA failed
     * 22.4 - withdraw request to the BAA failed
     * 23.1 - getImplementationAddress request to the ExchangeRouter failed
     * 24.1 - Reentrancy not allowed
     */
    struct Baa {
        address ownerAddress; // address of the BAA owner
        address stablecoinAddress; // address of the borrowed stablecoin
        address tokenAddress; // address of the traded token
        uint256 depositAmount; // stablecoin amount that was deposited
        uint256 loanAmount; // stablecoin amount that was borrowed
        uint256 accumulatedFee; // accumulated fee amount
        uint256 borrowingPower; // borrowing power at the moment of the last borrowing
        uint256 feeUpdatedAt; // last time when BAA fee was updated
        uint256 lastFeePaymentTime; // last time fee was paid
        uint256 lastMarketIndex; // market index value when fee was updated last time
    }
    struct MarginSwap {
        uint256 amount;
        uint256 marginRate; // when pair rate is below (below == true) or above marginRate
        // margin swap can be proceeded (* SHIFT * tokenIn decimals / tokenOut decimals)
        bool reversed; // true if token was swapped to stablecoin
        bool below;
        bool active;
    }
    struct MarginSwapNew {
        uint256 amount;
        uint256 amountBack; // minimal amount user wants to get when swap
        uint8 status; // 0 - disabled, 1 - waiting, 2 - completed
    }
    mapping(address => Baa) internal _baaRegistry;
    // BAA contract address => Baa object
    mapping(address => mapping(address => mapping(address => address))) internal _baaAddresses;
    // user address => stablecoin address => token address => BAA contract address
    mapping(address => MarginSwap) internal _marginSwapRegistry;
    // BAA contract address => Margin Swap object
    mapping(address => uint256) internal _stablecoinProfileId;
    // Stablecoin contract address => profile id in the borrowing lending contract
    mapping(address => bool) internal _tokenAvailable;
    // Token contract address => true if token can be traded
    mapping(address => mapping(address => uint256)) internal _liquidationRemains;
    // Amount of stablecoins remained after liquidation,
    // user address => stablecoin address => amount
    mapping(address => mapping(address => uint256)) internal _outstandingBalance;
    // Amount of due in stablecoins remained after liquidation,
    // user address => stablecoin address => amount
    mapping (address => bool) internal _hasOutstandingBalance;
    // user address => true if user has outstanding balance
    mapping(address => uint256) internal _debankWithdrawnAmount;
    // Token contract address => withdrawn amount (an amount of tokens that was withdrawn
    // from the borrowing lending contract)
    mapping (address => bool) internal _managers;

    address[] internal _stablecoins;
    IBorrowingPower internal _borrowingPowerContract;
    // BorrowingPower contract is used for a borrowing power calculation
    IBorrowingLending internal _borrowingLendingContract; // debank contract
    address internal _baaBeaconAddress; // beacon contract address where BAA implementation address
    // is stored
    address internal _exchangeRouterAddress; // decentralised exchange router address
    address internal _owner; // contract owner
    uint256 internal _marginSwapFee; // fee in BNB/Matic for margin swap proceeding
    uint256 internal _maxFeeUnpaidPeriod; // max period when fee can be unpaid
    // (after this period end user should pay fee in order to trade or withdraw)
    uint256 internal _borrowingFeeFactor; // borrowing fee (* DECIMALS)
    uint256 internal _feeOwnerFactor;
    // percentage of the borrowing fee sent to owner (* DECIMALS)
    uint256 internal _fee; // paid borrowing fee
    uint256 internal _marketIndex; // index that is used for borrowing fee changes treatment
    uint256 internal _marketIndexLastTime; // last time market index was recalculated
    uint256 internal _negativeFactor; // Determines threshold for a liquidation (* DECIMALS)
    uint256 internal _notificationFactor; // Determines threshold for a notification (* DECIMALS)
    uint256 internal _liquidationFeeFactor; // Determines liquidation fee (* DECIMALS)
    uint256 internal constant YEAR = 365 * 24 * 3600; // year duration in seconds
    uint256 internal constant SHIFT = 1 ether;
    // exponent shifting when calculation with decimals for market index and usd rate
    uint256 internal constant DECIMALS = 10000;
    // exponent shifting when calculation with decimals for percents
    mapping(address => mapping(bool => MarginSwapNew)) internal _marginSwapRegistryNew;
    // BAA contract address => Margin Swap object
}