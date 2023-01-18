const {ethers} = require("hardhat");
const path = require("path");
const d = {};
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
const deployedContracts = require(jsonPath);

async function main() {
  const contractAddress = deployedContracts.stakingNft.latest;
  d.addresses = {
    bscMainnet: {
      owner: '0x2218FA3012baD7DA5c7571c9cd14229AD9e9C0a3',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0x43E39a7b159c2b0804f377D3aC238f70dA2363A8',
    },
    polygonMainnet: {
      owner: '0x2218FA3012baD7DA5c7571c9cd14229AD9e9C0a3',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0xD2C2bd609045d750539DBB8a87D76d3F4CAE6494',
    },
    goerli: {
      syntrum: '0x589844B4885d8451144985F8f9da80085d5aD4E1',
      owner: '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA',
      taxReceiver: '0x000000000000000000000000000000000000dead',
      rates: '0xA146a0bED1774b46a9832560a236079bB3D8C412',
      nft: '0x6dcb3941d5C9697ac91FD0D95fC56FB8beb57018',
      marketplace: '0x8fd8EcE7480a9a458E96dC90BfFE296ab0d04B59',
    },
  };

  d.ABI = [
    "function initialize(address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.addresses[d.networkName].owner,
    d.addresses[d.networkName].taxReceiver,
    d.addresses[d.networkName].rates
  ]);

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      // deployedContracts.stakingImplementation.latest,
      // deployedContracts.proxyAdmin.latest,
      // d.calldata
      d.addresses[d.networkName].syntrum,
      d.addresses[d.networkName].marketplace,
      d.addresses[d.networkName].nft,
      d.addresses[d.networkName].owner,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });