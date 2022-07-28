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
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);

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

  d.Deployer = await ethers.getContractFactory("Deployer");
  d.deployerImplementation = await d.Deployer.deploy(d.options);
  await d.deployerImplementation.deployed();
  if (!(deployedContracts.deployerImplementation)) deployedContracts.deployerImplementation = {
    latest: '',
    all: [],
  };

  deployedContracts.deployerImplementation.latest = d.deployerImplementation.address;
  deployedContracts.deployerImplementation.all.push({
    address: d.deployerImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Deployer implementation contract deployed to ${d.deployerImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, uint256, uint256)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.zero,
    d.owner.address,
    0,
    0
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.deployerProxy = await d.Proxy.deploy(
    d.deployerImplementation.address,
    d.proxyAdmin.address,
    d.calldata,
    d.options
  );
  await d.deployerProxy.deployed();
  if (!(deployedContracts.deployerProxy)) deployedContracts.deployerProxy = {
    latest: '',
    all: [],
  };
  deployedContracts.deployerProxy.latest = d.deployerProxy.address;
  deployedContracts.deployerProxy.all.push({
    address: d.deployerProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Deployer proxy contract deployed to ${d.deployerProxy.address}`);
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });