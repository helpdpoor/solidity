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
    d.options.gasLimit = 10000000;
  }

  d.deployedContracts = require(jsonPath);
  d.signers = await ethers.getSigners();
  d.owner = d.signers[1];
  d.addresses = {
    goerli: {
      syntrum: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      syntrum_native: '',
      syntrum_usd: '',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0xA146a0bED1774b46a9832560a236079bB3D8C412',
    },
  };
  d.names = {
    goerli: {
      syntrum_native: 'SYNTRUM-ETH',
      syntrum_usd: 'SYNTRUM-USDT',
    },
  };
  d.links = {
    goerli: {
      syntrum_native: 'SYNTRUM-ETH',
      syntrum_usd: 'SYNTRUM-USDT',
    },
  };

  const Staking = await ethers.getContractFactory("Staking");
  d.staking = await Staking.attach(d.deployedContracts.staking.latest);

  // deposit profile 1
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].syntrum,
    d.addresses[d.networkName].syntrum,
    1, // type
    500, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    1, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    1,
    'SYNTRUM Bronze Vault',
    'SYNTRUM',
    'SYNTRUM',
    '',
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 2
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].syntrum,
    d.addresses[d.networkName].syntrum,
    1, // type
    2000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    2, // weight
    2592000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
    .setDepositProfileData(
      2,
      'SYNTRUM Silver Vault',
      'SYNTRUM',
      'SYNTRUM',
      '',
      true
    );
  await d.tx.wait(3);

  // deposit profile 3
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].syntrum,
    d.addresses[d.networkName].syntrum,
    1, // type
    4000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    3, // weight
    15552000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    3,
    'SYNTRUM Gold Vault',
    'SYNTRUM',
    'SYNTRUM',
    '',
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 4
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].syntrum,
    d.addresses[d.networkName].syntrum,
    1, // type
    6000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    4, // weight
    31536000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    4,
    'SYNTRUM Platinum Vault',
    'SYNTRUM',
    'SYNTRUM',
    '',
    true,
    d.options
  );
  await d.tx.wait(3);


  // // deposit profile 17 (lp farming)
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].syntrum_native,
  //   d.addresses[d.networkName].syntrum,
  //   2, // type
  //   10000, // apr
  //   2000, // withdrawYieldTax
  //   0, // downgradeTax,
  //   17, // weight
  //   259200, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  // .setDepositProfileData(
  //   17,
  //   d.names[d.networkName].syntrum_native,
  //   'SYNTRUM',
  //   'SYNTRUM',
  //   d.links[d.networkName].syntrum_native,
  //   true,
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // // deposit profile 18
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].syntrum_usd,
  //   d.addresses[d.networkName].syntrum,
  //   2, // type
  //   10000, // apr
  //   2000, // withdrawYieldTax
  //   0, // downgradeTax,
  //   18, // weight
  //   259200, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  // .setDepositProfileData(
  //   18,
  //   d.names[d.networkName].syntrum_usd,
  //   'SYNTRUM',
  //   'SYNTRUM',
  //   d.links[d.networkName].syntrum_usd,
  //   true,
  //   d.options
  // );
  // await d.tx.wait(3);

  console.log('Profiles creation completed');
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