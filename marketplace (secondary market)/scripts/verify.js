const {ethers} = require("hardhat");
const d = {};
d.name = 'Token';
d.symbol = 'TN';
d.decimals = 8;
d.totalSupply = 1000000;


async function main() {
  d.signers = await ethers.getSigners();
  d.owner = d.signers[0];
  d.zero = '0x0000000000000000000000000000000000000000';
  const contractAddress = '0xF66b5507EfDA400abc31b1c055022FdE969aE9be';


  const ABI = [
    "function initialize(address, address, address, uint256, uint256, uint256)"
  ];
  const iface = new ethers.utils.Interface(ABI);
  const calldata = iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.zero,
    d.owner.address,
    0,
    0,
    0
  ]);

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      // '0x6987f2A1ff39DbF369A0629c06bf529327ebea25',
      // '0xecBB155027262635ccE355a4F13e9643F8A37Df4',
      // calldata,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });