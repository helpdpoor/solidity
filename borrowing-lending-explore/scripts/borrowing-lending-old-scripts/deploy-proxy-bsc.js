// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const ZERO = '0x0000000000000000000000000000000000000000';
  const LP_ETNA_BNB = {
    address: '0xA2FACc7286E621C63a81a817Dba57a3c4dcC5ff2',
    _reserve0: 5942896.0354738266,
    _reserve1: 951.5992502982,
    total: 54659.0534219587,
  }
  const LP_ETNA_BUSD = {
    address: '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC',
    _reserve0: 683075.1217108559,
    _reserve1: 45038.8065613038,
    total: 160425.9985512401,
  }
  const LP_MTB_BNB = {
    address: '0xd4B9b39a8F76a7CaF66924f6000a506BdAbAdE70',
    _reserve0: 114516486.2850461169,
    _reserve1: 8.1421779673,
    total: 30205.1326706929,
  }
  const LP_MTB_BUSD = {
    address: '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd',
    _reserve0: 1521737928.8756150961,
    _reserve1: 45465.2314603326,
    total: 8278166.5898710912,
  }
  const LP_ETNA_MTB = {
    address: '0x8A9E5f9960019ED33BE3f7FD7EeF9AC2838e723e',
    _reserve0: 220294748.4196890962,
    _reserve1: 100423.6380531431,
    total: 4694269.9733429322,
  }

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach('0x5ce01499fCd6f44BA29eCed025D914c8EF1EaF60');
  let tx;

  // const proxyContract = await Proxy.deploy(
  //   OWNER
  // );
  // await proxyContract.deployed();
  // console.log(`Proxy contract address: ${proxyContract.address}`);

  // tx = await proxyContract
  //   .setUsdRateData(
  //     LP_ETNA_BNB.address, // contract address
  //     ZERO, // external contract placeholder
  //     LP_ETNA_BUSD.address, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     1, // rate type
  //     true // reversed order of results LP getReserves function
  //   );
  //   await tx.wait();

  // tx = await proxyContract
  //   .setUsdRateData(
  //     LP_ETNA_BUSD.address, // contract address
  //     ZERO, // external contract placeholder
  //     LP_ETNA_BUSD.address, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     1, // rate type
  //     true // reversed order of results LP getReserves function
  //   );
  // await tx.wait();

  // tx = await proxyContract
  //   .setUsdRateData(
  //     LP_MTB_BNB.address, // contract address
  //     ZERO, // external contract placeholder
  //     LP_MTB_BUSD.address, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     1, // rate type
  //     true // reversed order of results LP getReserves function
  //   );
  // await tx.wait();

  // tx = await proxyContract
  //   .setUsdRateData(
  //     LP_MTB_BUSD.address, // contract address
  //     ZERO, // external contract placeholder
  //     LP_MTB_BUSD.address, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     1, // rate type
  //     true // reversed order of results LP getReserves function
  //   );
  // await tx.wait();

  // tx = await proxyContract
  //   .setUsdRateData(
  //     LP_ETNA_MTB.address, // contract address
  //     ZERO, // external contract placeholder
  //     LP_MTB_BUSD.address, // LP contract for rate getting
  //     0, // rate if set manually (both external and lp should be zero)
  //     1, // rate type
  //     true // reversed order of results LP getReserves function
  //   );
  // await tx.wait();

  console.log(ethers.utils.formatUnits(
    await proxyContract.getUsdRate(LP_ETNA_MTB.address)
  ));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
