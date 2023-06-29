const {ethers} = require("hardhat");

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider(
    'https://polygon-mainnet.infura.io/v3/02cf60eb2f654099b29d89b28f7fb3f9'
  );
  const wallet = new ethers.Wallet('be28aa10e8f8b81909fed2792400ce3422be13c754829e97cf3f86b3523a35e4', provider);
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    gasPrice: 850000000000,
    gasLimit: 21000,
    nonce: 710
  });
  console.log(tx);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });