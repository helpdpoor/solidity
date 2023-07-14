// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/bscMainnet.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.updater = d.signers[1];

  const chainLinkFeeds = {
    ETH: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
  };

  const now = Math.round(Date.now() / 1000);

  const deployedContracts = require(jsonPath);

  d.Rates = await ethers.getContractFactory("Rates");
  d.ratesContract = await d.Rates.connect(d.updater).deploy(
    d.owner.address,
    d.updater.address
  );
  await d.ratesContract.deployed();
  if (!(deployedContracts.rates)) deployedContracts.rates = {
    latest: '',
    all: [],
  };
  deployedContracts.rates.latest = d.ratesContract.address;
  deployedContracts.rates.all.push({
    address: d.ratesContract.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Rates contract deployed to ${d.ratesContract.address}`);

  await d.ratesContract.connect(d.owner).setChainLink(
    ethers.constants.AddressZero,
    chainLinkFeeds.ETH
  );
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });