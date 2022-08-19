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
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 5000000;
  }
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);
  d.feeAmount = 0.01; // usd
  d.feeDiscount = 10; // %

  d.FactoryERC721 = await ethers.getContractFactory("FactoryERC721");
  d.factoryERC721 = await d.FactoryERC721.deploy(
    d.owner.address,
    deployedContracts.ratesContract.latest,
    deployedContracts.paymentToken.latest,
    d.owner.address, // fee receiver address
    ethers.utils.parseUnits(d.feeAmount.toString()),
    d.feeDiscount * 100,
    d.options
  );
  await d.factoryERC721.deployed();
  if (!(deployedContracts.factoryERC721)) deployedContracts.factoryERC721 = {
    latest: '',
    all: [],
  };

  deployedContracts.factoryERC721.latest = d.factoryERC721.address;
  deployedContracts.factoryERC721.all.push({
    address: d.factoryERC721.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`ERC721 factory contract deployed to ${d.factoryERC721.address}`);

  d.implementationERC721 = {
    address: await d.factoryERC721.getTokenImplementation()
  };
  if (!(deployedContracts.implementationERC721)) deployedContracts.implementationERC721 = {
    latest: '',
    all: [],
  };

  deployedContracts.implementationERC721.latest = d.implementationERC721.address;
  deployedContracts.implementationERC721.all.push({
    address: d.implementationERC721.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`ERC721 implementation contract deployed to ${d.implementationERC721.address}`);

  d.FactoryERC1155 = await ethers.getContractFactory("FactoryERC1155");
  d.factoryERC1155 = await d.FactoryERC1155.deploy(
    d.owner.address,
    deployedContracts.ratesContract.latest,
    deployedContracts.paymentToken.latest,
    d.owner.address, // fee receiver address
    ethers.utils.parseUnits(d.feeAmount.toString()),
    d.feeDiscount * 100,
    d.options
  );
  await d.factoryERC1155.deployed();
  if (!(deployedContracts.factoryERC1155)) deployedContracts.factoryERC1155 = {
    latest: '',
    all: [],
  };

  deployedContracts.factoryERC1155.latest = d.factoryERC1155.address;
  deployedContracts.factoryERC1155.all.push({
    address: d.factoryERC1155.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`ERC1155 factory contract deployed to ${d.factoryERC1155.address}`);

  d.implementationERC1155 = {
    address: await d.factoryERC1155.getTokenImplementation()
  };
  if (!(deployedContracts.implementationERC1155)) deployedContracts.implementationERC1155 = {
    latest: '',
    all: [],
  };

  deployedContracts.implementationERC1155.latest = d.implementationERC1155.address;
  deployedContracts.implementationERC1155.all.push({
    address: d.implementationERC1155.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`ERC1155 implementation contract deployed to ${d.implementationERC1155.address}`);
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