// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const NFT = '0x0186F8cDFe676D4Ca5EDc6f3aE4400Ca269f0F3a';
  const MARKETPLACE = '0x0f6296c3f3FCd5931dD542Dcd1f4EEAf6eEe4DD9';

  const CyclopsTokens = await ethers.getContractFactory("CyclopsTokens");
  const nftContract = await CyclopsTokens.attach(NFT);
  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplaceContract = await Marketplace.attach(MARKETPLACE);
  const addresses = [
    '0xB67c21C44fBD66AcA78e93F843d8bde98Af73762',
    '0x3664f86Bb3113089A5cFcB563E185921c5736d4c'
  ];

  let lastTokenId = Number(await nftContract.totalSupply());
  console.log(lastTokenId);
  for (const address of addresses) {
    lastTokenId ++;
    let tx = await marketplaceContract.adminMint(
      1,
      address,
      lastTokenId
    );
    console.log(tx.hash);
    await tx.wait();
    lastTokenId ++;
    tx = await marketplaceContract.adminMint(
      2,
      address,
      lastTokenId
    );
    console.log(tx.hash);
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
