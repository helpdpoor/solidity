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
  const OLD_BL = '0xD7baC58d0555215c5F05f166D39CBf706C988343';

  const BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  const oldBlContract = await BorrowingLending.attach(
    OLD_BL
  );
  const blContract = await BorrowingLending.attach(
    deployedContracts.blProxy.latest
  );
  console.log(blContract.address);

  const migrate = {
    data: {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    },
    addresses: [],
    numbers: [],
  };

  const borrowingsNumber = Number(await oldBlContract.getBorrowingsNumber());
  for (let i = 1; i <= borrowingsNumber; i ++) {
    const borrowing = await oldBlContract.getBorrowing(i);
    const borrowingMarketIndex = await oldBlContract.getBorrowingMarketIndex(i);
    const fee = await oldBlContract.getBorrowingFee(i, true);
    const data = {
      address: borrowing.userAddress,
      profileId: borrowing.borrowingProfileIndex,
      amount: borrowing.amount,
      fee: fee,
      fixedApr: borrowingMarketIndex.fixedApr,
      liquidated: borrowing.liquidated ? 1 : 0
    }
    migrate.addresses.push(data.address);
    migrate.data[1].push(data.profileId);
    migrate.data[2].push(data.amount);
    migrate.data[3].push(data.fee);
    migrate.data[4].push(data.fixedApr);
    migrate.data[5].push(data.liquidated);
  }
  migrate.numbers = migrate.data[1]
    .concat(migrate.data[2])
    .concat(migrate.data[3])
    .concat(migrate.data[4])
    .concat(migrate.data[5]);
  console.log('borrowing', migrate.addresses, migrate.numbers);
  // await blContract.migrateBorrowings(migrate.addresses, migrate.numbers);
  //
  // console.log(await oldBlContract.getBorrowing(1));
  // console.log(await blContract.getBorrowing(1));

  migrate.addresses = [];
  migrate.numbers = [];
  migrate.data = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };
  const lendingsNumber = Number(await oldBlContract.getLendingsNumber());
  for (let i = 1; i <= lendingsNumber; i ++) {
    const lending = await oldBlContract.getLending(i);
    const fee = await oldBlContract.getLendingYield(i, true);
    const data = {
      address: lending.userAddress,
      profileId: lending.borrowingProfileIndex,
      amount: lending.amount,
      fee: fee,
      unlock: lending.unlock,
    }
    migrate.addresses.push(data.address);
    migrate.data[1].push(data.profileId);
    migrate.data[2].push(data.amount);
    migrate.data[3].push(data.fee);
    migrate.data[4].push(data.unlock);
  }
  migrate.numbers = migrate.data[1]
    .concat(migrate.data[2])
    .concat(migrate.data[3])
    .concat(migrate.data[4]);
  console.log('lending', migrate.addresses, migrate.numbers);
  // await blContract.migrateLendings(migrate.addresses, migrate.numbers);
  //
  // console.log(await oldBlContract.getLending(1));
  // console.log(await blContract.getLending(1));
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
