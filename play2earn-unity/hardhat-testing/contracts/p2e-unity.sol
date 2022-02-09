// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _setOwner(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _setOwner(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _setOwner(newOwner);
    }

    function _setOwner(address newOwner) private {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract Play2Earn is Ownable {
    address _manager; // address for sending playGame transactions

    uint256 _feeToWithdraw;
    uint256 _gameCounter;
    struct Game {
        uint256 characterId;
        uint256 level;
        uint256 endTime;
        address playerAddress;
        bool win;
    }
    mapping (uint256 => Game) _games;
    IERC20 ETNA;

    /**
     * @dev Throws if called by any account other than the manager.
     */
    modifier onlyManager() {
        require(_manager == _msgSender(), "Caller is not the manager");
        _;
    }

    constructor (
        address tokenAddress,
        address newManager
    ) {
        require(tokenAddress != address(0), 'Token address can not be zero');
        require(newManager != address(0), 'Manager address can not be zero');
        ETNA = IERC20(tokenAddress);
        _manager = newManager;
    }

    function setManager (address newManager) external onlyOwner returns (bool) {
        require (newManager != address(0), 'Manager address can not be zero');
        _manager = newManager;
        return true;
    }

    function getManager () public view returns (address) {
        return _manager;
    }

    function getLastGameId () external view returns (uint256) {
        return _gameCounter;
    }

    function getGame (uint256 gameId) external view returns (address, uint256, uint256, uint256, bool) {
        Game memory game = _games[gameId];
        return (game.playerAddress, game.characterId, game.level, game.endTime, game.win);
    }

    function withdrawAmount (uint256 amount) external onlyOwner returns (bool) {
        uint256 balance = ETNA.balanceOf(address(this));
        require(balance >= _feeToWithdraw && amount <= balance - _feeToWithdraw, 'Amount exceeded safe amount to withdraw');
        require(ETNA.transfer(owner(), amount),
            'ETNA transfer failed');
        return true;
    }

    function withdraw () external onlyOwner returns (bool) {
        uint256 balance = ETNA.balanceOf(address(this));
        require(ETNA.transfer(owner(), balance - _feeToWithdraw),
            'ETNA transfer failed');
        return true;
    }

    function forceWithdraw (uint256 amount) external onlyOwner returns (bool) {
        uint256 balance = ETNA.balanceOf(address(this));
        require(amount <= balance, 'Amount exceeded contract balance');
        require(ETNA.transfer(owner(), amount),
            'ETNA transfer failed');
        return true;
    }

    function getFeeToWithdraw () external view returns (uint256) {
        return _feeToWithdraw;
    }
}