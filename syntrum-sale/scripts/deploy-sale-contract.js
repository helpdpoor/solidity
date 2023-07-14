// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const axios = require('axios');
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const network = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${network}.json`);
const deployedContracts = require(jsonPath);
const roundData = [
  [
    ethers.utils.parseUnits('0.065'),
    ethers.utils.parseUnits('0.075'),
    ethers.utils.parseUnits('0.085'),
    ethers.utils.parseUnits('0.095'),
  ],
  [
    1688385600,
    1690200000,
    1691409600,
    1692619200,
  ],
  [
    3 * 7 * 24 * 3600,
    2 * 7 * 24 * 3600,
    2 * 7 * 24 * 3600,
    2 * 7 * 24 * 3600,
  ],
  [
    ethers.utils.parseUnits('5000000'),
    ethers.utils.parseUnits('5000000'),
    ethers.utils.parseUnits('5000000'),
    ethers.utils.parseUnits('5000000'),
  ],
];
const paymentTokens = {
  ethereumMainnet: [
    // {
    //   name: 'ETH',
    //   address: ethers.constants.AddressZero,
    //   price: ethers.constants.Zero,
    //   weight: 1,
    // },
    {
      name: 'USDT',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      price: ethers.utils.parseUnits('1', 30),
      weight: 1,
    },
    {
      name: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      price: ethers.utils.parseUnits('1', 30),
      weight: 2,
    },
  ],
  bscMainnet: [
    // {
    //   name: 'BNB',
    //   address: ethers.constants.AddressZero,
    //   price: ethers.constants.Zero,
    //   weight: 1,
    // },
    {
      name: 'USDT',
      address: '0x55d398326f99059ff775485246999027b3197955',
      price: ethers.utils.parseUnits('1'),
      weight: 1,
    },
    {
      name: 'BUSD',
      address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      price: ethers.utils.parseUnits('1'),
      weight: 2,
    },
  ],
  polygonMainnet: [
    // {
    //   name: 'MATIC',
    //   address: ethers.constants.AddressZero,
    //   price: ethers.constants.Zero,
    //   weight: 1,
    // },
    {
      name: 'USDT',
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      price: ethers.utils.parseUnits('1', 30),
      weight: 1,
    },
    {
      name: 'USDC',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      price: ethers.utils.parseUnits('1', 30),
      weight: 2,
    },
  ],
  cronosMainnet: [
    // {
    //   name: 'CRO',
    //   address: ethers.constants.AddressZero,
    //   price: ethers.constants.Zero,
    //   weight: 1,
    // },
    {
      name: 'USDT',
      address: '0x66e428c3f67a68878562e79A0234c1F83c208770',
      price: ethers.utils.parseUnits('1', 30),
      weight: 1,
    },
    {
      name: 'USDC',
      address: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
      price: ethers.utils.parseUnits('1', 30),
      weight: 2,
    },
  ],
};
const options = {};

async function main() {
  if (network === 'polygonMainnet') {
    const gasPrice = Number(await getGasPrice());
    options.gasPrice = gasPrice > 30000000000 ? gasPrice : 50000000000;
  }
  const now = Math.round(Date.now() / 1000);
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const manager = signers[1];
  const ownerAddress = '0x0b69151b04C5A0732e6DD35f8f1470c1a8cfB807';
  const managerAddress = manager.address;
  const ratesAddress = deployedContracts.rates.latest;
  const syntrumTokenAddress = '0xc8955E1d6a1785F951180e516ac00b940fF0b249';
  const receiverAddress = '0x0386bEb658c703a90a6e0A49E5Fd21eAefb866e3';

  const ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  if (!deployedContracts.proxyAdmin) throw new Error('Proxy admin contract is not defined');
  const proxyAdmin = await ProxyAdmin.attach(deployedContracts.proxyAdmin.latest);

  const Sale = await ethers.getContractFactory("Sale");
  // const saleImplementation = await Sale.attach(deployedContracts.saleImplementation.latest);
  const saleImplementation = await Sale.connect(deployer).deploy(options);
  await saleImplementation.deployed();
  if (!(deployedContracts.saleImplementation)) deployedContracts.saleImplementation = {
    latest: '',
    all: [],
  };
  deployedContracts.saleImplementation.latest = saleImplementation.address;
  deployedContracts.saleImplementation.all.push({
    address: saleImplementation.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Sale implementation contract deployed to ${saleImplementation.address}`);

  const ABI = [
    "function initialize(address, address, address, address, address)"
  ];
  const iface = new ethers.utils.Interface(ABI);
  const calldata = iface.encodeFunctionData("initialize", [
    ownerAddress,
    managerAddress,
    ratesAddress,
    syntrumTokenAddress,
    receiverAddress
  ]);

  const Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  const saleProxy = await Proxy.connect(deployer).deploy(
    saleImplementation.address,
    proxyAdmin.address,
    calldata,
    options
  );
  await saleProxy.deployed();
  if (!(deployedContracts.saleProxy)) deployedContracts.saleProxy = {
    latest: '',
    all: [],
  };
  deployedContracts.saleProxy.latest = saleProxy.address;
  deployedContracts.saleProxy.all.push({
    address: saleProxy.address,
    timestamp: now,
  });
  saveToJson(deployedContracts);
  console.log(`Sale proxy contract deployed to ${saleProxy.address}`);

  const sale = await Sale.attach(deployedContracts.saleProxy.latest);

  const tx = await sale.connect(manager).setRoundsData(
    roundData[0],
    roundData[1],
    roundData[2],
    roundData[3],
    options
  );
  await tx.wait(3);

  for (const profile of paymentTokens[network]) {
    // if (profile.weight === 2) continue;
    const tx = await sale.connect(manager).addPaymentProfile(
      profile.address,
      profile.price,
      profile.weight,
      profile.name,
      profile.name,
      options
    );
    await tx.wait(3);
  }

  await sale.connect(manager).setPublic(true, options);

  console.log('Deployment completed');
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

async function getGasPrice () {
  const gasPriceApi = 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=F1PQ752FZMGWKUW6YG1M73ZNG4RZAVHW1T';
  const response = await axios(gasPriceApi);
  const json = response.data;
  let gasPrice = Number(json?.result?.ProposeGasPrice);
  gasPrice = gasPrice > 0 ? gasPrice : 50;
  return ethers.utils.parseUnits(gasPrice.toString(), 'gwei');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
