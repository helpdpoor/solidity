// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");
const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '../../deployed-contracts/polygonMainnet.json');
const deployedContracts = require(jsonPath);
const d = {};

async function main() {
  const addresses = [
    '0xEBfb288d442809f1BA8aa8106fcf2DdE5d82C02C',
    '0xEBfb288d442809f1BA8aa8106fcf2DdE5d82C02C',
    '0xFF6207BC7f3C084204b9c5085Bf7226D9cdD05C3',
    '0xFF6207BC7f3C084204b9c5085Bf7226D9cdD05C3',
    '0x24F069c4e061122436ff0067cc98889c6b24E67C',
    '0xc745257B92E60BD8a4B3605D5F7F52597E152b8c',
    '0xB67c21C44fBD66AcA78e93F843d8bde98Af73762',
    '0xB67c21C44fBD66AcA78e93F843d8bde98Af73762',
    '0x7B70FE6E1421E7de9aa714cCE59b05405D212Daa',
    '0x7B70FE6E1421E7de9aa714cCE59b05405D212Daa',
    '0xcDFC202E11E051B5F3fe5db00D6D411D73A5b4C2',
    '0xd5171D1DB53bbfBbfb5c2Fc436C292E3400bcaA3',
    '0xb69ED7867CAbB5bF2D72d6F479f6E69D51613F98',
    '0xC90ABa8217000B6Cf7276e13322CbbFf36c7a0F7',
    '0xC90ABa8217000B6Cf7276e13322CbbFf36c7a0F7',
    '0x73CbDF131364A3b8dc6110a6037ABA1F868167Ee',
    '0xd5171D1DB53bbfBbfb5c2Fc436C292E3400bcaA3',
    '0x73CbDF131364A3b8dc6110a6037ABA1F868167Ee',
    '0x33d27f5F998BE73b5eaC7a9d9281512dfCC5492b',
    '0x33d27f5F998BE73b5eaC7a9d9281512dfCC5492b',
    '0x964d495B802793Ade6058F6720cA13715ed7217D',
    '0xc745257B92E60BD8a4B3605D5F7F52597E152b8c',
    '0x964d495B802793Ade6058F6720cA13715ed7217D',
    '0xF84a33b554b30e2AfC8f5A6Cbd0A2aB9Cfbf09b1'
  ];
  const proceededAddresses = {};
  const OLD_BL = '0xD7baC58d0555215c5F05f166D39CBf706C988343';
  const OLD_REWARD = '0xA4AE614B6a78b641324e416AeBa9573984fCf0A0';

  const BorrowingLending = await ethers.getContractFactory("BorrowingLending");
  const oldBlContract = await BorrowingLending.attach(
    OLD_BL
  );

  const Reward = await ethers.getContractFactory("Reward");
  const oldRewardContract = await Reward.attach(
    OLD_REWARD
  );
  const rewardContract = await Reward.attach(
    deployedContracts.rewardProxy.latest
  );
  console.log(rewardContract.address);

  const profilesNumber = Number(await oldBlContract.getBorrowingProfilesNumber());
  for (let i = 1; i <= profilesNumber; i ++) {
    console.log(i);
    const profile = await oldRewardContract.getProfile(i);
    const paid = await oldRewardContract.getRewardPaid(i);
    // await rewardContract.migrateProfiles(
    //   i,
    //   profile.rewardPerToken,
    //   profile.lastTimestamp,
    //   profile.rewardPercentage,
    //   profile.lastTotalLentAmount,
    //   paid
    // );
    for (const address of addresses) {
      if (proceededAddresses[i] && proceededAddresses[i][address]) continue;
      const userProfile = await oldRewardContract.getUserProfile(address, i);
      const userPaid = await oldRewardContract.getUserRewardPaid(address, i);
      // await rewardContract.migrateUserProfiles(
      //   address,
      //   i,
      //   userProfile.accumulatedReward,
      //   userProfile.withdrawnReward,
      //   userProfile.rewardPerTokenOffset,
      //   userProfile.lastLentAmount,
      //   userProfile.updatedAt,
      //   userPaid
      // );
      if (!proceededAddresses[i]) proceededAddresses[i] = {};
      proceededAddresses[i][address] = true;
    }
  }



}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
