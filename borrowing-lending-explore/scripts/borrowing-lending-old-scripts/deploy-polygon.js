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
  const MTB = '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069';
  const NETNA = '';
  const NFT = '0x1afc77170C1aadfF375e9e32D95C99C4d787aBe2';
  const MARKETPLACE = '0xE098E7C3C2Cd9bfbC9fcc4F3eD32bD5420f557f6';

  const ETNA_USDC = '0xfc2234eFF1ACe573915924fa6d12e5821635f111'; // not correct rate
  const ETNA_USDT = ''; // does not exist
  const MATIC_USDC = '0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827'; // not correct rate
  const MATIC_USDT = '0x604229c960e5CACF2aaEAc8Be68Ac07BA9dF81c3'; // not correct rate
  const MTB_USDC = '0x15F9EAC81721bb4Da5D516D3CbA393932e163017'; // not correct rate
  const MTB_USDT = ''; // does not exist

  const RATE_ETNA_USD = ethers.utils.parseUnits('');
  const RATE_MATIC_USD = ethers.utils.parseUnits('');
  const RATE_MTB_USD = ethers.utils.parseUnits('');

  const aprBorrowingMin = 2000;
  const aprBorrowingMax = 4000;
  const aprBorrowingFix = 500;
  const aprLendingMin = 1000;
  const aprLendingMax = 3000;

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.deploy(
    OWNER
  );
  await proxyContract.deployed();
  console.log(`Proxy contract address: ${proxyContract.address}`);
  await proxyContract
    .setUsdRateData(
      ETNA, // contract address
      ZERO, // external contract placeholder
      ZERO,
      // ETNA_USDC, // LP contract for rate getting
      RATE_ETNA_USD, // rate if set manually (both external and lp should be zero)
      0, // type (should be zero for simple token1/token2 rate
      false // reversed (token2/token1)
    );
  await proxyContract
    .setUsdRateData(
      NETNA,
      ZERO,
      ZERO,
      // ETNA_USDC,
      RATE_ETNA_USD,
      0,
      false
    );
  await proxyContract
    .setUsdRateData(
      NATIVE,
      ZERO,
      ZERO,
      // ETNA
      // BNB_USDC,
      RATE_MATIC_USD,
      0,
      false
    );
  await proxyContract
    .setUsdRateData(
      MTB,
      ZERO,
      ZERO,
      // MTB_USDC,
      RATE_MTB_USD,
      0,
      false
    );

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.deploy(
    OWNER,
    aprBorrowingMin,
    aprBorrowingMax,
    aprBorrowingFix,
    aprLendingMin,
    aprLendingMax
  );
  await blContract.deployed();
  console.log(`Borrowing-lending contract address: ${blContract.address}`);

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.deploy(
    OWNER,
    ETNA,
    blContract.address
  );
  await collateralContract.deployed();
  console.log(`Collateral contract address: ${collateralContract.address}`);

  await collateralContract
    .setProxyContract(
      proxyContract.address
    );
  await blContract
    .setProxyContract(
      proxyContract.address
    );
  await blContract
    .setCollateralContract(
      collateralContract.address
    );

  await blContract.addBorrowingProfile (
    USDC
  );
  await blContract.setUsdRateData(
    USDC,
    ethers.utils.parseUnits('1'),
    false
  );
  await blContract.addBorrowingProfile (
    USDT
  );
  await blContract.setUsdRateData(
    USDT,
    ethers.utils.parseUnits('1'),
    false
  );

  await collateralContract.setNEtnaContract (
    NETNA
  );
  await collateralContract.addCollateralProfile (
    NATIVE,
    5000, // borrowingFactor
    1, //order
    false // no fee
  );
  await collateralContract.setUsdRateData(
    NATIVE,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    ETNA,
    2500, // borrowingFactor
    2, //order
    true // no fee
  );
  await collateralContract.setUsdRateData(
    ETNA,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    MTB,
    2500, // borrowingFactor
    3, //order
    true // no fee
  );
  await collateralContract.setUsdRateData(
    MTB,
    0,
    true
  );
  await collateralContract.addCollateralProfile (
    NETNA,
    2500, // borrowingFactor
    4, //order
    true // no fee
  );
  await collateralContract.setUsdRateData(
    NETNA,
    0,
    true
  );

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const nftCollateralContract = await NftCollateral.deploy(
    MARKETPLACE,
    NFT,
    collateralContract.address,
    OWNER,
    4 // NETNA collateral profile index
  );
  await nftCollateralContract.deployed();
  console.log(`Nft Collateral contract address: ${nftCollateralContract.address}`);

  await collateralContract
    .setNftCollateralContract (
      nftCollateralContract.address
    );

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const rewardContract = await RewardPerBlock.deploy(
    OWNER,
    ETNA,
    blContract.address,
    proxyContract.address,
    365 * 24 * 3600, // duration
    ethers.utils.parseUnits('1000000'), // rewardPool
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