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

  const deployedContracts = {
    NFT_COLLATERAL: '0xE6aabB6EAA8395503Ae37a267D418A64b01733bc',
  };

  // const tokenIds = [4435];
  const tokenIds = [4257,4097,4254,4262,4096,4146,4258,4274,4270,4141,4140,4255,4261,4260,4256,4272,4273,4259,4282,4278,4283,4279,4281,4280,4098,4355];

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const nftCollateralContract = await NftCollateral.attach(deployedContracts.NFT_COLLATERAL);

  const Nft = await ethers.getContractFactory("CyclopsTokens");
  const nftContract = await Nft.attach(NFT);
  for (const id of tokenIds) {
    await nftContract['safeTransferFrom(address,address,uint256)'](
      OWNER, deployedContracts.NFT_COLLATERAL, id
    );
    console.log(id)
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