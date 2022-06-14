// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { deployer, scanApiKeys } = require(path.join(__dirname, '../../secrets.json'));
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {
  deployed: {}
};

async function main() {
  d.gasPriceApi = `https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${scanApiKeys.polygon}`
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
    borrowingLending: '0xD7baC58d0555215c5F05f166D39CBf706C988343',
    staking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D'
  };
  d.profileIds = {
    bronze: [1,5,9,13],
    silver: [2,6,10,14],
    gold: [3,7,11,15],
    platinum: [4,8,12,16,17,18,19,20,21,22,23,24],
  };

  d.response = await axios(d.gasPriceApi);
  d.result = Number(d.response.data.result.ProposeGasPrice);
  if (!(d.result > 0)) d.result = 56;
  d.gasPrice = ethers.utils.parseUnits(d.result.toString(), 'gwei');
  d.options = {gasPrice: d.gasPrice};

  d.PancakeRouter = await ethers.getContractFactory('PancakeRouter');
  d.router = await d.PancakeRouter.attach(d.addresses.router);

  d.UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory');
  d.factory = await d.UniswapV2Factory.attach(d.addresses.factory);

  d.ExchangeRouterPancakeSwap = await ethers.getContractFactory("ExchangeRouterPancakeSwap");
  d.exchangeRouterPancakeSwap = await d.ExchangeRouterPancakeSwap.deploy(
    d.owner.address,
    d.router.address,
    d.factory.address,
    d.options
  );
  await d.exchangeRouterPancakeSwap.deployed();
  d.deployed.exchangeRouterPancakeSwap = d.exchangeRouterPancakeSwap.address;
  console.log("Exchange router default implementation deployed to:", d.exchangeRouterPancakeSwap.address);

  d.ExchangeRouterProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.exchangeRouterProxyAdmin = await d.ExchangeRouterProxyAdmin.deploy(d.options);
  await d.exchangeRouterProxyAdmin.deployed();
  d.deployed.exchangeRouterProxyAdmin = d.exchangeRouterProxyAdmin.address;
  console.log("Exchange router proxy admin deployed to:", d.exchangeRouterProxyAdmin.address);

  d.ExchangeRouter = await ethers.getContractFactory("ExchangeRouter");
  d.exchangeRouter = await d.ExchangeRouter.deploy(d.options);
  await d.exchangeRouter.deployed();
  d.deployed.exchangeRouter = d.exchangeRouter.address;
  console.log("Exchange router deployed to:", d.exchangeRouter.address);

  d.ABI = [
    "function initialize(address newOwner, address defaultImplementation)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.exchangeRouterPancakeSwap.address
  ]);
  d.ExchangeRouterProxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );

  d.exchangeRouterProxy = await d.ExchangeRouterProxy.deploy(
    d.exchangeRouter.address,
    d.exchangeRouterProxyAdmin.address,
    d.calldata,
    d.options
  );
  await d.exchangeRouterProxy.deployed();
  d.deployed.exchangeRouterProxy = d.exchangeRouterProxy.address;
  console.log("Exchange router proxy deployed to:", d.exchangeRouterProxy.address);

  d.exchangeRouterConnect = new ethers.Contract(
    d.exchangeRouterProxy.address,
    d.exchangeRouter.interface.format(ethers.utils.FormatTypes.json),
    d.exchangeRouterProxy.provider
  );

  d.BEP20Token = await ethers.getContractFactory("BEP20Token");

  d.usdt = await d.BEP20Token.attach(d.addresses.usdt);
  d.usdc = await d.BEP20Token.attach(d.addresses.usdc);
  d.etna = await d.BEP20Token.attach(d.addresses.etna);
  d.mtb = await d.BEP20Token.attach(d.addresses.mtb);

  d.Baa = await ethers.getContractFactory("Baa");
  d.baa = await d.Baa.deploy(d.options);
  await d.baa.deployed();
  d.deployed.baa = d.baa.address;
  console.log("Baa deployed to:", d.baa.address);

  d.UpgradeableBeacon = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol:UpgradeableBeacon"
  );
  d.upgradeableBeacon = await d.UpgradeableBeacon.deploy(
    d.baa.address,
    d.options
  );
  await d.upgradeableBeacon.deployed();
  d.deployed.upgradeableBeacon = d.upgradeableBeacon.address;
  console.log("Beacon deployed to:", d.upgradeableBeacon.address);

  d.BorrowingLending= await ethers.getContractFactory("BorrowingLending");
  d.borrowingLending = await d.BorrowingLending.attach(d.addresses.borrowingLending);

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
  d.deployed.borrowingPower = d.borrowingPower.address;
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
  d.deployed.accessVaultProxyAdmin = d.accessVaultProxyAdmin.address;
  console.log("Access vault proxy admin deployed to:", d.accessVaultProxyAdmin.address);

  d.AccessVault = await ethers.getContractFactory("AccessVault");
  d.accessVault = await d.AccessVault.deploy(d.options);
  await d.accessVault.deployed();
  d.deployed.accessVault = d.accessVault.address;
  console.log("Access vault deployed to:", d.accessVault.address);

  d.ABI = [
    "function initialize(address newOwner, address borrowingLendingAddress, address borrowingPowerAddress, address baaBeaconAddress, uint256 borrowingFee)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.borrowingLending.address,
    d.borrowingPower.address,
    d.upgradeableBeacon.address,
    d.borrowingFee
  ]);

  d.AccessVaultProxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.accessVaultProxy = await d.AccessVaultProxy.deploy(
    d.accessVault.address,
    d.accessVaultProxyAdmin.address,
    d.calldata,
    d.options
  );
  await d.accessVaultProxy.deployed();
  d.deployed.accessVaultProxy = d.accessVaultProxy.address;
  console.log("Access vault proxy deployed to:", d.accessVaultProxy.address);

  // fs.writeFileSync(
  //   path.join(__dirname, '../../deployed-contracts/polygon.json'),
  //   JSON.stringify(d.deployed, null, 4)
  // );

  d.accessVaultConnect = new ethers.Contract(
    d.accessVaultProxy.address,
    d.accessVault.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );
  await d.accessVaultConnect.setStablecoinProfileId(
    d.usdt.address, 1,
    d.options
  );
  await d.accessVaultConnect.setStablecoinProfileId(
    d.usdc.address, 2,
    d.options
  );
  await d.accessVaultConnect.setTokenAvailable(
    d.etna.address, true,
    d.options
  );
  await d.accessVaultConnect.setTokenAvailable(
    d.mtb.address, true,
    d.options
  );
  await d.accessVaultConnect.setExchangeRouter(
    d.exchangeRouterConnect.address,
    d.options
  );
  await d.accessVaultConnect.setNegativeFactor(
    d.negativeFactor,
    d.options
  );
  await d.accessVaultConnect.setNotificationFactor(d.notificationFactor, d.options);
  await d.accessVaultConnect.setLiquidationFeeFactor(d.liquidationFeeFactor, d.options);
  await d.accessVaultConnect.setFeeOwnerFactor(d.feeOwnerFactor, d.options);
  await d.accessVaultConnect.setMarginSwapFee(
    ethers.utils.parseUnits(d.marginSwapFee.toString(), 18), d.options
  );
  console.log('Deployment completed');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });