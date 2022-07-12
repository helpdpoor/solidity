// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/bscMainnet.json');

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const tokenAddresses = {
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    NATIVE: '0x0000000000000000000000000000000000000000',
    ZERO: '0x0000000000000000000000000000000000000000',
    ETNA: '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46',
    NETNA: '0x279020017E7aa4cD7E35273CcF3DB2223475d7B3',
    MTB: '0x36C618F869050106e1F64d777395baF7d56A9Ead',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    OxPAD: '0x94733910a43D412DDaD505a8772839AA77aC1b6d',
    NFT: '0x83C454FF387cebbC3CbAa5a7a44F412F4FA63c0E',
    MARKETPLACE: '0x9cFFF32674745b4738306E87cCb14de18eABC6a7',
  };

  const lpPairs = {
    ETNA_BUSD: '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC',
    MTB_BUSD: '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd',
    OxPAD_BUSD: '0xEEd9d7D32BC8218025f263e85eA60d33c8dbAf09',
  };

  const chainLinkFeeds = {
    BNB: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    BTC: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    ETH: '0x2A3796273d47c4eD363b361D3AEFb7F7E2A13782',
    CAKE: '0xB6064eD41d4f67e353768aA239cA86f4F73665a1',
  };

  const factors = {
    NATIVE: 4000,
    ETNA: 2000,
    MTB: 1500,
    NETNA: 1500,
    BTCB: 5000,
    ETH: 5000,
    CAKE: 3000,
    OxPAD: 1500,
  };

  // settings for reward contract
  const DURATION = 365 * 24 * 3600;
  const POOL_SIZE = 5000000;

  // settings for borrowing-lending contract
  const aprBorrowingMin = 700;
  const aprBorrowingMax = 1400;
  const aprBorrowingFix = 300;
  const aprLendingMin = 500;
  const aprLendingMax = 1000;

  const deployedContractsData = require(jsonPath);
  const deployedContracts = {};

  const Rates = await ethers.getContractFactory("Rates");
  const ratesContract = await Rates.deploy(
    OWNER,
    OWNER
  );
  await ratesContract.deployed();
  deployedContractsData.rates = ratesContract.address;

  await ratesContract.setChainLink(
    tokenAddresses.NATIVE,
    chainLinkFeeds.BNB
  );
  await ratesContract.setChainLink(
    tokenAddresses.ETH,
    chainLinkFeeds.ETH
  );
  await ratesContract.setChainLink(
    tokenAddresses.BTCB,
    chainLinkFeeds.BTC
  );
  await ratesContract.setChainLink(
    tokenAddresses.CAKE,
    chainLinkFeeds.CAKE
  );

  await ratesContract.setLp(
    tokenAddresses.ETNA,
    lpPairs.ETNA_BUSD
  );
  await ratesContract.setLp(
    tokenAddresses.MTB,
    lpPairs.MTB_BUSD
  );
  await ratesContract.setLp(
    tokenAddresses.OxPAD,
    lpPairs.OxPAD_BUSD
  );


  const BL = '0x857b63C556466D3bA31381234f7e800eC83a38d4';
  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.attach(BL);
  // const blContract = await BorrowingLending.deploy(
  //   OWNER,
  //   aprBorrowingMin,
  //   aprBorrowingMax,
  //   aprBorrowingFix,
  //   aprLendingMin,
  //   aprLendingMax
  // );
  // await blContract.deployed();
  // console.log(`Borrowing-lending contract address: ${blContract.address}`);
  const COLLATERAL = '0x34ccAB89934927d36A8204dB3B92Fac1Ebd97FE6';
  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.attach(COLLATERAL);
  // const collateralContract = await Collateral.deploy(
  //   OWNER,
  //   ETNA,
  //   blContract.address
  // );
  // await collateralContract.deployed();
  // console.log(`Collateral contract address: ${collateralContract.address}`);

  // await collateralContract
  //   .setProxyContract(
  //     proxyContract.address
  //   );
  // await blContract
  //   .setProxyContract(
  //     proxyContract.address
  //   );
  // await blContract
  //   .setCollateralContract(
  //     collateralContract.address
  //   );
  //
  // await blContract.addBorrowingProfile (
  //   BUSD
  // );
  // await blContract.setUsdRateData(
  //   BUSD,
  //   ethers.utils.parseUnits('1'),
  //   false
  // );
  // await blContract.addBorrowingProfile (
  //   USDT
  // );
  // await blContract.setUsdRateData(
  //   USDT,
  //   ethers.utils.parseUnits('1'),
  //   false
  // );

  // await collateralContract.setNEtnaContract (
  //   NETNA
  // );
  await collateralContract.addCollateralProfile (
    NATIVE,
    factors.NATIVE, // borrowingFactor
    1, //order
    false // no fee
  );
  await collateralContract.setUsdRateData(
    NATIVE,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    BTCB,
    factors.BTCB, // borrowingFactor
    2, //order
    false // no fee
  );
  await collateralContract.setUsdRateData(
    BTCB,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    ETH,
    factors.ETH, // borrowingFactor
    3, //order
    false // no fee
  );
  await collateralContract.setUsdRateData(
    ETH,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    CAKE,
    factors.CAKE, // borrowingFactor
    4, //order
    false // no fee
  );
  await collateralContract.setUsdRateData(
    CAKE,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    OxPAD,
    factors.OxPAD, // borrowingFactor
    5, //order
    true // no fee
  );
  await collateralContract.setUsdRateData(
    OxPAD,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    ETNA,
    factors.ETNA, // borrowingFactor
    6, //order
    true // no fee
  );
  await collateralContract.setUsdRateData(
    ETNA,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    MTB,
    factors.MTB, // borrowingFactor
    7, //order
    true // no fee
  );
  await collateralContract.setUsdRateData(
    MTB,
    0,
    true
  );
  // await collateralContract.addCollateralProfile (
  //   NETNA,
  //   factors.NETNA, // borrowingFactor
  //   8, //order
  //   true // no fee
  // );
  // await collateralContract.setUsdRateData(
  //   NETNA,
  //   0,
  //   true
  // );

  // const NftCollateral = await ethers.getContractFactory("NftCollateral");
  // const nftCollateralContract = await NftCollateral.deploy(
  //   MARKETPLACE,
  //   NFT,
  //   collateralContract.address,
  //   OWNER,
  //   8 // NETNA collateral profile index
  // );
  // await nftCollateralContract.deployed();
  // console.log(`Nft Collateral contract address: ${nftCollateralContract.address}`);
  //
  // await collateralContract
  //   .setNftCollateralContract (
  //     nftCollateralContract.address
  //   );

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const rewardContract = await RewardPerBlock.deploy(
    OWNER,
    ETNA,
    blContract.address,
    proxyContract.address,
    DURATION, // duration
    ethers.utils.parseUnits(POOL_SIZE.toString()), // rewardPool
    3000, // blockTime
  );
  console.log(`Reward contract address: ${rewardContract.address}`);

  await blContract
    .setRewardContract(rewardContract.address);

  await rewardContract
    .setProxyContract(
      proxyContract.address
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