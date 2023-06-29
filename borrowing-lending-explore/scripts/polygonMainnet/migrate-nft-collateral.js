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

async function main() {
  const OLD_NFT_COLLATERAL = '0xf0901863fB31B30AC652Bb39e61CDd0Ae562baB9';

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const oldNftCollateralContract = await NftCollateral.attach(
    OLD_NFT_COLLATERAL
  );
  const nftCollateralContract = await NftCollateral.attach(
    deployedContracts.nftCollateralProxy.latest
  );
  console.log(nftCollateralContract.address);

  const depositsNumber = Number(await oldNftCollateralContract.getDepositsNumber());
  for (let i = 1; i <= depositsNumber; i ++) {
    console.log('deposit number', i);
    const tokenIds = [];
    const prices = [];
    const deposit = await oldNftCollateralContract.getDeposit(i);
    const tokensNumber = Number(deposit.tokensNumber);
    const userAddress = deposit.userAddress;
    let totalAmount = 0;
    for (let j = 1; j <= tokensNumber; j ++) {
      const tokenId = Number(await oldNftCollateralContract.getUserTokenByIndex(userAddress, j));
      const tokenPrice = await oldNftCollateralContract.getLastTokenPrice(tokenId);
      totalAmount += tokenPrice;
      tokenIds.push(tokenId);
      prices.push(tokenPrice);
    }
    console.log(userAddress, tokenIds, prices);
    // const tx = await nftCollateralContract.migrateNftCollaterals(
    //   userAddress,
    //   tokenIds,
    //   prices
    // );
    // await tx.wait();
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