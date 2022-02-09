const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialTokenTransfer = 1000;
const fee = 2;
let signers, tokenContract, nftContract, marketplaceContract, bridgeContract, result;

beforeEach(async function () {
  signers = await ethers.getSigners();
  const ETNA = await ethers.getContractFactory("ETNA");
  tokenContract = await ETNA
    .deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18);
  await tokenContract.deployed();
  await tokenContract.connect(signers[10])
    .transfer(signers[0].address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
  await tokenContract.connect(signers[10])
    .transfer(signers[1].address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
  await tokenContract.connect(signers[10])
    .transfer(signers[2].address, ethers.utils.parseUnits(initialTokenTransfer.toString()));

  const CyclopsTokens = await ethers.getContractFactory("CyclopsTokens");
  nftContract = await CyclopsTokens.connect(signers[10]).deploy();

  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  marketplaceContract = await NFTMarketplace.connect(signers[10]).connect(signers[10])
    .deploy(nftContract.address, tokenContract.address, 0);
  await marketplaceContract.connect(signers[10])
    .addNFTProfile(
      1,
      ethers.utils.parseUnits('100'),
      ethers.utils.parseUnits('90'),
      'https://example.com/1',
      100
    );
  await nftContract.connect(signers[10])
    .transferBankRight(marketplaceContract.address);

  await marketplaceContract.connect(signers[10])
    .adminMint(1, signers[0].address, 1);
  await marketplaceContract.connect(signers[10])
    .adminMint(1, signers[1].address, 2);
  await marketplaceContract.connect(signers[10])
    .adminMint(1, signers[2].address, 3);
  result = await nftContract.ownerOf(1);
  expect(result).to.equal(signers[0].address);
  result = await nftContract.ownerOf(2);
  expect(result).to.equal(signers[1].address);
  result = await nftContract.ownerOf(3);
  expect(result).to.equal(signers[2].address);

  const NFTBridge = await ethers.getContractFactory("NFTBridge");
  bridgeContract = await NFTBridge.connect(signers[10]).deploy(
    tokenContract.address,
    nftContract.address,
    marketplaceContract.address,
    signers[10].address, // owner
    signers[9].address, // manager
    ethers.utils.parseUnits('2')
  );
  await bridgeContract.deployed();
  await marketplaceContract.connect(signers[10]).setPriceManagerRight(bridgeContract.address);
});

describe("Testing NFT bridge", function () {
  it("Making deposit and adding credit record", async function () {
    result = await tokenContract.allowance(signers[0].address, bridgeContract.address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(0);

    await tokenContract.connect(signers[2]).approve(bridgeContract.address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
    await bridgeContract.connect(signers[2]).depositToken(3);
    await expect(bridgeContract.connect(signers[2]).depositToken(1))
      .to.be.revertedWith('Sender does not own token');
    result = await tokenContract.balanceOf(bridgeContract.address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(fee);
    await expect(nftContract.ownerOf(3)).to.be.revertedWith('003002');
    result = await bridgeContract.getDepositsNumber();

    const depositId = Number(result);
    result = await bridgeContract.getDepositData(depositId);

    await bridgeContract.connect(signers[9]).addCredit(
      Number(result[0]),
      Number(result[1]),
      result[2],
      depositId
    );

    result = await bridgeContract.getCreditData(depositId);
    expect(Number(result[0])).to.equal(1);
    expect(Number(result[1])).to.equal(3);
    expect(result[2]).to.equal(signers[2].address);

    result = await nftContract.ownerOf(3);
    expect(result).to.equal(signers[2].address);
    result = await marketplaceContract.getProfileIdByTokenId(3);
    expect(Number(result)).to.equal(1);
  });
  it("Admin functions", async function () {
    await expect(
      bridgeContract.connect(signers[9]).setTokenContract(signers[8].address)
    )
      .to.be.revertedWith('caller is not the owner');

    result = await bridgeContract.getTokenContract();
    expect(result).to.equal(tokenContract.address);
    await bridgeContract.connect(signers[10]).setTokenContract(signers[8].address);
    result = await bridgeContract.getTokenContract();
    expect(result).to.equal(signers[8].address);
    await bridgeContract.connect(signers[10]).setTokenContract(tokenContract.address);
    result = await bridgeContract.getTokenContract();
    expect(result).to.equal(tokenContract.address);

    await expect(
      bridgeContract.connect(signers[9]).setMarketplaceContract(signers[8].address)
    )
      .to.be.revertedWith('caller is not the owner');

    result = await bridgeContract.getMarketplaceContract();
    expect(result).to.equal(marketplaceContract.address);
    await bridgeContract.connect(signers[10]).setMarketplaceContract(signers[8].address);
    result = await bridgeContract.getMarketplaceContract();
    expect(result).to.equal(signers[8].address);
    await bridgeContract.connect(signers[10]).setMarketplaceContract(marketplaceContract.address);
    result = await bridgeContract.getMarketplaceContract();
    expect(result).to.equal(marketplaceContract.address);

    await expect(
      bridgeContract.connect(signers[9]).setNftContract(signers[8].address)
    )
      .to.be.revertedWith('caller is not the owner');

    result = await bridgeContract.getNftContract();
    expect(result).to.equal(nftContract.address);
    await bridgeContract.connect(signers[10]).setNftContract(signers[8].address);
    result = await bridgeContract.getNftContract();
    expect(result).to.equal(signers[8].address);
    await bridgeContract.connect(signers[10]).setNftContract(nftContract.address);
    result = await bridgeContract.getNftContract();
    expect(result).to.equal(nftContract.address);
  });
});
