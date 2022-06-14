const d = {};
d.addresses = {
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

async function main() {
  const contractAddress = '0x8Aa669A89D5867B266348928b1B4c8f8BbF751A8';

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      d.owner.address,
      d.router.address,
      d.factory.address
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });