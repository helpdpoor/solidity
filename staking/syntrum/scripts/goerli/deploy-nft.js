// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../../deployed-contracts/${d.networkName}.json`);
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
  }
  if (d.networkName === 'goerli') {
    d.options.gasPrice = 100000000;
  }
  const now = Math.round(Date.now() / 1000);
  d.deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[1];

  d.addresses = {
    goerli: {
      syntrum: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      nft: '0x6dcb3941d5C9697ac91FD0D95fC56FB8beb57018',
      marketplace: '0x8fd8EcE7480a9a458E96dC90BfFE296ab0d04B59',
    },
  };

  const StakingNft = await ethers.getContractFactory("StakingNft");
  d.stakingNft = await StakingNft.connect(d.owner).deploy(
    d.addresses[d.networkName].syntrum,
    d.addresses[d.networkName].marketplace,
    d.addresses[d.networkName].nft,
    d.owner.address,
    d.options
  );
  await d.stakingNft.deployed();

  if (!(d.deployedContracts.stakingNft)) d.deployedContracts.stakingNft = {
    latest: '',
    all: [],
  };

  d.deployedContracts.stakingNft.latest = d.stakingNft.address;
  d.deployedContracts.stakingNft.all.push({
    address: d.stakingNft.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log("Staking nft contract was deployed to:", d.stakingNft.address);

  console.log('Deployment completed');
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