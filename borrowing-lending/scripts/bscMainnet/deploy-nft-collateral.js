// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const NFT = '0x83C454FF387cebbC3CbAa5a7a44F412F4FA63c0E';
  const MARKETPLACE = '0x9cFFF32674745b4738306E87cCb14de18eABC6a7';

  const deployedContracts = {
    COLLATERAL: '0x34ccAB89934927d36A8204dB3B92Fac1Ebd97FE6',
    NFT_COLLATERAL: '',
  };

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const collateralContract = await Collateral.attach(deployedContracts.COLLATERAL);

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const nftCollateralContract = await NftCollateral.deploy(
    MARKETPLACE,
    NFT,
    collateralContract.address,
    OWNER,
    8 // NETNA collateral profile index
  );
  await nftCollateralContract.deployed();
  console.log(`Nft Collateral contract address: ${nftCollateralContract.address}`);

  await collateralContract
    .setNftCollateralContract (
      nftCollateralContract.address
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });