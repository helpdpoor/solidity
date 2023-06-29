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
d.deployedContracts = require(jsonPath);
d.now = Math.round(Date.now() / 1000);

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.totalSupply = ethers.utils.parseUnits('1000000000');
  d.zero = '0x0000000000000000000000000000000000000000';

  d.ERC20Token = await ethers.getContractFactory("ERC20Token");
  console.log(1);
  if (!(d.deployedContracts.usdt)) {
  console.log(2);
    d.usdtContract = await d.ERC20Token.deploy(
      d.owner.address,
      d.totalSupply,
      'USDT TEST',
      'USDT',
    );
    await d.usdtContract.deployed();
  console.log(3, d.usdtContract);
    d.deployedContracts.usdt = {
      latest: '',
      all: [],
    };
    d.deployedContracts.usdt.latest = d.usdtContract.address;
    d.deployedContracts.usdt.all.push({
      address: d.usdtContract.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`USDT contract deployed to ${d.usdtContract.address}`);
  }

  if (!(d.deployedContracts.usdc)) {
    d.usdcContract = await d.ERC20Token.deploy(
      d.owner.address,
      d.totalSupply,
      'USDC TEST',
      'USDC',
    );
    await d.usdcContract.deployed();
    d.deployedContracts.usdc = {
      latest: '',
      all: [],
    };
    d.deployedContracts.usdc.latest = d.usdcContract.address;
    d.deployedContracts.usdc.all.push({
      address: d.usdcContract.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`USDC contract deployed to ${d.usdcContract.address}`);
  }

  if (!(d.deployedContracts.syntrum)) {
    d.syntrumContract = await d.ERC20Token.deploy(
      d.owner.address,
      d.totalSupply,
      'SYNTRUM TEST',
      'SYN',
    );
    await d.syntrumContract.deployed();
    d.deployedContracts.syntrum = {
      latest: '',
      all: [],
    };
    d.deployedContracts.syntrum.latest = d.syntrumContract.address;
    d.deployedContracts.syntrum.all.push({
      address: d.syntrumContract.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`Syntrum contract deployed to ${d.syntrumContract.address}`);
  }

  if (!(d.deployedContracts.nSyntrum)) {
    d.nSyntrumContract = await d.ERC20Token.deploy(
      d.owner.address,
      d.totalSupply,
      'NFT SYNTRUM TEST',
      'NSYN',
    );
    await d.nSyntrumContract.deployed();
    d.deployedContracts.nSyntrum = {
      latest: '',
      all: [],
    };
    d.deployedContracts.nSyntrum.latest = d.nSyntrumContract.address;
    d.deployedContracts.nSyntrum.all.push({
      address: d.nSyntrumContract.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`NSyntrum contract deployed to ${d.nSyntrumContract.address}`);
  }

  if (!(d.deployedContracts.wbtc)) {
    d.wbtc = await d.ERC20Token.deploy(
      d.owner.address,
      d.totalSupply,
      'Wrapped BTC TEST',
      'WBTC',
    );
    await d.wbtc.deployed();
    d.deployedContracts.wbtc = {
      latest: '',
      all: [],
    };
    d.deployedContracts.wbtc.latest = d.wbtc.address;
    d.deployedContracts.wbtc.all.push({
      address: d.wbtc.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`WBTC contract deployed to ${d.wbtc.address}`);
  }

  if (!(d.deployedContracts.weth)) {
    d.weth = await d.ERC20Token.deploy(
      d.owner.address,
      d.totalSupply,
      'Wrapped ETH TEST',
      'WETH',
    );
    await d.weth.deployed();
    d.deployedContracts.weth = {
      latest: '',
      all: [],
    };
    d.deployedContracts.weth.latest = d.weth.address;
    d.deployedContracts.weth.all.push({
      address: d.weth.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`WETH contract deployed to ${d.weth.address}`);
  }

  if (!(d.deployedContracts.cyclops)) {
    d.Cyclops = await ethers.getContractFactory("CyclopsTokens");
    d.cyclops = await d.Cyclops.deploy();
    await d.cyclops.deployed();
    d.deployedContracts.cyclops = {
      latest: '',
      all: [],
    };
    d.deployedContracts.cyclops.latest = d.cyclops.address;
    d.deployedContracts.cyclops.all.push({
      address: d.cyclops.address,
      timestamp: d.now,
    });
    saveToJson(d.deployedContracts);
    console.log(`Cyclops contract deployed to ${d.cyclops.address}`);
  }
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