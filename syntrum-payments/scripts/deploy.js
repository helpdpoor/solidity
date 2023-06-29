// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require("path");
const network = hre.network.name;
const now = Math.round(Date.now() / 1000);
const jsonPath = path.join(__dirname, `../deployed-contracts/${network}.json`);
const deployedContracts = require(jsonPath);

async function main() {
  const networks = {
    goerli: {
      owner: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      manager: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      signer: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      rates: '0xA146a0bED1774b46a9832560a236079bB3D8C412',
      receiver: '0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9',
      usdt: '0x8AC88EAfB0d324C1C2E2bA5E740b8bbfaCf7D39A',
      usdc: '0x8162bfb22276b307C21343bEd181Cd15778151B9',
    }
  };
  if (!networks[network]) throw new Error(`Invalid network name - ${network}`);

  const Payments = await ethers.getContractFactory("Payments");
  const payments = await Payments.deploy(
    networks[network].owner,
    networks[network].manager,
    networks[network].signer,
    networks[network].rates,
    networks[network].receiver
  );
  await payments.deployed();

  if (!(deployedContracts.payments)) deployedContracts.payments = {
    latest: '',
    all: [],
  };
  deployedContracts.payments.latest = payments.address;
  deployedContracts.payments.all.push({
    address: payments.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Payments contract address: ${payments.address}`);

  await payments.addPaymentProfile(
    networks[network].usdt,
    0,
    1,
    'USDT',
    'USDT'
  );

  await payments.addPaymentProfile(
    networks[network].usdc,
    0,
    2,
    'USDC',
    'USDC'
  );
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
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
