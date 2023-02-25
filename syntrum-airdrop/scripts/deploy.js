// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.now = Math.round(Date.now() / 1000);
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 10000000;
  }
  if (d.networkName === 'goerli') {
    d.options.gasPrice = 100000000;
  }
  d.deployedContracts = require(jsonPath);
  d.networks = {
    goerli: {
      owner: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      manager: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      signer: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      token: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      amount: 10,
    },
    bscMainnet: {
      owner: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      manager: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      signer: '0xaE87c642AF526CE693b751ec55af47Eb543c0f3f',
      token: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      amount: 10,
    }
  };

  if (!d.networks[d.networkName]) {
    console.error('Addresses are not set for this network');
    return;
  }

  d.SyntrumAirdrop = await ethers.getContractFactory("SyntrumAirdrop");
  d.syntrumAirdrop = await d.SyntrumAirdrop.deploy(
    d.networks[d.networkName].owner,
    d.networks[d.networkName].manager,
    d.networks[d.networkName].signer,
    d.networks[d.networkName].token,
    ethers.utils.parseUnits(d.networks[d.networkName].amount.toString())
  );
  await d.syntrumAirdrop.deployed();

  if (!(d.deployedContracts.syntrumAirdrop)) d.deployedContracts.syntrumAirdrop = {
    latest: '',
    all: [],
  };

  d.deployedContracts.syntrumAirdrop.latest = d.syntrumAirdrop.address;
  d.deployedContracts.syntrumAirdrop.all.push({
    address: d.syntrumAirdrop.address,
    timestamp: d.now,
  });
  saveToJson(d.deployedContracts);
  console.log("syntrumAirdrop contract was deployed to:", d.syntrumAirdrop.address);

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
