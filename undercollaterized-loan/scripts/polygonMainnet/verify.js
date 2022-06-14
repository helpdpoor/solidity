const {ethers} = require("hardhat");

async function main() {
  const contractAddress = '0x0fBc945045BeA6ac16EE6C50E0625ad502826707';
  const d = {};
  d.addresses = {
    owner: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    etna: '0x015C425f6dfabC31E1464cC4339954339f096061',
    mtb: '0x5eE0fE440a4cA7F41bCF06b20c2A30a404E21069',
    borrowingLending: '0xD7baC58d0555215c5F05f166D39CBf706C988343',
    staking: '0x579a0aEDBDBc75c1227997489B0e037EA67bF49D'
  }
  d.borrowingFee = 1000;
  d.minimalStake = 10000;
  d.negativeFactor = 6000;
  d.borrowingPowerData = [
    15000, 20000, 25000, 30000, 40000, 50000
  ];
  d.neverLate = 10000000000;
  d.ABI = [
    "function initialize(address newOwner, address borrowingLendingAddress, address borrowingPowerAddress, address baaBeaconAddress, uint256 borrowingFee)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.addresses.owner,
    d.addresses.borrowingLending,
    '0x5793F0C7750F5FaF9bd05381886A3ff0274D76b1',
    '0x3Dcf962488589447c974F980314Fbe6D0F4FD69e',
    d.borrowingFee
  ]);

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });