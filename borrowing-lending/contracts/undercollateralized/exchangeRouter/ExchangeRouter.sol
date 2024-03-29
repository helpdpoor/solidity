// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the DexConnector Contracts.
 */
interface IDexConnector {
    function swapTokens (
        address receiver,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 swapTimeLimit
    ) external returns (uint256);
    function getSwapAmount (
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256);
    function getSwapAmount (
        address[] memory path,
        uint256 amountIn
    ) external view returns (uint256);
}

contract ExchangeRouter is Initializable {
    event RegisterDexConnector (
        address dexConnector,
        bool registered
    );

    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], 'Caller is not the manager');
        _;
    }

    mapping(address => bool) internal _dexConnectorsRegistry;
    mapping(address => mapping(address => address)) internal _defaultDexConnectors;
    // tokenIn address => tokenOut address => default dex connector address
    mapping (address => bool) internal _managers;
    address internal _fallbackDexConnector;
    address internal _owner;
    address internal immutable _ownAddress;

    constructor (
        address newOwner,
        address fallbackDexConnector
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        require(
            fallbackDexConnector != address(0),
                'Dex connector address can not be zero'
        );
        _owner = msg.sender;
        _managers[_owner] = true;
        _fallbackDexConnector = fallbackDexConnector;
        _dexConnectorsRegistry[fallbackDexConnector] = true;
        _ownAddress = address(this);
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

    // manager functions
    /*
     * Register dex connector address
     */
    function registerDexConnector (
        address dexConnector,
        bool registered
    ) external onlyManager returns (bool) {
        require(
            dexConnector != address(0),
            'Dex connector address can not be zero'
        );
        _dexConnectorsRegistry[dexConnector] = registered;
        emit RegisterDexConnector(dexConnector, registered);
        return true;
    }

    /*
     * Setting fallback dex connector address
     */
    function setFallbackDexConnector (
        address fallbackDexConnector
    ) external onlyManager returns (bool) {
        require(
            fallbackDexConnector != address(0),
            'Dex connector address can not be zero'
        );
        _fallbackDexConnector = fallbackDexConnector;
        return true;
    }

    /*
     * Setting default dex connector address for tokens pair
     */
    function setDefaultDexConnector (
        address tokenIn,
        address tokenOut,
        address dexConnector
    ) external onlyManager returns (bool) {
        _defaultDexConnectors[tokenIn][tokenOut] = dexConnector;
        return true;
    }

    // view functions
    function getSwapAmount (
        address dexConnector,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256) {
        if (dexConnector == address(0)) {
            dexConnector = getDefaultDexConnector(
                tokenIn, tokenOut
            );
        } else {
            require(isDexConnectorRegistered(dexConnector), 'Dex connector is not registered');
        }
        return IDexConnector(dexConnector).getSwapAmount(
            tokenIn,
            tokenOut,
            amountIn
        );
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
     * @dev Get default dex connector for token pair
     */
    function getDefaultDexConnector (
        address tokenIn,
        address tokenOut
    ) public view returns (address) {
        if (_defaultDexConnectors[tokenIn][tokenOut] == address(0)) {
            return _fallbackDexConnector;
        }
        return _defaultDexConnectors[tokenIn][tokenOut];
    }

    /*
     * Check if dex connector is registered
     */
    function isDexConnectorRegistered (
        address dexConnector
    ) public view returns (bool) {
        return _dexConnectorsRegistry[dexConnector];
    }

    /**
     * @dev Function for estimating arbitrage profit.
     */
    function getArbitrageProfit (
        address token1,
        address token2,
        address dexConnector1,
        address dexConnector2,
        uint256 amountIn // token1 amount
    ) external view returns (uint256) {
        require(
            isDexConnectorRegistered(dexConnector1),
            'dexConnector is not registered'
        );
        require(
            isDexConnectorRegistered(dexConnector2),
            'dexConnector is not registered'
        );
        uint256 amountOut1 = IDexConnector(dexConnector1).getSwapAmount(
            token1, token2, amountIn
        );
        uint256 amountOut2 = IDexConnector(dexConnector2).getSwapAmount(
            token2, token1, amountOut1
        );

        if (!(amountOut2 > amountIn)) return 0;
        return amountOut2 - amountIn;
    }

    /**
     * @dev Function for estimating arbitrage profit.
     */
    function getArbitrageProfit (
        address[] memory path1,
        address[] memory path2,
        address dexConnector1,
        address dexConnector2,
        uint256 amountIn // path1[0] amount
    ) external view returns (uint256) {
        require(path2[path2.length - 1] == path1[0], 'Path is not valid');
        require(path1[path1.length - 1] == path2[0], 'Path is not valid');
        require(
            isDexConnectorRegistered(dexConnector1),
            'dexConnector is not registered'
        );
        require(
            isDexConnectorRegistered(dexConnector2),
            'dexConnector is not registered'
        );

        uint256 amountOut1 = IDexConnector(dexConnector1).getSwapAmount(
            path1, amountIn
        );
        uint256 amountOut2 = IDexConnector(dexConnector2).getSwapAmount(
            path2, amountOut1
        );

        if (!(amountOut2 > amountIn)) return 0;
        return amountOut2 - amountIn;
    }
}