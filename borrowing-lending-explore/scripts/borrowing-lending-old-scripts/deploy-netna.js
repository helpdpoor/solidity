// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';

  const Netna = await ethers.getContractFactory("BEP20Token");
  const netnaContract = await Netna.deploy(
    OWNER,
    'NETNA-TEST',
    'NETNA-TEST',
    ethers.utils.parseUnits('1000000000'),
    18,
    {gasPrice: 50000000000}
  );
  await netnaContract.deployed();
  console.log(`NETNA contract address: ${netnaContract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
