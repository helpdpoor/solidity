// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const d = {};
d.networkName = hre.network.name;
d.options = {};
if (d.networkName === 'polygonMainnet') {
  d.options.gasPrice = 50000000000;
  d.options.gasLimit = 5000000;
}
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);

  d.ERC20Token = await ethers.getContractFactory("ERC20Token");
  d.erc20Token = await d.ERC20Token.deploy(
    d.owner.address,
    'ETNA TEST',
    'ETNA TEST',
    ethers.utils.parseUnits('1000000'),
    d.options
  );
  await d.erc20Token.deployed();
  if (!(deployedContracts.erc20Token)) deployedContracts.erc20Token = {
    latest: '',
    all: [],
  };

  deployedContracts.erc20Token.latest = d.erc20Token.address;
  deployedContracts.erc20Token.all.push({
    address: d.erc20Token.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`erc20Token contract deployed to ${d.erc20Token.address}`);
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