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

interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @dev Contract module for assets transferring.
 * Reentrancy protection based on OpenZeppelin ReentrancyGuard
 */
abstract contract Assets {
    modifier nonReentrant() {
        require(_status != _ENTERED, "Reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    function _takeAsset (
        address tokenAddress, address fromAddress, uint256 amount
    ) internal returns (bool) {
        require(tokenAddress != address(0), 'Token address should not be zero');
        IERC20 tokenContract = IERC20(tokenAddress);
        require(
            tokenContract.transferFrom(fromAddress, address(this), amount),
            'Transfer does not return true'
        );
        return true;
    }

    function _sendAsset (
        address tokenAddress, address toAddress, uint256 amount
    ) internal nonReentrant returns (bool) {
        if (tokenAddress == address(0)) {
            require(address(this).balance >= amount,
                'Not enough contract balance');
            payable(toAddress).transfer(amount);
        } else {
            IERC20 tokenContract = IERC20(tokenAddress);
            require(
                tokenContract.transfer(toAddress, amount),
                'Transfer does not return true'
            );
        }
        return true;
    }

    /**
     * @dev Contract timestamp getter
     */
    function getTimestamp() external view returns (uint256) {
        return block.timestamp;
    }
}

/**
 * @dev String operations.
 */
library Strings {
    bytes16 private constant _HEX_SYMBOLS = "0123456789abcdef";

    /**
     * @dev Converts a `uint256` to its ASCII `string` decimal representation.
     */
    function toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation.
     */
    function toHexString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0x00";
        }
        uint256 temp = value;
        uint256 length = 0;
        while (temp != 0) {
            length++;
            temp >>= 8;
        }
        return toHexString(value, length);
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.
     */
    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _HEX_SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }
}

/**
 * @dev Elliptic Curve Digital Signature Algorithm (ECDSA) operations.
 *
 * These functions can be used to verify that a message was signed by the holder
 * of the private keys of a given address.
 */
library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS,
        InvalidSignatureV
    }

    function _throwError(RecoverError error) private pure {
        if (error == RecoverError.NoError) {
            return; // no error: do nothing
        } else if (error == RecoverError.InvalidSignature) {
            revert("ECDSA: invalid signature");
        } else if (error == RecoverError.InvalidSignatureLength) {
            revert("ECDSA: invalid signature length");
        } else if (error == RecoverError.InvalidSignatureS) {
            revert("ECDSA: invalid signature 's' value");
        } else if (error == RecoverError.InvalidSignatureV) {
            revert("ECDSA: invalid signature 'v' value");
        }
    }

    /**
     * @dev Returns the address that signed a hashed message (`hash`) with
     * `signature` or error string. This address can then be used for verification purposes.
     *
     * The `ecrecover` EVM opcode allows for malleable (non-unique) signatures:
     * this function rejects them by requiring the `s` value to be in the lower
     * half order, and the `v` value to be either 27 or 28.
     *
     * IMPORTANT: `hash` _must_ be the result of a hash operation for the
     * verification to be secure: it is possible to craft signatures that
     * recover to arbitrary addresses for non-hashed data. A safe way to ensure
     * this is by receiving a hash of the original message (which may otherwise
     * be too long), and then calling {toEthSignedMessageHash} on it.
     *
     * Documentation for signature generation:
     * - with https://web3js.readthedocs.io/en/v1.3.4/web3-eth-accounts.html#sign[Web3.js]
     * - with https://docs.ethers.io/v5/api/signer/#Signer-signMessage[ethers]
     *
     * _Available since v4.3._
     */
    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address, RecoverError) {
        // Check the signature length
        // - case 65: r,s,v signature (standard)
        // - case 64: r,vs signature (cf https://eips.ethereum.org/EIPS/eip-2098) _Available since v4.1._
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            // ecrecover takes the signature parameters, and the only way to get them
            // currently is to use assembly.
            assembly {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            return tryRecover(hash, v, r, s);
        } else if (signature.length == 64) {
            bytes32 r;
            bytes32 vs;
            // ecrecover takes the signature parameters, and the only way to get them
            // currently is to use assembly.
            assembly {
                r := mload(add(signature, 0x20))
                vs := mload(add(signature, 0x40))
            }
            return tryRecover(hash, r, vs);
        } else {
            return (address(0), RecoverError.InvalidSignatureLength);
        }
    }

    /**
     * @dev Returns the address that signed a hashed message (`hash`) with
     * `signature`. This address can then be used for verification purposes.
     *
     * The `ecrecover` EVM opcode allows for malleable (non-unique) signatures:
     * this function rejects them by requiring the `s` value to be in the lower
     * half order, and the `v` value to be either 27 or 28.
     *
     * IMPORTANT: `hash` _must_ be the result of a hash operation for the
     * verification to be secure: it is possible to craft signatures that
     * recover to arbitrary addresses for non-hashed data. A safe way to ensure
     * this is by receiving a hash of the original message (which may otherwise
     * be too long), and then calling {toEthSignedMessageHash} on it.
     */
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, signature);
        _throwError(error);
        return recovered;
    }

    /**
     * @dev Overload of {ECDSA-tryRecover} that receives the `r` and `vs` short-signature fields separately.
     *
     * See https://eips.ethereum.org/EIPS/eip-2098[EIP-2098 short signatures]
     *
     * _Available since v4.3._
     */
    function tryRecover(
        bytes32 hash,
        bytes32 r,
        bytes32 vs
    ) internal pure returns (address, RecoverError) {
        bytes32 s = vs & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
        uint8 v = uint8((uint256(vs) >> 255) + 27);
        return tryRecover(hash, v, r, s);
    }

    /**
     * @dev Overload of {ECDSA-recover} that receives the `r and `vs` short-signature fields separately.
     *
     * _Available since v4.2._
     */
    function recover(
        bytes32 hash,
        bytes32 r,
        bytes32 vs
    ) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, r, vs);
        _throwError(error);
        return recovered;
    }

    /**
     * @dev Overload of {ECDSA-tryRecover} that receives the `v`,
     * `r` and `s` signature fields separately.
     *
     * _Available since v4.3._
     */
    function tryRecover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address, RecoverError) {
        // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
        // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
        // the valid range for s in (301): 0 < s < secp256k1n ÷ 2 + 1, and for v in (302): v ∈ {27, 28}. Most
        // signatures from current libraries generate a unique signature with an s-value in the lower half order.
        //
        // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
        // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
        // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
        // these malleable signatures as well.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return (address(0), RecoverError.InvalidSignatureS);
        }
        if (v != 27 && v != 28) {
            return (address(0), RecoverError.InvalidSignatureV);
        }

        // If the signature is valid (and not malleable), return the signer address
        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature);
        }

        return (signer, RecoverError.NoError);
    }

    /**
     * @dev Overload of {ECDSA-recover} that receives the `v`,
     * `r` and `s` signature fields separately.
     */
    function recover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, v, r, s);
        _throwError(error);
        return recovered;
    }

    /**
     * @dev Returns an Ethereum Signed Message, created from a `hash`. This
     * produces hash corresponding to the one signed with the
     * https://eth.wiki/json-rpc/API#eth_sign[`eth_sign`]
     * JSON-RPC method as part of EIP-191.
     *
     * See {recover}.
     */
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        // 32 is the length in bytes of hash,
        // enforced by the type signature above
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    /**
     * @dev Returns an Ethereum Signed Message, created from `s`. This
     * produces hash corresponding to the one signed with the
     * https://eth.wiki/json-rpc/API#eth_sign[`eth_sign`]
     * JSON-RPC method as part of EIP-191.
     *
     * See {recover}.
     */
    function toEthSignedMessageHash(bytes memory s) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", Strings.toString(s.length), s));
    }

    /**
     * @dev Returns an Ethereum Signed Typed Data, created from a
     * `domainSeparator` and a `structHash`. This produces hash corresponding
     * to the one signed with the
     * https://eips.ethereum.org/EIPS/eip-712[`eth_signTypedData`]
     * JSON-RPC method as part of EIP-712.
     *
     * See {recover}.
     */
    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}

