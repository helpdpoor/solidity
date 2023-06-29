// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/syntrumTestnet.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  const now = Math.round(Date.now() / 1000);

  const deployedContracts = require(jsonPath);

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.proxyAdmin = await d.ProxyAdmin.deploy();
  await d.proxyAdmin.deployed();
  if (!(deployedContracts.proxyAdmin)) deployedContracts.proxyAdmin = {
    latest: '',
    all: [],
  };
  deployedContracts.proxyAdmin.latest = d.proxyAdmin.address
  deployedContracts.proxyAdmin.all.push({
    address: d.proxyAdmin.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Proxy admin contract deployed to ${d.proxyAdmin.address}`);
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