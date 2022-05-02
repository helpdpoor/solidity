// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const ETNA = '0x015C425f6dfabC31E1464cC4339954339f096061';
  const BL = '0xD7baC58d0555215c5F05f166D39CBf706C988343';
  const PROXY = '0x6Da88dCE0AD9F850d4F1b5C147815c492E7A6dED';
  const REWARD = '0xA4AE614B6a78b641324e416AeBa9573984fCf0A0';
  const DURATION = 365 * 24 * 3600;
  const POOL_SIZE = 5000000;

  await hre.run("verify:verify", {
    address: REWARD,
    constructorArguments: [
      OWNER,
      ETNA,
      BL,
      PROXY,
      DURATION, // duration
      ethers.utils.parseUnits(POOL_SIZE.toString()), // rewardPool
      3000, // blockTime
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
