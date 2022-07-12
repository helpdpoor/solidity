// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
  const USDT = '0x55d398326f99059fF775485246999027B3197955';
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const ZERO = '0x0000000000000000000000000000000000000000';
  const ETNA = '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46';
  const NETNA = '0x279020017E7aa4cD7E35273CcF3DB2223475d7B3';
  const MTB = '0x36C618F869050106e1F64d777395baF7d56A9Ead';
  const BTCB = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c';
  const ETH = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8';
  const CAKE = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
  const OxPAD = '0x94733910a43D412DDaD505a8772839AA77aC1b6d';
  const NFT = '0x83C454FF387cebbC3CbAa5a7a44F412F4FA63c0E';
  const MARKETPLACE = '0x9cFFF32674745b4738306E87cCb14de18eABC6a7';
  const BL = '0x86358e0ac8BA5B164709AE28Cdc47494A8d55d09';
  const COLLATERAL = '0x34ccAB89934927d36A8204dB3B92Fac1Ebd97FE6';
  const PROXY = '0x005Aeaf1e1360186Be9f6152613250bB1EdCEAfb';
  const NFT_COLLATERAL = '0x481DF3892c4100C63880e558390d7fF02fb02A82';
  const REWARD = '0x82A32eb7f8A0df744d2AAf1392F0B30da38eFd32';

  const OLD_BL = '0xBF22B12DaC492D833cE3bF2Bb3199C62BED1be0c';
  const OLD_COLLATERAL = '0x800d322336d0d3a3548A90DE9ebE8929a1C0Cb80';
  const OLD_NFT_COLLATERAL = '0xaF6D794c516b179ACc779af2206df2978baA6292';
  const OLD_REWARD = '0xe34C5B5507b790F2C1b8af149fC80f0Dd166fFcA';

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

  // const migrate = {
  //   data: {
  //     1: [],
  //     2: [],
  //     3: [],
  //     4: [],
  //     5: [],
  //   },
  //   addresses: [],
  //   numbers: [],
  // };
  //
  // const borrowingsNumber = Number(await oldBlContract.getBorrowingsNumber());
  // for (let i = 1; i <= borrowingsNumber; i ++) {
  //   const borrowing = await oldBlContract.getBorrowing(i);
  //   const borrowingMarketIndex = await oldBlContract.getBorrowingMarketIndex(i);
  //   const fee = await oldBlContract.getBorrowingFee(i, true);
  //   const data = {
  //     address: borrowing.userAddress,
  //     profileId: Number(borrowing.borrowingProfileIndex),
  //     amount: Number(ethers.utils.formatUnits(borrowing.amount)),
  //     fee: Number(ethers.utils.formatUnits(fee)),
  //     fixedApr: Number(borrowingMarketIndex.fixedApr),
  //     liquidated: borrowing.liquidated ? 1 : 0
  //   }
  //   migrate.addresses.push(data.address);
  //   migrate.data[1].push(data.profileId);
  //   migrate.data[2].push(ethers.utils.parseUnits(data.amount.toFixed(10)));
  //   migrate.data[3].push(ethers.utils.parseUnits(data.fee.toFixed(10)));
  //   migrate.data[4].push(data.fixedApr);
  //   migrate.data[5].push(data.liquidated);
  // }
  // migrate.numbers = migrate.data[1]
  //   .concat(migrate.data[2])
  //   .concat(migrate.data[3])
  //   .concat(migrate.data[4])
  //   .concat(migrate.data[5]);
  // await blContract.migrateBorrowings(migrate.addresses, migrate.numbers);
  //
  // console.log(await oldBlContract.getBorrowing(1));
  // console.log(await blContract.getBorrowing(1));
  //
  // migrate.addresses = [];
  // migrate.numbers = [];
  // migrate.data = {
  //   1: [],
  //   2: [],
  //   3: [],
  //   4: [],
  //   5: [],
  // };
  const lendingsNumber = Number(await oldBlContract.getLendingsNumber());
  // for (let i = 1; i <= lendingsNumber; i ++) {
  //   const lending = await oldBlContract.getLending(i);
  //   const fee = await oldBlContract.getLendingYield(i, true);
  //   const data = {
  //     address: lending.userAddress,
  //     profileId: Number(lending.borrowingProfileIndex),
  //     amount: Number(ethers.utils.formatUnits(lending.amount)),
  //     fee: Number(ethers.utils.formatUnits(fee)),
  //     unlock: Number(lending.unlock),
  //   }
  //   migrate.addresses.push(data.address);
  //   migrate.data[1].push(data.profileId);
  //   migrate.data[2].push(ethers.utils.parseUnits(data.amount.toFixed(10)));
  //   migrate.data[3].push(ethers.utils.parseUnits(data.fee.toFixed(10)));
  //   migrate.data[4].push(data.unlock);
  // }
  // migrate.numbers = migrate.data[1]
  //   .concat(migrate.data[2])
  //   .concat(migrate.data[3])
  //   .concat(migrate.data[4]);
  // await blContract.migrateLendings(migrate.addresses, migrate.numbers);
  //
  // console.log(await oldBlContract.getLending(1));
  // console.log(await blContract.getLending(1));
  //
  // const addresses = [];
  // for (let i = 1; i <= lendingsNumber; i ++) {
  //   const lending = await blContract.getLending(i);
  //   addresses.push(lending.userAddress);
  // }
  //
  // await rewardContract.setProfilesTotalLent();
  // await rewardContract.setUserProfilesLent(addresses);

  const ERC20 = await ethers.getContractFactory("BEP20Token");
  const busdContract = await ERC20.attach(
    BUSD
  );
  const usdtContract = await ERC20.attach(
    USDT
  );
  const etnaContract = await ERC20.attach(
    ETNA
  );

  let balance;
  balance = await busdContract.balanceOf(OLD_BL);
  console.log('BUSD', Number(balance));
  if (Number(balance) > 0) {
    const tx = await oldBlContract.adminWithdraw(
      BUSD,
      balance
    );
    await tx.wait();
    await busdContract.transfer(blContract.address, balance);
  }

  balance = await usdtContract.balanceOf(OLD_BL);
  console.log('USDT', Number(balance));
  if (Number(balance) > 0) {
    const tx = await oldBlContract.adminWithdraw(
      USDT,
      balance
    );
    await tx.wait();
    await usdtContract.transfer(blContract.address, balance);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
