const { ethers, upgrades } = require("hardhat");

async function main() {
  const Box = await ethers.getContractFactory("Box");

  const beacon = await upgrades.deployBeacon(Box);
  await beacon.deployed();
  console.log("Beacon deployed to:", beacon.address);

  const box = await upgrades.deployBeaconProxy(beacon, Box, [5], { initializer: 'store' });
  await box.deployed();
  console.log("Box deployed to:", box.address);
}

main();