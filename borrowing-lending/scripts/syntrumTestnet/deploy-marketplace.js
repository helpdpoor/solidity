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
d.deployedContracts = require(jsonPath);
d.now = Math.round(Date.now() / 1000);

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.zero = '0x0000000000000000000000000000000000000000';

  d.NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  d.nftMarketplace = await d.NFTMarketplace.deploy(
    d.deployedContracts.cyclops.latest,
    d.deployedContracts.syntrum.latest,
    0
  );
  await d.nftMarketplace.deployed();
  if (!(d.deployedContracts.nftMarketplace)) {
    d.deployedContracts.nftMarketplace = {
      latest: '',
      all: [],
    };
  }

  d.deployedContracts.nftMarketplace.latest = d.nftMarketplace.address;
  d.deployedContracts.nftMarketplace.all.push({
    address: d.nftMarketplace.address,
    timestamp: d.now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Marketplace contract deployed to ${d.nftMarketplace.address}`);
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