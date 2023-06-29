// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const Owner = '0x8E63Cd2B67fd35413f761449Bcd9DeB070a72981';
  const Contract = '0xc8955E1d6a1785F951180e516ac00b940fF0b249';

  await hre.run("verify:verify", {
    address: Contract,
    constructorArguments: [
      Owner,
      'Syntrum',
      'SYT',
      ethers.utils.parseUnits('500000000')
    ],
    contract: "contracts/Syntrum.sol:Syntrum"
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
