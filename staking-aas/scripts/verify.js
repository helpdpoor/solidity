const {ethers} = require("hardhat");
const d = {};
d.name = 'Token';
d.symbol = 'TN';
d.decimals = 8;
d.totalSupply = 1000000;


async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  const contractAddress = '0x21d30E41277EbcC71DEB1FfA94448B4A0D61bd39';

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      d.owner.address,
      d.owner.address,
      2000,
      3,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });