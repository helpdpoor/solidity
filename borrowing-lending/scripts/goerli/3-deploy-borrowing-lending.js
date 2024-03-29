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
  const OWNER = d.owner.address;
  const tokenAddresses = {
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    NATIVE: '0x0000000000000000000000000000000000000000',
    ZERO: '0x0000000000000000000000000000000000000000',
    ETNA: '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46',
    NETNA: '0x279020017E7aa4cD7E35273CcF3DB2223475d7B3',
    MTB: '0x36C618F869050106e1F64d777395baF7d56A9Ead',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    OxPAD: '0x94733910a43D412DDaD505a8772839AA77aC1b6d',
    NFT: '0x83C454FF387cebbC3CbAa5a7a44F412F4FA63c0E',
    MARKETPLACE: '0x9cFFF32674745b4738306E87cCb14de18eABC6a7',
  };

  // settings for borrowing-lending contract
  const aprBorrowingMin = 700;
  const aprBorrowingMax = 1400;
  const aprBorrowingFix = 300;
  const aprLendingMin = 500;
  const aprLendingMax = 1000;
  const now = Math.round(Date.now() / 1000);

  d.deployedContracts = require(jsonPath);

  d.BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  d.blImplementation = await d.BorrowingLending.deploy();
  await d.blImplementation.deployed();
  if (!(d.deployedContracts.blImplementation)) d.deployedContracts.blImplementation = {
    latest: '',
    all: [],
  };
  d.deployedContracts.blImplementation.latest = d.blImplementation.address;
  d.deployedContracts.blImplementation.all.push({
    address: d.blImplementation.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Borrowing lending implementation contract deployed to ${d.blImplementation.address}`);

  d.ABI = [
    "function initialize(address, uint16, uint16, uint16, uint16, uint16)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
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
    d.deployedContracts.proxyAdmin.latest,
    d.calldata
  );
  await d.blProxy.deployed();
  if (!(d.deployedContracts.blProxy)) d.deployedContracts.blProxy = {
    latest: '',
    all: [],
  };
  d.deployedContracts.blProxy.latest = d.blProxy.address;
  d.deployedContracts.blProxy.all.push({
    address: d.blProxy.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`Borrowing lending proxy contract deployed to ${d.blProxy.address}`);

  d.blContract = new ethers.Contract(
    d.blProxy.address,
    d.blImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.blContract.addBorrowingProfile (
    d.deployedContracts.usdt.latest
  );
  await d.blContract.addBorrowingProfile (
    d.deployedContracts.usdc.latest
  );
  await d.blContract
    .setRatesContract(
      d.deployedContracts.rates.latest
    );
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