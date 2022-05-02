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
  const COLLATERAL = '0x5E57b7f620f24879A11d8a1A2f17c0DD22997975';

  await hre.run("verify:verify", {
    address: COLLATERAL,
    constructorArguments: [
      OWNER,
      ETNA,
      BL
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
