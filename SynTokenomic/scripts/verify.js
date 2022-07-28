const {ethers} = require("hardhat");
const d = {};
d.name = 'Token';
d.symbol = 'TN';
d.decimals = 8;
d.totalSupply = 1000000;


async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.zero = '0x0000000000000000000000000000000000000000';
  const contractAddress = '0x9477eFC987c022304316ccC3d28f917afE5F98c0';

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      d.owner.address,
      ethers.utils.parseUnits('1000000'),
      d.zero,
      0,
      18,
      'TEST',
      'TEST'
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });