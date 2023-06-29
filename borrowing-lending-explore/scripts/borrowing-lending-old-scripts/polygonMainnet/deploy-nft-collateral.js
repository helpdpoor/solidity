// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const NFT = '0x1afc77170C1aadfF375e9e32D95C99C4d787aBe2';
  const MARKETPLACE = '0xE098E7C3C2Cd9bfbC9fcc4F3eD32bD5420f557f6';

  const deployedContracts = {
    COLLATERAL: '0x5E57b7f620f24879A11d8a1A2f17c0DD22997975',
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
    7 // NETNA collateral profile index
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