// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import 'hardhat/console.sol';

/**
 * @dev Partial interface of the ERC20 standard according to the needs of the e2p contract.
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @dev Partial interface of the marketplace contract according to the needs of the staking nft contract.
 */
interface IMarketplace {
    function adminBurn(uint256 tokenId) external;
    function adminMint(uint32 profileId, address to, uint256 tokenId) external;
    function getProfileIdByTokenId(uint256 tokenId) external returns (uint32);
    function getSellPriceById(uint32 profileID) external  view returns (uint256);
}

/**
 * @dev Partial interface of the NFT contract according to the needs of the staking nft contract.
 */
interface INFT {
    function ownerOf(uint256 tokenId) external returns (address);
    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external;
}

/**
 * @dev Partial interface of the Borrowing/Lending contract.
 */
interface IBorrowingLending {
    function depositNetna (
        address userAddress, uint256 collateralProfileIndex, uint256 amount
    ) external returns (bool);
    function withdrawNetna (
        address userAddress, uint256 collateralProfileIndex, uint256 amount
    ) external returns (bool);
}

/**
 * @title ERC721 token receiver interface
 * @dev Interface for any contract that wants to support safeTransfers
 * from ERC721 asset contracts.
 */
interface IERC721Receiver {
    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721.onERC721Received.selector`.
     */
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}


contract NftCollateral is IERC721Receiver {
    modifier onlyOwner() {
        require(msg.sender == _owner, "caller is not the owner");
        _;
    }
    struct Deposit {
        address userAddress;
        uint256 amount;
        uint256 tokensNumber;
    }
    mapping (uint256 => Deposit) _deposits;
    mapping (address => uint256) _usersDepositIndex;
    mapping (uint256 => address) _tokenRegistry; // tokenId => userAddress
    mapping (address => mapping (uint256 => uint256)) _userTokenRegistry; // userAddress => RegistryIndex => tokenId
    mapping (address => mapping (uint256 => uint256)) _userTokenIndexes; // userAddress => tokenId => RegistryIndex
    mapping (uint256 => uint256) _tokenPrice;

    uint256 _depositsNumber;
    uint256 _tokensNumber;
    uint256 _batchLimit = 100;
    uint256 _nEtnaProfileIndex;
    uint256 _year = 365 * 24 * 3600;

    IERC20 _nEtnaContract;
    IMarketplace _marketplaceContract;
    INFT _nftContract;
    IBorrowingLending _borrowingLendingContract;
    address _owner;

    constructor (
        address nEtnaAddress,
        address marketplaceAddress,
        address nftAddress,
        address borrowingLendingAddress,
        address newOwner,
        uint256 netnaProfileIndex
    ) {
        require(nEtnaAddress != address(0), 'Token address can not be zero');
        require(marketplaceAddress != address(0), 'Marketplace contract address can not be zero');
        require(nftAddress != address(0), 'NFT token address can not be zero');
        require(borrowingLendingAddress != address(0), 'Borrowing - lending contract address can not be zero');
        require(newOwner != address(0), 'Owner address can not be zero');
        require(netnaProfileIndex > 0, 'Netna profile index should be greater than zero');

        _nEtnaContract = IERC20(nEtnaAddress);
        _marketplaceContract = IMarketplace(marketplaceAddress);
        _nftContract = INFT(nftAddress);
        _borrowingLendingContract = IBorrowingLending(borrowingLendingAddress);
        _owner = newOwner;
        _nEtnaProfileIndex = netnaProfileIndex;
    }

    function depositNftCollateral (uint256[] memory tokenIds) external returns (bool) {
        require(tokenIds.length > 0, 'No token ids provided');

        uint256 depositIndex = _usersDepositIndex[msg.sender];
        if (depositIndex == 0) {
            _depositsNumber ++;
            depositIndex = _depositsNumber;
            _deposits[depositIndex].userAddress = msg.sender;
            _usersDepositIndex[msg.sender] = depositIndex;
        }
        uint256 amount = _addTokens(msg.sender, depositIndex, tokenIds);
        _nEtnaContract.transfer(address(_borrowingLendingContract), amount);
        require(
            _borrowingLendingContract.depositNetna(msg.sender, _nEtnaProfileIndex, amount),
            'Deposit error'
        );

        return true;
    }

    function withdrawNftCollateral (uint256[] memory tokenIds) external returns (bool) {
        require(tokenIds.length > 0, 'No token ids provided');

        uint256 depositIndex = _usersDepositIndex[msg.sender];
        require(depositIndex > 0, 'Deposit is not found');

        uint256 amount = _withdrawTokens(msg.sender, depositIndex, tokenIds);
        require(
            _borrowingLendingContract.withdrawNetna(msg.sender, _nEtnaProfileIndex, amount),
            'Withdraw error'
        );
        return true;
    }

    function _addTokens(
        address userAddress, uint256 depositIndex, uint256[] memory tokenIds
    ) internal returns (uint256) {
        uint256 amount;
        uint256 tokensNumber;
        for (uint256 i; i < tokenIds.length; i ++) {
            if (i >= _batchLimit) break;
            if (_tokenRegistry[tokenIds[i]] != address(0)) continue;

            uint32 profileId = _marketplaceContract.getProfileIdByTokenId(tokenIds[i]);
            uint256 price = _marketplaceContract.getSellPriceById(profileId);
            if (!(price > 0)) continue;

            try _nftContract.ownerOf(tokenIds[i]) returns (address tokenOwner) {
                if (tokenOwner != userAddress) continue;

                _nftContract.safeTransferFrom(
                    userAddress,
                    address(this),
                    tokenIds[i]
                );
                _tokenPrice[tokenIds[i]] = price;
                tokensNumber ++;
                amount += price;
                _userTokenRegistry
                    [userAddress]
                    [_deposits[depositIndex].tokensNumber + tokensNumber] = tokenIds[i];
                _userTokenIndexes
                    [userAddress]
                    [tokenIds[i]] = _deposits[depositIndex].tokensNumber + tokensNumber;
                _tokenRegistry[tokenIds[i]] = userAddress;
            } catch {}
        }
        _deposits[depositIndex].tokensNumber += tokensNumber;
        _tokensNumber += tokensNumber;
        _deposits[depositIndex].amount += amount;

        return amount;
    }

    function _withdrawTokens(
        address userAddress, uint256 depositIndex, uint256[] memory tokenIds
    ) internal returns (uint256) {
        uint256 amount;
        uint256 tokensNumber;
        for (uint256 i; i < tokenIds.length; i ++) {
            if (i >= _batchLimit) break;
            if (_tokenRegistry[tokenIds[i]] != userAddress) continue;

            amount += _tokenPrice[tokenIds[i]];
            uint256 index = _userTokenIndexes[userAddress][tokenIds[i]];
            if (index < _deposits[depositIndex].tokensNumber) {
                _userTokenRegistry[userAddress][index] =
                _userTokenRegistry[userAddress][_deposits[depositIndex].tokensNumber];
                _userTokenIndexes[userAddress][_userTokenRegistry[userAddress][index]] = index;
            }
            _userTokenRegistry[userAddress][_deposits[depositIndex].tokensNumber] = 0;
            tokensNumber ++;
            _tokenRegistry[tokenIds[i]] = address(0);

            _nftContract.safeTransferFrom(
                address(this),
                userAddress,
                tokenIds[i]
            );
        }
        _deposits[depositIndex].amount -= amount;
        _deposits[depositIndex].tokensNumber -= tokensNumber;
        _tokensNumber -= tokensNumber;

        return amount;
    }

    function transferOwnership(address newOwner) external onlyOwner returns (bool) {
        require(newOwner != address(0), "newOwner should not be zero address");
        _owner = newOwner;
        return true;
    }

    function adminSetBatchLimit (
        uint256 batchLimit
    ) external onlyOwner returns (bool) {
        require(batchLimit > 0, 'Batch limit should be greater than zero');
        _batchLimit = batchLimit;

        return true;
    }

    function adminWithdrawNft (uint256[] memory tokenIds) external onlyOwner
    returns (bool) {
        for (uint256 i; i < tokenIds.length; i ++) {
            try _nftContract.safeTransferFrom(address(this), msg.sender, tokenIds[i]) {} catch {}
        }
        return true;
    }

    function adminWithdrawNEtna (uint256 amount) external onlyOwner
    returns (bool) {
        uint256 balance = _nEtnaContract.balanceOf(address(this));
        require(amount <= balance, 'Not enough contract balance');
        _nEtnaContract.transfer(msg.sender, amount);
        return true;
    }

    function adminSetNEtnaContract (address tokenAddress) external onlyOwner returns (bool) {
        require(tokenAddress != address(0), 'Token address can not be zero');
        _nEtnaContract = IERC20(tokenAddress);
        return true;
    }

    function adminSetMarketplaceContract (address tokenAddress) external onlyOwner returns (bool) {
        require(tokenAddress != address(0), 'Token address can not be zero');
        _marketplaceContract = IMarketplace(tokenAddress);
        return true;
    }

    function adminSetNftContract (address tokenAddress) external onlyOwner returns (bool) {
        require(tokenAddress != address(0), 'Token address can not be zero');
        _nftContract = INFT(tokenAddress);
        return true;
    }

    function getDepositsNumber () external view returns (uint256) {
        return _depositsNumber;
    }

    function getDeposit (
        uint256 depositIndex
    ) external view returns (
        address, uint256, uint256
    ) {
        return (
            _deposits[depositIndex].userAddress,
            _deposits[depositIndex].amount,
            _deposits[depositIndex].tokensNumber
        );
    }

    function getUserDeposit (
        address userAddress
    ) external view returns (
        uint256, address, uint256, uint256
    ) {
        uint256 depositIndex = _usersDepositIndex[userAddress];
        return (
            depositIndex,
            _deposits[depositIndex].userAddress,
            _deposits[depositIndex].amount,
            _deposits[depositIndex].tokensNumber
        );
    }

    function getTokenStaker (uint256 tokenId) external view returns (address) {
        return _tokenRegistry[tokenId];
    }

    function getLastTokenPrice (uint256 tokenId) external view returns (uint256) {
        return _tokenPrice[tokenId];
    }

    function getTokensNumber () external view returns (uint256) {
        return _tokensNumber;
    }

    function getUserTokensNumber (address userAddress) external view returns (uint256) {
        uint256 depositIndex = _usersDepositIndex[userAddress];
        return _deposits[depositIndex].tokensNumber;
    }

    function getUserTokenByIndex (address userAddress, uint256 index) external view returns (uint256) {
        return _userTokenRegistry[userAddress][index];
    }

    function getNEtnaContract () external view returns (address) {
        return address(_nEtnaContract);
    }

    function getMarketplaceContract () external view returns (address) {
        return address(_marketplaceContract);
    }

    function getNftContract () external view returns (address) {
        return address(_nftContract);
    }

    function getBatchLimit () external view returns (uint256) {
        return _batchLimit;
    }

    function getNEtnaBalance () external view returns (uint256) {
        return _nEtnaContract.balanceOf(address(this));
    }

    function owner() external view returns (address) {
        return _owner;
    }

    /**
    * @dev Standard callback fot the ERC721 token receiver.
    */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}