// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const axios = require("axios");
const d = {};
d.networkName = hre.network.name;
const csvPath = path.join(__dirname, `../deposits/${d.networkName}.csv`);
d.options = {};

async function main() {
  if (d.networkName === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    d.options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 10000000;
  }

  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  d.addresses = {
    oldStaking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D',
  };

  const Staking = await ethers.getContractFactory("Staking");
  d.oldStaking = await Staking.attach(d.addresses.oldStaking);

  d.oldDepositsNumber = Number(await d.oldStaking.getDepositsNumber());

  d.data = [];

  for (let id = 1; id <= d.oldDepositsNumber; id ++) {
    console.log(`Deposit ${id} of ${d.oldDepositsNumber}`);
    d.yield = await d.oldStaking.getDepositYield(id, false);
    d.deposit = await d.oldStaking.getDeposit(id);
    const row = [];
    row.push(d.deposit.userAddress);
    row.push(Number(d.deposit.depositProfileId));
    row.push(Number(ethers.utils.formatUnits(d.deposit.amount)));
    row.push(Number(ethers.utils.formatUnits(d.yield)));
    row.push(Number(d.deposit.unlock));
    d.data.push(row);
  }
  saveToCSV(d.data);
  console.log('Deposit data collecting completed');
}

function saveToCSV(csvData) {
  let csvContent = "data:text/csv;charset=utf-8,"
    + csvData.map(e => e.join(",")).join("\n");
  fs.writeFileSync(
    csvPath,
    csvContent
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