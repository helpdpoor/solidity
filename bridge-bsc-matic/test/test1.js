const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialTokenTransfer = 1000;
const fee = 2;
let signers, tokenContract, bridgeContract, result;

beforeEach(async function () {
  signers = await ethers.getSigners();
  const ETNA = await ethers.getContractFactory("ETNA");
  tokenContract = await ETNA.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18);
  await tokenContract.deployed();
  await tokenContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
  await tokenContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
  await tokenContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
  const Bridge = await ethers.getContractFactory("Bridge");
  bridgeContract = await Bridge.connect(signers[10]).deploy(
    tokenContract.address,
    signers[10].address, // owner
    signers[9].address, // manager
    ethers.utils.parseUnits(fee.toString())
  );
  await bridgeContract.deployed();
  await tokenContract.connect(signers[10]).transfer(bridgeContract.address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
});

describe("Testing ETNA bridge", function () {
  it("Adding credits", async function () {
    await expect(
      bridgeContract.connect(signers[10])
        .addCredit(signers[0].address, ethers.utils.parseUnits('10'), 1)
    )
      .to.be.revertedWith('Caller is not the manager');

    await expect(
      bridgeContract.connect(signers[9])
        .addCredit(signers[0].address, ethers.utils.parseUnits('10'), 2)
    )
      .to.be.revertedWith('Gap in credits records is not allowed');

    await bridgeContract.connect(signers[9]).addCredit(signers[0].address, ethers.utils.parseUnits('10'), 1);
    result = await tokenContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer + 10);
    await bridgeContract.connect(signers[9]).addCredit(signers[0].address, ethers.utils.parseUnits('15'), 2);
    result = await tokenContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer + 25);
    result = await tokenContract.balanceOf(bridgeContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer - 25);
    result = await bridgeContract.getCreditsNumber();
    expect(Number(result)).to.equal(2);
    result = await bridgeContract.getCreditData(1);
    expect(Number(ethers.utils.formatUnits(result[0]))).to.equal(10);
    expect(result[1]).to.equal(signers[0].address);
    result = await bridgeContract.getCreditData(2);
    expect(Number(ethers.utils.formatUnits(result[0]))).to.equal(15);
    expect(result[1]).to.equal(signers[0].address);
  });
  it("Adding deposits", async function () {
    await expect(
      bridgeContract.connect(signers[0])
        .depositTokens(ethers.utils.parseUnits('100'))
    )
      .to.be.revertedWith('ERC20: transfer amount exceeds allowance');

    await tokenContract.connect(signers[0]).approve(bridgeContract.address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
    await bridgeContract.connect(signers[0]).depositTokens(ethers.utils.parseUnits('100'));
    result = await tokenContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer - 100 - fee);
    result = await tokenContract.balanceOf(bridgeContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer + 100 + fee);


    await tokenContract.connect(signers[1]).approve(bridgeContract.address, ethers.utils.parseUnits(initialTokenTransfer.toString()));
    await bridgeContract.connect(signers[1]).depositTokens(ethers.utils.parseUnits('200'));
    result = await tokenContract.balanceOf(signers[1].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer - 200 - fee);
    result = await tokenContract.balanceOf(bridgeContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer + 300 + 2 * fee);

    result = await bridgeContract.getDepositsNumber();
    expect(Number(result)).to.equal(2);

    result = await bridgeContract.getDepositData(1);
    expect(Number(ethers.utils.formatUnits(result[0]))).to.equal(100);
    expect(result[1]).to.equal(signers[0].address);
    result = await bridgeContract.getDepositData(2);
    expect(Number(ethers.utils.formatUnits(result[0]))).to.equal(200);
    expect(result[1]).to.equal(signers[1].address);
  });
  it("Admin functions", async function () {
    await expect(
      bridgeContract.connect(signers[9]).setManager(signers[8].address)
    )
      .to.be.revertedWith('caller is not the owner');

    await expect(
      bridgeContract.connect(signers[9])
        .withdrawAdmin(ethers.utils.parseUnits('100'))
    )
      .to.be.revertedWith('caller is not the owner');

    await bridgeContract.connect(signers[10]).setManager(signers[8].address);
    result = await bridgeContract.getManager();
    expect(result).to.equal(signers[8].address);

    result = await tokenContract.balanceOf(signers[10].address);
    const ownerBalance = Number(ethers.utils.formatUnits(result));
    result = await tokenContract.balanceOf(bridgeContract.address);
    const bridgeContractBalance = Number(ethers.utils.formatUnits(result));
    await bridgeContract.connect(signers[10])
        .withdrawAdmin(ethers.utils.parseUnits('100'));

    result = await tokenContract.balanceOf(bridgeContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTokenTransfer - 100);
    result = await tokenContract.balanceOf(signers[10].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(ownerBalance + 100);

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
  });
});
