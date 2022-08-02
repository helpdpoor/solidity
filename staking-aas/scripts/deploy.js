// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const axios = require('axios');
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const d = {};
d.networkName = hre.network.name;
d.options = {};
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);

async function main() {
  const gasPrice = Number(await getGasPrice());
  if (d.networkName === 'polygonMainnet') {
    d.options.gasPrice = gasPrice > 50000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 5000000;
  }
  console.log(d.options.gasPrice);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);

  d.Staking = await ethers.getContractFactory("Staking");
  d.staking = await d.Staking.deploy(
    d.owner.address,
    d.owner.address,
    2000,
    3,
    d.options
  );
  await d.staking.deployed();
  if (!(deployedContracts.staking)) deployedContracts.staking = {
    latest: '',
    all: [],
  };

  deployedContracts.staking.latest = d.staking.address;
  deployedContracts.staking.all.push({
    address: d.staking.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Staking contract deployed to ${d.staking.address}`);
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

async function getGasPrice () {
  const gasPriceApi = 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=F1PQ752FZMGWKUW6YG1M73ZNG4RZAVHW1T';
  const response = await axios(gasPriceApi);
  const json = response.data;
  let gasPrice = Number(json?.result?.ProposeGasPrice);
  gasPrice = gasPrice > 0 ? gasPrice : 50;
  return ethers.utils.parseUnits(gasPrice.toString(), 'gwei');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });