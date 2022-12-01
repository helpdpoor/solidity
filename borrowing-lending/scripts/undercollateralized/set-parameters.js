const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.networkName = hre.network.name;
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 5000000;
  }
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
    staking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D',
    accessVaultProxyAdmin: '0xf1c9A781AbFC635fB765D2e3f2516d8ef13d264B',
    accessVaultProxy: '0x83c17a593b2e5a3d3567d82d014BbeeE90D35AbF',
    accessVault: '0x7897096b5Db4883800F728A6C33FA2cb696Bb19b',
  };
  d.profileIds = {
    bronze: [1,5,9,13],
    silver: [2,6,10,14],
    gold: [3,7,11,15],
    platinum: [4,8,12,16,17,18,19,20,21,22,23,24],
  };

  d.AccessVaultProxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.accessVaultProxy = await d.AccessVaultProxy.attach(d.addresses.accessVaultProxy);
  d.AccessVault = await ethers.getContractFactory("AccessVault");
  d.accessVault = await d.AccessVault.attach(d.addresses.accessVault);

  d.accessVaultConnect = new ethers.Contract(
    d.accessVaultProxy.address,
    d.accessVault.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );
  await d.accessVaultConnect.setNotificationFactor(d.notificationFactor, d.options);
  await d.accessVaultConnect.setLiquidationFeeFactor(d.liquidationFeeFactor, d.options);
  await d.accessVaultConnect.setFeeOwnerFactor(d.feeOwnerFactor, d.options);
  await d.accessVaultConnect.setMarginSwapFee(
    ethers.utils.parseUnits(d.marginSwapFee.toString(), 18), d.options
  );
  d.BorrowingPower = await ethers.getContractFactory('BorrowingPower');
  d.borrowingPower = await d.BorrowingPower.attach();

  console.log('Setting completed');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });