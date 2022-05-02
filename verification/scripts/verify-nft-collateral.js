// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const COLLATERAL = '0x5E57b7f620f24879A11d8a1A2f17c0DD22997975';
  const NFT_COLLATERAL = '0xf0901863fB31B30AC652Bb39e61CDd0Ae562baB9';
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
