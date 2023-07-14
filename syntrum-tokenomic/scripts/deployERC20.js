// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const d = {};
d.zero = '0x0000000000000000000000000000000000000000';
d.name = 'Token1';
d.symbol = 'TN1';
d.decimals = 18;
d.totalSupply = 10000000;

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.ERC20Token = await ethers.getContractFactory("ERC20Token");
  d.token = await d.ERC20Token.deploy(
    d.owner.address,
    ethers.utils.parseUnits('1000000'),
    d.zero,
    0,
    18,
    'TEST',
    'TEST'
  );
  await d.token.deployed();
  console.log('Token address: ', d.token.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });