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
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    etna: '0x015C425f6dfabC31E1464cC4339954339f096061',
    mtb: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
    staking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D'
  };
  d.profileIds = {
    bronze: [1,5,9,13],
    silver: [2,6,10,14],
    gold: [3,7,11,15],
    platinum: [4,8,12,16,17,18,19,20,21,22,23,24],
  };

  d.PancakeRouter = await ethers.getContractFactory('PancakeRouter');
  d.router = await d.PancakeRouter.attach(d.addresses.router);

  d.UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory');
  d.factory = await d.UniswapV2Factory.attach(d.addresses.factory);

  d.UniSwapConnector = await ethers.getContractFactory("UniSwapConnector");
  d.uniSwapConnector = await d.UniSwapConnector.connect(d.owner).deploy(
    d.owner.address,
    d.router.address,
    d.factory.address
  );
  await d.uniSwapConnector.deployed();

  if (!(deployedContracts.uniSwapConnector)) deployedContracts.uniSwapConnector = {
    latest: '',
    all: [],
  };

  deployedContracts.uniSwapConnector.latest = d.uniSwapConnector.address;
  deployedContracts.uniSwapConnector.all.push({
    address: d.uniSwapConnector.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Exchange router default connector deployed to:", d.uniSwapConnector.address);

  d.ExchangeRouter = await ethers.getContractFactory("ExchangeRouter");
  d.exchangeRouter = await d.ExchangeRouter.connect(d.owner).deploy(
    d.owner.address,
    d.uniSwapConnector.address
  );
  await d.exchangeRouter.deployed();

  if (!(deployedContracts.exchangeRouter)) deployedContracts.exchangeRouter = {
    latest: '',
    all: [],
  };

  deployedContracts.exchangeRouter.latest = d.exchangeRouter.address;
  deployedContracts.exchangeRouter.all.push({
    address: d.exchangeRouter.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Exchange router deployed to:", d.exchangeRouter.address);

  d.BEP20Token = await ethers.getContractFactory("BEP20Token");

  d.usdt = await d.BEP20Token.attach(d.addresses.usdt);
  d.usdc = await d.BEP20Token.attach(d.addresses.usdc);
  d.etna = await d.BEP20Token.attach(d.addresses.etna);
  d.mtb = await d.BEP20Token.attach(d.addresses.mtb);

  d.Baa = await ethers.getContractFactory("Baa");
  d.baaImplementation = await d.Baa.deploy(d.options);
  await d.baaImplementation.deployed();

  if (!(deployedContracts.baaImplementation)) deployedContracts.baaImplementation = {
    latest: '',
    all: [],
  };

  deployedContracts.baaImplementation.latest = d.baaImplementation.address;
  deployedContracts.baaImplementation.all.push({
    address: d.baaImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Baa deployed to:", d.baaImplementation.address);

  d.UpgradeableBeacon = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol:UpgradeableBeacon"
  );
  d.upgradeableBeacon = await d.UpgradeableBeacon.deploy(
    d.baaImplementation.address,
    d.options
  );
  await d.upgradeableBeacon.deployed();

  if (!(deployedContracts.upgradeableBeacon)) deployedContracts.upgradeableBeacon = {
    latest: '',
    all: [],
  };

  deployedContracts.upgradeableBeacon.latest = d.upgradeableBeacon.address;
  deployedContracts.upgradeableBeacon.all.push({
    address: d.upgradeableBeacon.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Beacon deployed to:", d.upgradeableBeacon.address);

  d.BorrowingLending= await ethers.getContractFactory("BorrowingLending");
  d.borrowingLending = await d.BorrowingLending.attach(deployedContracts.blProxy.latest);

  d.Staking = await ethers.getContractFactory("Staking");
  d.staking = await d.Staking.attach(d.addresses.staking);

  d.BorrowingPower = await ethers.getContractFactory('BorrowingPower');
  d.borrowingPower = await d.BorrowingPower.deploy(
    d.etna.address,
    d.staking.address,
    ethers.utils.parseUnits(d.minimalStake.toString()),
    d.options
  );
  await d.borrowingPower.deployed();

  if (!(deployedContracts.borrowingPower)) deployedContracts.borrowingPower = {
    latest: '',
    all: [],
  };

  deployedContracts.borrowingPower.latest = d.borrowingPower.address;
  deployedContracts.borrowingPower.all.push({
    address: d.borrowingPower.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("BorrowingPower deployed to:", d.borrowingPower.address);

  await d.borrowingPower.setBronzeStakingProfileIds(
    d.profileIds.bronze,
    d.options
  );
  await d.borrowingPower.setSilverStakingProfileIds(
    d.profileIds.silver,
    d.options
  );
  await d.borrowingPower.setGoldStakingProfileIds(
    d.profileIds.gold,
    d.options
  );
  await d.borrowingPower.setPlatinumStakingProfileIds(
    d.profileIds.platinum,
    d.options
  );
  await d.borrowingPower.setBorrowingPowerData(
    d.borrowingPowerData,
    d.options
  );

  d.AccessVaultProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.accessVaultProxyAdmin = await d.AccessVaultProxyAdmin.deploy(d.options);
  await d.accessVaultProxyAdmin.deployed();

  if (!(deployedContracts.accessVaultProxyAdmin)) deployedContracts.accessVaultProxyAdmin = {
    latest: '',
    all: [],
  };

  deployedContracts.accessVaultProxyAdmin.latest = d.accessVaultProxyAdmin.address;
  deployedContracts.accessVaultProxyAdmin.all.push({
    address: d.accessVaultProxyAdmin.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Access vault proxy admin deployed to:", d.accessVaultProxyAdmin.address);

  d.AccessVault = await ethers.getContractFactory("AccessVault");
  d.accessVaultImplementation = await d.AccessVault.deploy(d.options);
  await d.accessVaultImplementation.deployed();

  if (!(deployedContracts.accessVaultImplementation)) deployedContracts.accessVaultImplementation = {
    latest: '',
    all: [],
  };

  deployedContracts.accessVaultImplementation.latest = d.accessVaultImplementation.address;
  deployedContracts.accessVaultImplementation.all.push({
    address: d.accessVaultImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Access vault deployed to:", d.accessVaultImplementation.address);

  d.ABI = [
    "function initialize(address newOwner, address borrowingLendingAddress, address borrowingPowerAddress, address baaBeaconAddress, address exchangeRouterAddress, uint256 borrowingFee)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.borrowingLending.address,
    d.borrowingPower.address,
    d.upgradeableBeacon.address,
    d.exchangeRouter.address,
    d.borrowingFee
  ]);

  d.AccessVaultProxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.accessVaultProxy = await d.AccessVaultProxy.deploy(
    d.accessVaultImplementation.address,
    d.accessVaultProxyAdmin.address,
    d.calldata,
    d.options
  );
  await d.accessVaultProxy.deployed();

  if (!(deployedContracts.accessVaultProxy)) deployedContracts.accessVaultProxy = {
    latest: '',
    all: [],
  };

  deployedContracts.accessVaultProxy.latest = d.accessVaultProxy.address;
  deployedContracts.accessVaultProxy.all.push({
    address: d.accessVaultProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Access vault proxy deployed to:", d.accessVaultProxy.address);

  d.accessVault = new ethers.Contract(
    d.accessVaultProxy.address,
    d.accessVaultImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.borrowingLending.setAccessVault(d.accessVault.address, d.options);
  await d.accessVault.setStablecoinProfileId(
    d.usdt.address, 1,
    d.options
  );
  await d.accessVault.setStablecoinProfileId(
    d.usdc.address, 2,
    d.options
  );
  await d.accessVault.setTokenAvailable(
    d.etna.address, true,
    d.options
  );
  await d.accessVault.setTokenAvailable(
    d.mtb.address, true,
    d.options
  );
  await d.accessVault.setNegativeFactor(
    d.negativeFactor,
    d.options
  );
  await d.accessVault.setNotificationFactor(d.notificationFactor, d.options);
  await d.accessVault.setLiquidationFeeFactor(d.liquidationFeeFactor, d.options);
  await d.accessVault.setFeeOwnerFactor(d.feeOwnerFactor, d.options);
  await d.accessVault.setMarginSwapFee(
    ethers.utils.parseUnits(d.marginSwapFee.toString(), 18), d.options
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