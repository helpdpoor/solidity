// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 10000000;
  }
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.proxyAdmin = await d.ProxyAdmin.attach(
    deployedContracts.proxyAdmin.latest
  );

  const Staking = await ethers.getContractFactory("Staking");
  d.stakingImplementation = await Staking.connect(d.owner).deploy(d.options);
  await d.stakingImplementation.deployed();

  if (!(deployedContracts.stakingImplementation)) deployedContracts.stakingImplementation = {
    latest: '',
    all: [],
  };

  deployedContracts.stakingImplementation.latest = d.stakingImplementation.address;
  deployedContracts.stakingImplementation.all.push({
    address: d.stakingImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Staking contract was deployed to:", d.stakingImplementation.address);

  await d.proxyAdmin.upgrade(deployedContracts.staking.latest, d.stakingImplementation.address);
  console.log('Update completed');
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

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });