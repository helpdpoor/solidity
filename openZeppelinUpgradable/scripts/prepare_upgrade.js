// scripts/prepare_upgrade.js
async function main() {
  const proxyAddress = '0x8162bfb22276b307C21343bEd181Cd15778151B9';

  const BoxV3 = await ethers.getContractFactory("BoxV3");
  console.log("Preparing upgrade...");
  const boxV3Address = await upgrades.prepareUpgrade(proxyAddress, BoxV3);
  console.log("BoxV3 at:", boxV3Address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });