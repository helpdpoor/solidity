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
  const LP_ETNA_MATIC = {
    address: '0x116829711e57d77116a19e5cDc26B00DBDC05e14',
    _reserve0: 19251276161499111299415,
    _reserve1: 876470982716275922389,
    total: 4026077684889793266405,
  }
  const LP_ETNA_USDC = {
    address: '0xfc2234eFF1ACe573915924fa6d12e5821635f111',
    _reserve0: 19473930672052389154737,
    _reserve1: 1265265039,
    total: 4864818445303033,
  }
  const LP_MTB_MATIC = {
    address: '0xeBc33810C0F4261abb8D9e0fD39cd7d4f83eBC62',
    _reserve0: 57744415117558764273,
    _reserve1: 2772329106725979152772027,
    total: 12597563067373226486315,
  }
  const LP_MTB_USDC = {
    address: '0x15F9EAC81721bb4Da5D516D3CbA393932e163017',
    _reserve0: 10221877453,
    _reserve1: 340826461122257550043258189,
    total: 1862279394443294821,
  }
  const LP_ETNA_MTB = {
    address: '0x5a961D15438a5Efb7d832a6BbC4509c3819FfDEa',
    _reserve0: 62899218591621177018354,
    _reserve1: 136368479393028225394247522,
    total: 2924277821834495435414622,
  }

  const Proxy = await ethers.getContractFactory("Proxy");
  // const proxyContract = await Proxy.attach('0x5ce01499fCd6f44BA29eCed025D914c8EF1EaF60');
  let tx;

  const proxyContract = await Proxy.deploy(
    OWNER
  );
  await proxyContract.deployed();
  console.log(`Proxy contract address: ${proxyContract.address}`);

  tx = await proxyContract
    .setUsdRateData(
      LP_ETNA_MATIC.address, // contract address
      ZERO, // external contract placeholder
      LP_ETNA_USDC.address, // LP contract for rate getting
      0, // rate if set manually (both external and lp should be zero)
      1, // rate type
      true // reversed order of results LP getReserves function
    );
    await tx.wait();
  console.log('LP_ETNA_MATIC', ethers.utils.formatUnits(
    await proxyContract.getUsdRate(LP_ETNA_MATIC.address)
  ));

  tx = await proxyContract
    .setUsdRateData(
      LP_ETNA_USDC.address, // contract address
      ZERO, // external contract placeholder
      LP_ETNA_USDC.address, // LP contract for rate getting
      0, // rate if set manually (both external and lp should be zero)
      1, // rate type
      true // reversed order of results LP getReserves function
    );
  await tx.wait();
  console.log('LP_ETNA_USDC', ethers.utils.formatUnits(
    await proxyContract.getUsdRate(LP_ETNA_USDC.address)
  ));

  tx = await proxyContract
    .setUsdRateData(
      LP_MTB_MATIC.address, // contract address
      ZERO, // external contract placeholder
      LP_MTB_USDC.address, // LP contract for rate getting
      0, // rate if set manually (both external and lp should be zero)
      1, // rate type
      true // reversed order of results LP getReserves function
    );
  await tx.wait();
  console.log('LP_MTB_MATIC', ethers.utils.formatUnits(
    await proxyContract.getUsdRate(LP_MTB_MATIC.address)
  ));

  tx = await proxyContract
    .setUsdRateData(
      LP_MTB_USDC.address, // contract address
      ZERO, // external contract placeholder
      LP_MTB_USDC.address, // LP contract for rate getting
      0, // rate if set manually (both external and lp should be zero)
      1, // rate type
      true // reversed order of results LP getReserves function
    );
  await tx.wait();
  console.log('LP_MTB_USDC', ethers.utils.formatUnits(
    await proxyContract.getUsdRate(LP_MTB_USDC.address)
  ));

  tx = await proxyContract
    .setUsdRateData(
      LP_ETNA_MTB.address, // contract address
      ZERO, // external contract placeholder
      LP_MTB_USDC.address, // LP contract for rate getting
      0, // rate if set manually (both external and lp should be zero)
      1, // rate type
      true // reversed order of results LP getReserves function
    );
  await tx.wait();

  console.log('LP_ETNA_MTB', ethers.utils.formatUnits(
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
