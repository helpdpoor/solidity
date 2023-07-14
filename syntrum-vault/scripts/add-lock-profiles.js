// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const axios = require('axios');
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const d = {};
d.networkName = hre.network.name;
d.options = {};
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);

async function main() {
  const gasPrice = Number(await getGasPrice());
  if (d.networkName === 'polygonMainnet') {
    d.options.gasPrice = gasPrice > 50000000000 ? gasPrice : 50000000000;
    d.options.gasLimit = 5000000;
  }
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const now = Math.round(Date.now() / 1000);
  const deployedContracts = require(jsonPath);

  d.SyntrumVault = await ethers.getContractFactory("SyntrumVault");
  d.syntrumVault = await d.SyntrumVault.attach(deployedContracts.syntrumVault.latest);

  await d.syntrumVault.addLockProfile(
    '0xF2b65Fd32ca4B5EC5595ee97a833eb6bAd9e0C89',
    ethers.utils.parseUnits('100'),
    ethers.utils.parseUnits('50')
  );

  await d.syntrumVault.addLockProfile(
    '0x28525d136EAd6cd2f6810e3cD02CD4c7231A2951',
    ethers.utils.parseUnits('150'),
    ethers.utils.parseUnits('75')
  );

  await d.syntrumVault.setFavoriteToken(
    '0xF2b65Fd32ca4B5EC5595ee97a833eb6bAd9e0C89',
    true
  );

  await d.syntrumVault.setFavoriteToken(
    '0x28525d136EAd6cd2f6810e3cD02CD4c7231A2951',
    true
  );

  console.log(`Lock profiles added`);
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });