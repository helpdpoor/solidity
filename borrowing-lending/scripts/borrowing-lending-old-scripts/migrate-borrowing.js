// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const ETNA = '0x2D55E8637851D9106993439Eb9c8C6dB37525f2F';
  const MTB = '0x97741c2881ceb3e732665D422bEa621085f49825';
  const ETNA_BUSD = '0x458d4F8Eee678599F2Eafe1E3db6Aafa72B2a815';
  const BNB_BUSD = '0xf9C04582d8359Bbb3fe56C19E7F05EA92d2629ae';
  const MTB_BUSD = '0x6d5f5DBef48E1202380A16588D07C8CbBFf0876c';
  const PROXY = '0x1F66869D7111FC52558d202677b31A391D9f4f31';
  const BL = '0x74Dee8a25EdFEDa1F83418102Cc4A338c470A98f';
  const COLLATERAL = '0x5c41097A73Fd35e182e3B2F5713b45acdEb62263';
  const NFT_COLLATERAL = '0x62DDdF00e733dfd75c58C21a139007B28E170DD8';
  const REWARD = '0x06Cb02FEE4d9339c8833B52809844fB1bD2Ad0B1';

  const OLD_BL = '0x02030B2585005D900E4760599cA33692233e735a';
  const OLD_COLLATERAL = '0x800d322336d0d3a3548A90DE9ebE8929a1C0Cb80';
  const OLD_NFT_COLLATERAL = '0xaF6D794c516b179ACc779af2206df2978baA6292';
  const OLD_REWARD = '0xe34C5B5507b790F2C1b8af149fC80f0Dd166fFcA';

  const LP = await ethers.getContractFactory("LPToken");
  const lpEtnaBusdContract = await LP.attach(
    ETNA_BUSD
  );
  const lpBnbBusdContract = await LP.attach(
    BNB_BUSD
  );
  const lpMtbBusdContract = await LP.attach(
    MTB_BUSD
  );

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach(
    PROXY
  );

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const oldBlContract = await BorrowingLending.attach(
    OLD_BL
  );
  const blContract = await BorrowingLending.attach(
    BL
  );

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const oldCollateralContract = await Collateral.attach(
    OLD_COLLATERAL
  );
  const collateralContract = await Collateral.attach(
    COLLATERAL
  );

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const oldNftCollateralContract = await NftCollateral.attach(
    OLD_NFT_COLLATERAL
  );
  const nftCollateralContract = await NftCollateral.attach(
    NFT_COLLATERAL
  );

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const old_rewardContract = await RewardPerBlock.attach(
    OLD_REWARD
  );
  const rewardContract = await RewardPerBlock.attach(
    REWARD
  );

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
      profileId: Number(borrowing.borrowingProfileIndex),
      amount: Number(ethers.utils.formatUnits(borrowing.amount)),
      fee: Number(ethers.utils.formatUnits(fee)),
      fixedApr: Number(borrowingMarketIndex.fixedApr),
      liquidated: borrowing.liquidated ? 1 : 0
    }
    migrate.addresses.push(data.address);
    migrate.data[1].push(data.profileId);
    migrate.data[2].push(ethers.utils.parseUnits(data.amount.toFixed(10)));
    migrate.data[3].push(ethers.utils.parseUnits(data.fee.toFixed(10)));
    migrate.data[4].push(data.fixedApr);
    migrate.data[5].push(data.liquidated);
  }
  migrate.numbers = migrate.data[1]
    .concat(migrate.data[2])
    .concat(migrate.data[3])
    .concat(migrate.data[4])
    .concat(migrate.data[5]);
  await blContract.migrateBorrowings(migrate.addresses, migrate.numbers);

  console.log(await oldBlContract.getBorrowing(4));
  console.log(await blContract.getBorrowing(4));

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
      profileId: Number(lending.borrowingProfileIndex),
      amount: Number(ethers.utils.formatUnits(lending.amount)),
      fee: Number(ethers.utils.formatUnits(fee)),
      unlock: Number(lending.unlock),
    }
    migrate.addresses.push(data.address);
    migrate.data[1].push(data.profileId);
    migrate.data[2].push(ethers.utils.parseUnits(data.amount.toFixed(10)));
    migrate.data[3].push(ethers.utils.parseUnits(data.fee.toFixed(10)));
    migrate.data[4].push(data.unlock);
  }
  migrate.numbers = migrate.data[1]
    .concat(migrate.data[2])
    .concat(migrate.data[3])
    .concat(migrate.data[4]);
  await blContract.migrateLendings(migrate.addresses, migrate.numbers);

  console.log(await oldBlContract.getLending(4));
  console.log(await blContract.getLending(4));

  // const addresses = [];
  // for (let i = 1; i <= lendingsNumber; i ++) {
  //   const lending = await blContract.getLending(i);
  //   addresses.push(lending.userAddress);
  // }
  //
  // await rewardContract.setProfilesTotalLent();
  // await rewardContract.setUserProfilesLent(addresses);

  await rewardContract.setProxyContract(PROXY);
  await rewardContract.setBorrowingContract(BL);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
