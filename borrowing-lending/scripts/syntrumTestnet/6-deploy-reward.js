// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/goerli.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  // settings for reward contract
  const DURATION = 365 * 24 * 3600;
  const POOL_SIZE = 5000000;

  const now = Math.round(Date.now() / 1000);

  d.deployedContracts = require(jsonPath);

  d.Rates = await ethers.getContractFactory("Rates");
  if (!d.deployedContracts.rates) throw new Error('Rates contract is not defined');
  d.ratesContract = await d.Rates.attach(d.deployedContracts.rates.latest);

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  if (!d.deployedContracts.proxyAdmin) throw new Error('Proxy admin contract is not defined');
  d.proxyAdmin = await d.ProxyAdmin.attach(d.deployedContracts.proxyAdmin.latest);

  d.BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  d.blContract = await d.BorrowingLending.attach(d.deployedContracts.blProxy.latest);

  d.Collateral = await ethers.getContractFactory("Collateral");
  d.collateralContract = await d.Collateral.attach(d.deployedContracts.collateralProxy.latest);

  d.Reward = await ethers.getContractFactory("Reward");
  d.rewardImplementation = await d.Reward.deploy();
  await d.rewardImplementation.deployed();
  if (!(d.deployedContracts.rewardImplementation)) d.deployedContracts.rewardImplementation = {
    latest: '',
    all: [],
  };
  d.deployedContracts.rewardImplementation.latest = d.rewardImplementation.address;
  d.deployedContracts.rewardImplementation.all.push({
    address: d.rewardImplementation.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Reward implementation contract deployed to ${d.rewardImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, address, uint256, uint256, uint256)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.deployedContracts.syntrum.latest,
    d.blContract.address,
    d.ratesContract.address,
    DURATION, // duration
    ethers.utils.parseUnits(POOL_SIZE.toString()), // rewardPool
    3000, // blockTime
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.rewardProxy = await d.Proxy.connect(d.owner).deploy(
    d.rewardImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.rewardProxy.deployed();
  if (!(d.deployedContracts.rewardProxy)) d.deployedContracts.rewardProxy = {
    latest: '',
    all: [],
  };
  d.deployedContracts.rewardProxy.latest = d.rewardProxy.address;
  d.deployedContracts.rewardProxy.all.push({
    address: d.rewardProxy.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Reward proxy contract deployed to ${d.rewardProxy.address}`);

  // connect to rewardProxy contract using rewardImplementation ABI
  d.rewardContract = new ethers.Contract(
    d.rewardProxy.address,
    d.rewardImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.blContract
    .setRewardContract(d.rewardProxy.address);
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