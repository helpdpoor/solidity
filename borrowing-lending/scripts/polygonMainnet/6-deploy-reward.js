// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/polygonMainnet.json');
const d = {};
const options = {gasPrice: 50000000000};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const OWNER = d.owner.address;

  const tokenAddresses = {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    NATIVE: '0x0000000000000000000000000000000000000000',
    ZERO: '0x0000000000000000000000000000000000000000',
    ETNA: '0x015C425f6dfabC31E1464cC4339954339f096061',
    NETNA: '0xecBB155027262635ccE355a4F13e9643F8A37Df4',
    MTB: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    QUICK: '0x831753DD7087CaC61aB5644b308642cc1c33Dc13',
    NFT: '0x1afc77170C1aadfF375e9e32D95C99C4d787aBe2',
    MARKETPLACE: '0xE098E7C3C2Cd9bfbC9fcc4F3eD32bD5420f557f6',
  };

  const lpPairs = {
    ETNA_USDC: '0xfc2234eFF1ACe573915924fa6d12e5821635f111',
    MTB_USDC: '0x15F9EAC81721bb4Da5D516D3CbA393932e163017',
  };

  const chainLinkFeeds = {
    MATIC: '0xab594600376ec9fd91f8e885dadf0ce036862de0',
    WBTC: '0xde31f8bfbd8c84b5360cfacca3539b938dd78ae6',
    ETH: '0xf9680d99d6c9589e2a93a78a04a279e509205945',
    QUICK: '0xa058689f4bca95208bba3f265674ae95ded75b6d',
  };

  const factors = {
    NATIVE: 4000,
    ETNA: 2000,
    MTB: 1500,
    NETNA: 1500,
    WBTC: 5000,
    WETH: 5000,
    QUICK: 3000,
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
  d.rewardImplementation = await d.Reward.deploy(options);
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
    d.calldata,
    options
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

  await d.blContract.setRewardContract(
    d.rewardContract.address,
    options
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