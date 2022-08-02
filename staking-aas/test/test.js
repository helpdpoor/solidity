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
  deposit1contract, 
  deposit2contract,
  yield1contract,
  yield2contract,
  lock1contract,
  lock2contract,
  stakingContract;
let owner, manager, pool1owner, pool2owner, user1, user2, user3, taxReceiver;
const result = {};
const lock1amount = 9000;
const lock2amount = 8000;
const pool1size = 5000;
const pool2size = 5000;
const distribution1period = 3600 * 24 * 365;
const distribution2period = 3600 * 24 * 365;
const deposit1amount = 100;
const deposit2amount = 700;
const deposit3amount = 17;
const unstake1amount = 73;
const withdrawYield1amount = 1.8;
const tax = 1000;
const decimals = 10000;
const apr = 2000;


describe("Testing Staking contract", function () {
  beforeEach(async function () {
    signers = await ethers.getSigners();
    user1 = signers[0];
    user2 = signers[1];
    user3 = signers[2];
    pool1owner = signers[6];
    pool2owner = signers[7];
    taxReceiver = signers[8];
    manager = signers[9];
    owner = signers[10];

    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    deposit1contract = await ERC20Token.deploy(owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'));
    await deposit1contract.deployed();
    await deposit1contract.connect(owner).transfer(user1.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit1contract.connect(owner).transfer(user2.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit1contract.connect(owner).transfer(user3.address, ethers.utils.parseUnits(initialTransfer.toString()));

    deposit2contract = await ERC20Token.deploy(owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'));
    await deposit2contract.deployed();
    await deposit2contract.connect(owner).transfer(user1.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit2contract.connect(owner).transfer(user2.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit2contract.connect(owner).transfer(user3.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit2contract.connect(owner).transfer(pool2owner.address, ethers.utils.parseUnits(initialTransfer.toString()));

    yield1contract = await ERC20Token.deploy(owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'));
    await yield1contract.deployed();
    await yield1contract.connect(owner).transfer(pool1owner.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await yield1contract.connect(owner).transfer(pool2owner.address, ethers.utils.parseUnits(initialTransfer.toString()));

    yield2contract = await ERC20Token.deploy(owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'));
    await yield2contract.deployed();
    await yield2contract.connect(owner).transfer(pool1owner.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await yield2contract.connect(owner).transfer(pool2owner.address, ethers.utils.parseUnits(initialTransfer.toString()));

    lock1contract = await ERC20Token.deploy(owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'));
    await lock1contract.deployed();
    await lock1contract.connect(owner).transfer(pool1owner.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await lock1contract.connect(owner).transfer(pool2owner.address, ethers.utils.parseUnits(initialTransfer.toString()));

    lock2contract = await ERC20Token.deploy(owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'));
    await lock2contract.deployed();
    await lock2contract.connect(owner).transfer(pool1owner.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await lock2contract.connect(owner).transfer(pool2owner.address, ethers.utils.parseUnits(initialTransfer.toString()));

    const Staking = await ethers.getContractFactory("Staking");
    stakingContract = await Staking.connect(owner).deploy(
      owner.address,
      taxReceiver.address,
      tax,
      blockTime
    );
    await stakingContract.deployed();

    await deposit1contract.connect(user1).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit1contract.connect(user2).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit1contract.connect(user3).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

    await deposit2contract.connect(user1).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit2contract.connect(user2).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit2contract.connect(user3).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await deposit2contract.connect(pool2owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

    await yield1contract.connect(pool1owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await yield1contract.connect(pool2owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await yield2contract.connect(pool1owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await yield2contract.connect(pool2owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

    await lock1contract.connect(pool1owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await lock1contract.connect(pool2owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await lock2contract.connect(pool1owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
    await lock2contract.connect(pool2owner).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

    await stakingContract.connect(owner)
      .addLockProfile(
        lock1contract.address,
        ethers.utils.parseUnits(lock1amount.toString()),
        ethers.utils.parseUnits(lock1amount.toString()),
        true
      );
    await stakingContract.connect(owner)
      .addLockProfile(
        lock2contract.address,
        ethers.utils.parseUnits(lock2amount.toString()),
        ethers.utils.parseUnits(lock2amount.toString()),
        true
      );
  });

  it("Pools management", async function () {
    await stakingContract.connect(pool1owner)
      .addDepositProfile(
        [
          1, // lock profile id
          ethers.utils.parseUnits(pool1size.toString()), // pool size
          distribution1period, // period
          0 // apr
        ],
        deposit1contract.address,
        yield1contract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link'
        ]
      );

    expect(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(stakingContract.address)
    ))).to.equal(lock1amount);
    expect(Number(
      await stakingContract.getDepositProfilesNumber()
    )).to.equal(1);
    result.depositProfile = await stakingContract.getDepositProfile(1);
    expect(result.depositProfile.depositContractAddress)
      .to.equal(deposit1contract.address);
    expect(result.depositProfile.lockContractAddress)
      .to.equal(lock1contract.address);
    expect(Number(ethers.utils.formatUnits(
      result.depositProfile.poolSize
    )))
      .to.equal(pool1size);
    expect(Number(result.depositProfile.period))
      .to.equal(distribution1period);
    expect(result.depositProfile.active)
      .to.be.true;
    result.depositProfileExtra = await stakingContract.getDepositProfileExtra(1);
    expect(result.depositProfileExtra.poolOwnerAddress)
      .to.equal(pool1owner.address);
    expect(result.depositProfileExtra.name)
      .to.equal('name');
    expect(result.depositProfileExtra.depositCurrency)
      .to.equal('depositCurrency');
    expect(result.depositProfileExtra.yieldCurrency)
      .to.equal('yieldCurrency');
    expect(result.depositProfileExtra.link)
      .to.equal('link');
    expect(Number(result.depositProfileExtra.endTime))
      .to.equal(0);
    result.depositProfileData = await stakingContract.getDepositProfileData(1);
    expect(Number(ethers.utils.formatUnits(
      result.depositProfileData.lockedAmount
    )))
      .to.equal(lock1amount);

    await stakingContract.connect(pool2owner)
      .addDepositProfile(
        [
          2,
          ethers.utils.parseUnits(pool2size.toString()),
          distribution2period,
          0
        ],
        deposit2contract.address,
        yield2contract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link'
        ]
      );

    expect(Number(ethers.utils.formatUnits(
      await lock2contract.balanceOf(stakingContract.address)
    ))).to.equal(lock2amount);
    expect(Number(
      await stakingContract.getDepositProfilesNumber()
    )).to.equal(2);

    result.depositProfile = await stakingContract.getDepositProfile(2);
    expect(result.depositProfile.depositContractAddress)
      .to.equal(deposit2contract.address);
    expect(result.depositProfile.lockContractAddress)
      .to.equal(lock2contract.address);
    expect(Number(ethers.utils.formatUnits(
      result.depositProfile.poolSize
    )))
      .to.equal(pool2size);

    expect(Number(result.depositProfile.period))
      .to.equal(distribution2period);
    result.depositProfileExtra = await stakingContract.getDepositProfileExtra(2);
    expect(result.depositProfileExtra.poolOwnerAddress)
      .to.equal(pool2owner.address);
    expect(result.depositProfileExtra.name)
      .to.equal('name');
    expect(result.depositProfileExtra.depositCurrency)
      .to.equal('depositCurrency');
    expect(result.depositProfileExtra.yieldCurrency)
      .to.equal('yieldCurrency');
    expect(result.depositProfileExtra.link)
      .to.equal('link');
    expect(Number(result.depositProfileExtra.endTime))
      .to.equal(0);
    result.depositProfileData = await stakingContract.getDepositProfileData(2);
    expect(Number(ethers.utils.formatUnits(
      result.depositProfileData.lockedAmount
    )))
      .to.equal(lock2amount);

    await expect(
      stakingContract.connect(user1)
        .setDepositProfileStatus(1, false)
    ).to.be.revertedWith('Deposit profile is not found');

    await stakingContract.connect(pool1owner).setDepositProfileStatus(1, false);

    result.depositProfile = await stakingContract.getDepositProfile(1);
    expect(result.depositProfile.active)
      .to.be.false;
  });

  it("Dynamic staking", async function () {
    await stakingContract.connect(pool1owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool1size.toString()),
          distribution1period,
          0
        ],
        deposit1contract.address,
        yield1contract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link'
        ]
      );

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await stakingContract.connect(user1)
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );
    result.user1deposited = deposit1amount;
    result.totalDeposited = deposit1amount;

    expect(Number(ethers.utils.formatUnits(
      await deposit1contract.balanceOf(stakingContract.address)
    ))).to.equal(deposit1amount);
    expect(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward = pool1size
      * 3600 * 24 * 10
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    result.response = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    ));
    expect(roundTo(result.response, 2)).to.equal(roundTo(result.user1reward, 2));
    result.shouldBeDistributed = pool1size * 10 * 3600 * 24 / distribution1period;

    await stakingContract.connect(user2)
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    result.user2deposited = deposit2amount;
    result.totalDeposited += deposit2amount;
    result.response = await stakingContract.getDepositYield(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.response
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('22 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 22
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward = pool1size * 3600 * 24 * 22
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.shouldBeDistributed += pool1size * 22 * 3600 * 24 / distribution1period;

    hre.timeAndMine.increaseTime('12 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 12
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += pool1size * 3600 * 24 * 12
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.shouldBeDistributed += pool1size * 12 * 3600 * 24 / distribution1period;

    await stakingContract.connect(user2)
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    result.user2deposited += deposit2amount;
    result.totalDeposited += deposit2amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 11
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += pool1size * 3600 * 24 * 11
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.shouldBeDistributed += pool1size * 11 * 3600 * 24 / distribution1period;

    await stakingContract.connect(user3)
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    result.user3deposited = deposit3amount;
    result.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(0);

    hre.timeAndMine.increaseTime('17 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 17
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += pool1size * 3600 * 24 * 17
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward = pool1size * 3600 * 24 * 17
      * result.user3deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));
    result.shouldBeDistributed += pool1size * 17 * 3600 * 24 / distribution1period;

    await stakingContract.connect(user1)
      .withdrawYield(
        ethers.utils.parseUnits(withdrawYield1amount.toString()),
        1,
        false
      );
    result.user1reward -= withdrawYield1amount;

    await stakingContract.connect(user1)
      .unStake(
        ethers.utils.parseUnits(unstake1amount.toString()),
        1
      );
    result.user1deposited -= unstake1amount;
    result.totalDeposited -= unstake1amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    hre.timeAndMine.increaseTime('6 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 6
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += pool1size * 3600 * 24 * 6
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward += pool1size * 3600 * 24 * 6
      * result.user3deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));
    result.shouldBeDistributed += pool1size * 6 * 3600 * 24 / distribution1period;

    await stakingContract.connect(user2)
      .withdrawYieldAll(1);
    result.user2reward = 0;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    await stakingContract.connect(user3)
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    result.user3deposited += deposit3amount;
    result.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 11
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += pool1size * 3600 * 24 * 11
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward += pool1size * 3600 * 24 * 11
      * result.user3deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));
    result.shouldBeDistributed += pool1size * 11 * 3600 * 24 / distribution1period;

    await expect(
      stakingContract.connect(pool1owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets can not be withdrawn at the moment');

    hre.timeAndMine.increaseTime('280 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += pool1size * 3600 * 24 * 276
      * result.user1deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += pool1size * 3600 * 24 * 276
      * result.user2deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward += pool1size * 3600 * 24 * 276
      * result.user3deposited
      / result.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));
    result.shouldBeDistributed += pool1size * 266 * 3600 * 24 / distribution1period;

    await stakingContract.connect(user1)
      .withdrawYieldAll(1);
    await stakingContract.connect(user2)
      .withdrawYieldAll(1);
    await stakingContract.connect(user3)
      .withdrawYieldAll(1);

    expect(roundTo(Number(ethers.utils.formatUnits(
      await yield1contract.balanceOf(stakingContract.address)
    )), 2)).to.equal(0);

    await expect(
      stakingContract.connect(user1)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Deposit profile is not found');

    await stakingContract.connect(pool1owner)
      .withdrawLockedAssets(1);

    await expect(
      stakingContract.connect(pool1owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets are already withdrawn');

    const taxedAmount = lock1amount * tax / decimals;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(stakingContract.address)
    )), 8)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(pool1owner.address)
    )), 8)).to.equal(roundTo(initialTransfer - taxedAmount, 8));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(taxReceiver.address)
    )), 8)).to.equal(roundTo(taxedAmount, 8));
  });

  it("Fixed rate staking", async function () {
    await stakingContract.connect(pool2owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool2size.toString()),
          distribution2period,
          apr
        ],
        deposit2contract.address,
        deposit2contract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link',
        ]
      );
    const contractBalance = Number(ethers.utils.formatUnits(
      await deposit2contract.balanceOf(stakingContract.address)
    ));
    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await stakingContract.connect(user1)
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );
    result.user1deposited = deposit1amount;
    result.totalDeposited = deposit1amount;

    expect(Number(ethers.utils.formatUnits(
      await deposit2contract.balanceOf(stakingContract.address)
    ))).to.equal(deposit1amount + contractBalance);
    expect(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward = result.user1deposited
      * apr
      * 3600 * 24 * 10
      / decimals
      / year;
    result.response = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    ));
    expect(roundTo(result.response, 2)).to.equal(roundTo(result.user1reward, 2));

    await stakingContract.connect(user2)
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    result.user2deposited = deposit2amount;
    result.totalDeposited += deposit2amount;
    result.response = await stakingContract.getDepositYield(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.response
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('22 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 22
      / decimals
      / year;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward = result.user2deposited
      * apr
      * 3600 * 24 * 22
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    hre.timeAndMine.increaseTime('12 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 12
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += result.user2deposited
      * apr
      * 3600 * 24 * 12
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    await stakingContract.connect(user2)
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    result.user2deposited += deposit2amount;
    result.totalDeposited += deposit2amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += result.user2deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    await stakingContract.connect(user3)
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    result.user3deposited = deposit3amount;
    result.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(0);

    hre.timeAndMine.increaseTime('17 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 17
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += result.user2deposited
      * apr
      * 3600 * 24 * 17
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward = result.user3deposited
      * apr
      * 3600 * 24 * 17
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    await stakingContract.connect(user1)
      .withdrawYield(
        ethers.utils.parseUnits(withdrawYield1amount.toString()),
        1,
        false
      );
    result.user1reward -= withdrawYield1amount;

    await expect(
      stakingContract.connect(user1)
        .unStake(
          ethers.utils.parseUnits(unstake1amount.toString()),
          1
        )
    ).to.be.revertedWith('Assets are locked yet');

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    hre.timeAndMine.increaseTime('6 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 6
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += result.user2deposited
      * apr
      * 3600 * 24 * 6
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward += result.user3deposited
      * apr
      * 3600 * 24 * 6
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    await stakingContract.connect(user2)
      .withdrawYieldAll(1);
    result.user2reward = 0;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));

    await stakingContract.connect(user3)
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    result.user3deposited += deposit3amount;
    result.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += result.user2deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward += result.user3deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    await expect(
      stakingContract.connect(pool2owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets can not be withdrawn at the moment');

    hre.timeAndMine.increaseTime('280 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    result.user1reward += result.user1deposited
      * apr
      * 3600 * 24 * 276
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1)
    )), 2)).to.equal(roundTo(result.user1reward, 2));
    result.user2reward += result.user2deposited
      * apr
      * 3600 * 24 * 276
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2)
    )), 2)).to.equal(roundTo(result.user2reward, 2));
    result.user3reward += result.user3deposited
      * apr
      * 3600 * 24 * 276
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3)
    )), 2)).to.equal(roundTo(result.user3reward, 2));

    await stakingContract.connect(user1)
      .withdrawYieldAll(1);
    await stakingContract.connect(user2)
      .withdrawYieldAll(1);
    await stakingContract.connect(user3)
      .withdrawYieldAll(1);

    expect(roundTo(Number(ethers.utils.formatUnits(
      await yield1contract.balanceOf(stakingContract.address)
    )), 2)).to.equal(0);

    await expect(
      stakingContract.connect(user1)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Deposit profile is not found');

    await stakingContract.connect(pool2owner)
      .withdrawLockedAssets(1);

    await expect(
      stakingContract.connect(pool2owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets are already withdrawn');

    await stakingContract.connect(user1)
      .unStake(
        ethers.utils.parseUnits(unstake1amount.toString()),
        1
      );
    result.user1deposited -= unstake1amount;
    result.totalDeposited -= unstake1amount;

    const taxedAmount = lock1amount * tax / decimals;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(stakingContract.address)
    )), 8)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(pool2owner.address)
    )), 8)).to.equal(roundTo(initialTransfer - taxedAmount, 8));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(taxReceiver.address)
    )), 8)).to.equal(roundTo(taxedAmount, 8));
  });

  it("Admin functions", async function () {
    await deposit1contract.connect(user1)
      .transfer(stakingContract.address, ethers.utils.parseUnits(deposit1amount.toString()));
    result.ownerBalance = Number(ethers.utils.formatUnits(
      await deposit1contract.balanceOf(owner.address)
    ));
    await stakingContract.connect(owner)
      .adminWithdrawToken(ethers.utils.parseUnits(deposit1amount.toString()), deposit1contract.address);
    expect(Number(ethers.utils.formatUnits(
      await deposit1contract.balanceOf(deposit1contract.address)
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await deposit1contract.balanceOf(owner.address)
    ))).to.equal(result.ownerBalance + deposit1amount);
  });

  it("Manager settings", async function () {
    await expect(
      stakingContract.connect(manager)
        .setLockProfileAmount(1, 11)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(manager)
        .setLockProfileStatus(1, false)
    ).to.be.revertedWith('Caller is not the manager');

    await stakingContract.connect(owner)
      .addToManagers(manager.address);

    await stakingContract.connect(manager)
      .setLockProfileAmount(1, 11);
    await stakingContract.connect(manager)
      .setLockProfileStatus(1, false);

    result.lockProfile = await stakingContract
      .getLockProfile(1);

    expect(Number(result.lockProfile.amount)).to.be.equal(11);
    expect(result.lockProfile.active).to.be.false;
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}
