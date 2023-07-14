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
  const signers = await ethers.getSigners();
  const syntrumDeployer = signers[0];
  const deployer = signers[1];
  const updater = signers[2];
  const ownerAddress = deployer.address;
  const managerAddress = deployer.address;
  const ratesAddress = deployedContracts.rates.latest;
  const syntrumTokenAddress = '0xc8955E1d6a1785F951180e516ac00b940fF0b249';
  const receiverAddress = deployer.address;

  await hre.run("verify:verify", {
    address: deployedContracts.sale.latest,
    constructorArguments: [
      ownerAddress,
      managerAddress,
      ratesAddress,
      syntrumTokenAddress,
      receiverAddress
    ],
    contract: "contracts/Sale.sol:Sale"
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
