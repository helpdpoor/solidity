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


async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const deployedContracts = require(jsonPath);
  d.feeAmount = 0.01; // usd
  d.feeDiscount = 10; // %
  const contractAddress = '0x1661B310Cd194d08973b2c377fc39056A23056fc';

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      d.owner.address,
      deployedContracts.ratesContract.latest,
      deployedContracts.paymentToken.latest,
      d.owner.address,
      ethers.utils.parseUnits(d.feeAmount.toString()),
      d.feeDiscount * 100
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });