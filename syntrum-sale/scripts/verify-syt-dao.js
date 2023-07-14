// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const network = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${network}.json`);
const deployedContracts = require(jsonPath);

async function main() {
  const Owner = '0x8E63Cd2B67fd35413f761449Bcd9DeB070a72981';

  await hre.run("verify:verify", {
    address: deployedContracts.sytDao.latest,
    constructorArguments: [
      Owner,
      'Syntrum Founders DAO',
      'SYTDAO',
      ethers.utils.parseUnits('500000')
    ],
    contract: "contracts/SytDao.sol:SytDao"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
