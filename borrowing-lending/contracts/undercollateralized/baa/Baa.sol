// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '../../common/TransferHelper.sol';
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
 * @dev Partial interface of the AccessVault Contract.
 */
interface IAccessVault {
    function getOwedAmount (
        address baaAddress
    ) external view returns (uint256);
    function canTrade (
        address baaAddress
    ) external view returns (uint8);
}

/**
 * @dev Partial interface of the ExchangeRouter Contract.
 */
interface IExchangeRouter {
    function getDefaultDexConnector (
        address tokenIn,
        address tokenOut
    ) external view returns (address);
    function isDexConnectorRegistered (
        address dexConnector
    ) external view returns (bool);
}

contract Baa is Initializable {
    event SwapProceeded (
        uint256 amount,
        uint256 returnedAmount,
        uint8 swapType, // 1 - swap by owner, 2 - margin swap, 3 - liquidation swap, 4 - arbitrage in
        // 5 - arbitrage out
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
        uint256 owedAmount = IAccessVault(_accessVaultAddress).getOwedAmount(address(this));
        require(balance > owedAmount, 'Nothing to withdraw');
        uint256 availableAmount = balance - owedAmount;
        TransferHelper.safeTransfer(_stablecoinAddress, _owner, availableAmount);
        return true;
    }

    /**
     * @dev Function for tokens swap.
     */
    function accessVaultSwap (
        uint256 amountIn, // stablecoin amount (or token amount if reversed)
        // that should be spent for trading
        uint256 amountOutMin,
        uint256 swapTimeLimit,
        uint8 swapType, // 1 - swap by owner, 2 - margin swap, 3 - liquidation swap
        bool reversed // true if token should be swapped to stablecoin
    ) external onlyAccessVault returns (bool) {
        address tokenIn;
        address tokenOut;
        if (reversed) {
            tokenIn = _tokenAddress;
            tokenOut = _stablecoinAddress;
        } else {
            tokenIn = _stablecoinAddress;
            tokenOut = _tokenAddress;
        }
        address dexConnector = IExchangeRouter(_exchangeRouterAddress).getDefaultDexConnector(
            tokenIn, tokenOut
        );
        (bool success, bytes memory data) = dexConnector.delegatecall(
            abi.encodeWithSignature(
                'swapTokens(address,address,address,uint256,uint256,uint256)',
                address(this),
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMin,
                swapTimeLimit
            )
        );
        require(success, 'Swap request failed');
        (uint256 returnedAmount) = abi.decode(data, (uint256));
        require(returnedAmount > 0, 'Swap request failed');

        emit SwapProceeded(
            amountIn,
            returnedAmount,
            swapType,
            reversed
        );
        return true;
    }

    /**
     * @dev Function for tokens swap.
     */
    function swap (
        address dexConnector,
        uint256 amountIn, // stablecoin amount (or token amount if reversed)
        // that should be spent for trading
        uint256 amountOutMin,
        uint256 swapTimeLimit,
        bool reversed // true if token should be swapped to stablecoin
    ) external onlyOwner returns (bool) {
        uint8 result = IAccessVault(_accessVaultAddress).canTrade(address(this));
        require(result >= 1, 'canTrade request to the Access vault failed');
        if (result == 1) revert('BAA is at liquidation');
        if (result == 2) revert('Fee payment is expired');
        if (result == 3) revert('BAA owner has an outstanding balance after liquidation');
        if (result < 10) revert('BAA can not trade');
        address tokenIn;
        address tokenOut;
        if (reversed) {
            tokenIn = _tokenAddress;
            tokenOut = _stablecoinAddress;
        } else {
            tokenIn = _stablecoinAddress;
            tokenOut = _tokenAddress;
        }
        if (dexConnector == address(0)) {
            dexConnector = IExchangeRouter(_exchangeRouterAddress).getDefaultDexConnector(
                tokenIn, tokenOut
            );
        } else {
            require(
                IExchangeRouter(_exchangeRouterAddress).isDexConnectorRegistered(dexConnector),
                    'dexConnector is not registered'
            );
        }

        (bool success, bytes memory data) = dexConnector.delegatecall(
            abi.encodeWithSignature(
                'swapTokens(address,address,address,uint256,uint256,uint256)',
                address(this),
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMin,
                swapTimeLimit
            )
        );
        require(success, 'Swap request failed');
        (uint256 returnedAmount) = abi.decode(data, (uint256));
        require(returnedAmount > 0, 'Swap request failed');

        emit SwapProceeded(
            amountIn,
            returnedAmount,
            1,
            reversed
        );
        return true;
    }

    /**
     * @dev Function for arbitrage.
     */
    function arbitrage (
        address dexConnector1,
        address dexConnector2,
        uint256 amountIn, // stablecoin amount (or token amount if reversed)
        uint256 profitMin,
        uint256 swapTimeLimit1,
        uint256 swapTimeLimit2,
        bool reversed // true if token should be swapped to stablecoin
    ) external onlyOwner returns (bool) {
        uint8 result = IAccessVault(_accessVaultAddress).canTrade(address(this));
        require(result >= 1, 'canTrade request to the Access vault failed');
        if (result == 1) revert('BAA is at liquidation');
        if (result == 2) revert('Fee payment is expired');
        if (result == 3) revert('BAA owner has an outstanding balance after liquidation');
        if (result < 10) revert('BAA can not trade');
        address tokenIn;
        address tokenOut;
        if (reversed) {
            tokenIn = _tokenAddress;
            tokenOut = _stablecoinAddress;
        } else {
            tokenIn = _stablecoinAddress;
            tokenOut = _tokenAddress;
        }
        require(
            IExchangeRouter(_exchangeRouterAddress).isDexConnectorRegistered(dexConnector1),
            'dexConnector is not registered'
        );
        require(
            IExchangeRouter(_exchangeRouterAddress).isDexConnectorRegistered(dexConnector2),
            'dexConnector is not registered'
        );

        (bool success, bytes memory data) = dexConnector1.delegatecall(
            abi.encodeWithSignature(
                'swapTokens(address,address,address,uint256,uint256,uint256)',
                address(this),
                tokenIn,
                tokenOut,
                amountIn,
                0,
                swapTimeLimit1
            )
        );
        require(success, 'Swap request failed');
        uint256 returnedAmount1 = abi.decode(data, (uint256));
        require(returnedAmount1 > 0, 'Swap1 request failed');
        emit SwapProceeded(
            amountIn,
            returnedAmount1,
            4,
            reversed
        );

        (success, data) = dexConnector2.delegatecall(
            abi.encodeWithSignature(
                'swapTokens(address,address,address,uint256,uint256,uint256)',
                address(this),
                tokenOut,
                tokenIn,
                returnedAmount1,
                0,
                swapTimeLimit2
            )
        );
        require(success, 'Swap request failed');
        uint256 returnedAmount2 = abi.decode(data, (uint256));
        require(returnedAmount2 > 0, 'Swap2 request failed');
        require(returnedAmount2 >= amountIn + profitMin, 'Minimal profit requirements were not met');

        emit SwapProceeded(
            returnedAmount1,
            returnedAmount2,
            5,
            reversed
        );
        return true;
    }

    /**
     * @dev Function for arbitrage with arbitrary path
     */
    function arbitrage (
        address dexConnector1,
        address dexConnector2,
        address[] memory path1,
        address[] memory path2,
        uint256 amountIn, // stablecoin amount (or token amount if reversed)
        uint256 profitMin,
        uint256 swapTimeLimit1,
        uint256 swapTimeLimit2
    ) external onlyOwner returns (bool) {
        uint8 result = IAccessVault(_accessVaultAddress).canTrade(address(this));
        require(result >= 1, 'canTrade request to the Access vault failed');
        if (result == 1) revert('BAA is at liquidation');
        if (result == 2) revert('Fee payment is expired');
        if (result == 3) revert('BAA owner has an outstanding balance after liquidation');
        if (result < 10) revert('BAA can not trade');
        bool reversed;
        if (path1[0] == _stablecoinAddress) {
            require(path1[path1.length - 1] == _tokenAddress, 'Path is not valid');
            require(path2[0] == _tokenAddress, 'Path is not valid');
            require(path2[path2.length - 1] == _stablecoinAddress, 'Path is not valid');
        } else if (path1[0] == _tokenAddress) {
            reversed = true;
            require(path1[path1.length - 1] == _stablecoinAddress, 'Path is not valid');
            require(path2[0] == _stablecoinAddress, 'Path is not valid');
            require(path2[path2.length - 1] == _tokenAddress, 'Path is not valid');
        } else revert('Path is not valid');
        require(
            IExchangeRouter(_exchangeRouterAddress).isDexConnectorRegistered(dexConnector1),
            'dexConnector is not registered'
        );
        require(
            IExchangeRouter(_exchangeRouterAddress).isDexConnectorRegistered(dexConnector2),
            'dexConnector is not registered'
        );

        (bool success, bytes memory data) = dexConnector1.delegatecall(
            abi.encodeWithSignature(
                'swapTokens(address,address[],uint256,uint256,uint256)',
                address(this),
                path1,
                amountIn,
                0,
                swapTimeLimit1
            )
        );
        require(success, 'Swap request failed');
        uint256 returnedAmount1 = abi.decode(data, (uint256));
        require(returnedAmount1 > 0, 'Swap1 request failed');
        emit SwapProceeded(
            amountIn,
            returnedAmount1,
            4,
            reversed
        );

        (success, data) = dexConnector2.delegatecall(
            abi.encodeWithSignature(
                'swapTokens(address,address[],uint256,uint256,uint256)',
                address(this),
                path2,
                returnedAmount1,
                0,
                swapTimeLimit2
            )
        );
        require(success, 'Swap request failed');
        uint256 returnedAmount2 = abi.decode(data, (uint256));
        require(returnedAmount2 > 0, 'Swap2 request failed');
        require(returnedAmount2 >= amountIn + profitMin, 'Minimal profit requirements were not met');

        emit SwapProceeded(
            returnedAmount1,
            returnedAmount2,
            5,
            reversed
        );
        return true;
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