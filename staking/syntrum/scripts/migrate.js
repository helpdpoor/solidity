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
    d.options.gasLimit = 10000000;
  }

  const deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  d.addresses = {
    oldStaking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D',
  };

  const Staking = await ethers.getContractFactory("Staking");
  d.staking = await Staking.attach(deployedContracts.staking.latest);
  d.oldStaking = await Staking.attach(d.addresses.oldStaking);

  d.oldDepositsNumber = Number(await d.oldStaking.getDepositsNumber());
  d.depositsNumber = Number(await d.staking.getDepositsNumber());

  d.data = {
    userAddresses: [],
    depositProfileIds: [],
    amounts: [],
    yieldAmounts: [],
    unlocks: [],
  };

  for (let id = d.depositsNumber + 1; id <= d.depositsNumber + 50; id ++) {
    if (id > d.oldDepositsNumber) break;
    console.log(`Deposit ${id} of ${d.oldDepositsNumber}`);
    d.deposit = await d.oldStaking.getDeposit(id);
    let depositProfileId = Number(d.deposit.depositProfileId);
    if (depositProfileId === 23 && d.networkName === 'bscMainnet') {
      console.log(`profileId ${depositProfileId}, network ${d.networkName}`);
      depositProfileId = 27;
    }
    if (depositProfileId === 24) {
      console.log(`profileId ${depositProfileId}, network ${d.networkName}`);
      depositProfileId = 28;
    }
    if (depositProfileId === 25) {
      depositProfileId = 23;
    }
    if (depositProfileId === 26) {
      depositProfileId = 24;
    }
    d.yield = await d.oldStaking.getDepositYield(id, false);
    d.data.userAddresses.push(d.deposit.userAddress);
    d.data.depositProfileIds.push(depositProfileId);
    d.data.amounts.push(d.deposit.amount);
    d.data.yieldAmounts.push(d.yield);
    d.data.unlocks.push(d.deposit.unlock);
  }

  d.tx = await d.staking.connect(d.owner).setUserDepositMultiple(
    d.data.userAddresses,
    d.data.depositProfileIds,
    d.data.amounts,
    d.data.yieldAmounts,
    d.data.unlocks,
    d.options
  );

  console.log('Migration completed', d.tx.hash);
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