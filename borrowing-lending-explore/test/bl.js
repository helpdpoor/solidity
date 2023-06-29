const { expect } = require('chai');
const { ethers } = require("hardhat");
const path = require('path');
const networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${networkName}.json`);
const deployedContracts = require(jsonPath);
const d = {};

// Start test block
describe('swapTesting.js - Swap testing', function () {
  beforeEach(async function () {
    const BL = await ethers.getContractFactory('BorrowingLendingContract');
    d.bl = await BL.attach(deployedContracts.bl.latest);
  });

  it('Get contract data', async function () {
    const provider = d.bl.provider;
    const blockNumber = Number(await provider.getBlockNumber());
    console.log('blockNumber', blockNumber);
    const result = await d.bl.getBorrowing(1);

    console.log('amount', Number(ethers.utils.formatUnits(result.amount)));
    console.log('accumulatedFee', Number(ethers.utils.formatUnits(result.accumulatedFee)));
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}