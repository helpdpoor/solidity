// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import './common/AccessControl.sol';

/**
 * @dev Partial interface of the ERC20 standard.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(
        address recipient, uint256 amount
    ) external returns (bool);
    function transferFrom(
        address sender, address recipient, uint256 amount
    ) external returns (bool);
    function allowance(
        address owner, address spender
    ) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @dev Partial interface of the Rates contract.
 */
interface IRates {
    function getUsdRate (
        address contractAddress
    ) external view returns (uint256);
}

/**
 * @dev Borrowing functional implementation
 */
contract Sacrifice is AccessControl {
    event Exchange(
        address indexed exchangeSide,
        address tokenIn,
        address tokenOut,
        address receiver,
        uint256 amountIn,
        uint256 amountOut
    );

    struct Token {
        address tokenAddress;
        string name;
        uint256 total;
        uint256 ratio;
        uint8 weight;
        bool active;
    }

    mapping (uint8 => Token) internal _tokens;
    mapping (address => uint8) internal _tokensIndex;
    IERC20 internal _brandToken;
    IRates internal _rates;
    address _receiver;
    uint256 internal constant SHIFT_18 = 10 ** 18;
    bytes32 internal constant MANAGER = keccak256(abi.encode('MANAGER'));
    uint8 internal _tokensNumber;

    /**
     * @dev constructor
     */
    constructor (
        address ownerAddress,
        address managerAddress,
        address ratesAddress,
        address brandAddress,
        address receiverAddress
    ) {
        require(ownerAddress != address(0), 'ownerAddress can not be zero');
        require(managerAddress != address(0), 'managerAddress can not be zero');
        require(
            ratesAddress != address(0), 'ratesAddress can not be zero'
        );
        require(
            brandAddress != address(0), 'brandAddress can not be zero'
        );
        _owner = ownerAddress;
        _grantRole(MANAGER, managerAddress);
        _rates =  IRates(ratesAddress);
        _brandToken = IERC20(brandAddress);
        _receiver = receiverAddress;
    }

    function getRatesContract () external view returns (address) {
        return address(_rates);
    }

    function setRatesContract (
        address ratesAddress
    ) external hasRole(MANAGER) returns (bool) {
        require(
            ratesAddress != address(0), 'ratesAddress can not be zero'
        );
        _rates =  IRates(ratesAddress);
        return true;
    }

    function getReceiver () external view returns (address) {
        return _receiver;
    }

    function setReceiver (
        address receiverAddress
    ) external onlyOwner returns (bool) {
        _receiver =  receiverAddress;
        return true;
    }

    function addToken (
        address tokenAddress,
        uint256 ratio,
        uint8 weight,
        string calldata name
    ) external hasRole(MANAGER) returns (bool) {
        require(_tokensIndex[tokenAddress] == 0, 'Token already exists');
        require(ratio > 0, 'Ratio should be greater than zero');
        _tokensNumber ++;
        _tokens[_tokensNumber].tokenAddress = tokenAddress;
        _tokens[_tokensNumber].ratio = ratio;
        _tokens[_tokensNumber].weight = weight;
        _tokens[_tokensNumber].name = name;
        _tokens[_tokensNumber].active = true;
        _tokensIndex[tokenAddress] = _tokensNumber;
        return true;
    }

    function setTokenName (
        address tokenAddress,
        string calldata name
    ) external hasRole(MANAGER) returns (bool) {
        uint8 index = _tokensIndex[tokenAddress];
        require(index > 0, 'Token does not exist');
        _tokens[index].name = name;
        return true;
    }

    function setTokenStatus (
        address tokenAddress,
        bool active
    ) external hasRole(MANAGER) returns (bool) {
        uint8 index = _tokensIndex[tokenAddress];
        require(index > 0, 'Token does not exist');
        _tokens[index].active = active;
        return true;
    }

    function getTokenIndex (
        address tokenAddress
    ) external view returns (uint8) {
        return _tokensIndex[tokenAddress];
    }

    function getToken (
        uint8 index
    ) external view returns (
        address tokenAddress,
        string memory name,
        uint256 ratio,
        uint256 total,
        uint8 weight,
        bool active
    ) {
        return (
            _tokens[index].tokenAddress,
            _tokens[index].name,
            _tokens[index].ratio,
            _tokens[index].total,
            _tokens[index].weight,
            _tokens[index].active
        );
    }

    function getToken (
        address _tokenAddress
    ) external view returns (
        address tokenAddress,
        string memory name,
        uint256 ratio,
        uint256 total,
        uint8 weight,
        bool active
    ) {
        return (
            _tokenAddress,
            _tokens[_tokensIndex[_tokenAddress]].name,
            _tokens[_tokensIndex[_tokenAddress]].ratio,
            _tokens[_tokensIndex[_tokenAddress]].total,
            _tokens[_tokensIndex[_tokenAddress]].weight,
            _tokens[_tokensIndex[_tokenAddress]].active
        );
    }

    function exchangeAmount (
        address tokenAddress,
        uint256 amount
    ) public view returns(uint256) {
        return amount
            * _rates.getUsdRate(tokenAddress)
            * _tokens[_tokensIndex[tokenAddress]].ratio
            / _rates.getUsdRate(address(_brandToken))
            / SHIFT_18;
    }

    function exchange (
        address tokenAddress,
        uint256 amount
    ) external returns (bool) {
        require(
            _tokens[_tokensIndex[tokenAddress]].active,
                'Token is not available for exchange'
        );
        IERC20 token = IERC20(tokenAddress);
        uint256 amountOut = exchangeAmount(tokenAddress, amount);
        require(amountOut > 0, 'Exchange amount is zero');
        require(
            _brandToken.balanceOf(address(this)) > amountOut,
                'Not enough balance for exchange'
        );
        require(
            token.transferFrom(msg.sender, address(this), amount),
                'Token transaction failed'
        );
        require(
            token.transfer(_receiver, amount),
                'Token transaction failed'
        );
        require(
            _brandToken.transfer(msg.sender, amountOut),
                'Token transaction failed'
        );
        emit Exchange(
            msg.sender,
            tokenAddress,
            address(_brandToken),
            _receiver,
            amount,
            amountOut
        );
        return true;
    }
}