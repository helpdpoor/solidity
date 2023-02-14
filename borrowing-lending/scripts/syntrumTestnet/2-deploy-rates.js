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

  const now = Math.round(Date.now() / 1000);

  const deployedContracts = require(jsonPath);

  d.Rates = await ethers.getContractFactory("Rates");

  d.ratesContract = await d.Rates.connect(d.owner).deploy(
    d.owner.address,
    d.owner.address
  );
  await d.ratesContract.deployed();
  if (!(deployedContracts.rates)) deployedContracts.rates = {
    latest: '',
    all: [],
  };
  deployedContracts.rates.latest = d.ratesContract.address;
  deployedContracts.rates.all.push({
    address: d.ratesContract.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Rates contract deployed to ${d.ratesContract.address}`);

  await d.ratesContract.connect(d.owner).setAlias(
    deployedContracts.nSyntrum.latest,
    deployedContracts.syntrum.latest,
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