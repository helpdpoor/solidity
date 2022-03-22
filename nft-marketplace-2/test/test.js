const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialTransfer = 10000;
const blockTime = 3000;
const year = 365 * 24 * 3600;
let 
  signers, 
  nftContract,
  marketplaceContract,
  owner,
  manager,
  user1,
  user2,
  user3,
  paymentContract,
  buybackContract,
  royaltyContract
;
const result = {};
const paymentAddressRatio = 5000;
const buybackAddressRatio = 3000;
const inflation = 0.01;
const nftProfiles = {};
nftProfiles[1] = {
  price: 1,
  tokenURI: 'uri 1'
};

beforeEach(async function () {
  signers = await ethers.getSigners();
  user1 = signers[0];
  user2 = signers[1];
  user3 = signers[2];
  paymentContract = signers[6];
  buybackContract = signers[7];
  royaltyContract = signers[8];
  manager = signers[9];
  owner = signers[10];

  const NFT = await ethers.getContractFactory("Nft");
  nftContract = await NFT.connect(owner).deploy('NFT', 'NFT', 6000000);
  await nftContract.deployed();

  const Marketplace = await ethers.getContractFactory("Marketplace");
  marketplaceContract = await Marketplace.deploy(
    owner.address,
    nftContract.address,
    paymentContract.address,
    buybackContract.address,
    royaltyContract.address,
    paymentAddressRatio,
    buybackAddressRatio,
    ethers.utils.parseUnits(inflation.toString())
  );
  await marketplaceContract.deployed();

  await marketplaceContract.connect(owner)
    .addNftProfile(
      ethers.utils.parseUnits(nftProfiles[1].price.toString()),
      ethers.utils.parseUnits(inflation.toString()),
      0,
      nftProfiles[1].tokenURI,
      false,
      true
    );

  await nftContract.connect(owner)
    .addRole(
      marketplaceContract.address,
      1
    );
});

describe("Testing Marketplace contract", function () {
  it("Buy Nft", async function () {
    expect(Number(
      await nftContract.balanceOf(user1.address)
    )).to.equal(0)
    result.user1balance = Number(ethers.utils.formatUnits(
      await nftContract.provider.getBalance(user1.address)
    ));

    await marketplaceContract.connect(user1)
      .purchase(
        1,
        {value: ethers.utils.parseUnits(nftProfiles[1].price.toString())}
      );

    expect(Number(
      await nftContract.balanceOf(user1.address)
    )).to.equal(1)

    expect(roundTo(Number(ethers.utils.formatUnits(
      await nftContract.provider.getBalance(user1.address)
    )), 2)).to.equal(roundTo(result.user1balance - nftProfiles[1].price, 2));

    expect(
      await nftContract.ownerOf(6000001)
    ).to.equal(user1.address);
  });

  // it("Admin functions", async function () {
  //   await deposit1contract.connect(user1)
  //     .transfer(stakingContract.address, ethers.utils.parseUnits(deposit1amount.toString()));
  //   result.ownerBalance = Number(ethers.utils.formatUnits(
  //     await deposit1contract.balanceOf(owner.address)
  //   ));
  //   await stakingContract.connect(owner)
  //     .adminWithdrawToken(ethers.utils.parseUnits(deposit1amount.toString()), deposit1contract.address);
  //   expect(Number(ethers.utils.formatUnits(
  //     await deposit1contract.balanceOf(deposit1contract.address)
  //   ))).to.equal(0);
  //   expect(Number(ethers.utils.formatUnits(
  //     await deposit1contract.balanceOf(owner.address)
  //   ))).to.equal(result.ownerBalance + deposit1amount);
  // });
  //
  // it("Manager settings", async function () {
  //   await expect(
  //     stakingContract.connect(manager)
  //       .setLockProfileAmount(1, 11)
  //   ).to.be.revertedWith('Caller is not the manager');
  //
  //   await expect(
  //     stakingContract.connect(manager)
  //       .setLockProfileStatus(1, false)
  //   ).to.be.revertedWith('Caller is not the manager');
  //
  //   await stakingContract.connect(owner)
  //     .addToManagers(manager.address);
  //
  //   await stakingContract.connect(manager)
  //     .setLockProfileAmount(1, 11);
  //   await stakingContract.connect(manager)
  //     .setLockProfileStatus(1, false);
  //
  //   result.lockProfile = await stakingContract
  //     .getLockProfile(1);
  //
  //   expect(Number(result.lockProfile.amount)).to.be.equal(11);
  //   expect(result.lockProfile.active).to.be.false;
  // });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}
