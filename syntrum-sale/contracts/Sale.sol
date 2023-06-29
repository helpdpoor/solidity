// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import './common/AccessControl.sol';
import './common/Utils.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the Rates contract.
 */
interface IRates {
    function getUsdRate (
        address contractAddress
    ) external view returns (uint256);
}

/**
 * @dev Sale contract,
 * functions names are self explanatory
 */
contract Sale is AccessControl, Utils {
    using ECDSA for bytes32;

    event Purchase(
        address indexed userAddress,
        address indexed paymentToken,
        uint256 paidAmount,
        uint256 usdPaidAmount,
        uint256 purchasedAmount
    );

    event Withdraw(
        address indexed userAddress,
        uint256 withdrawAmount
    );

    struct PaymentProfile {
        address contractAddress; // if == zero payments are in the native currency
        uint256 weight; // sorting order at UI (asc from left to right)
        uint256 totalPaid;  // total amount of tokens paid in this currency
        string name;
        string currency;
        bool active;
    }

    struct Round {
        uint256 usdRate; // syntrum token price in USD multiplied by 10 ** 18
        uint256 startTime; // unix timestamp
        uint256 endTime; // unix timestamp
        uint256 duration; // duration in seconds
        uint256 maxAllocation; // maximum allocation of Syntrum tokens
        uint256 allocated; // amount of allocated Syntrum tokens
    }

    struct TokenReleaseStage {
        uint16 percentage; // purchased tokens percentage to be released
        uint256 activationTime;  // stage activation timestamp
    }

    mapping (uint8 => PaymentProfile) internal _paymentProfiles;
    mapping (uint8 => TokenReleaseStage) internal _releaseStages;
    mapping (uint8 => Round) internal _rounds;
    mapping (address => uint256) internal _purchasedAmount;
    mapping (address => uint256) internal _withdrawnAmount;
    mapping(address => uint256) internal _innerRates;
    mapping (address => bool) internal _whitelist;
    
    IRates internal _rates;
    address internal _syntrumTokenAddress;
    address _receiver;
    bytes32 internal constant MANAGER = keccak256(abi.encode('MANAGER'));
    bytes32 internal constant SIGNER = keccak256(abi.encode('SIGNER'));
    bool internal _isPublic;
    uint256 internal _usdTotalPaid; // paid in total in usd (stablecoins)
    uint256 internal _totalWithdrawn; // withdrawn token amount (for statistics)
    uint256 internal _maxPurchaseAmount;
    // Max amount of tokens that can be purchased by address
    uint256 internal constant SHIFT_18 = 10 ** 18;
    uint256 internal constant SHIFT_4 = 10 ** 4;
    uint16 internal _batchLimit = 100; 
    // limit for array length when added/removed to/from whitelist
    uint8 internal _tokenReleaseStagesNumber;
    // number of the stages of token releasing
    uint8 internal _paymentProfilesNumber; // number of payment profiles
    uint8 internal _roundsNumber; // number of rounds
    uint8 internal _maxRoundsNumber = 254;
    uint8 internal _activeRoundIndex;

    /**
     * @dev constructor
     */
    constructor (
        address ownerAddress,
        address managerAddress,
        address ratesAddress,
        address syntrumTokenAddress,
        address receiverAddress
    ) {
        require(ownerAddress != address(0), 'ownerAddress can not be zero');
        require(managerAddress != address(0), 'managerAddress can not be zero');
        require(ratesAddress != address(0), 'ratesAddress can not be zero');
        require(syntrumTokenAddress != address(0), 'syntrumTokenAddress can not be zero');
        require(receiverAddress != address(0), 'receiverAddress can not be zero');
        require(
            syntrumTokenAddress != address(0), 'syntrumTokenAddress can not be zero'
        );
        _owner = ownerAddress;
        _grantRole(MANAGER, managerAddress);
        _rates =  IRates(ratesAddress);
        _syntrumTokenAddress = syntrumTokenAddress;
        _receiver = receiverAddress;
    }

    function addToWhitelist (address userAddress) external hasRole(MANAGER) returns (bool) {
        _whitelist[userAddress] = true;
        return true;
    }

    function addToWhitelistMultiple (
        address[] calldata userAddresses
    ) external hasRole(MANAGER) returns (bool) {
        for (uint16 i; i < userAddresses.length; i ++) {
            if (i >= _batchLimit) break;
            _whitelist[userAddresses[i]] = true;
        }
        return true;
    }

    function removeFromWhitelist (address userAddress) external hasRole(MANAGER) returns (bool) {
        _whitelist[userAddress] = false;
        return true;
    }

    function removeFromWhitelistMultiple (
        address[] calldata userAddresses
    ) external hasRole(MANAGER) returns (bool) {
        for (uint16 i; i < userAddresses.length; i ++) {
            if (i >= _batchLimit) break;
            _whitelist[userAddresses[i]] = false;
        }
        return true;
    }

    function isWhitelisted (address userAddress) external view returns (bool) {
        return _whitelist[userAddress];
    }

    function setBatchLimit (
        uint16 batchLimit
    ) external hasRole(MANAGER) returns (bool) {
        require(batchLimit > 0, 'Batch limit should be greater than zero');
        _batchLimit = batchLimit;
        return true;
    }

    function getBatchLimit () external view returns (uint16) {
        return _batchLimit;
    }

    function _checkSale () internal returns (bool) {
        if (
            _activeRoundIndex == 0
                && _rounds[1].startTime < block.timestamp
        ) {
            _activeRoundIndex = 1;
        }
        require(_activeRoundIndex > 0, 'Sale is not started yet');
        uint8 activeRoundIndex = _activeRoundIndex;
        for (uint8 i = activeRoundIndex; i <= _roundsNumber; i ++) {
            if (_rounds[i].endTime < block.timestamp) {
                require(i < _roundsNumber, 'Sale is over');
                _activeRoundIndex = i + 1;
                if (_rounds[i].maxAllocation > _rounds[i].allocated) {
                    _rounds[_activeRoundIndex].maxAllocation
                        += (_rounds[i].maxAllocation - _rounds[i].allocated);
                }
            } else {
                break;
            }
        }

        return true;
    }

    function checkPermission (
        bytes memory signature
    ) public view returns (bool) {
        if (_isPublic) return true;
        if (_whitelist[msg.sender]) return true;
        require(signature.length > 0, "Sale is in private mode");
        bytes memory message = abi.encode(msg.sender);
        address signer = keccak256(message)
            .toEthSignedMessageHash()
            .recover(signature);
        require(_checkRole(SIGNER, signer), "Signature is not valid");
        return true;
    }

    function getRatesContract () external view returns (address) {
        return address(_rates);
    }

    function setRatesContract (
        address ratesAddress
    ) external hasRole(MANAGER) returns (bool) {
        require(ratesAddress != address(0), 'ratesAddress can not be zero');
        _rates =  IRates(ratesAddress);
        return true;
    }

    function getReceiver () external view returns (address) {
        return _receiver;
    }

    function setReceiver (
        address receiverAddress
    ) external onlyOwner returns (bool) {
        require(receiverAddress != address(0), 'receiverAddress can not be zero');
        _receiver =  receiverAddress;
        return true;
    }

    function getRate (
        address tokenAddress
    ) public view returns (uint256) {
        if (tokenAddress == _syntrumTokenAddress) {
            return getSyntrumUsdRate(true);
        }
        if (_innerRates[tokenAddress] > 0) {
            return _innerRates[tokenAddress];
        }
        uint256 rate = _rates.getUsdRate(tokenAddress);
        require(rate > 0, 'Rate calculation error');
        return rate;
    }

    function getSyntrumUsdRate (
        bool needUpdate
    ) public view returns (uint256) {
        if (!needUpdate) return _rounds[_activeRoundIndex].usdRate;
        uint8 activeRoundIndex = getActiveRoundIndex();
        return _rounds[activeRoundIndex].usdRate;
    }

    function getActiveRoundIndex () public view returns (uint8) {
        uint8 activeRoundIndex = _activeRoundIndex;
        if (
            activeRoundIndex == 0
                && _rounds[1].startTime < block.timestamp
        ) {
            activeRoundIndex = 1;
        }
        if (activeRoundIndex == 0) return 0;
        for (uint8 i = activeRoundIndex; i <= _roundsNumber; i ++) {
            if (_rounds[i].endTime < block.timestamp) {
                if (i >= _roundsNumber) return _maxRoundsNumber + 1;
                activeRoundIndex = i + 1;
            } else {
                break;
            }
        }
        return activeRoundIndex;
    }

    function isSaleActive () external view returns (bool) {
        uint8 activeRoundIndex = getActiveRoundIndex();
        return activeRoundIndex > 0
            && activeRoundIndex < _maxRoundsNumber;
    }

    function isSaleOver () external view returns (bool) {
        return getActiveRoundIndex() == _maxRoundsNumber;
    }

    function getInnerRate (
        address tokenAddress
    ) external view returns (uint256) {
        return _innerRates[tokenAddress];
    }

    function setInnerRate (
        address tokenAddress,
        uint256 rate
    ) external hasRole(MANAGER) returns (bool) {
        _innerRates[tokenAddress] = rate;
        return true;
    }

    function getPublic () external view returns (bool) {
        return _isPublic;
    }

    function setPublic (
        bool isPublic
    ) external hasRole(MANAGER) returns (bool) {
        _isPublic =  isPublic;
        return true;
    }

    /**
     * @dev Function accepts payments both in native currency and
     * in predefined erc20 tokens
     * Distributed token is accrued to the buyer's address to be withdrawn later
     */
    function purchase (
        uint8 paymentProfileIndex,
        uint256 paymentAmount, // payment amount
        address receiver,
        bytes memory signature
    ) external payable returns (bool) {
        _checkSale();
        checkPermission(signature);
        uint256 syntrumUsdRate = getSyntrumUsdRate(false);
        require(
            receiver != address(0),
                'Receiver address should not be a zero address'
        );
        require(
            _paymentProfiles[paymentProfileIndex].active,
                'Payment profile is not active or does not exist'
        );
        if (_paymentProfiles[paymentProfileIndex].contractAddress != address(0)) {
            require(
                paymentAmount > 0,
                    'paymentAmount for this payment profile should be greater than zero'
            );
            require(
                msg.value == 0, 'msg.value should be zero for this payment profile'
            );
        } else {
            paymentAmount = msg.value;
            require(
                paymentAmount > 0,
                    'Message value for this payment profile should be greater than zero'
            );
        }
        uint256 usdPaymentAmount = getUsdPaymentAmount(
            paymentProfileIndex, paymentAmount
        );
        uint256 purchaseAmount = usdPaymentAmount
            * SHIFT_18 / syntrumUsdRate;
        require(purchaseAmount > 0, 'Purchase amount calculation error');
        require(
            purchaseAmount
                + _rounds[_activeRoundIndex].allocated
                    <= _rounds[_activeRoundIndex].maxAllocation,
                'Round pool size exceeded'
        );

        require(
            _maxPurchaseAmount == 0
                || (
                        purchaseAmount + _purchasedAmount[receiver]
                            <= _maxPurchaseAmount
                    ),
                'Max purchase amount exceeded'
        );
        if (
            _paymentProfiles[paymentProfileIndex].contractAddress
                != address(0)
        ) {
            _takeAsset(
                _paymentProfiles[paymentProfileIndex].contractAddress,
                msg.sender,
                paymentAmount
            );
        }
        _sendAsset(
            _paymentProfiles[paymentProfileIndex].contractAddress,
            _receiver,
            paymentAmount
        );
        _purchasedAmount[receiver] += purchaseAmount;
        _rounds[_activeRoundIndex].allocated += purchaseAmount;
        _usdTotalPaid += usdPaymentAmount;
        _paymentProfiles[paymentProfileIndex].totalPaid += paymentAmount;
        emit Purchase(
            msg.sender,
            _paymentProfiles[paymentProfileIndex].contractAddress,
            paymentAmount,
            usdPaymentAmount,
            purchaseAmount
        );
        return true;
    }

    function getUsdPaymentAmount (
        uint8 paymentProfileIndex,
        uint256 paymentAmount
    ) public view returns (uint256) {
        uint256 usdPaymentRate = getRate(
            _paymentProfiles[paymentProfileIndex].contractAddress
        );
        return paymentAmount * usdPaymentRate /  SHIFT_18;
    }

    function getPaymentAmount (
        uint8 paymentProfileIndex,
        uint256 purchaseAmount
    ) external view returns (uint256) {
        uint256 usdPaymentRate = getRate(
            _paymentProfiles[paymentProfileIndex].contractAddress
        );
        uint256 syntrumUsdRate = getSyntrumUsdRate(true);
        if (usdPaymentRate == 0) return 0;
        return purchaseAmount * syntrumUsdRate / usdPaymentRate;
    }

    function getPurchaseAmount (
        uint8 paymentProfileIndex,
        uint256 paymentAmount
    ) external view returns (uint256) {
        uint256 usdPaymentRate = getRate(
            _paymentProfiles[paymentProfileIndex].contractAddress
        );
        uint256 syntrumUsdRate = getSyntrumUsdRate(true);
        if (syntrumUsdRate == 0) return 0;
        return paymentAmount * usdPaymentRate / syntrumUsdRate;
    }

    /**
     * @dev Internal function for purchased token withdraw
     */
    function _withdraw (
        address userAddress,
        uint256 withdrawAmount
    ) internal returns (bool) {
        _withdrawnAmount[userAddress] += withdrawAmount;
        _totalWithdrawn += withdrawAmount;
        emit Withdraw(userAddress, withdrawAmount);
        _sendAsset(_syntrumTokenAddress, userAddress, withdrawAmount);
        return true;
    }

    /**
     * @dev Function let users withdraw specified amount of distributed token
     * (amount that was paid for) when withdrawal is available
     */
    function withdraw (
        uint256 withdrawAmount
    ) external returns (bool) {
        require(
            withdrawAmount > 0,
            'withdrawAmount should be greater than zero'
        );
        require(
            withdrawAmount <= getUserAvailable(msg.sender),
            'withdrawAmount can not be greater than available token amount'
        );
        return _withdraw(msg.sender, withdrawAmount);
    }

    /**
     * @dev Function let users withdraw available purchased tokens
     */
    function withdrawAvailable () external returns (bool) {
        uint256 withdrawAmount = getUserAvailable(msg.sender);
        require(
            withdrawAmount > 0,
            'No tokens available for withdraw'
        );
        return _withdraw(msg.sender, withdrawAmount);
    }

    // manager functions
    function addPaymentProfile (
        address contractAddress,
        uint256 usdPaymentRate,
        uint256 weight,
        string memory name,
        string memory currency
    ) external hasRole(MANAGER) returns (bool) {
        if (usdPaymentRate == 0) {
            require(
                _rates.getUsdRate(contractAddress) > 0,
                    'Token rate can not be zero'
            );
        } else {
            _innerRates[contractAddress] = usdPaymentRate;
        }
        _paymentProfilesNumber ++;
        _paymentProfiles[_paymentProfilesNumber].contractAddress = contractAddress;
        _paymentProfiles[_paymentProfilesNumber].weight = weight;
        _paymentProfiles[_paymentProfilesNumber].name = name;
        _paymentProfiles[_paymentProfilesNumber].currency = currency;
        _paymentProfiles[_paymentProfilesNumber].active = true;
        return true;
    }

    function setPaymentProfileWeight (
        uint8 paymentProfileIndex,
        uint256 weight
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].weight = weight;
        return true;
    }

    function setPaymentProfileName (
        uint8 paymentProfileIndex,
        string calldata name
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].name = name;
        return true;
    }

    function setPaymentProfileCurrency (
        uint8 paymentProfileIndex,
        string calldata currency
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].currency = currency;
        return true;
    }

    function setPaymentProfileStatus (
        uint8 paymentProfileIndex,
        bool active
    ) external hasRole(MANAGER) returns (bool) {
        require(
            paymentProfileIndex > 0 && paymentProfileIndex <= _paymentProfilesNumber,
            'Payment profile is not found'
        );
        _paymentProfiles[paymentProfileIndex].active = active;
        return true;
    }

    function setMaxPurchaseAmount (
        uint256 maxPurchaseAmount
    ) external hasRole(MANAGER) returns (bool) {
        _maxPurchaseAmount = maxPurchaseAmount;
        return true;
    }

    function setTokenReleaseStageData (
        uint256[] calldata timestamps, uint16[] calldata percentage
    ) external hasRole(MANAGER) returns (bool) {
        require(
            timestamps.length == percentage.length,
            'Arrays should be of the same length'
        );
        uint8 stagesNumber;
        uint256 previousTimestamp;
        for (uint256 i = 0; i < timestamps.length; i ++) {
            require(
                timestamps[i] > previousTimestamp,
                'Each timestamp should be greater than previous one'
            );
            require(
                percentage[i] <= SHIFT_4,
                'Percentage should not be greater than 10000'
            );
            previousTimestamp = timestamps[i];
            stagesNumber ++;
            _releaseStages[stagesNumber].activationTime = timestamps[i];
            _releaseStages[stagesNumber].percentage = percentage[i];
        }
        _tokenReleaseStagesNumber = stagesNumber;
        return true;
    }

    function setRoundsData (
        uint256[] calldata usdRate,
        uint256[] calldata startTime,
        uint256[] calldata duration,
        uint256[] calldata maxAllocation
    ) external hasRole(MANAGER) returns (bool) {
        require(
            usdRate.length <= _maxRoundsNumber,
                'Array length can not be greater than _maxRoundsNumber'
        );
        require(
            usdRate.length == startTime.length
                && usdRate.length == duration.length
                && usdRate.length == maxAllocation.length,
            'Arrays should be of the same length'
        );
        uint8 roundsNumber;
        uint256 previousEndTime;
        for (uint256 i = 0; i < usdRate.length; i ++) {
            require(
                startTime[i] >= previousEndTime,
                    'Round can not start before previous round end'
            );
            roundsNumber ++;
            _rounds[roundsNumber].usdRate = usdRate[i];
            _rounds[roundsNumber].startTime = startTime[i];
            _rounds[roundsNumber].duration = duration[i];
            _rounds[roundsNumber].maxAllocation = maxAllocation[i];
            _rounds[roundsNumber].endTime = _rounds[roundsNumber].startTime
                + _rounds[roundsNumber].duration;
            previousEndTime = _rounds[roundsNumber].endTime;
        }
        _roundsNumber = roundsNumber;
        return true;
    }

    function setRoundUsdRate (
        uint8 roundIndex,
        uint256 usdRate
    ) external hasRole(MANAGER) returns (bool) {
        require(
            roundIndex > _activeRoundIndex,
                'This round can not be changed'
        );
        require(
            roundIndex <= _roundsNumber,
                'Invalid round number'
        );
        _rounds[roundIndex].usdRate = usdRate;
        return true;
    }

    function setRoundTime (
        uint8 roundIndex,
        uint256 startTime,
        uint256 endTime
    ) external hasRole(MANAGER) returns (bool) {
        require(
            roundIndex > _activeRoundIndex,
            'This round can not be changed'
        );
        require(
            roundIndex <= _roundsNumber,
            'Invalid round number'
        );
        require(
            endTime > startTime,
            'end time should be greater than start time'
        );
        if (roundIndex > 0) {
            require(
                _rounds[roundIndex].startTime >=
                    _rounds[roundIndex - 1].endTime,
                'Round can not start before previous round end'
            );
        }
        if (roundIndex < _roundsNumber) {
            require(
                _rounds[roundIndex].endTime <=
                    _rounds[roundIndex + 1].startTime,
                'Round can not end later than the next round start'
            );
        }
        _rounds[roundIndex].startTime = startTime;
        _rounds[roundIndex].endTime = endTime;
        _rounds[roundIndex].duration = _rounds[roundIndex].endTime
            - _rounds[roundIndex].startTime;
        return true;
    }

    function setRoundAllocation (
        uint8 roundIndex,
        uint256 maxAllocation
    ) external hasRole(MANAGER) returns (bool) {
        require(
            roundIndex > _activeRoundIndex,
            'This round can not be changed'
        );
        require(
            roundIndex <= _roundsNumber,
            'Invalid round number'
        );
        _rounds[roundIndex].maxAllocation = maxAllocation;
        return true;
    }

    function getUserPurchased (
        address userAddress
    ) external view returns (uint256) {
        return _purchasedAmount[userAddress];
    }

    function getUserWithdrawn (
        address userAddress
    ) external view returns (uint256) {
        return _withdrawnAmount[userAddress];
    }

    function getTotalPaid () external view returns (uint256) {
        return _usdTotalPaid;
    }

    function getTotalWithdrawn () external view returns (uint256) {
        return _totalWithdrawn;
    }

    function getTimestamp () external view returns (uint256) {
        return block.timestamp;
    }

    function getMaxPurchaseAmount () external view returns (uint256) {
        return _maxPurchaseAmount;
    }

    function getPaymentProfile (
        uint8 paymentProfileIndex
    ) external view returns (
        address contractAddress,
        uint256 weight,
        uint256 totalPaid,
        string memory name,
        string memory currency,
        bool active
    ) {
        return (
            _paymentProfiles[paymentProfileIndex].contractAddress,
            _paymentProfiles[paymentProfileIndex].weight,
            _paymentProfiles[paymentProfileIndex].totalPaid,
            _paymentProfiles[paymentProfileIndex].name,
            _paymentProfiles[paymentProfileIndex].currency,
            _paymentProfiles[paymentProfileIndex].active
        );
    }

    function getPaymentProfilesNumber () external view returns (uint256) {
        return _paymentProfilesNumber;
    }

    function getUserAvailable (
        address userAddress
    ) public view returns (uint256) {
        uint256 toWithdraw = _purchasedAmount[userAddress]
            * getAvailablePercentage() / SHIFT_4;
        if (toWithdraw < _withdrawnAmount[userAddress]) return 0;
        return toWithdraw - _withdrawnAmount[userAddress];
    }

    function getTokenReleaseStagesNumber () external view returns (uint256) {
        return _tokenReleaseStagesNumber;
    }

    function getTokenReleaseStageData (
        uint8 stageIndex
    ) external view returns (uint256 activationTime, uint16 percentage) {
        require(
            stageIndex > 0 && stageIndex <= _tokenReleaseStagesNumber,
            'Invalid stage number'
        );
        return (
            _releaseStages[stageIndex].activationTime,
            _releaseStages[stageIndex].percentage
        );
    }

    function getRoundData (
        uint8 roundIndex
    ) external view returns (
        uint256 usdRate,
        uint256 startTime,
        uint256 endTime,
        uint256 duration,
        uint256 maxAllocation,
        uint256 allocated
    ) {
        require(
            roundIndex <= _roundsNumber,
                'Invalid round number'
        );
        return (
            _rounds[roundIndex].usdRate,
            _rounds[roundIndex].startTime,
            _rounds[roundIndex].endTime,
            _rounds[roundIndex].duration,
            _rounds[roundIndex].maxAllocation,
            _rounds[roundIndex].allocated
        );
    }

    /**
     * @dev Function let use token realising schedule return % * 100
     */
    function getAvailablePercentage () public view returns (uint16) {
        uint16 percentage;
        if (_tokenReleaseStagesNumber == 0) return uint16(SHIFT_4);
        for (uint8 i = 1; i <= _tokenReleaseStagesNumber; i ++) {
            if (_releaseStages[i].activationTime > block.timestamp) break;
            percentage += _releaseStages[i].percentage;
        }
        if (percentage > SHIFT_4) percentage = uint16(SHIFT_4);
        return percentage;
    }
}
