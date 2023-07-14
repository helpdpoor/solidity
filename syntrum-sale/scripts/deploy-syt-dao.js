// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const network = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${network}.json`);
const deployedContracts = require(jsonPath);

async function main() {
  const now = Math.round(Date.now() / 1000);
  const Owner = '0x8E63Cd2B67fd35413f761449Bcd9DeB070a72981';
  const signers = await ethers.getSigners();
  const sytDaoDeployer = signers[2];

  const SytDao = await ethers.getContractFactory("SytDao");
  const sytDao = await SytDao.connect(sytDaoDeployer).deploy(
    Owner,
    'Syntrum Founders DAO',
    'SYTDAO',
    ethers.utils.parseUnits('500000')
  );
  if (!(deployedContracts.sytDao)) deployedContracts.sytDao = {
    latest: '',
    all: [],
  };
  deployedContracts.sytDao.latest = sytDao.address;
  deployedContracts.sytDao.all.push({
    address: sytDao.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`SytDao token contract address: ${sytDao.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}
