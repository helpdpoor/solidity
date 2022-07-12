// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import './Storage.sol';
import '../../common/TransferHelper.sol';
import 'hardhat/console.sol';

contract AccessVault is Initializable, Storage {
    modifier onlyOwner() {
        require(msg.sender == _owner, 'Caller is not the owner');
        _;
    }
    modifier onlyManager() {
        require(_managers[msg.sender], '1.1');
        _;
    }
    modifier onlyBaaContract() {
        require(
            _baaRegistry[msg.sender].ownerAddress != address(0),
                '1.2'
        );
        _;
    }
    modifier onlyBorrowingLending() {
        require(
            msg.sender == _borrowingLending,
                '1.2'
        );
        _;
    }
    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, '80');
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    event Borrow (
        address baaAddress,
        uint256 depositAmount,
        uint256 loanAmount
    );
    event ReturnLoan (
        address baaAddress,
        uint256 depositAmount,
        uint256 loanAmount,
        uint256 fee
    );
    event PayFee (
        address baaAddress,
        uint256 amount
    );
    event MarginSwapSet (
        address baaAddress,
        uint256 amountOut,
        uint256 marginRate,
        bool reversed,
        bool below,
        bool active
    );
    event BaaDeployed (
        address baaAddress,
        address owner,
        address stablecoinAddress,
        address tokenAddress
    );
    event Liquidated (
        address baaAddress,
        uint256 totalBalance, // BAA balance + deposit
        uint256 liquidationAmount
    );

    function initialize (
        address newOwner,
        address borrowingLending,
        address borrowingPowerAddress,
        address baaBeaconAddress,
        uint256 borrowingFeeFactor
    ) public initializer returns (bool) {
        require(newOwner != address(0), '2.1');
        require(
            borrowingLending != address(0),
                '2.2'
        );
        require(
            borrowingPowerAddress != address(0),
                '2.3'
        );
        _owner = msg.sender;
        _managers[_owner] = true;
        _borrowingLending = borrowingLending;
        _borrowingPowerContract = IBorrowingPower(borrowingPowerAddress);
        _borrowingFeeFactor = borrowingFeeFactor;
        _baaBeaconAddress = baaBeaconAddress;
        _marketIndex = SHIFT;
        _marketIndexLastTime = block.timestamp;
        _maxFeeUnpaidPeriod = 2 * 24 * 3600;
        _reentrancyStatus = _NOT_ENTERED; // reentrancy indicator initial setting
        return true;
    }

    /*
     * Deploy beacon proxy for user's baa if not existed
     */
    function deployBaa (
        address stablecoinAddress,
        address tokenAddress
    ) external returns (bool) {
        require(
            _stablecoinProfileId[stablecoinAddress] > 0,
                '3.1'
        );
        require(
            _tokenAvailable[tokenAddress],
                '3.2'
        );
        require(
            _baaAddresses[msg.sender][stablecoinAddress][tokenAddress] == address(0),
                '3.3'
        );
        bytes memory _initializationCallData = abi.encodeWithSignature(
            'initialize(address,address,address,address,address)',
                address(this),
                _exchangeRouterAddress,
                msg.sender,
                stablecoinAddress,
                tokenAddress
        );
        BeaconProxy baaContract = new BeaconProxy(_baaBeaconAddress, _initializationCallData);

        _baaRegistry[address(baaContract)].ownerAddress = msg.sender;
        _baaRegistry[address(baaContract)].stablecoinAddress = stablecoinAddress;
        _baaRegistry[address(baaContract)].tokenAddress = tokenAddress;
        _baaRegistry[address(baaContract)].feeUpdatedAt = block.timestamp;
        _baaRegistry[address(baaContract)].lastMarketIndex = _marketIndex;
        _baaAddresses[msg.sender][stablecoinAddress][tokenAddress] = address(baaContract);
        emit BaaDeployed(
            address(baaContract),
            msg.sender,
            stablecoinAddress,
            tokenAddress
        );
        return true;
    }

    /*
     * Deposit and borrow to the BAA in a single transaction
     */
    function borrow (
        address baaAddress,
        uint256 amount
    ) external returns (bool) {
        require(amount > 0, '4.1');
        address baaOwner = msg.sender;
        require(
            _baaRegistry[baaAddress].ownerAddress == baaOwner,
                '4.2'
        );
        _updateFee(baaAddress);
        uint256 borrowingPower = _borrowingPowerContract.getUserBorrowingPower(baaOwner);
        require(borrowingPower > 0, 'Borrowing power calculation error');
        uint256 depositAmount = (amount + _baaRegistry[baaAddress].loanAmount) * DECIMALS
            / borrowingPower - _baaRegistry[baaAddress].depositAmount;
        TransferHelper.safeTransferFrom(
            _baaRegistry[baaAddress].stablecoinAddress,
            baaOwner,
            address(this),
            depositAmount
        );
        _baaRegistry[baaAddress].depositAmount += depositAmount;
        _baaRegistry[baaAddress].loanAmount += amount;
        _baaRegistry[baaAddress].borrowingPower = borrowingPower;
        TransferHelper.safeTransfer(
            _baaRegistry[baaAddress].stablecoinAddress,
            baaAddress,
            amount
        );

        if (_baaRegistry[baaAddress].lastFeePaymentTime == 0) {
            _baaRegistry[baaAddress].lastFeePaymentTime = block.timestamp;
        }
        emit Borrow(baaAddress, depositAmount, amount);
        return true;
    }

    /*
     * Let BAA contract return loan
     */
    function returnLoan (
        address baaAddress,
        uint256 amount
    ) external returns (bool) {
        address baaOwner = msg.sender;
        require(amount > 0, '5.1');
        require(
            _baaRegistry[baaAddress].ownerAddress == baaOwner,
                '5.3'
        );
        _updateFee(baaAddress);
        require(
            _baaRegistry[baaAddress].loanAmount
                + _baaRegistry[baaAddress].accumulatedFee >= amount,
                    '5.2'
        );
        IERC20 stablecoin = IERC20(_baaRegistry[baaAddress].stablecoinAddress);
        IERC20 token = IERC20(_baaRegistry[baaAddress].tokenAddress);
        uint256 stablecoinBalance = stablecoin.balanceOf(baaAddress);
        uint256 tokenBalance = token.balanceOf(baaAddress);
        uint256 baaBalance = stablecoinBalance;
        if (tokenBalance > 0) {
            baaBalance += _getSwapAmount(
                _getImplementationAddress(address(stablecoin), address(token)),
                address(token),
                address(stablecoin),
                tokenBalance
            );
        }
        require(
            amount <= stablecoinBalance, '5.4'
        );
        _functionCall(
            baaAddress,
            abi.encodeWithSignature(
                'withdraw(address,uint256)',
                _baaRegistry[baaAddress].stablecoinAddress, amount
            ), '5.7'
        );

        uint256 fee;
        if (_baaRegistry[baaAddress].accumulatedFee > amount) {
            fee = amount;
        } else {
            fee = _baaRegistry[baaAddress].accumulatedFee;
        }
        if (fee > 0) {
            amount -= fee;
            _baaRegistry[baaAddress].accumulatedFee -= fee;
            _baaRegistry[baaAddress].lastFeePaymentTime = block.timestamp;
            uint256 ownerFee = fee * _feeOwnerFactor / DECIMALS;
            if (ownerFee > 0) {
                TransferHelper.safeTransfer(
                    _baaRegistry[baaAddress].stablecoinAddress,
                    _owner,
                    ownerFee
                );
            }
            _fee += fee - ownerFee;
        }
        uint256 depositAmount;
        if (amount > 0) {
            _baaRegistry[baaAddress].loanAmount -= amount;
            uint256 securedByCollateral = _baaRegistry[baaAddress].depositAmount
                * _baaRegistry[baaAddress].borrowingPower / DECIMALS;
            if (_baaRegistry[baaAddress].loanAmount < securedByCollateral) {
                depositAmount = (securedByCollateral - _baaRegistry[baaAddress].loanAmount)
                    * DECIMALS / _baaRegistry[baaAddress].borrowingPower;
                if (depositAmount > _baaRegistry[baaAddress].depositAmount) {
                    depositAmount = _baaRegistry[baaAddress].depositAmount;
                }
                _baaRegistry[baaAddress].depositAmount -= depositAmount;
                TransferHelper.safeTransfer(
                    _baaRegistry[baaAddress].stablecoinAddress,
                    baaOwner,
                    depositAmount
                );
            }
        }
        emit ReturnLoan(baaAddress, depositAmount, amount, fee);
        return true;
    }

    /*
     * Pay fee
     */
    function payFee (
        address baaAddress
    ) external returns (bool) {
        address baaOwner = msg.sender;
        require(
            _baaRegistry[baaAddress].ownerAddress == baaOwner,
                '7.1'
        );
        _updateFee(baaAddress);
        uint256 fee = _baaRegistry[baaAddress].accumulatedFee;
        TransferHelper.safeTransferFrom(
            _baaRegistry[baaAddress].stablecoinAddress,
            msg.sender,
            address(this),
            fee
        );
        uint256 ownerFee = fee * _feeOwnerFactor / DECIMALS;
        if (ownerFee > 0) {
            TransferHelper.safeTransfer(
                _baaRegistry[baaAddress].stablecoinAddress,
                _owner,
                ownerFee
            );
        }
        _fee += fee - ownerFee;
        _baaRegistry[baaAddress].accumulatedFee = 0;
        _baaRegistry[baaAddress].lastFeePaymentTime = block.timestamp;
        emit PayFee(baaAddress, fee);
        return true;
    }

    // owner function
    function transferOwnership(address newOwner) public onlyOwner returns (bool) {
        require(newOwner != address(0), '8.1');
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
     * @dev approve for Borrowing Lending contract
     */
    function approveForBorrowingLending (
        address tokenAddress,
        uint256 amount
    ) external onlyBorrowingLending returns (bool) {
        TransferHelper.safeApprove(
            tokenAddress, _borrowingLending, amount
        );
        return true;
    }

    /**
     * @dev Function for withdrawing erc20 tokens by admin.
     */
    function adminWithdraw (
        address tokenAddress, uint256 amount
    ) external onlyOwner returns (bool) {
        // todo add reentrancy gard
        bool reentrancy;
        if (tokenAddress == address(0)) {
            payable(owner()).transfer(amount);
            require(!reentrancy, '24.1');
            reentrancy = true;
        } else {
            TransferHelper.safeTransfer(tokenAddress, owner(), amount);
        }
        return true;
    }

    /**
     * @dev Function for withdrawing erc20 tokens by admin from BAA
     */
    function adminWithdrawBaa (
        address baaAddress, address tokenAddress, uint256 amount
    ) external onlyOwner returns (bool) {
        require(
            _baaRegistry[baaAddress].ownerAddress != address(0), '12.1'
        );
        _functionCall(
            baaAddress,
            abi.encodeWithSignature(
                    'withdraw(address,uint256)', tokenAddress, amount
            ), '12.2'
        );
        return true;
    }

    function setMarginSwap (
        address baaAddress,
        uint256 amount,
        uint256 marginRate,
        bool reversed,
        bool below,
        bool active
    ) external payable returns (bool) {
        require(msg.value == _marginSwapFee, '13.1');
        require(
            _baaRegistry[baaAddress].ownerAddress != address(0), '13.2'
        );
        _marginSwapRegistry[baaAddress].amount = amount;
        _marginSwapRegistry[baaAddress].marginRate = marginRate;
        _marginSwapRegistry[baaAddress].reversed = reversed;
        _marginSwapRegistry[baaAddress].below = below;
        _marginSwapRegistry[baaAddress].active = active;
        emit MarginSwapSet(
            baaAddress,
            amount,
            marginRate,
            reversed,
            below,
            active
        );
        return true;
    }

    function setBorrowingFeeFactor (
        uint256 borrowingFeeFactor
    ) external onlyManager returns (bool) {
        _updateMarketIndex();
        _borrowingFeeFactor = borrowingFeeFactor;
        return true;
    }

    function payOffOutstandingBalance (
        address stablecoinAddress
    ) external returns (bool) {
        uint256 amount = _outstandingBalance[msg.sender][stablecoinAddress];
        require(amount > 0, '6.1');
        TransferHelper.safeTransferFrom(
            stablecoinAddress, msg.sender, address(this), amount
        );
        _outstandingBalance[msg.sender][stablecoinAddress] = 0;
        for (uint256 i; i < _stablecoins.length; i ++) {
            if (_outstandingBalance[msg.sender][_stablecoins[i]] > 0) return true;
        }
        _hasOutstandingBalance[msg.sender] = false;
        return true;
    }

    // manager functions
    function setLiquidationFeeFactor (
        uint256 liquidationFeeFactor
    ) external onlyManager returns (bool) {
         _liquidationFeeFactor = liquidationFeeFactor;
        return true;
    }

    function setNegativeFactor (
        uint256 negativeFactor
    ) external onlyManager returns (bool) {
        _negativeFactor = negativeFactor;
        return true;
    }

    function setNotificationFactor (
        uint256 notificationFactor
    ) external onlyManager returns (bool) {
        _notificationFactor = notificationFactor;
        return true;
    }

    function proceedMarginSwap (
        address baaAddress
    ) external onlyManager returns(bool) {
        require(
            _marginSwapRegistry[baaAddress].active, '15.1'
        );
        require(canTrade(baaAddress) == 10, '15.2');
        address tokenInAddress;
        address tokenOutAddress;
        if (_marginSwapRegistry[baaAddress].reversed) {
            tokenInAddress = _baaRegistry[baaAddress].tokenAddress;
            tokenOutAddress = _baaRegistry[baaAddress].stablecoinAddress;
        } else {
            tokenInAddress = _baaRegistry[baaAddress].stablecoinAddress;
            tokenOutAddress = _baaRegistry[baaAddress].tokenAddress;
        }
        uint256 amountOut = _getSwapAmount(
            _getImplementationAddress(tokenInAddress, tokenOutAddress),
            tokenInAddress,
            tokenOutAddress,
            _marginSwapRegistry[baaAddress].amount
        );

        if (_marginSwapRegistry[baaAddress].below) {
            require(
                _marginSwapRegistry[baaAddress].amount * SHIFT / amountOut <=
                    _marginSwapRegistry[baaAddress].marginRate, '15.3'
            );
        } else {
            require(
                _marginSwapRegistry[baaAddress].amount * SHIFT / amountOut >=
                    _marginSwapRegistry[baaAddress].marginRate, '15.3'
            );
        }
        // todo add some slippage for amountOut
        _functionCall(
            baaAddress,
            abi.encodeWithSignature(
                'swap(uint256,uint256,uint8,bool)',
                _marginSwapRegistry[baaAddress].amount,
                amountOut,
                2,
                _marginSwapRegistry[baaAddress].reversed
            ), '15.4'
        );
        _marginSwapRegistry[baaAddress].active = false;
        return true;
    }

    // todo function for stablecoin transfer from one BAA to another ???

    function setStablecoinProfileId (
        address stablecoinAddress,
        uint256 profileId
    ) external onlyManager returns (bool) {
        if (
            profileId > 0 && _stablecoinProfileId[stablecoinAddress] == 0
        ) {
            _stablecoins.push(stablecoinAddress);
        } else if (
            profileId == 0 && _stablecoinProfileId[stablecoinAddress] > 0
        ) {
            for (uint256 i; i < _stablecoins.length; i ++) {
                if (_stablecoins[i] == stablecoinAddress) {
                    _stablecoins[i] = _stablecoins[_stablecoins.length - 1];
                    _stablecoins.pop();
                    break;
                }
            }
        }
        _stablecoinProfileId[stablecoinAddress] = profileId;
        return true;
    }

    function setTokenAvailable (
        address tokenAddress,
        bool available
    ) external onlyManager returns (bool) {
        _tokenAvailable[tokenAddress] = available;
        return true;
    }

    function setBorrowingLending (
        address borrowingLending
    ) external onlyManager returns (bool) {
        require(
            borrowingLending != address(0), '17.1'
        );
        _borrowingLending = borrowingLending;
        return true;
    }

    function setBorrowingPowerContract (
        address borrowingPowerAddress
    ) external onlyManager returns (bool) {
        require(
            borrowingPowerAddress != address(0), '18.1'
        );
        _borrowingPowerContract = IBorrowingPower(borrowingPowerAddress);
        return true;
    }

    function setExchangeRouter (
        address exchangeRouterAddress
    ) external onlyManager returns (bool) {
        require(
            exchangeRouterAddress != address(0), '19.1'
        );
        _exchangeRouterAddress = exchangeRouterAddress;
        return true;
    }

    function setBaaBeacon (
        address baaBeaconAddress
    ) external onlyManager returns (bool) {
        require(
            baaBeaconAddress != address(0), '20.1'
        );
        _baaBeaconAddress = baaBeaconAddress;
        return true;
    }

    function setMaxFeeUnpaidPeriod (
        uint256 maxFeeUnpaidPeriod
    ) external onlyManager returns (bool) {
        _maxFeeUnpaidPeriod = maxFeeUnpaidPeriod;
        return true;
    }

    function setFeeOwnerFactor (
        uint256 feeOwnerFactor
    ) external onlyManager returns (bool) {
        require(
            feeOwnerFactor <= DECIMALS, '21.1'
        );
        _feeOwnerFactor = feeOwnerFactor;
        return true;
    }

    function setMarginSwapFee (
        uint256 marginSwapFee
    ) external onlyManager returns (bool) {
        _marginSwapFee = marginSwapFee;
        return true;
    }

    function liquidate (
        address baaAddress
    ) external onlyManager returns (bool) {
        address baaOwner = _baaRegistry[baaAddress].ownerAddress;
        require(
            baaOwner != address(0),
                '22.1'
        );
        _updateFee(baaAddress);
        require(
            atLiquidation(
                _getImplementationAddress(
                    _baaRegistry[baaAddress].stablecoinAddress,
                    _baaRegistry[baaAddress].tokenAddress
                ),
                baaAddress,
                false
            ), '22.2'
        );
        uint256 owedAmount = _baaRegistry[baaAddress].loanAmount +
            _baaRegistry[baaAddress].accumulatedFee;

        IERC20 stablecoin = IERC20(_baaRegistry[baaAddress].stablecoinAddress);
        IERC20 token = IERC20(_baaRegistry[baaAddress].tokenAddress);
        uint256 balance = token.balanceOf(baaAddress);
        if (balance > 0) { // swap tokens to stablecoins
            _functionCall(
                baaAddress,
                abi.encodeWithSignature(
                    'swap(uint256,uint256,uint8,bool)',
                    balance,
                    0,
                    3,
                    true
                ), '22.3'
            );
        }
        balance = stablecoin.balanceOf(baaAddress);
        uint256 liquidationAmount = owedAmount + owedAmount * _liquidationFeeFactor / DECIMALS
            - _baaRegistry[baaAddress].depositAmount;
        uint256 withdrawAmount = liquidationAmount > balance ? balance : liquidationAmount;
        if (withdrawAmount < liquidationAmount) {
            _hasOutstandingBalance[baaOwner] = true;
            _outstandingBalance[baaOwner][_baaRegistry[baaAddress].stablecoinAddress] +=
                liquidationAmount - withdrawAmount;
        }
        _functionCall(
            baaAddress,
            abi.encodeWithSignature(
                'withdraw(address,uint256)',
                    _baaRegistry[baaAddress].stablecoinAddress, withdrawAmount
            ), '22.4'
        );

        _baaRegistry[baaAddress].depositAmount = 0;
        _baaRegistry[baaAddress].loanAmount = 0;
        _baaRegistry[baaAddress].accumulatedFee = 0;
        emit Liquidated(
            baaAddress,
            balance,
            liquidationAmount
        );
        return true;
    }

    // internal functions
    function _functionCall (
        address contractAddress, bytes memory callData, string memory revertMessage
    ) internal returns (bool) {
        (bool success, bytes memory data) = contractAddress.call(callData);
        (bool result) = abi.decode(data, (bool));
        require(success && result, revertMessage);
        return true;
    }

    function _updateMarketIndex () internal returns (bool) {
        uint256 period = block.timestamp
            - _marketIndexLastTime;
        if (period == 0) return false;
        uint256 marketFactor = SHIFT +
            SHIFT * _borrowingFeeFactor * period / DECIMALS / YEAR;

        _marketIndex = _marketIndex * marketFactor / SHIFT;
        _marketIndexLastTime = block.timestamp;
        return true;
    }

    function _getImplementationAddress (
        address tokenInAddress,
        address tokenOutAddress
    ) internal returns (address) {
        bytes memory callData = abi.encodeWithSignature(
            'getImplementationContract(address,address)',
            tokenInAddress, tokenOutAddress
        );
        (bool success, bytes memory data) = _exchangeRouterAddress.call(callData);
        (address implementationAddress) = abi.decode(data, (address));
        require(success && implementationAddress != address(0), '23.1');
        return implementationAddress;
    }

    function _getSwapAmount (
        address implementationAddress,
        address tokenInAddress,
        address tokenOutAddress,
        uint256 amountIn
    ) internal view returns(uint256) {
        IExchangeRouterImplementation implementationContract =
            IExchangeRouterImplementation(implementationAddress);
        uint256 amount = implementationContract.getSwapAmount(
            tokenInAddress, tokenOutAddress, amountIn
        );
        return amount;
    }

    function _updateFee (
        address baaAddress
    ) internal returns (bool) {
        _baaRegistry[baaAddress].accumulatedFee +=
            calculateFee(baaAddress, false);
        _baaRegistry[baaAddress].feeUpdatedAt = block.timestamp;
        _baaRegistry[baaAddress].lastMarketIndex = _marketIndex;
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

    /**
     * Function returns amount owed by BAA contract (loan + fees)
     */
    function getOwedAmount (
        address baaAddress
    ) public view returns (uint256) {
        return _baaRegistry[baaAddress].loanAmount
            + calculateFee(baaAddress, true);
    }

    function getDebankWithdrawnAmount (
        address baaAddress
    ) public view returns (uint256) {
        return _debankWithdrawnAmount[baaAddress];
    }

    function calculateFee (
        address baaAddress,
        bool accumulated
    ) public view returns (uint256) {
        if (_baaRegistry[baaAddress].ownerAddress == address(0)) return 0;
        uint256 marketIndex = _marketIndex;

        uint256 extraPeriodStartTime =
            _marketIndexLastTime;
        if (extraPeriodStartTime < _baaRegistry[baaAddress].feeUpdatedAt) {
            extraPeriodStartTime = _baaRegistry[baaAddress].feeUpdatedAt;
        }
        uint256 extraPeriod = block.timestamp - extraPeriodStartTime;
        if (extraPeriod > 0) {
            uint256 marketFactor = SHIFT +
                SHIFT * _borrowingFeeFactor * extraPeriod / DECIMALS / YEAR;
            marketIndex = marketIndex * marketFactor / SHIFT;
        }

        uint256 newAmount = _baaRegistry[baaAddress].loanAmount
            * marketIndex
            / _baaRegistry[baaAddress].lastMarketIndex;

        uint256 fee = newAmount - _baaRegistry[baaAddress].loanAmount;
        if (accumulated) {
            fee += _baaRegistry[baaAddress].accumulatedFee;
        }
        return fee;
    }

    function getMarketIndex () external view returns (uint256) {
        return _marketIndex;
    }

    function getStablecoinProfileId (
        address stablecoinAddress
    ) external view returns (uint256) {
        return _stablecoinProfileId[stablecoinAddress];
    }

    function getStablecoinsNumber () external view returns (uint256) {
        return _stablecoins.length;
    }

    function getStablecoinByIndex (
        uint256 index
    ) external view returns (address) {
        return _stablecoins[index];
    }

    function getTokenAvailable (
        address tokenAddress
    ) external view returns (bool) {
        return _tokenAvailable[tokenAddress];
    }

    function getBaaAddresses (
        address baaAddress
    ) external view returns (
        address ownerAddress,
        address stablecoinAddress,
        address tokenAddress
    ) {
        return (
            _baaRegistry[baaAddress].ownerAddress,
            _baaRegistry[baaAddress].stablecoinAddress,
            _baaRegistry[baaAddress].tokenAddress
        );
    }

    function getBaaData (
        address baaAddress
    ) external view returns (
        uint256 depositAmount,
        uint256 loanAmount,
        uint256 accumulatedFee,
        uint256 borrowingPower,
        uint256 feeUpdatedAt,
        uint256 lastFeePaymentTime,
        uint256 lastMarketIndex
    ) {
        return (
            _baaRegistry[baaAddress].depositAmount,
            _baaRegistry[baaAddress].loanAmount,
            _baaRegistry[baaAddress].accumulatedFee,
            _baaRegistry[baaAddress].borrowingPower,
            _baaRegistry[baaAddress].feeUpdatedAt,
            _baaRegistry[baaAddress].lastFeePaymentTime,
            _baaRegistry[baaAddress].lastMarketIndex
        );
    }

    function getUserBaaAddress (
        address userAddress, address stablecoinAddress, address tokenAddress
    ) external view returns (address) {
        return _baaAddresses[userAddress][stablecoinAddress][tokenAddress];
    }

    function getContractAddresses () external view returns (
        address borrowingLendingContract,
        address borrowingPowerContract,
        address exchangeRouterContract,
        address baaBeaconContract
    ) {
        return (
           _borrowingLending,
            address(_borrowingPowerContract),
            _exchangeRouterAddress,
            _baaBeaconAddress
        );
    }

    function getFee () external view returns (uint256) {
        return _fee;
    }

    function getMarginSwapFee () external view returns (uint256) {
        return _marginSwapFee;
    }

    function getMaxFeeUnpaidPeriod () external view returns (uint256) {
        return _maxFeeUnpaidPeriod;
    }

    function getOutstandingBalance (
        address userAddress,
        address stablecoinAddress
    ) external view returns (uint256) {
        return _outstandingBalance[userAddress][stablecoinAddress];
    }

    function getHasOutstandingBalance (
        address userAddress
    ) external view returns (bool) {
        return _hasOutstandingBalance[userAddress];
    }

    function canTrade (
        address implementationAddress,
        address baaAddress
    ) public view returns (uint8) {
        if (
            atLiquidation(
                implementationAddress,
                baaAddress,
                false
            )
        ) return 1; // BAA is at liquidation
        if (
            _baaRegistry[baaAddress].lastFeePaymentTime > 0
                && block.timestamp - _baaRegistry[baaAddress].lastFeePaymentTime
                    >= _maxFeeUnpaidPeriod
        ) return 2; // BAA fee payment is expired
        if (_hasOutstandingBalance[_baaRegistry[baaAddress].ownerAddress]) return 3;
        return 10; // Trading available
    }

    function canTrade (
        address baaAddress
    ) public returns (uint8) {
        return canTrade(
            _getImplementationAddress(
                _baaRegistry[baaAddress].stablecoinAddress,
                _baaRegistry[baaAddress].tokenAddress
            ),
            baaAddress
        );
    }

    function atLiquidation (
        address implementationAddress,
        address baaAddress,
        bool notification
    ) public view returns (bool) {
        return getMinimalPayment(implementationAddress, baaAddress, notification) > 0;
    }

    function getMinimalPayment (
        address implementationAddress,
        address baaAddress,
        bool notification
    ) public view returns (uint256) {
        uint256 owedAmount = getOwedAmount(baaAddress);
        if (owedAmount == 0) return 0;
        IERC20 stablecoin = IERC20(_baaRegistry[baaAddress].stablecoinAddress);
        IERC20 token = IERC20(_baaRegistry[baaAddress].tokenAddress);
        uint256 stablecoinBalance = stablecoin.balanceOf(baaAddress);
        uint256 tokenBalance = token.balanceOf(baaAddress);
        uint256 baaBalance = stablecoinBalance;
        if (tokenBalance > 0) {
            uint256 swapAmount = _getSwapAmount(
                implementationAddress,
                address(token),
                address(stablecoin),
                tokenBalance
            );
            baaBalance += swapAmount;
        }
        uint256 negativeVolatilityThreshold;
        if (notification) {
            negativeVolatilityThreshold = _baaRegistry[baaAddress].depositAmount
            * _negativeFactor * _notificationFactor / DECIMALS / DECIMALS;
        } else {
            negativeVolatilityThreshold = _baaRegistry[baaAddress].depositAmount
            * _negativeFactor / DECIMALS;
        }
//        console.log('baaBalance', baaBalance);
//        console.log('_baaRegistry[baaAddress].depositAmount', _baaRegistry[baaAddress].depositAmount);
//        console.log('negativeVolatilityThreshold', negativeVolatilityThreshold);
//        console.log('owedAmount - negativeVolatilityThreshold', owedAmount - negativeVolatilityThreshold);
//        console.log('atLiquidation owedAmount', owedAmount);
        if (baaBalance >= owedAmount - negativeVolatilityThreshold) return 0;
        return owedAmount - negativeVolatilityThreshold - baaBalance;
    }

    function getFactors () external view returns (
        uint256 liquidationFeeFactor,
        uint256 negativeFactor,
        uint256 notificationFactor,
        uint256 borrowingFeeFactor,
        uint256 feeOwnerFactor
    ) {
        return  (
            _liquidationFeeFactor,
            _negativeFactor,
            _notificationFactor,
            _borrowingFeeFactor,
            _feeOwnerFactor
        );
    }

    function getMarginSwapData (
        address baaAddress
    ) external view returns (
        uint256 amount,
        uint256 marginRate,
        bool reversed,
        bool below,
        bool active
    ) {
        return (
            _marginSwapRegistry[baaAddress].amount,
            _marginSwapRegistry[baaAddress].marginRate,
            _marginSwapRegistry[baaAddress].reversed,
            _marginSwapRegistry[baaAddress].below,
            _marginSwapRegistry[baaAddress].active
        );
    }
}