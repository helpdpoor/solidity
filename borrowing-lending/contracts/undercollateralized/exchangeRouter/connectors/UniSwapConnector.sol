// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import '../../../common/TransferHelper.sol';
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @dev Partial interface of the router contract.
 */
interface IRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function getAmountsOut(
        uint amountIn, address[] memory path
    ) external view returns (uint[] memory amounts);
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

contract UniSwapConnector {
    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], 'Caller is not the manager');
        _;
    }

    mapping (address => bool) internal _managers;
    IRouter internal immutable _router;
    address internal _owner;
    address internal immutable _ownAddress;
    uint256 internal constant SHIFT = 1 ether;
    address immutable public WETH;

    constructor (
        address newOwner,
        address router,
        address weth
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        _owner = msg.sender;
        _router = IRouter(router);
        _managers[_owner] = true;
        _ownAddress = address(this);
        WETH = weth;
    }

    /*
     * swap tokens using best path (direct or through weth)
     */
    function swapTokens (
        address receiver,
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 swapTimeLimit
    ) external returns (uint256) {
        require(address(this) != _ownAddress, 'Only delegatecall allowed');
        require(amountIn > 0, 'Amount can not be zero');
        (uint256 amountOut, address[] memory path) =
            _getSwapPath(tokenInAddress, tokenOutAddress, amountIn);
        require(amountOut >= amountOutMin, 'Amount out requirements were not met');
        TransferHelper.safeApprove(tokenInAddress, address(_router), amountIn);
        uint256[] memory amounts = _router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            receiver,
            block.timestamp + swapTimeLimit
        );
        require(amounts[path.length - 1] >= amountOutMin, 'Amount out requirements were not met');
        return amounts[path.length - 1];
    }

    /*
     * swap tokens using best path (direct or through weth)
     */
    function swapTokens (
        address receiver,
        address[] memory path,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 swapTimeLimit
    ) external returns (uint256) {
        require(address(this) != _ownAddress, 'Only delegatecall allowed');
        require(amountIn > 0, 'Amount can not be zero');
        TransferHelper.safeApprove(path[0], address(_router), amountIn);
        uint256[] memory amounts = _router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            receiver,
            block.timestamp + swapTimeLimit
        );
        require(amounts[path.length - 1] >= amountOutMin, 'Amount out requirements were not met');
        return amounts[path.length - 1];
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

    // view functions
    /**
     * Getting swap amount out for token pair
     */
    function getSwapAmount (
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn
    ) external view returns (uint256) {
        (uint256 amountOut,) = _getSwapPath(tokenInAddress, tokenOutAddress, amountIn);
        return amountOut;
    }

    /**
     * Getting swap amount out for arbitrary path
     */
    function getSwapAmount (
        address[] memory path,
        uint256 amountIn
    ) external view returns (uint256) {
        uint256[] memory amounts = _router.getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }

    /**
     * Getting swap amount out for token pair
     */
    function _getSwapPath (
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn
    ) internal view returns (
        uint256 amountOut, address[] memory path
    ) {
        uint256 amountOut1;
        uint256 amountOut2;
        address[] memory path1 = new address[](2);
        path1[0] = tokenInAddress;
        path1[1] = tokenOutAddress;
        address[] memory path2 = new address[](3);
        path2[0] = tokenInAddress;
        path2[1] = WETH;
        path2[2] = tokenOutAddress;
        bool success;
        bytes memory data;

        try _router.getAmountsOut(amountIn, path1) returns (uint256[] memory amounts) {
            amountOut1 = amounts[1];
        } catch {}

        try _router.getAmountsOut(amountIn, path2) returns (uint256[] memory amounts) {
            amountOut2 = amounts[2];
        } catch {}

        require(amountOut1 > 0 || amountOut2 > 0, 'Can not find route');
        if (amountOut2 > amountOut1) {
            return (amountOut2, path2);
        } else {
            return (amountOut1, path1);
        }
    }

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

    /**
     * @dev Router address getter
     */
    function getRouter () external view returns (address) {
        return address(_router);
    }
}