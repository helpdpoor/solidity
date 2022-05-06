// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const COLLATERAL = '0x34ccAB89934927d36A8204dB3B92Fac1Ebd97FE6';
  const NFT_COLLATERAL = '0x0e4580413c7BFcb433E36DAEbD64614b95935aD0';
  const NFT = '0x1afc77170C1aadfF375e9e32D95C99C4d787aBe2';
  const MARKETPLACE = '0xE098E7C3C2Cd9bfbC9fcc4F3eD32bD5420f557f6';

  await hre.run("verify:verify", {
    address: NFT_COLLATERAL,
    constructorArguments: [
      MARKETPLACE,
      NFT,
      COLLATERAL,
      OWNER,
      7
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