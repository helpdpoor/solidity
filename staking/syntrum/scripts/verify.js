const {ethers} = require("hardhat");
const path = require("path");
const d = {};
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
const deployedContracts = require(jsonPath);

async function main() {
  const contractAddress = deployedContracts.stakingImplementation.latest;
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
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });