// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/syntrumTestnet.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  const now = Math.round(Date.now() / 1000);

  const deployedContracts = require(jsonPath);

  d.Collateral = await ethers.getContractFactory("Collateral");
  d.collateral = await d.Collateral.attach(deployedContracts.collateralProxy.latest);

  d.tx = await d.collateral.depositCollateral(1, 0, {value: ethers.utils.parseUnits('1.1')});
  await d.tx.wait(1);
  console.log('deposit', d.tx.hash);

  d.tx = await d.collateral.withdrawCollateral(1, ethers.utils.parseUnits('0.9'));
  await d.tx.wait(1);
  console.log('withdraw', d.tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });