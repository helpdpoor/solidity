// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import '../../common/TransferHelper.sol';
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

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
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountsOut(
        uint amountIn, address[] memory path
    ) external view returns (uint[] memory amounts);
    function factory() external view returns (address);
}

/**
 * @dev Partial interface of the PancakeFactory contract.
 */
interface IPancakeFactory {
    function getPair(address tokenIn, address tokenOut) external view returns (address pair);
}

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20_LP {
    function totalSupply() external view returns (uint256);
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract ExchangeRouterPancakeSwap {
    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], 'Caller is not the manager');
        _;
    }

    mapping (address => bool) private _managers;
    IPancakeRouter private _router;
    IPancakeFactory private _factory;
    address private _owner;
    uint256 private _swapTimeLimit = 3600;
    uint256 private constant SHIFT = 1 ether;

    constructor (
        address newOwner,
        address router,
        address factory
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        _owner = msg.sender;
        _router = IPancakeRouter(router);
        _factory = IPancakeFactory(factory);
        _managers[_owner] = true;
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function swapTokens (
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenInAddress;
        path[1] = tokenOutAddress;
        TransferHelper.safeTransferFrom(
            tokenInAddress, msg.sender, address(this), amountIn
        );
        TransferHelper.safeApprove(tokenInAddress, address(_router), amountIn);
        uint256[] memory amounts = _router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            block.timestamp + _swapTimeLimit
        );
        return amounts[1];
    }

    // admin functions
    function transferOwnership(address newOwner) public onlyOwner returns (bool) {
        require(newOwner != address(0), 'newOwner should not be zero address');
        _owner = newOwner;
        return true;
    }

    function addToManagers (
        address userAddress
    ) public onlyOwner returns (bool) {
        _managers[userAddress] = true;
        return true;
    }

    function removeFromManagers (
        address userAddress
    ) public onlyOwner returns (bool) {
        _managers[userAddress] = false;
        return true;
    }

    /**
     * @dev Function for withdrawing erc20 tokens by admin.
     */
    function adminWithdraw (
        address tokenAddress, uint256 amount
    ) external onlyOwner returns (bool) {
        require(tokenAddress != address(0), 'Token address can not be zero');
        TransferHelper.safeTransfer(tokenAddress, msg.sender, amount);
        return true;
    }

    // manager functions
    /*
     * Setting router and factory addresses
     */
    function setSwapData (
        address routerAddress,
        address factoryAddress
    ) external onlyManager returns (bool) {
        _router = IPancakeRouter(routerAddress);
        _factory = IPancakeFactory(factoryAddress);
        return true;
    }

    /*
     * setting swap time limit
     */
    function setSwapTimeLimit (
        uint256 swapTimeLimit
    ) external onlyManager returns (bool) {
        _swapTimeLimit = swapTimeLimit;
        return true;
    }

    /*
     * getting current swap rate for a tokens pair
     */
    function getSwapRate(
        address tokenInAddress,
        address tokenOutAddress
    ) external view returns (uint256) {
        address pair = _factory.getPair(tokenInAddress, tokenOutAddress);
        require(pair != address(0), 'Pair does not exists');
        IERC20_LP lpToken = IERC20_LP(pair);
        address token0 = lpToken.token0();
        address token1 = lpToken.token1();
        if (
            tokenInAddress != token0 && tokenInAddress != token1
            || tokenOutAddress != token0 && tokenOutAddress != token1
        ) return 0;
        bool reversed = tokenInAddress != token0;
        IERC20 tokenIn = IERC20(tokenInAddress);
        IERC20 tokenOut = IERC20(tokenOutAddress);
        uint8 decimals0;
        uint8 decimals1;
        if (reversed) {
            decimals0 = tokenOut.decimals();
            decimals1 = tokenIn.decimals();
        } else {
            decimals0 = tokenIn.decimals();
            decimals1 = tokenOut.decimals();
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
        if (reversed) {
            return SHIFT * uint256(reserve0) / uint256(reserve1);
        } else {
            return SHIFT * uint256(reserve1) / uint256(reserve0);
        }
    }

    function getSwapAmount (
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn
    ) external view returns (uint256) {
        address pair = _factory.getPair(tokenInAddress, tokenOutAddress);
        require(pair != address(0), 'Pair does not exists');
        address[] memory path = new address[](2);
        path[0] = tokenInAddress;
        path[1] = tokenOutAddress;
        uint256[] memory amounts = _router.getAmountsOut(
            amountIn, path
        );
        return amounts[1];
    }

    // view functions
    /**
     * @dev If true - user has manager role
     */
    function isManager (
        address userAddress
    ) external view returns (bool) {
        return _managers[userAddress];
    }

    /**
     * @dev Owner address getter
     */
    function owner() public view returns (address) {
        return _owner;
    }

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
}