const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const assert = chai.assert;

const { ethers } = require("hardhat");

describe("Test 1", function () {
  it("Basic functions testing", async function () {
    const signers = await ethers.getSigners();
    const gamePrice = 3;
    const gamesPerPeriod = 7;
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

    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 1);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 1);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 1);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 1);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 1);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 1);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);

    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(7);

    try {
      await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 3);
      shouldBeFalse = true;
    } catch (e) {}
    expect(shouldBeFalse, 'Transaction should fail').to.be.false;

    result = await p2e.getPayment(signers[0].address);
    expect(Number(result)).to.equal(0);
    await etna.approve(p2e.address, ethers.utils.parseUnits('100'));
    await p2e.connect(signers[0]).payForGame();
    result = await etna.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - gamePrice);
    result = await p2e.getPayment(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(gamePrice);
    result = await p2e.getPaidGameNumber(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 3);
    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(8);
    result = await p2e.getPayment(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);
    result = await p2e.getPaidGameNumber(signers[0].address);
    expect(Number(result)).to.equal(gamesPerPeriod - 1);
    
    
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);

    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(14);
    result = await p2e.getPaidGameNumber(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    try {
      await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 5);
      shouldBeFalse = true;
    } catch (e) {}
    expect(shouldBeFalse, 'Transaction should fail').to.be.false;

    await hre.timeAndMine.increaseTime('1 days');

    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(1);

    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);

    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(7);

    try {
      await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 3);
      shouldBeFalse = true;
    } catch (e) {}
    expect(shouldBeFalse, 'Transaction should fail').to.be.false;

    result = await p2e.getPayment(signers[0].address);
    expect(Number(result)).to.equal(0);
    await etna.approve(p2e.address, ethers.utils.parseUnits('100'));
    await p2e.connect(signers[0]).payForGame();
    result = await etna.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 2 * gamePrice);
    result = await p2e.getPayment(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(gamePrice);
    result = await p2e.getPaidGameNumber(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 3);
    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(8);
    result = await p2e.getPayment(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);
    result = await p2e.getPaidGameNumber(signers[0].address);
    expect(Number(result)).to.equal(gamesPerPeriod - 1);

    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);
    await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 2);

    result = await p2e.getGameNumber(signers[0].address);
    expect(Number(result)).to.equal(14);
    result = await p2e.getPaidGameNumber(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    try {
      await p2e.connect(signers[10]).playGame(signers[0].address, 1, 55, 66, 5);
      shouldBeFalse = true;
    } catch (e) {}
    expect(shouldBeFalse, 'Transaction should fail').to.be.false;
  });
});
