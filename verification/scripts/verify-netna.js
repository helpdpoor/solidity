// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const NETNA = '0xecBB155027262635ccE355a4F13e9643F8A37Df4';

  await hre.run("verify:verify", {
    address: NETNA,
    constructorArguments: [
      OWNER,
      'NETNA',
      'NETNA',
      ethers.utils.parseUnits('10000000')
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
// npx hardhat verify --contract contracts/netna.sol:NETNA 0x279020017E7aa4cD7E35273CcF3DB2223475d7B3 0x5011f31d9969Fb0B31766435829Df66Afa04D6FA 'NETNA' 'NETNA' 10000000000000000000000000  --network bscMainnet
