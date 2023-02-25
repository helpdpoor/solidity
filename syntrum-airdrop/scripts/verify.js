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
      owner: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      manager: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      signer: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      token: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      amount: 10,
    },
    bscMainnet: {
      owner: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      manager: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      signer: '0xaE87c642AF526CE693b751ec55af47Eb543c0f3f',
      token: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      amount: 10,
    }
  };

  await hre.run("verify:verify", {
    address: deployedContracts.syntrumAirdrop.latest,
    constructorArguments: [
      networks[networkName].owner,
      networks[networkName].manager,
      networks[networkName].signer,
      networks[networkName].token,
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
