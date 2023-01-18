// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/goerli.json');
const d = {};

async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];

  const now = Math.round(Date.now() / 1000);

  d.deployedContracts = require(jsonPath);

  d.options = {gasPrice: 100000000};

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  if (!d.deployedContracts.proxyAdmin) throw new Error('Proxy admin contract is not defined');
  d.proxyAdmin = await d.ProxyAdmin.attach(d.deployedContracts.proxyAdmin.latest);

  d.BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  d.blContract = await d.BorrowingLending.attach(d.deployedContracts.blProxy.latest);

  d.Collateral = await ethers.getContractFactory("Collateral");
  d.collateralContract = await d.Collateral.attach(d.deployedContracts.collateralProxy.latest);

  d.NftCollateral = await ethers.getContractFactory("NftCollateral");
  d.nftCollateralImplementation = await d.NftCollateral.deploy(d.options);
  await d.nftCollateralImplementation.deployed();

  if (!(d.deployedContracts.nftCollateralImplementation)) d.deployedContracts.nftCollateralImplementation = {
    latest: '',
    all: [],
  };
  d.deployedContracts.nftCollateralImplementation.latest = d.nftCollateralImplementation.address;
  d.deployedContracts.nftCollateralImplementation.all.push({
    address: d.nftCollateralImplementation.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`NFT Collateral implementation contract deployed to ${d.nftCollateralImplementation.address}`);

  d.ABI = [
    "function initialize(address, address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.deployedContracts.nftMarketplace.latest,
    d.deployedContracts.cyclops.latest,
    d.collateralContract.address,
    d.owner.address
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.nftCollateralProxy = await d.Proxy.connect(d.owner).deploy(
    d.nftCollateralImplementation.address,
    d.proxyAdmin.address,
    d.calldata,
    d.options
  );
  await d.nftCollateralProxy.deployed();
  if (!(d.deployedContracts.nftCollateralProxy)) d.deployedContracts.nftCollateralProxy = {
    latest: '',
    all: [],
  };
  d.deployedContracts.nftCollateralProxy.latest = d.nftCollateralProxy.address;
  d.deployedContracts.nftCollateralProxy.all.push({
    address: d.nftCollateralProxy.address,
    timestamp: now,
  });
  saveToJson(d.deployedContracts);
  console.log(`NFT Collateral proxy contract deployed to ${d.nftCollateralProxy.address}`);

  await d.collateralContract
    .setNftCollateralContract (
      d.nftCollateralProxy.address,
      d.options
    );
}

function saveToJson(jsonData) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(jsonData, null, 4)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });