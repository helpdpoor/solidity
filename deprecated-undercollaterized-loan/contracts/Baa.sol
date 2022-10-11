// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import './TransferHelper.sol';
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function approve(address spender, uint256 amount) external returns (bool);
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

contract Baa is Initializable {
    event SwapProceeded (
        uint256 amount,
        uint256 returnedAmount,
        uint8 swapType, // 1 - swap by owner, 2 - margin swap, 3 - liquidation swap
        bool reversed
    );

    modifier onlyAccessVault() {
        require(
            msg.sender == _accessVaultAddress,
                'Caller is not the Access Vault'
        );
        _;
    }
    modifier onlyOwner() {
        require(
            msg.sender == _owner,
                'Caller is not the owner'
        );
        _;
    }
    modifier onlyOwnerOrAccessVault() {
        require(
            msg.sender == _owner || msg.sender == _accessVaultAddress,
                'Caller is not the owner'
        );
        _;
    }

    address private _accessVaultAddress;
    address private _exchangeRouterAddress;
    address private _stablecoinAddress; // stablecoin address
    address private _tokenAddress; // traded token address
    address private _owner;
    uint256 private _stablecoinDecimals;
    uint256 private _tokenDecimals;
    uint256 internal constant DECIMALS = 10000;
    // exponent shifting when calculation with decimals for percents
    uint256 internal constant SHIFT = 1 ether;
    // exponent shifting when calculation with decimals for market index and usd rate

    function initialize (
        address accessVaultAddress,
        address exchangeRouterAddress,
        address ownerAddress,
        address stablecoinAddress,
        address tokenAddress
    ) public initializer returns (bool) {
        _accessVaultAddress = accessVaultAddress;
        _exchangeRouterAddress = exchangeRouterAddress;
        _owner = ownerAddress;
        _stablecoinAddress = stablecoinAddress;
        _tokenAddress = tokenAddress;
        _stablecoinDecimals = IERC20(stablecoinAddress).decimals();
        _tokenDecimals = IERC20(tokenAddress).decimals();
        return true;
    }
    
    /**
     * @dev Function for withdrawing erc20 tokens by access vault contract (returnLoan,
     * liquidation, in emergency)
     */
    function withdraw (
        address tokenAddress,
        uint256 amount
    ) external onlyAccessVault returns (bool) {
        TransferHelper.safeTransfer(tokenAddress, _accessVaultAddress, amount);
        return true;
    }

    /**
     * @dev Function for withdrawing extra stablecoins by BAA owner
     */
    function userWithdraw () external onlyOwner returns (bool) {
        uint256 balance = IERC20(_stablecoinAddress).balanceOf(address(this));
        bytes memory callData = abi.encodeWithSignature(
            'getOwedAmount(address)', address(this)
        );
        (bool success, bytes memory data) = _accessVaultAddress.call(callData);
        (uint256 owedAmount) = abi.decode(data, (uint256));
        require(success, 'getOwedAmount request to the Access vault failed');
        require(balance > owedAmount, 'Nothing to withdraw');
        uint256 availableAmount = balance - owedAmount;
        TransferHelper.safeTransfer(_stablecoinAddress, _owner, availableAmount);
        return true;
    }

    /**
     * @dev Function for tokens swap.
     */
    function swap (
        uint256 amount, // stablecoin amount (or token amount if reversed) that was spent for trading
        uint256 minOutAmount,
        uint8 swapType, // 1 - swap by owner, 2 - margin swap, 3 - liquidation swap
        bool reversed // true if token was swapped to stablecoin
    ) external onlyOwnerOrAccessVault returns (bool) {
        if (msg.sender != _accessVaultAddress) {
            swapType = 1;
            bytes memory callData = abi.encodeWithSignature(
                'canTrade(address)', address(this)
            );
            (bool success, bytes memory data) = _accessVaultAddress.call(callData);
            (uint8 result) = abi.decode(data, (uint8));
            require(
                success && result >= 1,
                    'canTrade request to the Access vault failed'
            );
            if (result == 1) revert('BAA is at liquidation');
            if (result == 2) revert('Fee payment is expired');
            if (result == 3) revert('BAA owner has an outstanding balance after liquidation');
            if (result < 10) revert('BAA can not trade');
        }
        uint256 returnedAmount = _exchangeRouterSwap(
            amount, minOutAmount, reversed
        );
        emit SwapProceeded(
            amount,
            returnedAmount,
            swapType,
            reversed
        );
        return true;
    }

    // internal functions
    function _exchangeRouterSwap (
        uint256 amount,
        uint256 minOutAmount,
        bool reversed
    ) internal returns (uint256) {
        address tokenInAddress;
        address tokenOutAddress;
        if (reversed) {
            tokenInAddress = _tokenAddress;
            tokenOutAddress = _stablecoinAddress;
        } else {
            tokenInAddress = _stablecoinAddress;
            tokenOutAddress = _tokenAddress;
        }
        bytes memory callData = abi.encodeWithSignature(
            'getImplementationContract(address,address)',
            tokenInAddress, tokenOutAddress
        );
        (bool success, bytes memory data) = _exchangeRouterAddress.call(callData);
        (address implementationAddress) = abi.decode(data, (address));
        require(
            success && implementationAddress != address(0),
                'Request to ExchangeRouter failed'
        );
        TransferHelper.safeApprove(tokenInAddress, implementationAddress, amount);
        IExchangeRouterImplementation implementationContract =
            IExchangeRouterImplementation(implementationAddress);
        return implementationContract.swapTokens(
            tokenInAddress, tokenOutAddress, amount, minOutAmount
        );
    }

    // view functions
    function owner () external view returns (address) {
        return _owner;
    }

    function getAddresses () external view returns (
        address accessVaultAddress,
        address exchangeRouterAddress,
        address stablecoinAddress,
        address tokenAddress
    ) {
        return (
            _accessVaultAddress,
            _exchangeRouterAddress,
            _stablecoinAddress,
            _tokenAddress
        );
    }

    function getDecimals () external view returns (
        uint256 stablecoinDecimals, uint256 tokenDecimals
    ) {
        return (_stablecoinDecimals, _tokenDecimals);
    }
}