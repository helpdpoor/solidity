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

  const deployedContracts = {
    NFT_COLLATERAL: '0x0e4580413c7BFcb433E36DAEbD64614b95935aD0',
  };

  // const tokenIds = [4380];
  // const tokenIds = [2000003,2002671,9216,3205,2122,2855,103,4824,9215,10904,10848,12678,10906,4870,4815,17103,12658,10905,11878,12195,6345,11761,12251,12272,12390,12355,12216,11756,11778,11782,12161,12373,11801,4149];
  const tokenIds = [4149];

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const nftCollateralContract = await NftCollateral.attach(deployedContracts.NFT_COLLATERAL);

  const Nft = await ethers.getContractFactory("CyclopsTokens");
  const nftContract = await Nft.attach(NFT);
  for (const id of tokenIds) {
    await nftContract['safeTransferFrom(address,address,uint256)'](
      OWNER, deployedContracts.NFT_COLLATERAL, id, {gasPrice: 80000000000}
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