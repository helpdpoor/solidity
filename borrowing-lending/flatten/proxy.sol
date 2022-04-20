// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

/**
 * @dev Access control contract,
 * functions names are self explanatory
 */
abstract contract AccessControl {
    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], 'Caller is not the manager');
        _;
    }

    mapping (address => bool) private _managers;
    address private _owner;

    constructor () {
        _owner = msg.sender;
        _managers[_owner] = true;
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
}

/**
 * @dev Partial interface of the external contract (for the case if some new logic will be needed).
 */
interface IExternal {
    function getUsdRate(address contractAddress) external view returns (uint256);
}

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20_LP {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function getReserves() external view returns (uint112, uint112, uint32);
}

contract Proxy is AccessControl {
    struct Rate {
        address externalContractAddress; // possibility to add some new logic if needed
        address lpAddress;
        uint256 rate;
        bool lpSecond;
    }
    mapping (address => Rate) internal _usdRates;
    uint256 internal constant SHIFT = 1 ether;

    constructor (
        address newOwner
    ) {
        require(newOwner != address(0), 'Owner address can not be zero');
        addToManagers(newOwner);
        transferOwnership(newOwner);
    }

    function setUsdRateData (
        address contractAddress,
        address externalContractAddress,
        address lpAddress,
        uint256 rate,
        bool lpSecond
    ) external onlyManager returns (bool) {
        _usdRates[contractAddress].externalContractAddress = externalContractAddress;
        _usdRates[contractAddress].lpAddress = lpAddress;
        _usdRates[contractAddress].rate = rate;
        _usdRates[contractAddress].lpSecond = lpSecond;
        return true;
    }

    function getUsdRateData (
        address contractAddress
    ) external view returns (
        address externalContractAddress,
        address lpAddress,
        uint256 rate,
        bool lpSecond
    ) {
        return (
            _usdRates[contractAddress].externalContractAddress,
            _usdRates[contractAddress].lpAddress,
            _usdRates[contractAddress].rate,
            _usdRates[contractAddress].lpSecond
        );
    }

    function getUsdRate (
        address contractAddress
    ) external view returns (uint256) {
        if (_usdRates[contractAddress].externalContractAddress != address(0)) {
            IExternal externalContract =
                IExternal(_usdRates[contractAddress].externalContractAddress);
            return externalContract.getUsdRate(contractAddress);
        }
        if (_usdRates[contractAddress].lpAddress != address(0)) {
            IERC20_LP lpToken = IERC20_LP(
                _usdRates[contractAddress].lpAddress
            );
            (uint112 first, uint112 second,) = lpToken.getReserves();
            uint256 total = lpToken.totalSupply();
            if (total == 0) return 0;
            if (_usdRates[contractAddress].lpSecond) {
                return uint256(second) * 2 * SHIFT / total;
            }
            return uint256(first) * 2 * SHIFT / total;
        }
        return _usdRates[contractAddress].rate;
    }
}
