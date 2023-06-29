// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const deployedContracts = {
    BL: '0x86358e0ac8BA5B164709AE28Cdc47494A8d55d09',
    COLLATERAL: '0x34ccAB89934927d36A8204dB3B92Fac1Ebd97FE6',
    NFT_COLLATERAL: '0x481DF3892c4100C63880e558390d7fF02fb02A82',
    REWARD: '0x82A32eb7f8A0df744d2AAf1392F0B30da38eFd32',
  };

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach('0x11a6c3A798Db2d9Fa677124ea3946f9f775DA797');

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const blContract = await BorrowingLending.attach(deployedContracts.BL);

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.attach(deployedContracts.COLLATERAL);

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const rewardContract = await RewardPerBlock.attach(deployedContracts.REWARD);

  await collateralContract
    .setProxyContract(
      proxyContract.address
    );
  await blContract
    .setProxyContract(
      proxyContract.address
    );
  await rewardContract
    .setProxyContract(
      proxyContract.address
    );

  console.log('Update completed');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });