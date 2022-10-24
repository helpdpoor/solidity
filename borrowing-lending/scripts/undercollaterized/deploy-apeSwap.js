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
    d.options.gasLimit = 10000000;
  }
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.zero = '0x0000000000000000000000000000000000000000';
  d.borrowingFee = 1000;
  d.minimalStake = 10000;
  d.negativeFactor = 6000;
  d.liquidationFeeFactor = 1000;
  d.feeOwnerFactor = 4000;
  d.marginSwapFee = 0.01;
  d.notificationFactor = 7000;
  d.borrowingPowerData = [
    15000, 20000, 25000, 30000, 40000, 50000
  ];
  d.neverLate = 10000000000;
  d.addresses = {
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    etna: '0x015C425f6dfabC31E1464cC4339954339f096061',
    mtb: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
    staking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D',
    apeSwapRouter: '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607',
    apeSwapFactory: '0xCf083Be4164828f00cAE704EC15a36D711491284',
  };
  d.profileIds = {
    bronze: [1,5,9,13],
    silver: [2,6,10,14],
    gold: [3,7,11,15],
    platinum: [4,8,12,16,17,18,19,20,21,22,23,24],
  };

  d.PancakeRouter = await ethers.getContractFactory('PancakeRouter');
  d.apeSwapRouter = await d.PancakeRouter.attach(d.addresses.apeSwapRouter);

  d.UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory');
  d.apeSwapFactory = await d.UniswapV2Factory.attach(d.addresses.apeSwapFactory);

  d.UniSwapConnector = await ethers.getContractFactory("UniSwapConnector");
  d.apeSwapConnector = await d.UniSwapConnector.connect(d.owner).deploy(
    d.owner.address,
    d.apeSwapRouter.address,
    d.apeSwapFactory.address
  );
  await d.apeSwapConnector.deployed();

  if (!(deployedContracts.apeSwapConnector)) deployedContracts.apeSwapConnector = {
    latest: '',
    all: [],
  };

  deployedContracts.apeSwapConnector.latest = d.apeSwapConnector.address;
  deployedContracts.apeSwapConnector.all.push({
    address: d.apeSwapConnector.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Ape Swap connector deployed to:", d.apeSwapConnector.address);

  d.ExchangeRouter = await ethers.getContractFactory("ExchangeRouter");
  d.exchangeRouter = await d.ExchangeRouter.attach(deployedContracts.exchangeRouter.latest);

  await d.exchangeRouter.connect(d.owner).registerDexConnector(
    d.apeSwapConnector.address, true, d.options
  );

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