const { ethers, upgrades } = require("hardhat");

async function main() {
  const BeaconAddress = '0x005Aeaf1e1360186Be9f6152613250bB1EdCEAfb';
  const Box = await ethers.getContractFactory("Box");

  const beacon = await Box.attach(BeaconAddress);

  const box1 = await upgrades.deployBeaconProxy(beacon, Box, [5], { initializer: 'store' });
  await box1.deployed();
  console.log("Box deployed to:", box1.address);
  const box2 = await upgrades.deployBeaconProxy(beacon, Box, [5], { initializer: 'store' });
  await box2.deployed();
  console.log("Box deployed to:", box2.address);
  const box3 = await upgrades.deployBeaconProxy(beacon, Box, [5], { initializer: 'store' });
  await box3.deployed();
  console.log("Box deployed to:", box3.address);
}

main();