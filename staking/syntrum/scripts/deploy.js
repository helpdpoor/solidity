// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
  }
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.addresses = {
    bscMainnet: {
      etna: '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46',
      mtb: '0x36C618F869050106e1F64d777395baF7d56A9Ead',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0x43E39a7b159c2b0804f377D3aC238f70dA2363A8',
    },
    polygonMainnet: {
      etna: '0x015C425f6dfabC31E1464cC4339954339f096061',
      mtb: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0xD2C2bd609045d750539DBB8a87D76d3F4CAE6494',
    },
  };

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.proxyAdmin = await d.ProxyAdmin.deploy(d.options);
  await d.proxyAdmin.deployed();

  if (!(deployedContracts.proxyAdmin)) deployedContracts.proxyAdmin = {
    latest: '',
    all: [],
  };

  deployedContracts.proxyAdmin.latest = d.proxyAdmin.address;
  deployedContracts.proxyAdmin.all.push({
    address: d.proxyAdmin.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log("Proxy admin contract was deployed to:", d.proxyAdmin.address);

  const Staking = await ethers.getContractFactory("Staking");
  d.stakingImplementation = await Staking.connect(d.owner).deploy(d.options);
  await d.stakingImplementation.deployed();

  if (!(deployedContracts.stakingImplementation)) deployedContracts.stakingImplementation = {
    latest: '',
    all: [],
  };

  deployedContracts.stakingImplementation.latest = d.stakingImplementation.address;
  deployedContracts.stakingImplementation.all.push({
    address: d.stakingImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
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

  if (!(deployedContracts.staking)) deployedContracts.staking = {
    latest: '',
    all: [],
  };

  deployedContracts.staking.latest = d.staking.address;
  deployedContracts.staking.all.push({
    address: d.staking.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
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