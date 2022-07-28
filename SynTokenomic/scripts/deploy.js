// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const d = {};
d.zero = '0x0000000000000000000000000000000000000000';
d.networkName = hre.network.name;
d.options = {};
if (d.networkName === 'polygonMainnet') {
  d.options.gasPrice = 50000000000;
}
const jsonPath = path.join(__dirname, `../../deployed-contracts/${d.networkName}.json`);

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);




  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  if (!deployedContracts.proxyAdmin) throw new Error('Proxy admin contract is not defined');
  d.proxyAdmin = await d.ProxyAdmin.attach(deployedContracts.proxyAdmin.latest);

  d.BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  d.blImplementation = await d.BorrowingLending.deploy();
  await d.blImplementation.deployed();
  if (!(deployedContracts.blImplementation)) deployedContracts.blImplementation = {
    latest: '',
    all: [],
  };
  deployedContracts.blImplementation.latest = d.blImplementation.address;
  deployedContracts.blImplementation.all.push({
    address: d.blImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Borrowing lending implementation contract deployed to ${d.blImplementation.address}`);

  d.ABI = [
    "function initialize(address, uint16, uint16, uint16, uint16, uint16)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    OWNER,
    aprBorrowingMin,
    aprBorrowingMax,
    aprBorrowingFix,
    aprLendingMin,
    aprLendingMax
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.blProxy = await d.Proxy.deploy(
    d.blImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.blProxy.deployed();
  if (!(deployedContracts.blProxy)) deployedContracts.blProxy = {
    latest: '',
    all: [],
  };
  deployedContracts.blProxy.latest = d.blProxy.address;
  deployedContracts.blProxy.all.push({
    address: d.blProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Borrowing lending proxy contract deployed to ${d.blProxy.address}`);
















  d.Deployer = await ethers.getContractFactory("Deployer");
  d.deployer = await d.Deployer.deploy(
    d.owner.address,
    d.zero,
    d.owner.address,
    0,
    0,
    d.options
  );
  await d.deployer.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });