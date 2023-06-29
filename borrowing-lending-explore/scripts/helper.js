const {ethers} = require("hardhat");

async function main() {
  const wallet = ethers.Wallet.createRandom();
  console.log(wallet.address, wallet.privateKey);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });