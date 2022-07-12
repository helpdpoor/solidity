const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const BL = await ethers.getContractFactory("BorrowingLendingContract");
  const bl = await BL.attach('0x86358e0ac8BA5B164709AE28Cdc47494A8d55d09');
  const borrowingsNumber = Number(await bl.getBorrowingsNumber());
  console.log(borrowingsNumber);
  const borrowing = await bl.getBorrowing(7);
  console.log(borrowing);
  console.log(ethers.utils.formatUnits(borrowing.amount));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });