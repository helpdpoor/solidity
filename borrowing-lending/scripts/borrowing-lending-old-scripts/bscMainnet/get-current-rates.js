// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const ETNA_BUSD = '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC';
  const BNB_BUSD = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16';
  const MTB_BUSD = '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd';
  const BTCB_BUSD = '0xF45cd219aEF8618A92BAa7aD848364a158a24F33';
  const ETH_BUSD = '0xEa26B78255Df2bBC31C1eBf60010D78670185bD0';
  const CAKE_BUSD = '0x804678fa97d91B974ec2af3c843270886528a9E6';
  const OxPAD_BUSD = '0xEEd9d7D32BC8218025f263e85eA60d33c8dbAf09';

  const PROXY = '0x005Aeaf1e1360186Be9f6152613250bB1EdCEAfb';
  const NEW_PROXY = '0x11a6c3A798Db2d9Fa677124ea3946f9f775DA797';

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach(PROXY);
  const newProxyContract = await Proxy.attach(NEW_PROXY);

  const contracts = {
    NATIVE: '0x0000000000000000000000000000000000000000',
    ETNA: '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46',
    MTB: '0x36C618F869050106e1F64d777395baF7d56A9Ead',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    OxPAD: '0x94733910a43D412DDaD505a8772839AA77aC1b6d',
  };

  for (let id in contracts) {
    const rate1 = ethers.utils.formatUnits(await proxyContract.getUsdRate(contracts[id]), 0);
    const rate2 = ethers.utils.formatUnits(await proxyContract.getUsdRate(contracts[id]), 0);
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