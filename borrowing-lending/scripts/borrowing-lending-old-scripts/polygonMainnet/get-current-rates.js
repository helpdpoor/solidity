// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const RATES = '0xD2C2bd609045d750539DBB8a87D76d3F4CAE6494';
  const NEW_PROXY = '0x6Da88dCE0AD9F850d4F1b5C147815c492E7A6dED';

  const Rates = await ethers.getContractFactory("Rates");
  const ProxyOld = await ethers.getContractFactory("ProxyOld");
  const ratesContract = await Rates.attach(RATES);
  const newProxyContract = await ProxyOld.attach(NEW_PROXY);

  const contracts = {
    NATIVE: '0x0000000000000000000000000000000000000000',
    ETNA: '0x015C425f6dfabC31E1464cC4339954339f096061',
    NETNA: '0xecBB155027262635ccE355a4F13e9643F8A37Df4',
    MTB: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    QUICK: '0x831753DD7087CaC61aB5644b308642cc1c33Dc13',
  };

  for (let id in contracts) {
    const rate1 = ethers.utils.formatUnits(await ratesContract['getUsdRate(address)'](contracts[id]), 0);
    const rate2 = ethers.utils.formatUnits(await newProxyContract.getUsdRate(contracts[id]), 0);
    console.log(id, rate1);
    console.log(id, rate2);
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