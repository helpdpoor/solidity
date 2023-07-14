// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const network = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${network}.json`);
const deployedContracts = require(jsonPath);

async function main() {
  const signers = await ethers.getSigners();
  const manager = signers[1];
  const ownerAddress = '0x0b69151b04C5A0732e6DD35f8f1470c1a8cfB807';
  const managerAddress = manager.address;
  const ratesAddress = deployedContracts.rates.latest;
  const syntrumTokenAddress = '0xc8955E1d6a1785F951180e516ac00b940fF0b249';
  const receiverAddress = '0x0386bEb658c703a90a6e0A49E5Fd21eAefb866e3';

  const ABI = [
    "function initialize(address, address, address, address, address)"
  ];
  const iface = new ethers.utils.Interface(ABI);
  const calldata = iface.encodeFunctionData("initialize", [
    ownerAddress,
    managerAddress,
    ratesAddress,
    syntrumTokenAddress,
    receiverAddress
  ]);

  await hre.run("verify:verify", {
    address: deployedContracts.saleProxy.latest,
    constructorArguments: [
      deployedContracts.saleImplementation.latest,
      deployedContracts.proxyAdmin.latest,
      calldata
    ]
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
