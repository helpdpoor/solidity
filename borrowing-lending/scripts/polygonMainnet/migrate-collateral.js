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
const deployedContracts = require(jsonPath);
const d = {};

async function main() {
  const OLD_COLLATERAL = '0x5E57b7f620f24879A11d8a1A2f17c0DD22997975';

  const Collateral = await ethers.getContractFactory("Collateral");
  const oldCollateralContract = await Collateral.attach(
    OLD_COLLATERAL
  );
  const collateralContract = await Collateral.attach(
    deployedContracts.collateralProxy.latest
  );
  console.log(collateralContract.address);

  const migrate = {
    data: {
      1: [],
      2: [],
      3: [],
      4: [],
    },
    addresses: [],
    numbers: [],
  };

  const collateralsNumber = await oldCollateralContract.getCollateralsNumber();
  console.log(collateralsNumber);
  for (let i = 1; i <= collateralsNumber; i ++) {
    const collateral = await oldCollateralContract.getCollateral(i);
    const data = {
      address: collateral.userAddress,
      profileId: collateral.collateralProfileIndex,
      amount: collateral.amount,
      prevCollateral: collateral.prevCollateral,
      liquidated: collateral.liquidated ? 1 : 0
    }
    migrate.addresses.push(data.address);
    migrate.data[1].push(data.profileId);
    migrate.data[2].push(data.amount);
    migrate.data[3].push(data.prevCollateral);
    migrate.data[4].push(data.liquidated);
  }
  migrate.numbers = migrate.data[1]
    .concat(migrate.data[2])
    .concat(migrate.data[3])
    .concat(migrate.data[4]);
  console.log('collateral', migrate.addresses, migrate.numbers);
  // await collateralContract.migrateCollaterals(migrate.addresses, migrate.numbers);
  //
  // console.log(await oldCollateralContract.getCollateral(1));
  // console.log(await collateralContract.getCollateral(1));
  //
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
