const { expect } = require('chai')
const { ethers } = require("hardhat")
const now = Math.round(Date.now() / 1000)
const day = 24 * 3600
const year = day * 365
const d = {
  initialTransfer: 10000,
  users: [],
  depositContracts: [
    {
      apr: 20,
      maxStakedAmount: 1000000,
      startTime: now + day,
      endTime: now + day * 20,
      rewardAmount: 50,
    },
    {
      apr: 15,
      maxStakedAmount: 800000,
      startTime: now + day * 2,
      endTime: now + day * 30,
      rewardAmount: 7000,
    },
  ],
}

describe("Testing SyntrumVault contract", function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.users[0] = d.signers[0];
    d.users[1] = d.signers[1];
    d.users[2] = d.signers[2];
    d.manager = d.signers[9];
    d.owner = d.signers[10];

    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    d.depositContracts[0].contract = await ERC20Token.connect(d.owner).deploy(
      d.owner.address, 'Syntrum', 'SYT', ethers.utils.parseUnits('1000000')
    );
    await d.depositContracts[0].contract.deployed();
    await d.depositContracts[0].contract.connect(d.owner).transfer(d.users[0].address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[0].contract.connect(d.owner).transfer(d.users[1].address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[0].contract.connect(d.owner).transfer(d.users[2].address, ethers.utils.parseUnits(d.initialTransfer.toString()));

    d.depositContracts[1].contract = await ERC20Token.connect(d.owner).deploy(
      d.owner.address, 'Syntrum DAO', 'STD', ethers.utils.parseUnits('1000000')
    );
    await d.depositContracts[1].contract.deployed();
    await d.depositContracts[1].contract.connect(d.owner).transfer(d.users[0].address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[1].contract.connect(d.owner).transfer(d.users[1].address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[1].contract.connect(d.owner).transfer(d.users[2].address, ethers.utils.parseUnits(d.initialTransfer.toString()));

    d.rewardContract = await ERC20Token.connect(d.owner).deploy(d.owner.address, 'USDT', 'USDT', ethers.utils.parseUnits('1000000'));
    await d.rewardContract.deployed();
    
    const SyntrumDaoStaking = await ethers.getContractFactory("SyntrumDaoStaking");
    d.syntrumDaoStaking = await SyntrumDaoStaking.deploy(
      d.owner.address, d.manager.address
    );

    await d.depositContracts[0].contract.connect(d.users[0]).approve(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[0].contract.connect(d.users[1]).approve(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[0].contract.connect(d.users[2]).approve(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));

    await d.depositContracts[1].contract.connect(d.users[0]).approve(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[1].contract.connect(d.users[1]).approve(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));
    await d.depositContracts[1].contract.connect(d.users[2]).approve(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));

    await d.rewardContract.connect(d.owner).transfer(d.syntrumDaoStaking.address, ethers.utils.parseUnits(d.initialTransfer.toString()));

    await d.syntrumDaoStaking.connect(d.manager)
      .addDepositProfile(
        ethers.utils.parseUnits(d.depositContracts[0].apr.toString(), 2),
        ethers.utils.parseUnits(d.depositContracts[0].maxStakedAmount.toString()),
        d.depositContracts[0].startTime,
        d.depositContracts[0].endTime,
        d.depositContracts[0].contract.address,
        d.rewardContract.address
      );

    await d.syntrumDaoStaking.connect(d.manager)
      .addDepositProfile(
        ethers.utils.parseUnits(d.depositContracts[1].apr.toString(), 2),
        ethers.utils.parseUnits(d.depositContracts[1].maxStakedAmount.toString()),
        d.depositContracts[1].startTime,
        d.depositContracts[1].endTime,
        d.depositContracts[1].contract.address,
        d.rewardContract.address
      );
  });

  it.only("Pools management", async function () {
    expect(Number(
      await d.syntrumDaoStaking.getDepositProfilesNumber()
    )).to.equal(2);
    d.depositProfile = await d.syntrumDaoStaking.getDepositProfile(1);
    expect(d.depositProfile.depositContractAddress)
      .to.equal(d.depositContracts[0].contract.address);
    expect(d.depositProfile.rewardContractAddress)
      .to.equal(d.rewardContract.address);
    expect(Number(ethers.utils.formatUnits(
      d.depositProfile.apr, 2
    )))
      .to.equal(d.depositContracts[0].apr);
    expect(Number(ethers.utils.formatUnits(
      d.depositProfile.maxStakedAmount
    )))
      .to.equal(d.depositContracts[0].maxStakedAmount);
    expect(Number(
      d.depositProfile.startTime
    ))
      .to.equal(d.depositContracts[0].startTime);
    expect(Number(
      d.depositProfile.endTime
    ))
      .to.equal(d.depositContracts[0].endTime);
    expect(d.depositProfile.active)
      .to.be.true;

    d.depositProfile = await d.syntrumDaoStaking.getDepositProfile(2);
    expect(d.depositProfile.depositContractAddress)
      .to.equal(d.depositContracts[1].contract.address);
    expect(d.depositProfile.rewardContractAddress)
      .to.equal(d.rewardContract.address);
    expect(Number(ethers.utils.formatUnits(
      d.depositProfile.apr, 2
    )))
      .to.equal(d.depositContracts[1].apr);
    expect(Number(ethers.utils.formatUnits(
      d.depositProfile.maxStakedAmount
    )))
      .to.equal(d.depositContracts[1].maxStakedAmount);
    expect(Number(
      d.depositProfile.startTime
    ))
      .to.equal(d.depositContracts[1].startTime);
    expect(Number(
      d.depositProfile.endTime
    ))
      .to.equal(d.depositContracts[1].endTime);
    expect(d.depositProfile.active)
      .to.be.true;
  });

  it("Dynamic staking", async function () {
    await d.syntrumDaoStaking.connect(pool1owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool1size.toString()),
          distribution1period,
          0
        ],
        d.depositContracts[0].contract.address,
        d.rewardContract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link'
        ]
      );

    expect(
      await d.syntrumDaoStaking.isReStakeAvailable(1)
    ).to.be.false;

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await d.syntrumDaoStaking.connect(d.users[0])
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );

    d.users[0].deposited = deposit1amount;
    d.totalDeposited = deposit1amount;

    expect(Number(ethers.utils.formatUnits(
      await d.depositContracts[0].contract.balanceOf(d.syntrumDaoStaking.address)
    ))).to.equal(deposit1amount);
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    ))).to.equal(0);

    await expect(
      d.syntrumDaoStaking.connect(pool1owner).withdrawYieldRemains(1)
    ).to.be.revertedWith('Option available for FSP pool only');

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward = pool1size
      * 3600 * 24 * 10
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    d.response = Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    ));
    expect(roundTo(d.response, 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.shouldBeDistributed = pool1size * 10 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.users[1].deposited = deposit2amount;
    d.totalDeposited += deposit2amount;
    d.response = await d.syntrumDaoStaking.getDepositYield(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.response
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('22 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 22
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward = pool1size * 3600 * 24 * 22
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.shouldBeDistributed += pool1size * 22 * 3600 * 24 / distribution1period;

    hre.timeAndMine.increaseTime('12 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 12
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += pool1size * 3600 * 24 * 12
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.shouldBeDistributed += pool1size * 12 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.users[1].deposited += deposit2amount;
    d.totalDeposited += deposit2amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 11
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += pool1size * 3600 * 24 * 11
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.shouldBeDistributed += pool1size * 11 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[2])
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    d.users[2].deposited = deposit3amount;
    d.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(0);

    hre.timeAndMine.increaseTime('17 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 17
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += pool1size * 3600 * 24 * 17
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward = pool1size * 3600 * 24 * 17
      * d.users[2].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));
    d.shouldBeDistributed += pool1size * 17 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[0])
      .withdrawYield(
        ethers.utils.parseUnits(withdrawYield1amount.toString()),
        1,
        false
      );
    d.users[0].reward -= withdrawYield1amount;

    await d.syntrumDaoStaking.connect(d.users[0])
      .unStake(
        ethers.utils.parseUnits(unstake1amount.toString()),
        1
      );
    d.users[0].deposited -= unstake1amount;
    d.totalDeposited -= unstake1amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    hre.timeAndMine.increaseTime('6 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 6
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += pool1size * 3600 * 24 * 6
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward += pool1size * 3600 * 24 * 6
      * d.users[2].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));
    d.shouldBeDistributed += pool1size * 6 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[1])
      .withdrawYieldAll(1);
    d.users[1].reward = 0;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[2])
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    d.users[2].deposited += deposit3amount;
    d.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 11
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += pool1size * 3600 * 24 * 11
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward += pool1size * 3600 * 24 * 11
      * d.users[2].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));
    d.shouldBeDistributed += pool1size * 11 * 3600 * 24 / distribution1period;

    await expect(
      d.syntrumDaoStaking.connect(pool1owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets can not be withdrawn at the moment');

    hre.timeAndMine.increaseTime('280 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += pool1size * 3600 * 24 * 276
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += pool1size * 3600 * 24 * 276
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward += pool1size * 3600 * 24 * 276
      * d.users[2].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));
    d.shouldBeDistributed += pool1size * 266 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[0])
      .withdrawYieldAll(1);
    await d.syntrumDaoStaking.connect(d.users[1])
      .withdrawYieldAll(1);
    await d.syntrumDaoStaking.connect(d.users[2])
      .withdrawYieldAll(1);

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.rewardContract.balanceOf(d.syntrumDaoStaking.address)
    )), 2)).to.equal(0);

    await expect(
      d.syntrumDaoStaking.connect(d.users[0])
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Sender is not the pool owner');

    await d.syntrumDaoStaking.connect(pool1owner)
      .withdrawLockedAssets(1);

    await expect(
      d.syntrumDaoStaking.connect(pool1owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets are already withdrawn');

    const taxedAmount = lock1amount * tax / decimals;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(d.syntrumDaoStaking.address)
    )), 8)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(pool1owner.address)
    )), 8)).to.equal(roundTo(d.initialTransfer - taxedAmount, 8));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(taxReceiver.address)
    )), 8)).to.equal(roundTo(taxedAmount, 8));
  });

  it("Fixed rate staking", async function () {
    await d.syntrumDaoStaking.connect(pool2owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool2size.toString()),
          distribution2period,
          apr
        ],
        d.depositContracts[1].contract.address,
        d.depositContracts[1].contract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link',
        ]
      );

    const contractBalance = Number(ethers.utils.formatUnits(
      await d.depositContracts[1].contract.balanceOf(d.syntrumDaoStaking.address)
    ));

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await d.syntrumDaoStaking.connect(d.users[0])
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );

    d.users[0].deposited = deposit1amount;
    d.totalDeposited = deposit1amount;

    expect(Number(ethers.utils.formatUnits(
      await d.depositContracts[1].contract.balanceOf(d.syntrumDaoStaking.address)
    ))).to.equal(deposit1amount + contractBalance);
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    ))).to.equal(0);

    await expect(
      d.syntrumDaoStaking.connect(pool2owner).withdrawYieldRemains(1)
    ).to.be.revertedWith('Vault is not expired yet');

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward = d.users[0].deposited
      * apr
      * 3600 * 24 * 10
      / decimals
      / year;
    d.response = Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    ));
    expect(roundTo(d.response, 2)).to.equal(roundTo(d.users[0].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.users[1].deposited = deposit2amount;
    d.totalDeposited += deposit2amount;
    d.response = await d.syntrumDaoStaking.getDepositYield(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.response
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('22 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 22
      / decimals
      / year;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward = d.users[1].deposited
      * apr
      * 3600 * 24 * 22
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    hre.timeAndMine.increaseTime('12 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 12
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += d.users[1].deposited
      * apr
      * 3600 * 24 * 12
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.users[1].deposited += deposit2amount;
    d.totalDeposited += deposit2amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += d.users[1].deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[2])
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    d.users[2].deposited = deposit3amount;
    d.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(0);

    hre.timeAndMine.increaseTime('17 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 17
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += d.users[1].deposited
      * apr
      * 3600 * 24 * 17
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward = d.users[2].deposited
      * apr
      * 3600 * 24 * 17
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[0])
      .withdrawYield(
        ethers.utils.parseUnits(withdrawYield1amount.toString()),
        1,
        false
      );
    d.users[0].reward -= withdrawYield1amount;

    await expect(
      d.syntrumDaoStaking.connect(d.users[0])
        .unStake(
          ethers.utils.parseUnits(unstake1amount.toString()),
          1
        )
    ).to.be.revertedWith('Assets are locked yet');

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    hre.timeAndMine.increaseTime('6 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 6
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += d.users[1].deposited
      * apr
      * 3600 * 24 * 6
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward += d.users[2].deposited
      * apr
      * 3600 * 24 * 6
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[1])
      .withdrawYieldAll(1);
    d.users[1].reward = 0;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[2])
      .stake(
        ethers.utils.parseUnits(deposit3amount.toString()),
        1
      );
    d.users[2].deposited += deposit3amount;
    d.totalDeposited += deposit3amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    hre.timeAndMine.increaseTime('11 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += d.users[1].deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward += d.users[2].deposited
      * apr
      * 3600 * 24 * 11
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    await expect(
      d.syntrumDaoStaking.connect(pool2owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets can not be withdrawn at the moment');

    hre.timeAndMine.increaseTime('280 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward += d.users[0].deposited
      * apr
      * 3600 * 24 * 276
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.users[1].reward += d.users[1].deposited
      * apr
      * 3600 * 24 * 276
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 2)).to.equal(roundTo(d.users[1].reward, 2));
    d.users[2].reward += d.users[2].deposited
      * apr
      * 3600 * 24 * 276
      / decimals
      / year;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(3)
    )), 2)).to.equal(roundTo(d.users[2].reward, 2));

    await d.syntrumDaoStaking.connect(d.users[0])
      .withdrawYieldAll(1);
    await d.syntrumDaoStaking.connect(d.users[1])
      .withdrawYieldAll(1);
    await d.syntrumDaoStaking.connect(d.users[2])
      .withdrawYieldAll(1);

    await expect(
      d.syntrumDaoStaking.connect(d.users[0])
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Sender is not the pool owner');

    await d.syntrumDaoStaking.connect(pool2owner)
      .withdrawLockedAssets(1);

    await expect(
      d.syntrumDaoStaking.connect(pool2owner)
        .withdrawLockedAssets(1)
    ).to.be.revertedWith('Locked assets are already withdrawn');

    await d.syntrumDaoStaking.connect(d.users[0])
      .unStake(
        ethers.utils.parseUnits(unstake1amount.toString()),
        1
      );
    d.users[0].deposited -= unstake1amount;
    d.totalDeposited -= unstake1amount;

    const taxedAmount = lock1amount * tax / decimals;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(d.syntrumDaoStaking.address)
    )), 8)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(pool2owner.address)
    )), 8)).to.equal(roundTo(d.initialTransfer - taxedAmount, 8));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await lock1contract.balanceOf(taxReceiver.address)
    )), 8)).to.equal(roundTo(taxedAmount, 8));
  });

  it("Fixed rate staking, owner withdraw", async function () {
    await d.syntrumDaoStaking.connect(pool2owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool2size.toString()),
          distribution2period,
          apr
        ],
        d.depositContracts[1].contract.address,
        d.depositContracts[1].contract.address,
        [
          'name',
          'depositCurrency',
          'yieldCurrency',
          'link',
        ]
      );

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await d.syntrumDaoStaking.connect(d.users[0])
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );

    d.maxYield = pool2size
      * apr
      * distribution2period
      / decimals
      / year;
    d.users[0].deposited = deposit1amount;
    d.totalDeposited = deposit1amount;
    d.totalYieldExpected = deposit1amount
      * apr
      * distribution2period
      / decimals
      / year;

    d.response = await d.syntrumDaoStaking.getDepositProfileData(1);
    d.totalYield = Number(ethers.utils.formatUnits(
      d.response.totalYield
    ));
    expect(d.totalYield).to.equal(d.totalYieldExpected);

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.totalYieldExpected += deposit2amount
      * apr
      * (distribution2period - 10 * 24 * 3600)
      / decimals
      / year;

    d.response = await d.syntrumDaoStaking.getDepositProfileData(1);
    d.totalYield = Number(ethers.utils.formatUnits(
      d.response.totalYield
    ));
    expect(roundTo(d.totalYield, 4)).to.equal(roundTo(d.totalYieldExpected, 4));

    hre.timeAndMine.increaseTime('365 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    const contractBalance = Number(ethers.utils.formatUnits(
      await d.depositContracts[1].contract.balanceOf(d.syntrumDaoStaking.address)
    ));
    await d.syntrumDaoStaking.connect(pool2owner).withdrawYieldRemains(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.depositContracts[1].contract.balanceOf(d.syntrumDaoStaking.address)
    )), 1)).to.equal(roundTo(
      contractBalance - (d.maxYield - d.totalYield), 1
    ));
  });

  it("Dynamic staking with restake", async function () {
    await d.syntrumDaoStaking.connect(pool1owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool1size.toString()),
          distribution1period,
          0
        ],
        d.rewardContract.address,
        d.rewardContract.address,
        [
          'name',
          'yieldCurrency',
          'yieldCurrency',
          'link'
        ]
      );

    expect(
      await d.syntrumDaoStaking.isReStakeAvailable(1)
    ).to.be.true;

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.contractBalance = Number(ethers.utils.formatUnits(
      await d.rewardContract.balanceOf(d.syntrumDaoStaking.address)
    ));

    await d.syntrumDaoStaking.connect(d.users[0])
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );

    d.users[0].deposited = deposit1amount;
    d.totalDeposited = deposit1amount;

    expect(Number(ethers.utils.formatUnits(
      await d.rewardContract.balanceOf(d.syntrumDaoStaking.address)
    ))).to.equal(d.contractBalance + deposit1amount);
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward = pool1size
      * 3600 * 24 * 10
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(roundTo(d.users[0].reward, 2));
    d.shouldBeDistributed = pool1size * 10 * 3600 * 24 / distribution1period;

    await d.syntrumDaoStaking.connect(d.users[0])
      .reStake(1);

    d.users[0].deposited += d.users[0].reward;
    d.totalDeposited += d.users[0].reward;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(0);

    d.response = await d.syntrumDaoStaking.getDeposit(1);
    expect (roundTo(Number(ethers.utils.formatUnits(
      d.response.amount
    )), 2)).to.equal(roundTo(deposit1amount + d.users[0].reward, 2));


    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.users[1].deposited = deposit2amount;
    d.totalDeposited += deposit2amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 3)).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('22 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });
    d.users[0].reward = pool1size * 3600 * 24 * 22
      * d.users[0].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 3)).to.equal(roundTo(d.users[0].reward, 3));
    d.users[1].reward = pool1size * 3600 * 24 * 22
      * d.users[1].deposited
      / d.totalDeposited
      / distribution1period;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 3)).to.equal(roundTo(d.users[1].reward, 3));
  });

  it("Fixed staking with restake", async function () {
    await d.syntrumDaoStaking.connect(pool1owner)
      .addDepositProfile(
        [
          1,
          ethers.utils.parseUnits(pool1size.toString()),
          distribution1period,
          apr
        ],
        d.rewardContract.address,
        d.rewardContract.address,
        [
          'name',
          'yieldCurrency',
          'yieldCurrency',
          'link'
        ]
      );

    expect(
      await d.syntrumDaoStaking.isReStakeAvailable(1)
    ).to.be.true;

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.contractBalance = Number(ethers.utils.formatUnits(
      await d.rewardContract.balanceOf(d.syntrumDaoStaking.address)
    ));

    await d.syntrumDaoStaking.connect(d.users[0])
      .stake(
        ethers.utils.parseUnits(deposit1amount.toString()),
        1
      );

    d.users[0].deposited = deposit1amount;
    d.totalDeposited = deposit1amount;

    expect(Number(ethers.utils.formatUnits(
      await d.rewardContract.balanceOf(d.syntrumDaoStaking.address)
    ))).to.equal(d.contractBalance + deposit1amount);
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('10 day');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward = d.users[0].deposited
      * apr
      * 3600 * 24 * 10
      / decimals
      / year;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 3)).to.equal(roundTo(d.users[0].reward, 3));

    await d.syntrumDaoStaking.connect(d.users[0])
      .reStake(1);

    d.users[0].deposited += d.users[0].reward;
    d.totalDeposited += d.users[0].reward;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 2)).to.equal(0);

    d.response = await d.syntrumDaoStaking.getDeposit(1);
    expect (roundTo(Number(ethers.utils.formatUnits(
      d.response.amount
    )), 2)).to.equal(roundTo(deposit1amount + d.users[0].reward, 2));


    await d.syntrumDaoStaking.connect(d.users[1])
      .stake(
        ethers.utils.parseUnits(deposit2amount.toString()),
        1
      );
    d.users[1].deposited = deposit2amount;
    d.totalDeposited += deposit2amount;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 3)).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    ))).to.equal(0);

    hre.timeAndMine.increaseTime('22 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    d.users[0].reward = d.users[0].deposited
      * apr
      * 3600 * 24 * 22
      / decimals
      / year;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(1)
    )), 3)).to.equal(roundTo(d.users[0].reward, 3));

    d.users[1].reward = d.users[1].deposited
      * apr
      * 3600 * 24 * 22
      / decimals
      / year;

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumDaoStaking.getDepositYield(2)
    )), 3)).to.equal(roundTo(d.users[1].reward, 3));
  });

  it("Admin functions", async function () {
    await d.depositContracts[0].contract.connect(d.users[0])
      .transfer(d.syntrumDaoStaking.address, ethers.utils.parseUnits(deposit1amount.toString()));
    d.ownerBalance = Number(ethers.utils.formatUnits(
      await d.depositContracts[0].contract.balanceOf(d.owner.address)
    ));
    await d.syntrumDaoStaking.connect(d.owner)
      .adminWithdrawToken(ethers.utils.parseUnits(deposit1amount.toString()), d.depositContracts[0].contract.address);
    expect(Number(ethers.utils.formatUnits(
      await d.depositContracts[0].contract.balanceOf(d.depositContracts[0].contract.address)
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await d.depositContracts[0].contract.balanceOf(d.owner.address)
    ))).to.equal(d.ownerBalance + deposit1amount);
  });

  it("Manager settings", async function () {
    await expect(
      d.syntrumDaoStaking.connect(manager)
        .setLockProfileAmount(1, 11)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      d.syntrumDaoStaking.connect(manager)
        .setLockProfileStatus(1, false)
    ).to.be.revertedWith('Caller is not the manager');

    await d.syntrumDaoStaking.connect(d.owner)
      .addToManagers(manager.address);

    await d.syntrumDaoStaking.connect(manager)
      .setLockProfileAmount(1, 11);
    await d.syntrumDaoStaking.connect(manager)
      .setLockProfileStatus(1, false);

    d.lockProfile = await d.syntrumDaoStaking
      .getLockProfile(1);

    expect(Number(d.lockProfile.amount)).to.be.equal(11);
    expect(d.lockProfile.active).to.be.false;
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}
