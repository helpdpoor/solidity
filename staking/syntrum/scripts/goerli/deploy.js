// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../../deployed-contracts/${d.networkName}.json`);
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
  }
  const now = Math.round(Date.now() / 1000);
  d.deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[1];

  d.addresses = {
    goerli: {
      syntrum: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0xA146a0bED1774b46a9832560a236079bB3D8C412',
    },
  };

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.proxyAdmin = await d.ProxyAdmin.connect(d.owner).deploy(d.options);
  await d.proxyAdmin.deployed();

  if (!(d.deployedContracts.proxyAdmin)) d.deployedContracts.proxyAdmin = {
    latest: '',
    all: [],
  };

  d.deployedContracts.proxyAdmin.latest = d.proxyAdmin.address;
  d.deployedContracts.proxyAdmin.all.push({
    address: d.proxyAdmin.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log("Proxy admin contract was deployed to:", d.proxyAdmin.address);

  const Staking = await ethers.getContractFactory("Staking");
  d.stakingImplementation = await Staking.connect(d.owner).deploy(d.options);
  await d.stakingImplementation.deployed();

  if (!(d.deployedContracts.stakingImplementation)) d.deployedContracts.stakingImplementation = {
    latest: '',
    all: [],
  };

  d.deployedContracts.stakingImplementation.latest = d.stakingImplementation.address;
  d.deployedContracts.stakingImplementation.all.push({
    address: d.stakingImplementation.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log("Staking implementation contract was deployed to:", d.stakingImplementation.address);

  d.ABI = [
    "function initialize(address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.addresses[d.networkName].taxReceiver,
    d.addresses[d.networkName].rates
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.stakingProxy = await d.Proxy.connect(d.owner).deploy(
    d.stakingImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.stakingProxy.deployed();

  d.staking = await Staking.attach(d.stakingProxy.address);

  if (!(d.deployedContracts.staking)) d.deployedContracts.staking = {
    latest: '',
    all: [],
  };

  d.deployedContracts.staking.latest = d.staking.address;
  d.deployedContracts.staking.all.push({
    address: d.staking.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log("Staking contract was deployed to:", d.staking.address);

  console.log('Deployment completed');
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

async function getGasPrice () {
  const gasPriceApi = 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=F1PQ752FZMGWKUW6YG1M73ZNG4RZAVHW1T';
  const response = await axios(gasPriceApi);
  const json = response.data;
  let gasPrice = Number(json?.result?.ProposeGasPrice);
  gasPrice = gasPrice > 0 ? gasPrice : 50;
  return ethers.utils.parseUnits(gasPrice.toString(), 'gwei');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });