// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  const USDT = '0x55d398326f99059fF775485246999027B3197955';
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const ZERO = '0x0000000000000000000000000000000000000000';
  const ETNA = '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46';
  const NETNA = '0x279020017E7aa4cD7E35273CcF3DB2223475d7B3';
  const MTB = '0x36C618F869050106e1F64d777395baF7d56A9Ead';
  const BTCB = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';
  const ETH = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
  const CAKE = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
  const OxPAD = '0x94733910a43D412DDaD505a8772839AA77aC1b6d';
  const NFT = '0x83C454FF387cebbC3CbAa5a7a44F412F4FA63c0E';
  const MARKETPLACE = '0x9cFFF32674745b4738306E87cCb14de18eABC6a7';

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

  const ETNA_BUSD = '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC';
  const BNB_BUSD = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
  const MTB_BUSD = '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd';
  const BTCB_BUSD = '0xF45cd219aEF8618A92BAa7aD848364a158a24F33';
  const ETH_BUSD = '0xEa26B78255Df2bBC31C1eBf60010D78670185bD0';
  const CAKE_BUSD = '0x804678fa97d91B974ec2af3c843270886528a9E6';
  const OxPAD_BUSD = '0xEEd9d7D32BC8218025f263e85eA60d33c8dbAf09';

  const DURATION = 365 * 24 * 3600;
  const POOL_SIZE = 5000000;

  const aprBorrowingMin = 700;
  const aprBorrowingMax = 1400;
  const aprBorrowingFix = 300;
  const aprLendingMin = 500;
  const aprLendingMax = 1000;

  const deployedContracts = {
    BL: '0x86358e0ac8BA5B164709AE28Cdc47494A8d55d09',
    COLLATERAL: '0x34ccAB89934927d36A8204dB3B92Fac1Ebd97FE6',
    NFT_COLLATERAL: '0x481DF3892c4100C63880e558390d7fF02fb02A82',
    REWARD: '0x82A32eb7f8A0df744d2AAf1392F0B30da38eFd32',
  };

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach('0x11a6c3A798Db2d9Fa677124ea3946f9f775DA797');
  // const proxyContract = await Proxy.deploy(
  //   OWNER
  // );
  // await proxyContract.deployed();
  // console.log(`Proxy contract address: ${proxyContract.address}`);
  await proxyContract
    .setUsdRateData(
      ETNA, // contract address
      ZERO, // external contract placeholder
      ZERO, // LP contract for rate getting
      '17821302989058792', // rate if set manually (both external and lp should be zero)
      0, // type (should be zero for simple token1/token2 rate
      18,
      18,
      18,
      true // reversed (token2/token1)
    );
  await proxyContract
    .setUsdRateData(
      NETNA,
      ZERO,
      ZERO,
      '17821302989058792',
      0,
      18,
      18,
      18,
      true
    );
  await proxyContract
    .setUsdRateData(
      NATIVE,
      ZERO,
      ZERO,
      '207789902628158387344',
      0,
      18,
      18,
      18,
      true
    );
  await proxyContract
    .setUsdRateData(
      MTB,
      ZERO,
      ZERO,
      '6950517719466',
      0,
      18,
      18,
      18,
      true
    );
  await proxyContract
    .setUsdRateData(
      BTCB,
      ZERO,
      ZERO,
      '19961103679538642478633',
      0,
      18,
      18,
      18,
      true
    );
  await proxyContract
    .setUsdRateData(
      ETH,
      ZERO,
      ZERO,
      '1077041890887729559599',
      0,
      18,
      18,
      18,
      true
    );
  await proxyContract
    .setUsdRateData(
      CAKE,
      ZERO,
      ZERO,
      '2909993955292029246',
      0,
      18,
      18,
      18,
      true
    );
  await proxyContract
    .setUsdRateData(
      OxPAD,
      ZERO,
      ZERO,
      '13121759631803182',
      0,
      18,
      18,
      18,
      true
    );
  console.log('Update completed');

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.attach(deployedContracts.BL);

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.attach(deployedContracts.COLLATERAL);

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const rewardContract = await RewardPerBlock.attach(deployedContracts.REWARD);

  // await collateralContract
  //   .setProxyContract(
  //     proxyContract.address
  //   );
  // await blContract
  //   .setProxyContract(
  //     proxyContract.address
  //   );
  // await rewardContract
  //   .setProxyContract(
  //     proxyContract.address
  //   );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });