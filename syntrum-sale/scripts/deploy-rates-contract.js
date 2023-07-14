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
const chainLinkNativeFeeds = {
  ethereumMainnet: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
}

async function main() {
  if (deployedContracts?.rates?.latest) {
    console.log('Rates contract already exists');
    return;
  }
  if (!chainLinkNativeFeeds[network]) {
    console.log('No chainLink address specified');
    return;
  }
  const now = Math.round(Date.now() / 1000);
  const signers = await ethers.getSigners();
  const syntrumDeployer = signers[0];
  const deployer = signers[1];
  const updater = signers[2];
  const Rates = await ethers.getContractFactory("Rates");
  const ratesContract = await Rates.connect(deployer).deploy(
    deployer.address,
    updater.address
  );
  await ratesContract.deployed();
  if (!(deployedContracts.rates)) deployedContracts.rates = {
    latest: '',
    all: [],
  };
  deployedContracts.rates.latest = ratesContract.address;
  deployedContracts.rates.all.push({
    address: ratesContract.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Rates contract deployed to ${ratesContract.address}`);

  await ratesContract.connect(deployer).setChainLink(
    ethers.constants.AddressZero,
    chainLinkNativeFeeds[network]
  );
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
