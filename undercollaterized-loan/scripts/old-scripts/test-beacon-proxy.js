const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = '0x346db1CEf072f38F7be1ae97D8CE01EcB49ab7dF';
  const Box = await ethers.getContractFactory("BoxV2");
  const box = await Box.attach(proxyAddress);
  console.log(box);
  await box.increment();
}

main();