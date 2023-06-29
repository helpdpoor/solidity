// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/syntrumTestnet.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.zero = '0x0000000000000000000000000000000000000000';

  d.factors = {
    native: 4000,
    syntrum: 2000,
    nSyntrum: 1500,
    wbtc: 5000,
    weth: 5000,
    cake: 3000,
    oxpad: 1500,
  };

  d.options = {gasPrice: 100000000};
  
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
  d.collateralImplementation = await d.Collateral.deploy(d.options);
  await d.collateralImplementation.deployed();
  if (!(d.deployedContracts.collateralImplementation)) d.deployedContracts.collateralImplementation = {
    latest: '',
    all: [],
  };
  d.deployedContracts.collateralImplementation.latest = d.collateralImplementation.address;
  d.deployedContracts.collateralImplementation.all.push({
    address: d.collateralImplementation.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Collateral implementation contract deployed to ${d.collateralImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address, // owner
    d.deployedContracts.syntrum.latest,
    d.deployedContracts.nSyntrum.latest,
    d.deployedContracts.blProxy.latest,
    d.deployedContracts.rates.latest
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.collateralProxy = await d.Proxy.connect(d.owner).deploy(
    d.collateralImplementation.address,
    d.proxyAdmin.address,
    d.calldata,
    d.options
  );
  await d.collateralProxy.deployed();
  if (!(d.deployedContracts.collateralProxy)) d.deployedContracts.collateralProxy = {
    latest: '',
    all: [],
  };
  d.deployedContracts.collateralProxy.latest = d.collateralProxy.address;
  d.deployedContracts.collateralProxy.all.push({
    address: d.collateralProxy.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Collateral proxy contract deployed to ${d.collateralProxy.address}`);

  // connect to collateralProxy contract using collateralImplementation ABI
  d.collateralContract = new ethers.Contract(
    d.collateralProxy.address,
    d.collateralImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.blContract
    .setCollateralContract(
      d.collateralContract.address
    );

  await d.collateralContract.addCollateralProfile (
    d.zero,
    d.factors.native, // borrowingFactor
    1, //order
    false, // no fee
    d.options
  );
  await d.collateralContract.addCollateralProfile (
    d.deployedContracts.wbtc.latest,
    d.factors.wbtc, // borrowingFactor
    2, //order
    false, // no fee
    d.options
  );
  await d.collateralContract.addCollateralProfile (
    d.deployedContracts.weth.latest,
    d.factors.weth, // borrowingFactor
    3, //order
    false, // no fee
    d.options
  );
  await d.collateralContract.addCollateralProfile (
    d.deployedContracts.syntrum.latest,
    d.factors.syntrum, // borrowingFactor
    4, //order
    true, // no fee
    d.options
  );
  await d.collateralContract.addCollateralProfile (
    d.deployedContracts.nSyntrum.latest,
    d.factors.nSyntrum, // borrowingFactor
    5, //order
    true, // no fee
    d.options
  );
  console.log('installation completed');
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