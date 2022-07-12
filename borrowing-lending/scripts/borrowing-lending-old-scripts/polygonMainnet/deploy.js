// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const ZERO = '0x0000000000000000000000000000000000000000';
  const ETNA = '0x015C425f6dfabC31E1464cC4339954339f096061';
  const NETNA = '0xecBB155027262635ccE355a4F13e9643F8A37Df4';
  const MTB = '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069';
  const WBTC = '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'; // 8
  const WETH = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';
  const QUICK = '0x831753DD7087CaC61aB5644b308642cc1c33Dc13';
  const NFT = '0x1afc77170C1aadfF375e9e32D95C99C4d787aBe2';
  const MARKETPLACE = '0xE098E7C3C2Cd9bfbC9fcc4F3eD32bD5420f557f6';

  const factors = {
    NATIVE: 4000,
    ETNA: 2000,
    MTB: 1500,
    NETNA: 1500,
    WBTC: 5000,
    WETH: 5000,
    QUICK: 3000,
  };

  const ETNA_USDC = '0xfc2234eFF1ACe573915924fa6d12e5821635f111'; // reversed, 18, 6
  const MATIC_USDC = '0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827'; // reversed, 18, 6
  const MTB_USDC = '0x15F9EAC81721bb4Da5D516D3CbA393932e163017'; // reversed, 18, 6
  const WBTC_USDC = '0xF6a637525402643B0654a54bEAd2Cb9A83C8B498'; // reversed, 8, 6
  const WETH_USDC = '0x853Ee4b2A13f8a742d64C8F088bE7bA2131f670d'; // not reversed, 6, 18
  const QUICK_USDC = '0x1F1E4c845183EF6d50E9609F16f6f9cAE43BC9Cb'; // not reversed, 6, 18

  const DURATION = 365 * 24 * 3600;
  const POOL_SIZE = 5000000;

  const aprBorrowingMin = 700;
  const aprBorrowingMax = 1400;
  const aprBorrowingFix = 300;
  const aprLendingMin = 500;
  const aprLendingMax = 1000;

  let tx;

  const deployedContracts = {
    BL: '0xD7baC58d0555215c5F05f166D39CBf706C988343',
    COLLATERAL: '0x5E57b7f620f24879A11d8a1A2f17c0DD22997975',
    PROXY: '0x6Da88dCE0AD9F850d4F1b5C147815c492E7A6dED',
    NFT_COLLATERAL: '0xf0901863fB31B30AC652Bb39e61CDd0Ae562baB9',
    REWARD: '0xA4AE614B6a78b641324e416AeBa9573984fCf0A0',
  };
  const options = {gasPrice: 50000000000};
  // const Netna = await ethers.getContractFactory("NETNA");
  // const netnaContract = await Netna.deploy(
  //   OWNER,
  //   'NETNA',
  //   'NETNA',
  //   ethers.utils.parseUnits('10000000'),
  //   options
  // );
  // await netnaContract.deployed();
  // console.log(`NETNA contract address: ${netnaContract.address}`);
  // const NETNA = netnaContract.address;

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach(deployedContracts.PROXY);
  // const proxyContract = await Proxy.deploy(
  //   OWNER,
  //   options
  // );
  // await proxyContract.deployed();
  // console.log(`Proxy contract address: ${proxyContract.address}`);
  // await proxyContract
  //   .setUsdRateData(
  //     ETNA, // contract address
  //     ZERO, // external contract placeholder
  //     ETNA_USDC, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     0, // type (should be zero for simple token1/token2 rate
  //     18,
  //     18,
  //     6,
  //     true, // reversed (token2/token1)
  //     options
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     NETNA,
  //     ZERO,
  //     ETNA_USDC,
  //     0,
  //     0,
  //     18,
  //     18,
  //     6,
  //     true,
  //     options
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     MTB,
  //     ZERO,
  //     MTB_USDC,
  //     0,
  //     0,
  //     18,
  //     6,
  //     18,
  //     false,
  //     options
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     NATIVE,
  //     ZERO,
  //     MATIC_USDC,
  //     0,
  //     0,
  //     18,
  //     18,
  //     6,
  //     true,
  //     options
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     WBTC,
  //     ZERO,
  //     WBTC_USDC,
  //     0,
  //     0,
  //     8,
  //     8,
  //     6,
  //     true,
  //     options
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     WETH,
  //     ZERO,
  //     WETH_USDC,
  //     0,
  //     0,
  //     18,
  //     6,
  //     18,
  //     false,
  //     options
  //   );
  await proxyContract
    .setUsdRateData(
      QUICK,
      ZERO,
      QUICK_USDC,
      0,
      0,
      18,
      6,
      18,
      false,
      options
    );

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.attach(deployedContracts.BL);
  // const blContract = await BorrowingLending.deploy(
  //   OWNER,
  //   aprBorrowingMin,
  //   aprBorrowingMax,
  //   aprBorrowingFix,
  //   aprLendingMin,
  //   aprLendingMax,
  //   options
  // );
  // await blContract.deployed();
  // console.log(`Borrowing-lending contract address: ${blContract.address}`);
  //
  // await blContract
  //   .setProxyContract(
  //     proxyContract.address,
  //     options
  //   );
  //
  // await blContract.addBorrowingProfile (
  //   USDC,
  //   options
  // );
  // await blContract.setUsdRateData(
  //   USDC,
  //   ethers.utils.parseUnits('1', 30),
  //   false,
  //   options
  // );
  // await blContract.addBorrowingProfile (
  //   USDT,
  //   options
  // );
  // await blContract.setUsdRateData(
  //   USDT,
  //   ethers.utils.parseUnits('1', 30),
  //   false,
  //   options
  // );

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.attach(deployedContracts.COLLATERAL);
  // const collateralContract = await Collateral.deploy(
  //   OWNER,
  //   ETNA,
  //   blContract.address,
  //   options
  // );
  // await collateralContract.deployed();
  // console.log(`Collateral contract address: ${collateralContract.address}`);

  // tx = await blContract
  //   .setCollateralContract(
  //     collateralContract.address,
  //     options
  //   );
  // await tx.wait();

  // await collateralContract
  //   .setProxyContract(
  //     proxyContract.address,
  //     options
  //   );

  // await collateralContract.setNEtnaContract (
  //   NETNA,
  //   options
  // );
  // tx = await collateralContract.addCollateralProfile (
  //   NATIVE,
  //   factors.NATIVE, // borrowingFactor
  //   1, //order
  //   false, // no fee
  //   options
  // );
  // tx = await tx.wait();
  // if (tx.status !== 1) {
  //   console.error(tx);
  //   return;
  // }
  // await collateralContract.setUsdRateData(
  //   NATIVE,
  //   0,
  //   true,
  //   options
  // );

  tx = await collateralContract.addCollateralProfile (
    WBTC,
    factors.WBTC, // borrowingFactor
    2, //order
    false, // no fee
    options
  );
  tx = await tx.wait();
  if (tx.status !== 1) {
    console.error(tx);
    return;
  }
  await collateralContract.setUsdRateData(
    WBTC,
    0,
    true,
    options
  );
  tx = await collateralContract.addCollateralProfile (
    WETH,
    factors.WETH, // borrowingFactor
    3, //order
    false, // no fee
    options
  );
  tx = await tx.wait();
  if (tx.status !== 1) {
    console.error(tx);
    return;
  }
  await collateralContract.setUsdRateData(
    WETH,
    0,
    false,
    options
  );
  tx = await collateralContract.addCollateralProfile (
    QUICK,
    factors.QUICK, // borrowingFactor
    4, //order
    true, // no fee
    options
  );
  tx = await tx.wait();
  if (tx.status !== 1) {
    console.error(tx);
    return;
  }
  await collateralContract.setUsdRateData(
    QUICK,
    0,
    true,
    options
  );
  tx = await collateralContract.addCollateralProfile (
    ETNA,
    factors.ETNA, // borrowingFactor
    5, //order
    true, // no fee
    options
  );
  tx = await tx.wait();
  if (tx.status !== 1) {
    console.error(tx);
    return;
  }
  await collateralContract.setUsdRateData(
    ETNA,
    0,
    true,
    options
  );
  tx = await collateralContract.addCollateralProfile (
    MTB,
    factors.MTB, // borrowingFactor
    6, //order
    true, // no fee
    options
  );
  tx = await tx.wait();
  if (tx.status !== 1) {
    console.error(tx);
    return;
  }
  await collateralContract.setUsdRateData(
    MTB,
    0,
    true,
    options
  );
  tx = await collateralContract.addCollateralProfile (
    NETNA,
    factors.NETNA, // borrowingFactor
    7, //order
    true, // no fee
    options
  );
  tx = await tx.wait();
  if (tx.status !== 1) {
    console.error(tx);
    return;
  }
  await collateralContract.setUsdRateData(
    NETNA,
    0,
    true,
    options
  );

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const nftCollateralContract = await NftCollateral.deploy(
    MARKETPLACE,
    NFT,
    collateralContract.address,
    OWNER,
    7, // NETNA collateral profile index
    options
  );
  await nftCollateralContract.deployed();
  console.log(`Nft Collateral contract address: ${nftCollateralContract.address}`);

  await collateralContract
    .setNftCollateralContract (
      nftCollateralContract.address,
      options
    );

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const rewardContract = await RewardPerBlock.deploy(
    OWNER,
    ETNA,
    blContract.address,
    proxyContract.address,
    DURATION, // duration
    ethers.utils.parseUnits(POOL_SIZE.toString()), // rewardPool
    3000, // blockTime
    options
  );
  console.log(`Reward contract address: ${rewardContract.address}`);

  await blContract
    .setRewardContract(
      rewardContract.address,
      options
    );

  await rewardContract
    .setProxyContract(
      proxyContract.address,
      options
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