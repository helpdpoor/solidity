require("@nomiclabs/hardhat-waffle");
require("@atixlabs/hardhat-time-n-mine");
require("hardhat-tracer");
// require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");
require("@cronos-labs/hardhat-cronoscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const { owner, manager, scanApiKeys } = require('./secrets.json');

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    goerli: {
      url: 'https://goerli.infura.io/v3/a722278d431a4cc1a7529963d2d66b25',
      accounts: [`${owner.privateKey}`,`${manager.privateKey}`]
    },
    ethereumMainnet: {
      url: 'https://mainnet.infura.io/v3/a722278d431a4cc1a7529963d2d66b25',
      accounts: [`${owner.privateKey}`,`${manager.privateKey}`]
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: [`${owner.privateKey}`, `${manager.privateKey}`]
    },
    bscMainnet: {
      url: 'https://proud-patient-forest.bsc.quiknode.pro/8fffb4d84f42ec02686c35631b566c819138e876/',
      accounts: [`${owner.privateKey}`,`${manager.privateKey}`]
    },
    polygonMainnet: {
      url: 'https://polygon-mainnet.infura.io/v3/a722278d431a4cc1a7529963d2d66b25',
      accounts: [`${owner.privateKey}`,`${manager.privateKey}`]
    },
    cronosMainnet: {
      url: 'https://evm.cronos.org/',
      accounts: [`${owner.privateKey}`,`${manager.privateKey}`]
    }
  },
  etherscan: {
    apiKey: scanApiKeys
  }
};
