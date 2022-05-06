// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import './access-control.sol';
import './admin.sol';

/**
 * @dev Partial interface of the PancakeRouter contract.
 */
interface IPancakeRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts);
    function factory() external view returns (address);
}

/**
 * @dev Partial interface of the PancakeFactory contract.
 */
interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20_LP {
    function totalSupply() external view returns (uint256);
    function getReserves() external view returns (uint112, uint112, uint32);
}

/**
 * @dev Partial interface of the Access vault contract.
 */
interface IAccessVault {
    function borrow() external returns (bool);
}

contract Baa is AccessControl, AdminContract {
    modifier onlyAccessVault() {
        require(msg.sender == _accessVault, '792');
        _;
    }

    IPancakeRouter private _router;
    IPancakeFactory private _factory;
    IAccessVault private _accessVault;
    uint256 _swapTimeLimit = 3600;
    uint256 _borrowFactor = 1000;
    uint256 private _balance;
    uint256 private _borrowedBalance;

    constructor (
        address newOwner,
        address accessVaultAddress
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        require(accessVaultAddress != address(0), 'Access vault address can not be zero');
        _accessVault = IAccessVault(accessVaultAddress);
        addToManagers(newOwner);
        transferOwnership(newOwner);
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function borrow (
        address tokenAddress,
        uint256 amount
    ) external onlyManager returns (bool) {
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) * _borrowFactor >= amount);
        _accessVault.borrow(tokenAddress, amount);
        return true;
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function swapTokens (
        address tokenAddressA,
        address tokenAddressB,
        uint256 amountIn,
        uint256 amountOutMin
    ) external onlyManager returns (bool) {
        IERC20 tokenA = IERC20(tokenAddressA);
        require(tokenA.balanceOf(address(this)) >= amountIn);
        _router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            [tokenAddressA, tokenAddressB],
            address(this),
            block.timestamp + _swapTimeLimit
        );
        return true;
    }

    // manager functions
    /*
     * Setting router and factory addresses TODO should be moved to the exchange contract
     */
    function setSwapData (
        address routerAddress,
        address factoryAddress
    ) external onlyManager returns (bool) {
        _router = IPancakeRouter(router);
        _factory = IPancakeFactory(factory);
        return true;
    }

    function setAccessVault (
        address accessVaultAddress
    ) external onlyManager returns (bool) {
        require(accessVaultAddress != address(0), 'Access vault address can not be zero');
        _accessVault = IAccessVault(accessVaultAddress);
        return true;
    }

    /*
     * setting swap time limit
     */
    function setSwapTimeLimit (
        uint256 swapTimeLimit
    ) external onlyManager view returns (bool) {
        _swapTimeLimit = swapTimeLimit;
        return true;
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function getSwapRate(
        address tokenAddressA,
        address tokenAddressB
    ) public pure returns (uint256) {
        address pair = _factory.getPair(tokenAddressA, tokenAddressB);
        IERC20_LP lpToken = IERC20_LP(pair);
        address token0 = lpToken.token0();
        address token1 = lpToken.token1();
        if (
            tokenAddressA != token0 && tokenAddressA != token1
            || tokenAddressB != token0 && tokenAddressB != token1
        ) return 0;
        bool reversed = tokenAddressA != token0;
        IERC20 tokenA = IERC20(tokenAddressA);
        IERC20 tokenB = IERC20(tokenAddressB);
        uint8 decimals0;
        uint8 decimals1;
        if (reversed) {
            decimals0 = tokenB.decimals();
            decimals1 = tokenA.decimals();
        } else {
            decimals0 = tokenA.decimals();
            decimals1 = tokenB.decimals();
        }

        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1,) = lpToken.getReserves();
        if (reserve0 == 0 || reserve1 == 0) return 0;
        if (decimals0 < 18) {
            reserve0 *= uint112(10 ** (18 - decimals0));
        }
        if (decimals1 < 18) {
            reserve1 *= uint112(10 ** (18 - decimals1));
        }
        uint256 rate;
        if (reversed) {
            rate = SHIFT * uint256(reserve1) / uint256(reserve0);
        } else {
            rate = SHIFT * uint256(reserve0) / uint256(reserve1);
        }
        return rate;
    }

    // view functions
    function getSwapData () external view returns (
        address routerAddress, address factoryAddress
    ) {
        return (
            address(_router), address(_factory)
        );
    }

    function getSwapTimeLimit () external view returns (uint256) {
        return _swapTimeLimit;
    }

    function getAccessVault () external view returns (address) {
        return address(_accessVault);
    }

    function getBalances () external view returns (
        uint256 balance, uint256 borrowedBalance
    ) {
        return (_balance, _borrowedBalance);
    }

    function getSwapTimeLimit () external view returns (uint256) {
        return _swapTimeLimit;
    }
}