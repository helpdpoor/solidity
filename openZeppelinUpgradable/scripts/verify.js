

async function main() {
  const contractAddress = '0x31A6B10d8eEb4204725559Ad87c338350Da92af5';

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });