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

  const ETNA_BUSD = '0x458d4F8Eee678599F2Eafe1E3db6Aafa72B2a815';
  const BNB_BUSD = '0xf9C04582d8359Bbb3fe56C19E7F05EA92d2629ae';
  const MTB_BUSD = '0x6d5f5DBef48E1202380A16588D07C8CbBFf0876c';
  const PROXY = '0x8Fb49436f6De3a2E8eB0c007d80B561e43cceD0a';

  // const LP = await ethers.getContractFactory("LPToken");
  // const lpEtnaBusdContract = await LP.deploy(
  //   OWNER, 'ETNA-BUSD', 'ETNA-BUSD', ethers.utils.parseUnits('1000000'), 18);
  // await lpEtnaBusdContract.deployed();
  // console.log(`ETNA-BUSD LP contract address: ${lpEtnaBusdContract.address}`);
  // const lpBnbBusdContract = await LP.deploy(
  //   OWNER, 'BNB-BUSD', 'BNB-BUSD', ethers.utils.parseUnits('1000000'), 18);
  // await lpBnbBusdContract.deployed();
  // console.log(`BNB-BUSD LP contract address: ${lpBnbBusdContract.address}`);
  // const lpMtbBusdContract = await LP.deploy(
  //   OWNER, 'MTB-BUSD', 'MTB-BUSD', ethers.utils.parseUnits('1000000'), 18);
  // await lpMtbBusdContract.deployed();
  // console.log(`MTB-BUSD LP contract address: ${lpMtbBusdContract.address}`);

  const proxyContract = {
    address: PROXY
  };
  // const Proxy = await ethers.getContractFactory("Proxy");
  // // const proxyContract = await Proxy.attach(PROXY);
  // const proxyContract = await Proxy.deploy(
  //   OWNER
  // );
  // await proxyContract.deployed();
  // console.log(`Proxy contract address: ${proxyContract.address}`);
  // await proxyContract
  //   .setUsdRateData(
  //     ETNA, // contract address
  //     ZERO, // external contract placeholder
  //     ETNA_BUSD, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     0, // type (should be zero for simple token1/token2 rate
  //     false // if used second parameter in LP getReserves function
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     NETNA,
  //     ZERO,
  //     ETNA_BUSD,
  //     0,
  //     0,
  //     false
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     NATIVE,
  //     ZERO,
  //     BNB_BUSD,
  //     0,
  //     0,
  //     false
  //   );
  // await proxyContract
  //   .setUsdRateData(
  //     MTB,
  //     ZERO,
  //     MTB_BUSD,
  //     0,
  //     0,
  //     false
  //   );

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
  const collateralContract = {
    address: '0xA193aFb48dd19c618537016813459116b17e5f6C',
  };

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
