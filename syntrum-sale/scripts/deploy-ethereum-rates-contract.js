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
  if (network !== 'ethereumMainnet') {
    console.log('Only for a ethereum network');
    return;
  }
  const now = Math.round(Date.now() / 1000);
  const signers = await ethers.getSigners();
  const manager = signers[1];
  const RatesPlaceholder = await ethers.getContractFactory("RatesPlaceholder");
  const ratesContract = await RatesPlaceholder.connect(manager).deploy();
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
