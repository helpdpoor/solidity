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

  const Rates = await ethers.getContractFactory("Rates");
  d.ratesContract = await Rates.deploy(
    OWNER,
    OWNER
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

  // await d.ratesContract.setChainLink(
  //   tokenAddresses.NATIVE,
  //   chainLinkFeeds.BNB
  // );
  // await d.ratesContract.setChainLink(
  //   tokenAddresses.ETH,
  //   chainLinkFeeds.ETH
  // );
  // await d.ratesContract.setChainLink(
  //   tokenAddresses.BTCB,
  //   chainLinkFeeds.BTC
  // );
  // await d.ratesContract.setChainLink(
  //   tokenAddresses.CAKE,
  //   chainLinkFeeds.CAKE
  // );
  //
  // await d.ratesContract.setLp(
  //   tokenAddresses.ETNA,
  //   lpPairs.ETNA_BUSD
  // );
  // await d.ratesContract.setLp(
  //   tokenAddresses.MTB,
  //   lpPairs.MTB_BUSD
  // );
  // await d.ratesContract.setLp(
  //   tokenAddresses.OxPAD,
  //   lpPairs.OxPAD_BUSD
  // );

  const ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.proxyAdmin = await ProxyAdmin.deploy();
  await d.proxyAdmin.deployed();
  if (!(deployedContracts.proxyAdmin)) deployedContracts.proxyAdmin = {
    latest: '',
    all: [],
  };
  deployedContracts.proxyAdmin.latest = d.proxyAdmin.address
  deployedContracts.proxyAdmin.all.push({
    address: d.proxyAdmin.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Proxy admin contract deployed to ${d.proxyAdmin.address}`);

  const BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  d.blImplementation = await BorrowingLending.deploy();
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

  d.blContract = new ethers.Contract(
    d.blProxy.address,
    d.blImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.blContract
    .setRatesContract(
      d.ratesContract.address
    );

  const Collateral = await ethers.getContractFactory("Collateral");
  d.collateralImplementation = await Collateral.deploy();
  await d.collateralImplementation.deployed();
  if (!(deployedContracts.collateralImplementation)) deployedContracts.collateralImplementation = {
    latest: '',
    all: [],
  };
  deployedContracts.collateralImplementation.latest = d.collateralImplementation.address;
  deployedContracts.collateralImplementation.all.push({
    address: d.collateralImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Collateral implementation contract deployed to ${d.collateralImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    OWNER, // owner
    tokenAddresses.ETNA,
    tokenAddresses.NETNA,
    d.blContract.address,
    d.ratesContract.address
  ]);

  d.collateralProxy = await d.Proxy.connect(d.owner).deploy(
    d.collateralImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.collateralProxy.deployed();
  if (!(deployedContracts.collateralProxy)) deployedContracts.collateralProxy = {
    latest: '',
    all: [],
  };
  deployedContracts.collateralProxy.latest = d.collateralProxy.address;
  deployedContracts.collateralProxy.all.push({
    address: d.collateralProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Collateral proxy contract deployed to ${d.collateralProxy.address}`);

  // connect to collateralProxy contract using collateralImplementation ABI
  d.collateralContract = new ethers.Contract(
    d.collateralProxy.address,
    d.collateralImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.blContract.connect(d.owner)
    .setCollateralContract(
      d.collateralContract.address
    );

  await d.blContract.addBorrowingProfile (
    tokenAddresses.BUSD
  );
  await d.blContract.addBorrowingProfile (
    tokenAddresses.USDT
  );

  await d.collateralContract.addCollateralProfile (
    tokenAddresses.NATIVE,
    factors.NATIVE, // borrowingFactor
    1, //order
    false // no fee
  );
  await d.collateralContract.addCollateralProfile (
    tokenAddresses.BTCB,
    factors.BTCB, // borrowingFactor
    2, //order
    false // no fee
  );
  await collateralContract.addCollateralProfile (
    tokenAddresses.ETH,
    factors.ETH, // borrowingFactor
    3, //order
    false // no fee
  );
  await collateralContract.addCollateralProfile (
    tokenAddresses.CAKE,
    factors.CAKE, // borrowingFactor
    4, //order
    false // no fee
  );
  await collateralContract.addCollateralProfile (
    tokenAddresses.OxPAD,
    factors.OxPAD, // borrowingFactor
    5, //order
    true // no fee
  );
  await collateralContract.addCollateralProfile (
    tokenAddresses.ETNA,
    factors.ETNA, // borrowingFactor
    6, //order
    true // no fee
  );
  await collateralContract.addCollateralProfile (
    tokenAddresses.MTB,
    factors.MTB, // borrowingFactor
    7, //order
    true // no fee
  );
  await collateralContract.addCollateralProfile (
    tokenAddresses.NETNA,
    factors.NETNA, // borrowingFactor
    8, //order
    true // no fee
  );

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  d.nftCollateralImplementation = await NftCollateral.deploy();
  await d.nftCollateralImplementation.deployed();

  if (!(deployedContracts.nftCollateralImplementation)) deployedContracts.nftCollateralImplementation = {
    latest: '',
    all: [],
  };
  deployedContracts.nftCollateralImplementation.latest = d.nftCollateralImplementation.address;
  deployedContracts.nftCollateralImplementation.all.push({
    address: d.nftCollateralImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`NFT Collateral implementation contract deployed to ${d.nftCollateralImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    tokenAddresses.MARKETPLACE,
    tokenAddresses.NFT,
    d.collateralContract.address,
    OWNER
  ]);

  d.nftCollateralProxy = await d.Proxy.connect(d.owner).deploy(
    d.nftCollateralImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.nftCollateralProxy.deployed();
  if (!(deployedContracts.nftCollateralProxy)) deployedContracts.nftCollateralProxy = {
    latest: '',
    all: [],
  };
  deployedContracts.nftCollateralProxy.latest = d.nftCollateralProxy.address;
  deployedContracts.nftCollateralProxy.all.push({
    address: d.nftCollateralProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`NFT Collateral proxy contract deployed to ${d.nftCollateralProxy.address}`);

  // connect to nftCollateralProxy contract using nftCollateralImplementation ABI
  d.nftCollateralContract = new ethers.Contract(
    d.nftCollateralProxy.address,
    d.nftCollateralImplementation.interface.format(ethers.utils.FormatTypes.json),
    d.owner
  );

  await d.collateralContract
    .setNftCollateralContract (
      d.nftCollateralContract.address
    );

  const Reward = await ethers.getContractFactory("Reward");
  d.rewardImplementation = await Reward.deploy();
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