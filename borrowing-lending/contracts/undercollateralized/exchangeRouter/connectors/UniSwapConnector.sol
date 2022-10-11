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
    function factory() external view returns (address);
}

/**
 * @dev Partial interface of the factory contract.
 */
interface IFactory {
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
    IFactory internal immutable _factory;
    address internal _owner;
    address internal immutable _ownAddress;
    uint256 internal constant SHIFT = 1 ether;

    constructor (
        address newOwner,
        address router,
        address factory
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        _owner = msg.sender;
        _router = IRouter(router);
        _factory = IFactory(factory);
        _managers[_owner] = true;
        _ownAddress = address(this);
    }

    /*
     * getting current swap rate for a tokens pair
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
        address pair = _factory.getPair(tokenInAddress, tokenOutAddress);
        require(pair != address(0), 'Pair does not exists');
        address[] memory path = new address[](2);
        path[0] = tokenInAddress;
        path[1] = tokenOutAddress;
        TransferHelper.safeApprove(tokenInAddress, address(_router), amountIn);
        uint256[] memory amounts = _router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            receiver,
            block.timestamp + swapTimeLimit
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

    // view functions
    /**
     * Getting swap amount out for token pair
     */
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
     * @dev Swap data getter
     */
    function getSwapData () external view returns (
        address routerAddress, address factoryAddress
    ) {
        return (
            address(_router), address(_factory)
        );
    }
}