const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const d = {};
d.name = 'Token';
d.symbol = 'TN';
d.decimals = 8;
d.totalSupply = 1000000;
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
const deployedContracts = require(jsonPath);


async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  // const contractAddress = '0x69B276B94A8895bcCCe401DB78174590E12fcDc4';
  const contractAddress = deployedContracts.syntrumVault.latest;

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      d.owner.address,
      d.owner.address,
      2000,
      3,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });