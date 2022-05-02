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

  const PROXY = '0x8Fb49436f6De3a2E8eB0c007d80B561e43cceD0a';
  const BL = '0x02030B2585005D900E4760599cA33692233e735a';
  const NFT_COLLATERAL = '0x62DDdF00e733dfd75c58C21a139007B28E170DD8';

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.deploy(
    OWNER,
    ETNA,
    BL
  );
  await collateralContract.deployed();
  console.log(`Collateral contract address: ${collateralContract.address}`);

  await collateralContract
    .setProxyContract(
      PROXY
    );

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.attach(
    BL
  );

  await blContract
    .setCollateralContract(
      collateralContract.address
    );

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const nftCollateralContract = await BorrowingLending.attach(
    NFT_COLLATERAL
  );
  await nftCollateralContract.setCollateralContract(collateralContract.address);

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

  await collateralContract
    .setNftCollateralContract (
      NFT_COLLATERAL
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
