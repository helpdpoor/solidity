// scripts/deploy.js
async function main() {
  const Box = await ethers.getContractFactory("BoxV3");
  console.log("Deploying Box...");
  const box = await upgrades.deployProxy(Box, [5], { initializer: 'store' });
  console.log("Box deployed to:", box.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });