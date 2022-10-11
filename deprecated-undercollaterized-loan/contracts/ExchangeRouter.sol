// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import 'hardhat/console.sol';

contract ExchangeRouter is Initializable {
    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], 'Caller is not the manager');
        _;
    }

    mapping(address => mapping(address => address)) private _implementationContracts;
    // tokenIn address => tokenOut address => implementation contract address
    mapping (address => bool) private _managers;
    address private _defaultImplementationAddress;
    address private _owner;

    function initialize (
        address newOwner,
        address defaultImplementationAddress
    ) public initializer returns (bool) {
        require(newOwner != address(0), 'Owner address can not be zero');
        require(
            defaultImplementationAddress != address(0),
                'Implementation address can not be zero'
        );
        _owner = msg.sender;
        _managers[_owner] = true;
        _defaultImplementationAddress = defaultImplementationAddress;
        return true;
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
     * Setting router and factory addresses
     */
    function setImplementationContract (
        address tokenInAddress,
        address tokenOutAddress,
        address implementationAddress
    ) external onlyManager returns (bool) {
        _implementationContracts[tokenInAddress][tokenOutAddress] = implementationAddress;
        return true;
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

    function getImplementationContract (
        address tokenInAddress,
        address tokenOutAddress
    ) external view returns (address) {
        if (_implementationContracts[tokenInAddress][tokenOutAddress] == address(0)) {
            return _defaultImplementationAddress;
        }
        return _implementationContracts[tokenInAddress][tokenOutAddress];
    }
}