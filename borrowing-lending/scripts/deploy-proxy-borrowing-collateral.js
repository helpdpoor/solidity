// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const BUSD = '0x37ce40B509b65176e4cda0b9936863177B1c020C';
  const USDT = '0xa6437182423E8f24e6B69DE6e7e8B12397e6457a';
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const ZERO = '0x0000000000000000000000000000000000000000';
  const ETNA = '0x2D55E8637851D9106993439Eb9c8C6dB37525f2F';
  const MTB = '0x97741c2881ceb3e732665D422bEa621085f49825';
  const NETNA = '0x60850619b6335328f013aae1e5576C7A28Bec3d4';
  const NFT = '0x0186F8cDFe676D4Ca5EDc6f3aE4400Ca269f0F3a';
  const MARKETPLACE = '0x0f6296c3f3FCd5931dD542Dcd1f4EEAf6eEe4DD9';

  const REWARD = '0x06Cb02FEE4d9339c8833B52809844fB1bD2Ad0B1';

  const ETNA_BUSD = '0x458d4F8Eee678599F2Eafe1E3db6Aafa72B2a815';
  const BNB_BUSD = '0xf9C04582d8359Bbb3fe56C19E7F05EA92d2629ae';
  const MTB_BUSD = '0x6d5f5DBef48E1202380A16588D07C8CbBFf0876c';

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
      ETNA_BUSD, // LP contract for rate getting
      0, // rate if set manually (both external and lp should be zero)
      0, // type (should be zero for simple token1/token2 rate
      18,
      18,
      false // if used second parameter in LP getReserves function
    );
  await proxyContract
    .setUsdRateData(
      NETNA,
      ZERO,
      ETNA_BUSD,
      0,
      0,
      18,
      18,
      false
    );
  await proxyContract
    .setUsdRateData(
      NATIVE,
      ZERO,
      BNB_BUSD,
      0,
      0,
      18,
      18,
      false
    );
  await proxyContract
    .setUsdRateData(
      MTB,
      ZERO,
      MTB_BUSD,
      0,
      0,
      18,
      18,
      false
    );

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.deploy(
    OWNER,
    2000, // aprBorrowingMin
    4000, // aprBorrowingMax
    500, // aprBorrowingFix
    1000, // aprLendingMin
    3000 // aprLendingMax
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
    BUSD
  );
  await blContract.setUsdRateData(
    BUSD,
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

  await blContract
    .setRewardContract(REWARD);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
