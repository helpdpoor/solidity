// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const Owner = '0x8E63Cd2B67fd35413f761449Bcd9DeB070a72981';

  const Syntrum = await ethers.getContractFactory("Syntrum");
  const syntrumContract = await Syntrum.deploy(
    Owner,
    'Syntrum',
    'SYT',
    ethers.utils.parseUnits('500000000')
  );
  console.log(`Syntrum token contract address: ${syntrumContract.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
