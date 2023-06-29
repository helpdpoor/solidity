// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';

  const BNB_BUSD = '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE';
  const BTCB_BUSD = '0x264990fbd0a4796a3e3d8e37c4d5f87a3aca5ebf';
  const ETH_BUSD = '0x9ef1b8c0e4f7dc8bf5719ea496883dc6401d5b2e';
  const CAKE_BUSD = '0xb6064ed41d4f67e353768aa239ca86f4f73665a1';
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const BTCB = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';
  const ETH = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
  const CAKE = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';

  const PriceFeed = await ethers.getContractFactory("PriceFeed");
  const priceFeed = await PriceFeed.deploy(
    OWNER
  );
  await priceFeed.deployed();
  console.log(`Price feed contract address: ${priceFeed.address}`);

  await priceFeed.setUsdRateData(
    NATIVE,
    BNB_BUSD
  );

  await priceFeed.setUsdRateData(
    BTCB,
    BTCB_BUSD
  );

  await priceFeed.setUsdRateData(
    ETH,
    ETH_BUSD
  );

  await priceFeed.setUsdRateData(
    CAKE,
    CAKE_BUSD
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