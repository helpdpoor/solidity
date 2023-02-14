// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const path = require("path");
const networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${networkName}.json`);
const deployedContracts = require(jsonPath);
async function main() {
  const networks = {
    goerli: {
      owner: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      manager: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      signer: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      syntrum: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      amount: 10,
    }
  };

  await hre.run("verify:verify", {
    address: deployedContracts.syntrumAirdrop.latest,
    constructorArguments: [
      networks[networkName].owner,
      networks[networkName].manager,
      networks[networkName].signer,
      networks[networkName].syntrum,
      ethers.utils.parseUnits(networks[networkName].amount.toString())
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
