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
    bscMainnet: {
      etna: '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46',
      mtb: '0x36C618F869050106e1F64d777395baF7d56A9Ead',
      etna_native: '0xA2FACc7286E621C63a81a817Dba57a3c4dcC5ff2',
      etna_usd: '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC',
      mtb_native: '0xd4B9b39a8F76a7CaF66924f6000a506BdAbAdE70',
      mtb_usd: '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd',
      etna_mtb: '0x8A9E5f9960019ED33BE3f7FD7EeF9AC2838e723e',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0x43E39a7b159c2b0804f377D3aC238f70dA2363A8',
    },
    polygonMainnet: {
      etna: '0x015C425f6dfabC31E1464cC4339954339f096061',
      mtb: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
      etna_native: '0x116829711e57d77116a19e5cDc26B00DBDC05e14',
      etna_usd: '0xfc2234eFF1ACe573915924fa6d12e5821635f111',
      mtb_native: '0xeBc33810C0F4261abb8D9e0fD39cd7d4f83eBC62',
      mtb_usd: '0x15F9EAC81721bb4Da5D516D3CbA393932e163017',
      etna_mtb: '0x5a961D15438a5Efb7d832a6BbC4509c3819FfDEa',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0xD2C2bd609045d750539DBB8a87D76d3F4CAE6494',
    },
  };
  d.names = {
    bscMainnet: {
      etna_native: 'ETNA-BNB',
      etna_usd: 'ETNA-BUSD',
      mtb_native: 'MTB-BNB',
      mtb_usd: 'MTB-BUSD',
      etna_mtb: 'ETNA-MTB',
    },
    polygonMainnet: {
      etna_native: 'ETNA-MATIC',
      etna_usd: 'ETNA-USDC',
      mtb_native: 'MTB-MATIC',
      mtb_usd: 'MTB-USDC',
      etna_mtb: 'ETNA-MTB',
    }
  };
  d.links = {
    bscMainnet: {
      etna_native: 'https://pancakeswap.finance/add/BNB/0x51F35073FF7cF54c9e86b7042E59A8cC9709FC46',
      etna_usd: 'https://pancakeswap.finance/add/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56/0x51F35073FF7cF54c9e86b7042E59A8cC9709FC46',
      mtb_native: 'https://pancakeswap.finance/add/BNB/0x36C618F869050106e1F64d777395baF7d56A9Ead',
      mtb_usd: 'https://pancakeswap.finance/add/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56/0x36C618F869050106e1F64d777395baF7d56A9Ead',
      etna_mtb: 'https://pancakeswap.finance/add/0x36C618F869050106e1F64d777395baF7d56A9Ead/0x51F35073FF7cF54c9e86b7042E59A8cC9709FC46',
    },
    polygonMainnet: {
      etna_native: 'https://quickswap.exchange/#/add/ETH/0x015C425f6dfabC31E1464cC4339954339f096061',
      etna_usd: 'https://quickswap.exchange/#/add/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/0x015C425f6dfabC31E1464cC4339954339f096061',
      mtb_native: 'https://quickswap.exchange/#/add/ETH/0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
      mtb_usd: 'https://quickswap.exchange/#/add/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
      etna_mtb: 'https://quickswap.exchange/#/add/0x015C425f6dfabC31E1464cC4339954339f096061/0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
    }
  };

  const Staking = await ethers.getContractFactory("Staking");
  d.staking = await Staking.attach(deployedContracts.staking.latest);

  // // deposit profile 1
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].etna,
  //   1, // type
  //   500, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   1, // weight
  //   259200, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  // .setDepositProfileData(
  //   1,
  //   'ETNA Bronze Vault',
  //   'ETNA',
  //   'ETNA',
  //   '',
  //   true,
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // // deposit profile 2
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].etna,
  //   1, // type
  //   2000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   2, // weight
  //   2592000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     2,
  //     'ETNA Silver Vault',
  //     'ETNA',
  //     'ETNA',
  //     '',
  //     true
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 3
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].etna,
  //   1, // type
  //   4000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   3, // weight
  //   15552000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  // .setDepositProfileData(
  //   3,
  //   'ETNA Gold Vault',
  //   'ETNA',
  //   'ETNA',
  //   '',
  //   true,
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // // deposit profile 4
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].etna,
  //   1, // type
  //   6000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   4, // weight
  //   31536000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  // .setDepositProfileData(
  //   4,
  //   'ETNA Platinum Vault',
  //   'ETNA',
  //   'ETNA',
  //   '',
  //   true,
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // // deposit profile 5
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   1000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   5, // weight
  //   259200, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     5,
  //     'ETNA Bronze Vault',
  //     'ETNA',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 6
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   3000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   6, // weight
  //   2592000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     6,
  //     'ETNA Silver Vault',
  //     'ETNA',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 7
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   5000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   7, // weight
  //   15552000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     7,
  //     'ETNA Gold Vault',
  //     'ETNA',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 8
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].etna,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   7000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   8, // weight
  //   31536000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     8,
  //     'ETNA Platinum Vault',
  //     'ETNA',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 9
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].mtb,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   1500, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   9, // weight
  //   604800, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     9,
  //     'MTB Bronze Vault',
  //     'MTB',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 10
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].mtb,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   3500, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   10, // weight
  //   2592000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     10,
  //     'MTB Silver Vault',
  //     'MTB',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);
  //
  // // deposit profile 11
  // d.tx = await d.staking.connect(d.owner).addDepositProfile(
  //   d.addresses[d.networkName].mtb,
  //   d.addresses[d.networkName].mtb,
  //   1, // type
  //   6000, // apr
  //   0, // withdrawYieldTax
  //   0, // downgradeTax,
  //   11, // weight
  //   15552000, // lockTime
  //   d.options
  // );
  // await d.tx.wait(3);
  //
  // d.tx = await d.staking.connect(d.owner)
  //   .setDepositProfileData(
  //     11,
  //     'MTB Gold Vault',
  //     'MTB',
  //     'MTB',
  //     '',
  //     true,
  //     d.options
  //   );
  // await d.tx.wait(3);

  // deposit profile 12
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb,
    d.addresses[d.networkName].mtb,
    1, // type
    8000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    12, // weight
    31536000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
    .setDepositProfileData(
      12,
      'MTB Platinum Vault',
      'MTB',
      'MTB',
      '',
      true,
      d.options
    );
  await d.tx.wait(3);

  // deposit profile 13
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb,
    d.addresses[d.networkName].etna,
    1, // type
    500, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    13, // weight
    604800, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
    .setDepositProfileData(
      13,
      'MTB Bronze Vault',
      'MTB',
      'ETNA',
      '',
      true,
      d.options
    );
  await d.tx.wait(3);

  // deposit profile 14
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb,
    d.addresses[d.networkName].etna,
    1, // type
    2000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    14, // weight
    2592000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
    .setDepositProfileData(
      14,
      'MTB Silver Vault',
      'MTB',
      'ETNA',
      '',
      true,
      d.options
    );
  await d.tx.wait(3);

  // deposit profile 15
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb,
    d.addresses[d.networkName].etna,
    1, // type
    4000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    15, // weight
    15552000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
    .setDepositProfileData(
      15,
      'MTB Gold Vault',
      'MTB',
      'ETNA',
      '',
      true,
      d.options
    );
  await d.tx.wait(3);

  // deposit profile 16
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb,
    d.addresses[d.networkName].etna,
    1, // type
    6000, // apr
    0, // withdrawYieldTax
    0, // downgradeTax,
    16, // weight
    31536000, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
    .setDepositProfileData(
      16,
      'MTB Platinum Vault',
      'MTB',
      'ETNA',
      '',
      true,
      d.options
    );
  await d.tx.wait(3);

  // deposit profile 17
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].etna_native,
    d.addresses[d.networkName].etna,
    2, // type
    10000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    17, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    17,
    d.names[d.networkName].etna_native,
    'ETNA',
    'ETNA',
    d.links[d.networkName].etna_native,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 18
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].etna_usd,
    d.addresses[d.networkName].etna,
    2, // type
    10000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    18, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    18,
    d.names[d.networkName].etna_usd,
    'ETNA',
    'ETNA',
    d.links[d.networkName].etna_usd,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 19
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].etna_native,
    d.addresses[d.networkName].mtb,
    2, // type
    25000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    19, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    19,
    d.names[d.networkName].etna_native,
    'ETNA',
    'MTB',
    d.links[d.networkName].etna_native,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 20
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].etna_usd,
    d.addresses[d.networkName].mtb,
    2, // type
    25000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    20, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    20,
    d.names[d.networkName].etna_usd,
    'ETNA',
    'MTB',
    d.links[d.networkName].etna_usd,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 21
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb_native,
    d.addresses[d.networkName].mtb,
    2, // type
    25000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    21, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    21,
    d.names[d.networkName].mtb_native,
    'MTB',
    'MTB',
    d.links[d.networkName].mtb_native,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 22
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].mtb_usd,
    d.addresses[d.networkName].mtb,
    2, // type
    25000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    22, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    22,
    d.names[d.networkName].mtb_usd,
    'MTB',
    'MTB',
    d.links[d.networkName].mtb_usd,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 23
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].etna_mtb,
    d.addresses[d.networkName].mtb,
    2, // type
    25000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    23, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    23,
    d.names[d.networkName].etna_mtb,
    'ETNA',
    'MTB',
    d.links[d.networkName].etna_mtb,
    true,
    d.options
  );
  await d.tx.wait(3);

  // deposit profile 24
  d.tx = await d.staking.connect(d.owner).addDepositProfile(
    d.addresses[d.networkName].etna_mtb,
    d.addresses[d.networkName].etna,
    2, // type
    10000, // apr
    2000, // withdrawYieldTax
    0, // downgradeTax,
    24, // weight
    259200, // lockTime
    d.options
  );
  await d.tx.wait(3);

  d.tx = await d.staking.connect(d.owner)
  .setDepositProfileData(
    24,
    d.names[d.networkName].etna_mtb,
    'ETNA',
    'ETNA',
    d.links[d.networkName].etna_mtb,
    true,
    d.options
  );
  await d.tx.wait(3);

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