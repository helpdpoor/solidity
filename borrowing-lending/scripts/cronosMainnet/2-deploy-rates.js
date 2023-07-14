// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/cronosMainnet.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.updater = d.signers[1];
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

  const lpPairs = {
    ETNA_BUSD: '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC',
    MTB_BUSD: '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd',
    OxPAD_BUSD: '0xEEd9d7D32BC8218025f263e85eA60d33c8dbAf09',
  };

  const chainLinkFeeds = {
    CRO: '',
  };

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
  const now = Math.round(Date.now() / 1000);

  const deployedContracts = require(jsonPath);

  d.Rates = await ethers.getContractFactory("Rates");
  d.ratesContract = await d.Rates.connect(d.updater).attach(deployedContracts.rates.latest);
  d.ratesContract = await d.Rates.connect(d.updater).deploy(
    d.owner.address,
    d.updater.address
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

  await d.ratesContract.connect(d.owner).setChainLink(
    tokenAddresses.NATIVE,
    chainLinkFeeds.BNB
  );
  await d.ratesContract.connect(d.owner).setChainLink(
    tokenAddresses.ETH,
    chainLinkFeeds.ETH
  );
  await d.ratesContract.connect(d.owner).setChainLink(
    tokenAddresses.BTCB,
    chainLinkFeeds.BTC
  );
  await d.ratesContract.connect(d.owner).setChainLink(
    tokenAddresses.CAKE,
    chainLinkFeeds.CAKE
  );

  await d.ratesContract.connect(d.owner).setLp(
    tokenAddresses.ETNA,
    lpPairs.ETNA_BUSD,
    {gasLimit: 500000}
  );

  await d.ratesContract.connect(d.owner).setLp(
    tokenAddresses.MTB,
    lpPairs.MTB_BUSD
  );

  await d.ratesContract.connect(d.owner).setLp(
    tokenAddresses.OxPAD,
    lpPairs.OxPAD_BUSD
  );

  await d.ratesContract.connect(d.owner).setAlias(
    tokenAddresses.NETNA,
    tokenAddresses.ETNA,
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