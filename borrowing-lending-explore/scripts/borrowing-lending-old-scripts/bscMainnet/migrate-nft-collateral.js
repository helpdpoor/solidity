// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const deployedContracts = {
    OLD_NFT_COLLATERAL: '0x481DF3892c4100C63880e558390d7fF02fb02A82',
    NFT_COLLATERAL: '0xE6aabB6EAA8395503Ae37a267D418A64b01733bc',
  };

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const oldNftCollateralContract = await NftCollateral.attach(deployedContracts.OLD_NFT_COLLATERAL);
  const nftCollateralContract = await NftCollateral.attach(deployedContracts.NFT_COLLATERAL);

  const depositsNumber = Number(await oldNftCollateralContract.getDepositsNumber());
  for (let i = 1; i <= depositsNumber; i ++) {
    console.log('deposit number', i);
    const tokenIds = [];
    const prices = [];
    const deposit = await oldNftCollateralContract.getDeposit(i);
    const amount = Number(ethers.utils.formatUnits(deposit.amount));
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
    const tx = await nftCollateralContract.migrateNftCollaterals(
      userAddress,
      tokenIds,
      prices
    );
    await tx.wait();
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