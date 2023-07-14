// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const axios = require('axios');
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const network = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${network}.json`);
const deployedContracts = require(jsonPath);
const options = {};

async function main() {
  if (network === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
  }
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const now = Math.round(Date.now() / 1000);

  const ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  const proxyAdmin = await ProxyAdmin.connect(deployer).deploy(options);
  await proxyAdmin.deployed();
  if (!(deployedContracts.proxyAdmin)) deployedContracts.proxyAdmin = {
    latest: '',
    all: [],
  };
  deployedContracts.proxyAdmin.latest = proxyAdmin.address
  deployedContracts.proxyAdmin.all.push({
    address: proxyAdmin.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Proxy admin contract deployed to ${proxyAdmin.address}`);
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