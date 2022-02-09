const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const assert = chai.assert;

const { ethers } = require("hardhat");

describe("Test 2", function () {
  it("Withdraw testing", async function () {
    const signers = await ethers.getSigners();
    const gamePrice = 3;
    const withdrawTax = 30;
    const withdrawTaxResetPeriod = 15;
    const initialEtnaTransfer = 200;
    const parameters = {
      winAmounts : [2,3,4,5],
      depletions: [5, 6, 7, 8],
      thresholds: [210,230,270,300],
    }
    let shouldBeFalse = false;
    const ETNA = await ethers.getContractFactory("ETNA");
    const etna = await ETNA.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('10000'), 18);
    await etna.deployed();
    await etna.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    const P2e = await ethers.getContractFactory("p2e");
    const p2e = await P2e.connect(signers[10]).deploy(
      etna.address,
      signers[10].address,
      ethers.utils.parseUnits(gamePrice.toString()),
      [ethers.utils.parseUnits(parameters.winAmounts[0].toString()), ethers.utils.parseUnits(parameters.winAmounts[0].toString()), ethers.utils.parseUnits(parameters.winAmounts[0].toString()), ethers.utils.parseUnits(parameters.winAmounts[0].toString())],
      parameters.depletions,
      parameters.thresholds
    );
    await p2e.deployed();
    let result;
    await etna.connect(signers[10]).transfer(p2e.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    let level = 1;
    await p2e.connect(signers[10]).playGame(signers[0].address, level, 55, 66, 1);
    result = await p2e.getWinToWithdraw();
    expect(Number(ethers.utils.formatUnits(result))).to.equal(parameters.winAmounts[level - 1]);

    result = await p2e.getCurrentWithdrawTax(signers[0].address);
    expect(Number(result / 100)).to.equal(withdrawTax);

    await hre.timeAndMine.increaseTime('10 days');
    await p2e.connect(signers[10]).playGame(signers[1].address, level, 55, 66, 2);
    result = await p2e.getCurrentWithdrawTax(signers[0].address);
    expect(Number(result / 100)).to.equal(withdrawTax - 10 * withdrawTax / withdrawTaxResetPeriod);

    await hre.timeAndMine.increaseTime('15 days');
    await p2e.connect(signers[10]).playGame(signers[1].address, level, 55, 66, 2);
    result = await p2e.getCurrentWithdrawTax(signers[0].address);
    expect(Number(result / 100)).to.equal(0);

    await hre.timeAndMine.increaseTime('50 days');
    await p2e.connect(signers[10]).playGame(signers[1].address, level, 55, 66, 2);
    result = await p2e.getCurrentWithdrawTax(signers[0].address);
    expect(Number(result / 100)).to.equal(0);

    await p2e.connect(signers[10]).playGame(signers[0].address, level, 55, 66, 1);
    result = await p2e.getCurrentWithdrawTax(signers[0].address);
    expect(Number(result / 100)).to.equal(withdrawTax);

    let winToWithdraw = await p2e.getWinToWithdraw();
    winToWithdraw = Number(ethers.utils.formatUnits(winToWithdraw));
    expect(winToWithdraw).to.equal(5 * parameters.winAmounts[level - 1]);

    let balance = await etna.balanceOf(signers[0].address);
    balance = Number(ethers.utils.formatUnits(balance));
    expect(balance).to.equal(initialEtnaTransfer);

    await p2e.connect(signers[0]).withdrawWin(ethers.utils.parseUnits('1'));
    let withdrawTaxes = await p2e.getWithdrawTaxes();
    withdrawTaxes = Number(ethers.utils.formatUnits(withdrawTaxes));
    result = await etna.balanceOf(signers[0].address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result + withdrawTaxes).to.equal(initialEtnaTransfer + 1);

    winToWithdraw = await p2e.getWinToWithdraw();
    winToWithdraw = Number(ethers.utils.formatUnits(winToWithdraw));
    expect(winToWithdraw).to.equal(5 * parameters.winAmounts[level - 1] - 1);

    result = await etna.balanceOf(p2e.address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(initialEtnaTransfer - 1 + withdrawTaxes);

    let ownerBalance = await etna.balanceOf(signers[10].address);
    ownerBalance = Number(ethers.utils.formatUnits(ownerBalance));

    await p2e.connect(signers[10]).withdrawAmount(ethers.utils.parseUnits('1'));
    result = await etna.balanceOf(p2e.address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(initialEtnaTransfer - 2 + withdrawTaxes);

    result = await etna.balanceOf(signers[10].address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(ownerBalance + 1);

    await p2e.connect(signers[10]).withdraw();
    let contractBalance = await etna.balanceOf(p2e.address);
    contractBalance = Number(ethers.utils.formatUnits(contractBalance));
    expect(contractBalance).to.equal(winToWithdraw);

    try {
      await p2e.connect(signers[10]).withdrawAmount(1);
      shouldBeFalse = true;
    } catch (e) {}
    expect(shouldBeFalse, 'Transaction should fail').to.be.false;

    ownerBalance = await etna.balanceOf(signers[10].address);
    ownerBalance = Number(ethers.utils.formatUnits(ownerBalance));

    const forceWithdraw = 8;
    await p2e.connect(signers[10]).forceWithdraw(ethers.utils.parseUnits(forceWithdraw.toString()));
    result = await etna.balanceOf(p2e.address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(contractBalance - forceWithdraw);
    result = await etna.balanceOf(signers[10].address);
    result = Number(ethers.utils.formatUnits(result));
    expect(result).to.equal(ownerBalance + forceWithdraw);
  });
});
