const {ethers} = require("hardhat");
const d = {};
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/goerli.json');
d.deployedContracts = require(jsonPath);

const factors = {
  NATIVE: 4000,
  ETNA: 2000,
  MTB: 1500,
  NETNA: 1500,
  BTCB: 5000,
  ETH: 5000,
  CAKE: 3000,
  OxPAD: 1500,
};

// settings for reward contract
const DURATION = 365 * 24 * 3600;
const POOL_SIZE = 5000000;

// settings for borrowing-lending contract
const aprBorrowingMin = 700;
const aprBorrowingMax = 1400;
const aprBorrowingFix = 300;
const aprLendingMin = 500;
const aprLendingMax = 1000;

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.updater = d.signers[1];
  d.totalSupply = ethers.utils.parseUnits('1000000');

  const aprBorrowingMin = 700;
  const aprBorrowingMax = 1400;
  const aprBorrowingFix = 300;
  const aprLendingMin = 500;
  const aprLendingMax = 1000;

  const ABI = [
    "function initialize(address, address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.deployedContracts.nftMarketplace.latest,
    d.deployedContracts.cyclops.latest,
    d.deployedContracts.collateralProxy.latest,
    d.owner.address
  ]);

  await hre.run("verify:verify", {
    address: d.deployedContracts.rewardImplementation.latest,
    constructorArguments: [
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });