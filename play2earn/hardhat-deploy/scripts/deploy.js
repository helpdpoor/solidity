async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Contract = await ethers.getContractFactory("p2e");
  const contract = await Contract.deploy("0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46", "0x6f7A0eD2Cb4CA507fEEC2a7F5E9f0754fAd61647", "0x14eAd28aeDfCd65f02Bb33f43E53e93d1A421Ba9","3000000000000000000",["2000000000000000000","3000000000000000000","4000000000000000000","5000000000000000000"],[5,6,7,8],[210,230,270,300]);

  console.log("Contract address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });