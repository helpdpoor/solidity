require("@nomiclabs/hardhat-waffle");
require("@atixlabs/hardhat-time-n-mine");
require("hardhat-tracer");
require('hardhat-contract-sizer');
// require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");

const { deployer, ratesDeployer, scanApiKeys } = require('./secrets.json');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: [`${deployer.privateKey}`, `${ratesDeployer.privateKey}`]
    },
    bscMainnet: {
      url: 'https://proud-patient-forest.bsc.quiknode.pro/8fffb4d84f42ec02686c35631b566c819138e876/',
      accounts: [`${deployer.privateKey}`, `${ratesDeployer.privateKey}`]
    },
    polygonMainnet: {
      url: 'https://polygon-mainnet.infura.io/v3/02cf60eb2f654099b29d89b28f7fb3f9',
      accounts: [`${deployer.privateKey}`, `${ratesDeployer.privateKey}`]
    },
    kovan: {
      url: 'https://kovan.infura.io/v3/a8192b3af98c4fa7b02136e60c754897',
      accounts: [`${deployer.privateKey}`, `${ratesDeployer.privateKey}`]
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/a8192b3af98c4fa7b02136e60c754897',
      accounts: [`${deployer.privateKey}`, `${ratesDeployer.privateKey}`]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: scanApiKeys,
  },
  mocha: {
    timeout: 100000000
  },
};
