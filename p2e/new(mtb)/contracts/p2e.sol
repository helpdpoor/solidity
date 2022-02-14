// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
import 'hardhat/console.sol';
import './access-control.sol';
import './assets.sol';

contract p2e is AccessControl, Assets {
    event GamePlayed(
        address userAddress,
        uint256 gameId,
        uint256 characterId,
        uint256 endTime,
        bool win
    );

    address private _etnaAddress;
    address private _mtbAddress;
    address private _gameSignerAddress; // address for sending playGame transactions
    address private _taxReceiverAddress; // Receiver of the tax payments
    address private _taxBurningAddress = 0x000000000000000000000000000000000000dEaD;
    // Dead address for a tax burning

    uint16 private _taxBurningPercentage = 5000; // part of the tax to be burned in percents * 100
    uint256 private _withdrawTax = 3000; // base tax for withdraw in percents * 100
    uint256 private _withdrawTaxResetPeriod = 15 days; // period in seconds for tax resetting to 0 (since last game)
    uint256 private _gameCounter; // counter of all games played
    uint256 private _gamePerPeriodNumber = 7; // number of free games per 24 hours or for extra games after payment
    uint256 private _gamePrice; // price for extra games
    uint256 private _metabolismPrice; // price for extra metabolism
    uint256 private _taxAmountTotal; // Total tax for ETNA withdraw (decreased in time if user don't play)
    uint256 private _taxAmountBurned; // Burned tax for ETNA withdraw (decreased in time if user don't play)
    uint256 private _winToWithdraw; // Amount of ETNA won dy users and not withdrawn yet
    uint256 private constant DECIMALS = 10000;
    bool private _safeMode;

    uint256[] private _winAmounts; // Win amounts for different levels
    uint256[] private _depletion; // Strength depletion per game for different levels
    uint256[] private _thresholds; // Strength thresholds for different levels

    mapping (address => uint256) private _gameNumber; // User's played game number
    mapping (address => uint256) private _lastGameTime; // User's last played game time
    mapping (address => uint256) private _paidGameNumber; // User's paid game number left to play
    mapping (address => uint256) private _gamePayment; // User's unspent payment
    mapping (address => uint256) private _userWin; // User's wins that can be withdrawn
    mapping (address => uint256) private _withdrawTaxResetTime; // Time for tax decreasing calculation
    mapping (address => uint256) private _paidMetabolism; // Paid metabolism amount by user

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyGameSigner() {
        require(_gameSignerAddress == msg.sender, "Caller is not the game signer");
        _;
    }

    constructor (
        address etnaAddress,
        address mtbAddress,
        address gameSignerAddress,
        address taxReceiverAddress,
        uint256 gamePrice,
        uint256 metabolismPrice,
        uint256[] memory winAmounts,
        uint256[] memory depletion,
        uint256[] memory thresholds
    ) {
        require(etnaAddress != address(0), 'Token address can not be zero');
        require(mtbAddress != address(0), 'Token address can not be zero');
        require(gameSignerAddress != address(0), 'Game signer address can not be zero');
        require(taxReceiverAddress != address(0), 'Tax receiver address address can not be zero');
        require(gamePrice > 0, 'Game price should be greater than zero');
        require(
            winAmounts.length == depletion.length
                && winAmounts.length == thresholds.length,
            'winAmounts, depletion and threshold arrays should be of the same length'
        );
        for (uint256 i; i < winAmounts.length; i ++) {
            require(
                winAmounts[i] > 0,
                'Any win amount should be greater than zero'
            );
            require(
                thresholds[i] > 0,
                'Any threshold amount should be greater than zero'
            );
            _winAmounts.push(winAmounts[i]);
            _depletion.push(depletion[i]);
            _thresholds.push(thresholds[i]);
        }
        _etnaAddress = etnaAddress;
        _mtbAddress = mtbAddress;
        _gameSignerAddress = gameSignerAddress;
        _taxReceiverAddress = taxReceiverAddress;
        _gamePrice = gamePrice;
        _metabolismPrice = metabolismPrice;
        addToManagers(owner());
    }

    function payForGame () external returns (bool) {
        require(_gamePayment[msg.sender] == 0, 'Your have already paid for a game');
        _takeAsset (
            _etnaAddress,
            msg.sender,
            _gamePrice
        );
        _gamePayment[msg.sender] = _gamePrice;
        return true;
    }

    function payForMetabolism (
        uint256 metabolismAmount
    ) external returns (bool) {
        uint256 amount = metabolismAmount * _metabolismPrice;
        _takeAsset (
            _mtbAddress,
            msg.sender,
            amount
        );
        _burnAssets(_mtbAddress, amount, true);
        _paidMetabolism[msg.sender] += amount;
        return true;
    }

    function withdrawWin (uint256 amount) public returns (bool) {
        require(amount <= _userWin[msg.sender], 'Amount exceeds total winning');
        require(amount > 0, 'Amount should be greater than zero');
        uint256 tax = getCurrentWithdrawTax(msg.sender); // % value multiplied by 100
        uint256 taxAmount = amount * tax / DECIMALS;
        _winToWithdraw -= amount;
        _userWin[msg.sender] -= amount;
        if (
            taxAmount > 0 && amount > taxAmount
        ) amount -= taxAmount;
        else taxAmount = 0;
        _sendAsset(
            _mtbAddress,
            msg.sender,
            amount
        );
        if (taxAmount > 0) {
            _taxAmountTotal += taxAmount;
            _burnAssets(_mtbAddress, taxAmount, true);
        }
        return true;
    }

    function withdrawWinAll () external returns (bool) {
        require(
            _userWin[msg.sender] > 0,
            'Nothing to withdraw'
        );
        return withdrawWin(_userWin[msg.sender]);
    }

    function playGame (
        address userAddress,
        uint256 gameId,
        uint256 level,
        uint256 number,
        uint256 strength,
        uint256 characterId
    ) external onlyGameSigner returns (bool) {
        if (_lastGameTime[userAddress] < block.timestamp - 86400) {
            _gameNumber[userAddress] = 1;
        } else {
            _gameNumber[userAddress] += 1;
        }

        if (_gameNumber[userAddress] > _gamePerPeriodNumber) {
            if (_paidGameNumber[userAddress] > 0) {
                _paidGameNumber[userAddress] -= 1;
            } else {
                require(_gamePayment[userAddress] > 0, 'This account hit 24 hours limit.');
                _gamePayment[userAddress] = 0;
                _paidGameNumber[userAddress] += (_gamePerPeriodNumber - 1);
            }
        }
        _lastGameTime[userAddress] = block.timestamp;

        uint256 _winAmount = _winAmounts[level - 1];
        require(_winAmount > 0, 'Invalid level');
        _withdrawTaxResetTime[userAddress] = block.timestamp;

        bool win = _getGameResult(number, strength);

        if (win) {
            _userWin[userAddress] += _winAmount;
            _winToWithdraw += _winAmount;
        }
        emit GamePlayed(userAddress, gameId, characterId, block.timestamp, win);
        return true;
    }

    // manager functions
    function setTaxBurningPercentage (
        uint16 taxBurningPercentage
    ) external onlyManager returns (bool) {
        _taxBurningPercentage = taxBurningPercentage;
        return true;
    }

    function setTaxBurningAddress (
        address taxBurningAddress
    ) external onlyManager returns (bool) {
        _taxBurningAddress = taxBurningAddress;
        return true;
    }

    function setTaxReceiverAddress (
        address taxReceiverAddress
    ) external onlyManager returns (bool) {
        _taxReceiverAddress = taxReceiverAddress;
        return true;
    }

    function setSafeMode (
        bool safeMode
    ) external onlyManager returns (bool) {
        _safeMode = safeMode;
        return true;
    }

    function setGameSignerAddress (
        address gameSignerAddress
    ) external onlyManager returns (bool) {
        require (gameSignerAddress != address(0), 'Game signer address can not be zero');
        _gameSignerAddress = gameSignerAddress;
        return true;
    }

    function setGameData (
        uint256[] calldata winAmounts,
        uint256[] calldata depletion,
        uint256[] calldata thresholds
    ) external onlyManager returns (bool) {
        require(
            winAmounts.length == depletion.length
                && winAmounts.length == thresholds.length,
            'winAmounts, depletion and threshold arrays should be of the same length'
        );
        delete _winAmounts;
        delete _depletion;
        delete _thresholds;
        for (uint256 i; i < winAmounts.length; i ++) {
            require(
                winAmounts[i] > 0, 'Any win amount should be greater than zero'
            );
            require(
                thresholds[i] > 0, 'Any threshold amount should be greater than zero'
            );
            _winAmounts.push(winAmounts[i]);
            _depletion.push(depletion[i]);
            _thresholds.push(thresholds[i]);
        }
        return true;
    }

    function setGamePrice (
        uint256 gamePrice
    ) external onlyManager returns (bool) {
        require(gamePrice > 0, 'Game price should be greater than zero');
        _gamePrice = gamePrice;
        return true;
    }

    function setMetabolismPrice (
        uint256 metabolismPrice
    ) external onlyManager returns (bool) {
        require(metabolismPrice > 0, 'Game price should be greater than zero');
        _metabolismPrice = metabolismPrice;
        return true;
    }

    function setGamePerPeriodNumber (
        uint256 gamePerPeriodNumber
    ) external onlyManager returns (bool) {
        require(
            gamePerPeriodNumber > 0,
            'Games per period should be greater than zero'
        );
        _gamePerPeriodNumber = gamePerPeriodNumber;
        return true;
    }

    function setWithdrawTax (
        uint256 withdrawTax
    ) external onlyManager returns (bool) {
        _withdrawTax = withdrawTax;
        return true;
    }

    function setWithdrawTaxResetPeriod (
        uint256 taxResetPeriod
    ) external onlyManager returns (bool) {
        require(
            taxResetPeriod > 0,
            'Tax reset period should be greater than zero'
        );
        _withdrawTaxResetPeriod = taxResetPeriod;
        return true;
    }

    // admin functions
    function adminWithdraw (
        address tokenAddress, uint256 amount
    ) external onlyOwner returns (bool) {
        if (
            tokenAddress == _mtbAddress && _safeMode
        ) {
            uint256 balance = IERC20(_mtbAddress).balanceOf(address(this));
            require(
                balance >= _winToWithdraw + amount,
                'Amount exceeded safe amount to withdraw'
            );
        }
        _sendAsset(
            tokenAddress,
            msg.sender,
            amount
        );
        return true;
    }

    // internal functions
    function _burnAssets (
        address tokenAddress,
        uint256 amount,
        bool split
    ) private returns (bool) {
        uint256 toBeBurned;
        if (split) {
            toBeBurned =  amount * _taxBurningPercentage / DECIMALS;
        } else {
            toBeBurned =  amount;
        }
        if (toBeBurned > 0 && toBeBurned < amount) {
            _taxAmountBurned += toBeBurned;
            _sendAsset(
                tokenAddress,
                _taxBurningAddress,
                toBeBurned
            );
            amount -= toBeBurned;
        }
        if (amount > 0) {
            _sendAsset(
                _mtbAddress,
                _taxReceiverAddress,
                amount
            );
        }
        return true;
    }

    // view functions
    function _getGameResult (
        uint256 number, uint256 strength
    ) private pure returns (bool) {
        return number <= strength;
    }

    function getGamePrice () external view returns (uint256) {
        return _gamePrice;
    }

    function getMetabolismPrice () external view returns (uint256) {
        return _metabolismPrice;
    }

    function getGameSignerAddress () public view returns (address) {
        return _gameSignerAddress;
    }

    function getPayment (
        address userAddress
    ) external view returns (uint256) {
        return _gamePayment[userAddress];
    }

    function getSafeMode () external view returns (bool) {
        return _safeMode;
    }

    function getGameData () external view returns (
        uint256[] memory winAmounts,
        uint256[] memory depletions,
        uint256[] memory thresholds
    ) {
        return (_winAmounts, _depletion, _thresholds);
    }

    function getUserWin (
        address userAddress
    ) external view returns (uint256) {
        return _userWin[userAddress];
    }

    function getCurrentWithdrawTax (
        address userAddress
    ) public view returns (uint256) {
        if (_withdrawTax == 0) return 0;
        uint256 timePassed = block.timestamp - _withdrawTaxResetTime[userAddress];
        if (timePassed >= _withdrawTaxResetPeriod) return 0;
        return _withdrawTax * (_withdrawTaxResetPeriod - timePassed) / _withdrawTaxResetPeriod;
    }

    /**
     * @dev Arbitrary token balance of the contract
     */
    function getTokenBalance (
        address tokenAddress
    ) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }

    function getGamePerPeriodNumber () external view returns (uint256) {
        return _gamePerPeriodNumber;
    }

    function getWithdrawTax () external view returns (uint256) {
        return _withdrawTax;
    }

    function getWithdrawTaxResetPeriod () external view returns (uint256) {
        return _withdrawTaxResetPeriod;
    }

    function getTaxAmountTotal () external view returns (uint256) {
        return _taxAmountTotal;
    }

    function getTaxAmountBurned () external view returns (uint256) {
        return _taxAmountBurned;
    }

    function getPaidGameNumber (
        address userAddress
    ) external view returns (uint256) {
        return _paidGameNumber[userAddress];
    }

    function getGameNumber (
        address userAddress
    ) external view returns (uint256) {
        return _gameNumber[userAddress];
    }

    function getLastGameTime (
        address userAddress
    ) external view returns (uint256) {
        return _lastGameTime[userAddress];
    }

    function getWinToWithdraw () external view returns (uint256) {
        return _winToWithdraw;
    }

    function getTaxBurningPercentage () external view returns (uint256) {
        return _taxBurningPercentage;
    }

    function getTaxBurningAddress () external view returns (address) {
        return _taxBurningAddress;
    }

    function getTaxReceiverAddress () external view returns (address) {
        return _taxReceiverAddress;
    }

    function getPaidMetabolism (
        address userAddress
    ) external view returns (uint256) {
        return _paidMetabolism[userAddress];
    }
}