contract p2e is AccessControl, Assets {
    using ECDSA for bytes32;
    event GamePlayed (
        address userAddress,
        uint256 serialNumber,
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
    uint256 private _withdrawTax = 1000; // base tax for withdraw in percents * 100
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
    mapping (address => uint256) private _userSerialNumber; // Paid metabolism amount by user

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
        _sendAsset (
            _etnaAddress,
            _taxBurningAddress,
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
        _paidMetabolism[msg.sender] += metabolismAmount;
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
        uint256 serialNumber,
        uint256 characterId,
        uint256 data,
        bytes memory signature
    ) external returns (bool) {
        (uint256 gameNumber, uint256 level, uint256 strength) = _extractData(data);
        bytes memory message = abi.encode(
            userAddress, gameNumber, level, serialNumber, strength, characterId
        );
        address signer = keccak256(message).toEthSignedMessageHash().recover(signature);
        require(_gameSignerAddress == signer, "Signature is not valid");
        require(userAddress == msg.sender, "Caller is not authorized");
        _userSerialNumber[userAddress] ++;
        require(serialNumber == _userSerialNumber[userAddress], "Serial number mismatch");

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

        bool win = _getGameResult(gameNumber, strength);

        if (win) {
            _userWin[userAddress] += _winAmount;
            _winToWithdraw += _winAmount;
        }
        emit GamePlayed(userAddress, serialNumber, characterId, block.timestamp, win);
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

    function getUserSerialNumber (
        address userAddress
    ) external view returns (uint256) {
        return _userSerialNumber[userAddress];
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

    function getAvailableGames (
        address userAddress
    ) external view returns (uint256) {
        uint256 availableGames;

        if (_lastGameTime[userAddress] < block.timestamp - 86400) {
            availableGames = _gamePerPeriodNumber
                + _paidGameNumber[userAddress];
        } else if (_gameNumber[userAddress] < _gamePerPeriodNumber) {
            availableGames = _gamePerPeriodNumber
                - _gameNumber[userAddress]
                + _paidGameNumber[userAddress];
        } else {
            availableGames = _paidGameNumber[userAddress];
        }

        if (_gamePayment[userAddress] > 0) {
            availableGames += _gamePerPeriodNumber;
        }
        return availableGames;
    }

    function _extractData (
        uint256 data
    ) internal pure returns (
        uint256 gameNumber,
        uint256 level,
        uint256 strength
    ) {
        uint256 switcher = data / 10 ** 15;
        data -= switcher * 10 ** 15;
        uint256[] memory result = new uint256[](3);
        result[0] = data / 10 ** 10;
        data -= result[0] * 10 ** 10;
        result[1] = data / 10 ** 5;
        data -= result[1] * 10 ** 5;
        result[2] = data;
        if (switcher < 2) {
            return (result[0], result[1], result[2]);
        } else if (switcher < 4) {
            return (result[0], result[2], result[1]);
        } else if (switcher < 6) {
            return (result[1], result[0], result[2]);
        } else if (switcher < 8) {
            return (result[2], result[0], result[1]);
        } else if (switcher < 9) {
            return (result[1], result[2], result[0]);
        } else {
            return (result[2], result[1], result[0]);
        }
    }
}
