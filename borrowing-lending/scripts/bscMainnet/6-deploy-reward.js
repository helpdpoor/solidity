// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/bscMainnet.json');
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

  const lpPairs = {
    ETNA_BUSD: '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC',
    MTB_BUSD: '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd',
    OxPAD_BUSD: '0xEEd9d7D32BC8218025f263e85eA60d33c8dbAf09',
  };

  const chainLinkFeeds = {
    BNB: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    BTC: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    ETH: '0x2A3796273d47c4eD363b361D3AEFb7F7E2A13782',
    CAKE: '0xB6064eD41d4f67e353768aA239cA86f4F73665a1',
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
  if (!deployedContracts.rates) throw new Error('Rates contract is not defined');
  d.ratesContract = await d.Rates.attach(deployedContracts.rates.latest);

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  if (!deployedContracts.proxyAdmin) throw new Error('Proxy admin contract is not defined');
  d.proxyAdmin = await d.ProxyAdmin.attach(deployedContracts.proxyAdmin.latest);

  d.BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  if (!deployedContracts.blImplementation) throw new Error('Borrowing lending implementation contract is not defined');
  d.blImplementation = await d.BorrowingLending.attach(deployedContracts.blImplementation.latest);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  if (!deployedContracts.blProxy) throw new Error('Borrowing lending proxy contract is not defined');
  d.blProxy = await d.Proxy.attach(deployedContracts.blProxy.latest);

  d.blContract = new ethers.Contract(
    d.blProxy.address,
    d.blImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  d.Collateral = await ethers.getContractFactory("Collateral");
  if (!deployedContracts.collateralImplementation) throw new Error('Collateral implementation contract is not defined');
  d.collateralImplementation = await d.Collateral.attach(deployedContracts.collateralImplementation.latest);

  if (!deployedContracts.collateralProxy) throw new Error('Collateral proxy contract is not defined');
  d.collateralProxy = await d.Proxy.attach(deployedContracts.collateralProxy.latest);

  // connect to collateralProxy contract using collateralImplementation ABI
  d.collateralContract = new ethers.Contract(
    d.collateralProxy.address,
    d.collateralImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  d.Reward = await ethers.getContractFactory("Reward");
  d.rewardImplementation = await d.Reward.deploy();
  await d.rewardImplementation.deployed();
  if (!(deployedContracts.rewardImplementation)) deployedContracts.rewardImplementation = {
    latest: '',
    all: [],
  };
  deployedContracts.rewardImplementation.latest = d.rewardImplementation.address;
  deployedContracts.rewardImplementation.all.push({
    address: d.rewardImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Reward implementation contract deployed to ${d.rewardImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, address, uint256, uint256, uint256)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    OWNER,
    tokenAddresses.ETNA,
    d.blContract.address,
    d.ratesContract.address,
    DURATION, // duration
    ethers.utils.parseUnits(POOL_SIZE.toString()), // rewardPool
    3000, // blockTime
  ]);

  d.rewardProxy = await d.Proxy.connect(d.owner).deploy(
    d.rewardImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.rewardProxy.deployed();
  if (!(deployedContracts.rewardProxy)) deployedContracts.rewardProxy = {
    latest: '',
    all: [],
  };
  deployedContracts.rewardProxy.latest = d.rewardProxy.address;
  deployedContracts.rewardProxy.all.push({
    address: d.rewardProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Reward proxy contract deployed to ${d.rewardProxy.address}`);

  // connect to rewardProxy contract using rewardImplementation ABI
  d.rewardContract = new ethers.Contract(
    d.rewardProxy.address,
    d.rewardImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );


  await d.blContract
    .setRewardContract(d.rewardContract.address);
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