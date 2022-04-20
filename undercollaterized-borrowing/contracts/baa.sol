// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import './roles.sol';

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

contract Baa is Roles {
    address private _router;
    address private _factory;

    constructor (
        address newOwner
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        addToManagers(newOwner);
        transferOwnership(newOwner);
    }

    // manager functions
    function setRouterData (
        address router,
        address factory
    ) external onlyManager returns (bool) {
        _router = router;
        _factory = factory;
        return true;
    }


    function getSwapRate(
        address token0,
        address token1
    ) public view returns (uint256) {

        IERC20_LP lpToken = IERC20_LP(contractAddress);
        uint112 reserve0;
        uint112 reserve1;
        (reserve0, reserve1,) = lpToken.getReserves();
        if (reserve0 == 0 || reserve1 == 0) return 0;
        uint256 rate;
        return SHIFT * uint256(reserve0) / uint256(reserve1);
    }

}