// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const SALE = '0xAeCB7a6a454146c449c4131EE12de8Db46eeDe6E';
  const Sale = await ethers.getContractFactory("Sale");
  const saleContract = await Sale.attach(SALE);

  const addresses = [
    '0x1F5102eEa527109aaAa424b5352c8A074Ed71554',
    '0xD1552D83c682447f2F4886Ba4E1717a96d0Bf9EE',
    '0xfcA547241D5c9A771a0A8464e9b112bA43628766',
    '0xd14389078d43ce0532Db4c3Bb85286E917706f98',
    '0xCAD942018CfBd8F989DaE9Fb786067d9Ad06BD52',
    '0x99159Db6734d55FB04c005b9ae05671D2883c5ac',
    '0xB9879013Cd8D65047762fe208B1DE613EF3f40Bc',
    '0xAcCcB099318D7AF5b94f40dbbD05D36386E36921',
    '0xBeeB32e8e57D4E9E726960Da3F6174EB1C96AB31',
    '0x4CDae536800eF36930AC2032391B0A6dab04f4f3',
    '0xdfb92A9d77205e2897D76C47847897B41B44c025',
    '0x7d3021B72a965F86273D17c8E898c864F4d86596',
    '0xB1c730DcE68B35525333e91b7e6b37bb030CaDf3',
    '0xaFbC6c5Bee692f45B0bC12b6085a46342DA1b501',
    '0xd3EFFBf76c31C50F9088E6cd3793e66a50f56890',
    '0xd3EFFBf76c31C50F9088E6cd3793e66a50f56890',
    '0xC2383e76b901b43AE5487bc38293c5091D4E8074',
    '0xBD06492cfD658D1112F6cE340551e5c34EB75D84',
    '0xBeC4594e05154F7C1a269401A0dF4C5354F1CE75',
    '0xBeeB32e8e57D4E9E726960Da3F6174EB1C96AB31',
    '0x27D42C64eD27dF1223720620e7C14602F2B1B0Dc',
    '0xDf0D5bcb444adBAe47bDA9e9a0596225309dAdF4',
    '0xDdB5635C0B712A7Ec72cC09d908631fDBe6439CC',
    '0x31dD747d8e8419Db1386c2BD07849Beb848Ea3A2',
    '0x271Ae2AEf759169Fb2d373c9D1e19E2B20eE36d1',
    '0x69C0b0d8252E57636f9A7f45c7d9CF5af562D30e',
    '0x61086985d5D18af7E87b9C9e2579625e8C6fa787',
    '0x05b6bc4052dff342f042fa998752c9f0bf718986',
    '0x4743c89575f47C9c8458566430B7E46483b9Df9d',
    '0xF607a8078341bdAe2411eFc58E6fA64Ad08aD4D5',
    '0x89315fC2aC1E406bCA7085cD40F96da93C8d5008',
    '0x45E52A3271705969ebca336B249B55F9ED50E9F2',
    '0x45E52A3271705969ebca336B249B55F9ED50E9F2',
    '0x26C41a55040035fbB89908A2c0f8A9d87b7b35e0',
    '0xf8bC7620533A5694fcC904527459464a3e4c8f77',
    '0x969ACb0b8132f8b76b1943754C9d514d40Ea4FEb',
    '0x2F0696BE5D0685f032c078db76125C10C46927A2',
    '0x188aB4390c8fCfE93A8342327f1BB2EEa703Fb96',
    '0xA20282b341E19948C198AF97478444429488456b',
    '0x2A5A03E2eB96cC33b0080b0e80610Cae64b4Dc75',
    '0x625A1e360C9114C2EB6A1A3bA0A5816B48aCcD90',
    '0xAf9181c2896B3b3e3336c512956c4264e473f367',
    '0xeD964dB43C2Cd3e544c2D59D78CbB9115E20F578',
    '0x7957De7781CF0AA151A03E5D79949D28751544C4',
    '0xB5C6CCf5B89A7CfD221D7e4e5C686711448ea18D',
    '0x16A9Ff8776236A36B65BE4E72233d623A2dd0F87',
    '0xf140f36363EA35B7b8781CF60778105C1544b4B5',
    '0x4cC4F50b786DD9FA9DBDa148f033F061a0a82bB1',
  ];

  const tx = await saleContract.addToWhitelistMultiple(
    addresses
  );
  await tx.wait();
  console.log(tx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });