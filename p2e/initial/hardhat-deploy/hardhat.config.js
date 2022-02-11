require("@nomiclabs/hardhat-waffle");

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
        version: "0.8.0",
        // settings: {
        //   optimizer: {
        //     enabled: true,
        //     runs: 1000,
        //   },
        // },
      },
    ],
  },
  networks: {
    kovan: {
      url: `https://kovan.infura.io/v3/a8192b3af98c4fa7b02136e60c754897`,
      accounts: [`0xbbfee28197f9a8a858188f748eed0e5d9b4fb53f55c0736d3f10522fb65bada8`],
    },
    bsc_mainnet: {
      url: `https://proud-patient-forest.bsc.quiknode.pro/8fffb4d84f42ec02686c35631b566c819138e876/`,
      accounts: [`0xbbfee28197f9a8a858188f748eed0e5d9b4fb53f55c0736d3f10522fb65bada8`],
    }
  },
};
