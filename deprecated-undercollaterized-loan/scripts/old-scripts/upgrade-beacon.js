const { ethers, upgrades } = require("hardhat");

async function main() {
  const BoxV2 = await ethers.getContractFactory("BoxV2");
  const BEACON_ADDRESS = '0x005Aeaf1e1360186Be9f6152613250bB1EdCEAfb';

  await upgrades.upgradeBeacon(BEACON_ADDRESS, BoxV2);
  console.log("Beacon upgraded");

  // const box = BoxV2.attach(BOX_ADDRESS);
}

main();