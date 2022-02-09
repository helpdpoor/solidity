const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialEtnaTransfer = 10000;
const batchLimit = 100;
let signers, etnaContract, marketplaceContract, nftContract, stakingNftContract, result, tempResult, tokensArray;

beforeEach(async function () {
  signers = await ethers.getSigners();

  const ETNA = await ethers.getContractFactory("BEP20Token");
  etnaContract = await ETNA.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18);
  await etnaContract.deployed();
  await etnaContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  const Nft = await ethers.getContractFactory("CyclopsTokens");
  nftContract = await Nft.connect(signers[10]).deploy();
  await nftContract.deployed();

  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  marketplaceContract = await Marketplace.connect(signers[10]).deploy(nftContract.address, etnaContract.address, 0);
  await marketplaceContract.deployed();

  await nftContract.connect(signers[10]).transferPublishRight(marketplaceContract.address);
  await etnaContract.connect(signers[0]).approve(marketplaceContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[1]).approve(marketplaceContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[2]).approve(marketplaceContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  await marketplaceContract.connect(signers[10]).setExternalPriceCurve();
  await marketplaceContract.connect(signers[10]).addNFTProfile(
    1, ethers.utils.parseUnits('11'), ethers.utils.parseUnits('10'), 'https://test/1', 1000
  );

  await marketplaceContract.connect(signers[10]).addNFTProfile(
    2, ethers.utils.parseUnits('22'), ethers.utils.parseUnits('20'), 'https://test/2', 1000
  );
  await marketplaceContract.connect(signers[10]).addNFTProfile(
    3, ethers.utils.parseUnits('33'), ethers.utils.parseUnits('30'), 'https://test/3', 1000
  );

  await marketplaceContract.connect(signers[0]).buyNFT(1);
  await marketplaceContract.connect(signers[0]).buyNFT(2);
  await marketplaceContract.connect(signers[0]).buyNFT(3);

  await marketplaceContract.connect(signers[1]).buyNFT(1);
  await marketplaceContract.connect(signers[1]).buyNFT(2);
  await marketplaceContract.connect(signers[1]).buyNFT(3);

  tokensArray = [];
  for (let i = 7; i <= 7 + batchLimit - 1; i ++) {
    let profileId = 1;
    if (i < 10) profileId = 3;
    else if (i < 13) profileId = 2;
    await marketplaceContract.connect(signers[2]).buyNFT(profileId);
    tokensArray.push(i);
  }

  const StakingNft = await ethers.getContractFactory("StakingNft");
  stakingNftContract = await StakingNft.connect(signers[10]).deploy(
    etnaContract.address,
    marketplaceContract.address,
    nftContract.address,
    signers[10].address // owner
  );
  await stakingNftContract.deployed();
  await etnaContract.connect(signers[10]).transfer(stakingNftContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  await nftContract.connect(signers[0])['safeTransferFrom(address,address,uint256)'](signers[0].address, signers[1].address, 1);
  await nftContract.connect(signers[0])['safeTransferFrom(address,address,uint256)'](signers[0].address, signers[1].address, 2);
  await nftContract.connect(signers[0])['safeTransferFrom(address,address,uint256)'](signers[0].address, signers[1].address, 3);
  await nftContract.connect(signers[1])['safeTransferFrom(address,address,uint256)'](signers[1].address, signers[0].address, 1);
  await nftContract.connect(signers[1])['safeTransferFrom(address,address,uint256)'](signers[1].address, signers[0].address, 2);
  await nftContract.connect(signers[1])['safeTransferFrom(address,address,uint256)'](signers[1].address, signers[0].address, 3);

  await nftContract.connect(signers[0]).approve(stakingNftContract.address, 1);
  await nftContract.connect(signers[0]).approve(stakingNftContract.address, 2);
  await nftContract.connect(signers[0]).approve(stakingNftContract.address, 3);
  await nftContract.connect(signers[1]).approve(stakingNftContract.address, 4);
  await nftContract.connect(signers[1]).approve(stakingNftContract.address, 5);
  await nftContract.connect(signers[1]).approve(stakingNftContract.address, 6);
  for (let i = 7; i <= 7 + batchLimit - 1; i ++) {
    await nftContract.connect(signers[2]).approve(stakingNftContract.address, i);
  }
  await  stakingNftContract.connect(signers[10]).adminSetApr(1000);
  await  stakingNftContract.connect(signers[10]).adminSetLockTime(86400);
});

describe("Testing Staking contract", function () {
  it("Stake Nft", async function () {
    result = await stakingNftContract.getDepositsNumber();
    expect(Number(result)).to.equal(0);

    await stakingNftContract.connect(signers[0])
      .stake([1,2,4]);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(2);

    result = await stakingNftContract.getDepositsNumber();
    expect(Number(result)).to.equal(1);
    result = await stakingNftContract.getDeposit(1);

    expect(result[0]).to.equal(signers[0].address);
    let amount = Number(ethers.utils.formatUnits(result[1]));
    expect(Number(result[2])).to.equal(Number(result[3]) + 86400);
    expect(Number(result[4])).to.equal(0);
    expect(Number(result[5])).to.equal(2);

    result = await stakingNftContract.getUserTokensNumber(signers[0].address);
    expect(Number(result)).to.equal(2);

    let tokensPrice = 0;
    result = await stakingNftContract.getLastTokenPrice(1);
    tokensPrice += Number(ethers.utils.formatUnits(result));
    result = await stakingNftContract.getLastTokenPrice(2);
    tokensPrice += Number(ethers.utils.formatUnits(result));
    expect(amount).to.equal(tokensPrice);

    await hre.timeAndMine.increaseTime('100 days');

    await stakingNftContract.connect(signers[0])
      .stake([3]);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(3);
    let apr = await stakingNftContract.getApr();
    let expectedYield = roundTo(amount * apr / 10000 * 100 / 365, 4);

    result = await stakingNftContract.getDeposit(1);
    amount = Number(ethers.utils.formatUnits(result[1]));
    expect(roundTo(Number(ethers.utils.formatUnits(result[4])), 4)).to.equal(expectedYield);
    expect(Number(result[5])).to.equal(3);
    result = await stakingNftContract.getLastTokenPrice(3);
    tokensPrice += Number(ethers.utils.formatUnits(result));
    expect(amount).to.equal(tokensPrice);

    result = await stakingNftContract.getTokenStaker(1);
    expect(result).to.equal(signers[0].address);
    result = await stakingNftContract.getTokenStaker(2);
    expect(result).to.equal(signers[0].address);
    result = await stakingNftContract.getTokenStaker(3);
    expect(result).to.equal(signers[0].address);

    result = await stakingNftContract.getUserTokensNumber(signers[0].address);
    expect(Number(result)).to.equal(3);

    result = await stakingNftContract.getUserTokenByIndex(signers[0].address, 1);
    expect(Number(result)).to.equal(1);
    result = await stakingNftContract.getUserTokenByIndex(signers[0].address, 2);
    expect(Number(result)).to.equal(2);
    result = await stakingNftContract.getUserTokenByIndex(signers[0].address, 3);
    expect(Number(result)).to.equal(3);

    await stakingNftContract.connect(signers[1])
      .stake([4,5,6]);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(6);
    result = await stakingNftContract.getDeposit(2);
    expect(Number(result[5])).to.equal(3);

    result = await stakingNftContract.getTokenStaker(4);
    expect(result).to.equal(signers[1].address);
    result = await stakingNftContract.getTokenStaker(5);
    expect(result).to.equal(signers[1].address);
    result = await stakingNftContract.getTokenStaker(6);
    expect(result).to.equal(signers[1].address);

    result = await stakingNftContract.getUserTokenByIndex(signers[1].address, 1);
    expect(Number(result)).to.equal(4);
    result = await stakingNftContract.getUserTokenByIndex(signers[1].address, 2);
    expect(Number(result)).to.equal(5);
    result = await stakingNftContract.getUserTokenByIndex(signers[1].address, 3);
    expect(Number(result)).to.equal(6);

    await stakingNftContract.connect(signers[2])
      .stake(tokensArray);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(6 + tokensArray.length);
    result = await stakingNftContract.getDeposit(3);
    expect(Number(result[5])).to.equal(batchLimit);
    result = await stakingNftContract.getUserDeposit(signers[2].address);
    expect(Number(result[0])).to.equal(3);
    expect(result[1]).to.equal(signers[2].address);
    expect(Number(result[6])).to.equal(batchLimit);
  });
  it("unStake Nft", async function () {
    await stakingNftContract.connect(signers[0])
      .stake([1,2]);
    await stakingNftContract.connect(signers[1])
      .stake([4,5,6]);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(5);

    result = await stakingNftContract.getUserTokenByIndex(signers[1].address, 3);
    expect(Number(result)).to.equal(6);

    await stakingNftContract.connect(signers[2])
      .stake(tokensArray);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(5 + tokensArray.length);

    await expect(
      stakingNftContract.connect(signers[0])
        .unStake([1,2])
    ).to.be.revertedWith('Deposit is locked yet');

    await hre.timeAndMine.increaseTime('20 hours');

    await expect(
      stakingNftContract.connect(signers[0])
        .unStake([1,2])
    ).to.be.revertedWith('Deposit is locked yet');

    await stakingNftContract.connect(signers[0])
      .stake([1,2,3]);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(6 + tokensArray.length);

    await hre.timeAndMine.increaseTime('20 hours');

    await expect(
      stakingNftContract.connect(signers[0])
        .unStake([1,2])
    ).to.be.revertedWith('Deposit is locked yet');

    result = await nftContract.ownerOf(4);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(5);
    expect(result).to.equal(stakingNftContract.address);

    await stakingNftContract.connect(signers[1])
      .unStake([1,2,4,5]);

    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(4 + tokensArray.length);
    result = await nftContract.ownerOf(1);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(2);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(4);
    expect(result).to.equal(signers[1].address);
    result = await nftContract.ownerOf(5);
    expect(result).to.equal(signers[1].address);
    result = await stakingNftContract.getUserDeposit(signers[1].address);
    expect(Number(result[6])).to.equal(1);
    result = await stakingNftContract.getUserTokensNumber(signers[1].address);
    expect(Number(result)).to.equal(1);
    result = await stakingNftContract.getUserTokenByIndex(signers[1].address, 1);
    expect(Number(result)).to.equal(6);

    await hre.timeAndMine.increaseTime('24 hours');

    await stakingNftContract.connect(signers[1])
        .unStake([6]);

    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(3 + tokensArray.length);

    result = await stakingNftContract.getUserDeposit(signers[1].address);
    expect(Number(result[6])).to.equal(0);
    result = await stakingNftContract.getUserTokensNumber(signers[1].address);
    expect(Number(result)).to.equal(0);

    await hre.timeAndMine.increaseTime('8 hours');
    await hre.timeAndMine.increaseTime('97 days');

    await stakingNftContract.connect(signers[0])
        .unStake([1,2]);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(1 + tokensArray.length);
    let amount = 0;
    for (const tokenId of tokensArray) {
      amount +=
        Number(ethers.utils.formatUnits( await stakingNftContract.getLastTokenPrice(tokenId) ));
    }
    let apr = await stakingNftContract.getApr();
    let expectedYield = roundTo(amount * apr / 10000 * 100 / 365, 4);

    result = await stakingNftContract.getUserDeposit(signers[2].address);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(amount);
    expect(Number(result[6])).to.equal(batchLimit);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingNftContract.getUserTokensNumber(signers[2].address);
    expect(Number(result)).to.equal(batchLimit);

    result = await stakingNftContract.calculateYield(3);
    expect(roundTo(Number(ethers.utils.formatUnits(result)), 4)).to.equal(expectedYield);

    await stakingNftContract.connect(signers[2])
        .unStake(tokensArray);
    result = await stakingNftContract.getTokensNumber();
    expect(Number(result)).to.equal(1);

    result = await stakingNftContract.getUserDeposit(signers[2].address);
    expect(Number(result[6])).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(result[5])), 4)).to.equal(expectedYield);

    result = await stakingNftContract.getUserTokensNumber(signers[2].address);
    expect(Number(result)).to.equal(0);
  });
  it("Withdraw yield", async function () {
    await stakingNftContract.connect(signers[0])
      .stake([1,2,3]);

    result = await stakingNftContract.getDeposit(1);
    let amount = Number(ethers.utils.formatUnits(result[1]));

    await hre.timeAndMine.increaseTime('100 days');

    result = await stakingNftContract.calculateYield(1);
    let apr = Number(await stakingNftContract.getApr());
    let expectedYield = amount * apr / 10000 * 100 / 365;

    await stakingNftContract.connect(signers[10])
      .adminSetApr(2000);

    result = await stakingNftContract.calculateYield(1);

    await hre.timeAndMine.increaseTime('100 days');

    await stakingNftContract.connect(signers[1])
      .stake([4]);

    apr = Number(await stakingNftContract.getApr());
    expectedYield += (amount + expectedYield) * apr / 10000 * 100 / 365;
    result = await stakingNftContract.calculateYield(1);

    result = await etnaContract.balanceOf(signers[0].address);
    let balance = Number(ethers.utils.formatUnits(result));

    await stakingNftContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('1'));

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(balance + 1);

    result = await stakingNftContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(result[4])), 4))
      .to.equal(roundTo(expectedYield - 1, 4));
  });
  it("Admin settings", async function () {
    await stakingNftContract.connect(signers[10])
      .adminSetEtnaContract(signers[10].address);
    result = await stakingNftContract.getEtnaContract();
    expect(result).to.equal(signers[10].address);

    await stakingNftContract.connect(signers[10])
      .adminSetEtnaContract(etnaContract.address);
    result = await stakingNftContract.getEtnaContract();
    expect(result).to.equal(etnaContract.address);

    await stakingNftContract.connect(signers[10])
      .adminSetNftContract(signers[10].address);
    result = await stakingNftContract.getNftContract();
    expect(result).to.equal(signers[10].address);

    await stakingNftContract.connect(signers[10])
      .adminSetMarketplaceContract(etnaContract.address);
    result = await stakingNftContract.getMarketplaceContract();
    expect(result).to.equal(etnaContract.address);

    await stakingNftContract.connect(signers[10])
      .adminSetLockTime(123);
    result = await stakingNftContract.getLockTime();
    expect(result).to.equal(123);

    await stakingNftContract.connect(signers[10])
      .adminSetBatchLimit(50);
    result = await stakingNftContract.getBatchLimit();
    expect(result).to.equal(50);
  });
  it("Admin withdraw", async function () {
    await stakingNftContract.connect(signers[2])
      .stake(tokensArray);

    result = await etnaContract.balanceOf(signers[10].address);
    let balance = Number(ethers.utils.formatUnits(result));
    await stakingNftContract.connect(signers[10])
      .adminWithdrawEtna(ethers.utils.parseUnits('110'));
    result = await etnaContract.balanceOf(signers[10].address);
    expect(Number(ethers.utils.formatUnits(result)))
      .to.equal(balance + 110);

    result = await nftContract.ownerOf(7);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(8);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(9);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(10);
    expect(result).to.equal(stakingNftContract.address);
    result = await nftContract.ownerOf(11);
    expect(result).to.equal(stakingNftContract.address);

    await stakingNftContract.connect(signers[10])
      .adminWithdrawNft([7,8,9,10,11]);

    result = await nftContract.ownerOf(7);
    expect(result).to.equal(signers[10].address);
    result = await nftContract.ownerOf(8);
    expect(result).to.equal(signers[10].address);
    result = await nftContract.ownerOf(9);
    expect(result).to.equal(signers[10].address);
    result = await nftContract.ownerOf(10);
    expect(result).to.equal(signers[10].address);
    result = await nftContract.ownerOf(11);
    expect(result).to.equal(signers[10].address);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.floor(a * b) / b;
}
