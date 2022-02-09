const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialTransfer = 1000;
let signers, etnaContract, mtbContract, erc20Contract, wrongDecimalsContract, lpContract, stakingContract, result, resultStorage = {};
const depositProfile1Apr = 1000;
const depositProfile2Apr = 2000;
const depositProfile3Apr = 10000;
const depositProfile1DepositUsdRate = 1000;
const depositProfile2DepositUsdRate = 1000;
const depositProfile3DepositUsdRate = 2000;
const depositProfile1YieldUsdRate = 1000;
const depositProfile2YieldUsdRate = 500;
const depositProfile3YieldUsdRate = 500;
const downgradeTax = 1000;
const withdrawYieldTax = 1000;
const lockTime = 3600 * 24 * 3;
const decimals = 10000;

beforeEach(async function () {
  signers = await ethers.getSigners();

  const ERC20 = await ethers.getContractFactory("BEP20Token");
  etnaContract = await ERC20.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18);
  await etnaContract.deployed();
  await etnaContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialTransfer.toString()));
  
  mtbContract = await ERC20.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18);
  await mtbContract.deployed();
  await mtbContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialTransfer.toString()));
  
  erc20Contract = await ERC20.deploy(signers[10].address, 'ERC20 token', 'ERC20 token', ethers.utils.parseUnits('1000000'), 18);
  await erc20Contract.deployed();
  await erc20Contract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialTransfer.toString()));
  
  wrongDecimalsContract = await ERC20.deploy(signers[10].address, 'QQ', 'QQ', ethers.utils.parseUnits('1000000'), 0);
  await wrongDecimalsContract.deployed();

  const LP = await ethers.getContractFactory("LPToken");
  lpContract = await LP.deploy(signers[10].address, 'LP token', 'LP token', ethers.utils.parseUnits('1000000'), 18);
  await lpContract.deployed();
  await lpContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialTransfer.toString()));

  const Staking = await ethers.getContractFactory("Staking");
  stakingContract = await Staking.connect(signers[10]).deploy(
    signers[10].address,
    signers[5].address // tax receiver
  );
  await stakingContract.deployed();
  
  await etnaContract.connect(signers[10]).transfer(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[10]).transfer(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await etnaContract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await etnaContract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await mtbContract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await mtbContract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await erc20Contract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await erc20Contract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await lpContract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await lpContract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await stakingContract.connect(signers[10])
    .addDepositProfile(
      etnaContract.address,
      etnaContract.address,
      1,
      depositProfile1Apr,
      0,
      downgradeTax,
      depositProfile1DepositUsdRate,
      depositProfile1YieldUsdRate,
      1,
      lockTime
    );
  await stakingContract.connect(signers[10])
    .setDepositProfileData(
      1,
      'ETNA Bronze Vault',
      'ETNA',
      'ETNA',
      '',
      true
    );
  await stakingContract.connect(signers[10])
    .addDepositProfile(
      etnaContract.address,
      mtbContract.address,
      1,
      depositProfile2Apr,
      0,
      downgradeTax,
      depositProfile2DepositUsdRate,
      depositProfile2YieldUsdRate,
      2,
      lockTime
    );
  await stakingContract.connect(signers[10])
    .setDepositProfileData(
      2,
      'ETNA Bronze Vault',
      'ETNA',
      'MTB',
      '',
      true
    );
  await stakingContract.connect(signers[10])
    .addDepositProfile(
      lpContract.address,
      mtbContract.address,
      2,
      depositProfile3Apr,
      withdrawYieldTax,
      downgradeTax,
      depositProfile3DepositUsdRate,
      depositProfile3YieldUsdRate,
      6,
      lockTime
    );
  await stakingContract.connect(signers[10])
    .setDepositProfileData(
      3,
      'LP Vault',
      'MTB',
      'MTB',
      '',
      true
    );

  await stakingContract.connect(signers[10])
    .setSafeMode(true);
});

describe("Testing Staking contract", function () {
  it("Managing profiles", async function () {
    await expect(
      stakingContract.connect(signers[0])
        .addDepositProfile(
          mtbContract.address,
          etnaContract.address,
          1,
          1000,
          1000,
          1000,
          500,
          1000,
          4,
          3600 * 24 * 30
        )
    )
      .to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[10])
        .addDepositProfile(
          wrongDecimalsContract.address,
          etnaContract.address,
          1,
          1000,
          1000,
          1000,
          500,
          1000,
          4,
          3600 * 24 * 30
        )
    )
      .to.be.revertedWith('Only for tokens with decimals 18');

    await expect(
      stakingContract.connect(signers[10])
        .addDepositProfile(
          mtbContract.address,
          wrongDecimalsContract.address,
          1,
          1000,
          1000,
          1000,
          500,
          1000,
          4,
          3600 * 24 * 30
        )
    )
      .to.be.revertedWith('Only for tokens with decimals 18');

    result = await stakingContract.getDepositProfilesNumber();
    expect(Number(result)).to.equal(3);

    result = await stakingContract.getDepositProfile(1);
    expect(result.depositContractAddress).to.equal(etnaContract.address);
    expect(result.yieldContractAddress).to.equal(etnaContract.address);
    expect(Number(result.depositType)).to.equal(1);
    expect(Number(result.lockTime)).to.equal(lockTime);
    expect(Number(result.tvl)).to.equal(0);
    expect(result.active).to.be.true;

    result = await stakingContract.getDepositProfileExtra(1);
    expect(Number(result.weight)).to.equal(1);
    expect(result.name).to.equal("ETNA Bronze Vault");
    expect(result.depositCurrency).to.equal("ETNA");
    expect(result.yieldCurrency).to.equal("ETNA");
    expect(result.link).to.equal("");

    result = await stakingContract.getDepositProfileRateData(1);
    expect(Number(result.apr)).to.equal(depositProfile1Apr);
    expect(Number(result.withdrawYieldTax)).to.equal(0);
    expect(Number(result.downgradeTax)).to.equal(downgradeTax);
    expect(Number(result.depositUsdRate)).to.equal(depositProfile1DepositUsdRate);
    expect(Number(result.yieldUsdRate)).to.equal(depositProfile1YieldUsdRate);

    await stakingContract.connect(signers[10])
      .setDepositProfileLockTime(3, 2);
    await stakingContract.connect(signers[10])
      .setDepositProfileStatus(3, false);

    result = await stakingContract.getDepositProfile(3);
    expect(Number(result.lockTime)).to.equal(2);
    expect(result.active).to.be.false;

    await stakingContract.connect(signers[10])
      .setDepositProfileName(3, '1');
    await stakingContract.connect(signers[10])
      .setDepositProfileDepositCurrency(3, '2');
    await stakingContract.connect(signers[10])
      .setDepositProfileYieldCurrency(3, '3');
    await stakingContract.connect(signers[10])
      .setDepositProfileLink(3, '4');
    await stakingContract.connect(signers[10])
      .setDepositProfileWeight(3, 2);

    result = await stakingContract.getDepositProfileExtra(3);
    expect(result.name).to.equal("1");
    expect(result.depositCurrency).to.equal("2");
    expect(result.yieldCurrency).to.equal("3");
    expect(result.link).to.equal("4");
    expect(result.weight).to.equal(2);

    await expect(
      stakingContract.connect(signers[10])
        .setDepositProfileWithdrawYieldTax(2, 300)
    )
      .to.be.revertedWith('Tax for yield withdrawal can be set for LP vaults only');

    await stakingContract.connect(signers[10])
      .setDepositProfileApr(3, 11);
    await stakingContract.connect(signers[10])
      .setDepositProfileWithdrawYieldTax(3, 22);
    await stakingContract.connect(signers[10])
      .setDepositProfileDowngradeTax(3, 33);
    await stakingContract.connect(signers[10])
      .setDepositProfileDepositUsdRate(1, 44);
    await stakingContract.connect(signers[10])
      .setDepositProfileYieldUsdRate(1, 55);

    result = await stakingContract.getDepositProfileRateData(3);
    expect(Number(result.apr)).to.equal(11);
    expect(Number(result.withdrawYieldTax)).to.equal(22);
    expect(Number(result.downgradeTax)).to.equal(33);

    result = await stakingContract.getDepositProfileRateData(1);
    expect(Number(result.depositUsdRate)).to.equal(44);
    expect(Number(result.yieldUsdRate)).to.equal(55);
  });

  it("Simple staking", async function () {
    const stakedAmount = 100;

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakedAmount.toString()), 2);

    resultStorage.expectedAmount = stakedAmount;
    resultStorage.expectedAccumulatedYield = 0;
    resultStorage.expectedYield = 0;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield, 4));

    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    await hre.timeAndMine.increaseTime('31 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedAmount = stakedAmount;
    resultStorage.expectedAccumulatedYield = 0;
    resultStorage.expectedYield = stakedAmount
      * depositProfile2Apr / decimals * 31 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    await hre.timeAndMine.increaseTime('150 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedYield += stakedAmount
      * depositProfile2Apr / decimals * 150 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield, 4));

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakedAmount.toString()), 2);

    resultStorage.expectedAmount = stakedAmount + stakedAmount;
    resultStorage.expectedAccumulatedYield = resultStorage.expectedYield
      / depositProfile2DepositUsdRate * depositProfile2YieldUsdRate;
    resultStorage.expectedYield;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.calculateYield(1)
    ));
    expect(roundTo(result, 5))
      .to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    await hre.timeAndMine.increaseTime('100 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedYield += (stakedAmount + stakedAmount)
      * depositProfile2Apr / decimals * 100 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
  });

  it("Combined staking", async function () {
    const stakingAmounts = {}; // [depositProfileId][signerId][]
    const unstakingAmounts = {}; // [depositProfileId][signerId][]
    stakingAmounts[1] = {};
    stakingAmounts[2] = {};
    stakingAmounts[3] = {};
    stakingAmounts[1][0] = 10;
    stakingAmounts[1][1] = 1.9;
    stakingAmounts[2][0] = 12;
    stakingAmounts[2][1] = 1.1;
    stakingAmounts[3][0] = 14;
    stakingAmounts[3][1] = 1.1;
    unstakingAmounts[1] = {};
    unstakingAmounts[2] = {};
    unstakingAmounts[3] = {};
    unstakingAmounts[1][0] = 2;
    unstakingAmounts[1][1] = 3;
    unstakingAmounts[2][0] = 4.3;
    unstakingAmounts[2][1] = 1.1;
    unstakingAmounts[3][0] = 2.1;
    unstakingAmounts[3][1] = 3;

    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(0);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer);
    result = await mtbContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer);
    result = await mtbContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer);
    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakingAmounts[1][0].toString()), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer - stakingAmounts[1][0]);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer + stakingAmounts[1][0]);

    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(1);

    result = await stakingContract.getDeposit(1);
    expect(result.userAddress).to.equal(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result.amount))).to.equal(stakingAmounts[1][0]);
    expect(Number(ethers.utils.formatUnits(result.accumulatedYield))).to.equal(0);

    result = await stakingContract.getUserDeposit(signers[0].address, 1);
    expect(Number(ethers.utils.formatUnits(result.amount))).to.equal(stakingAmounts[1][0]);
    expect(Number(ethers.utils.formatUnits(result.accumulatedYield))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await hre.timeAndMine.increaseTime(`10 days`);
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedYield1 = stakingAmounts[1][0]
      * depositProfile1Apr / decimals * 10 / 365;
    result = Number(ethers.utils.formatUnits(
      await stakingContract.calculateYield(1)
    ));
    expect(roundTo(result, 6))
      .to.equal(roundTo(resultStorage.expectedYield1 , 6));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 6))
      .to.equal(roundTo(resultStorage.expectedYield1 , 6));
    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result.accumulatedYield))).to.equal(0);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakingAmounts[2][0].toString()), 2);

    result = await stakingContract.getDeposit(2);
    expect(Number(ethers.utils.formatUnits(result.amount))).to.equal(stakingAmounts[2][0]);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 6)).to.equal(0);
    result = await stakingContract.calculateYield(2);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 6))
      .to.equal(0);
    await hre.timeAndMine.increaseTime('20 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakingAmounts[3][0].toString()), 3);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakingAmounts[3][1].toString()), 3);

    // deposit 1
    resultStorage.expectedAmount1 = stakingAmounts[1][0];
    resultStorage.expectedAccumulatedYield1 = resultStorage.expectedYield1;
    resultStorage.expectedYield1 += stakingAmounts[1][0]
      * depositProfile1Apr / decimals * 20 / 365;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount1, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 6)).to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 6))
      .to.equal(roundTo(resultStorage.expectedYield1 , 6));

    // deposit 2
    resultStorage.expectedAmount2 = stakingAmounts[2][0];
    resultStorage.expectedAccumulatedYield2 = 0;
    resultStorage.expectedYield2 = stakingAmounts[2][0]
      * depositProfile2Apr / decimals * 20 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 6)).to.equal(roundTo(resultStorage.expectedAccumulatedYield2, 6));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 6))
      .to.equal(roundTo(resultStorage.expectedYield2 , 6));

    // deposit 3
    resultStorage.expectedAmount3 = stakingAmounts[3][0] + stakingAmounts[3][1];
    resultStorage.expectedAccumulatedYield3 = 0;
    resultStorage.expectedYield3 = 0;
    result = await stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield3, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield3, 4));
    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits(unstakingAmounts[1][0].toString()), 1);

    await hre.timeAndMine.increaseTime('20 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    // deposit 1
    resultStorage.expectedAmount1 = stakingAmounts[1][0] - unstakingAmounts[1][0];
    resultStorage.expectedAccumulatedYield1 = resultStorage.expectedYield1;
    resultStorage.expectedYield1 += resultStorage.expectedAmount1
      * depositProfile1Apr / decimals * 20 / 365;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount1, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 6)).to.equal(roundTo(resultStorage.expectedAccumulatedYield1, 6));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield1 , 5));

    // deposit 2
    resultStorage.expectedAmount2 = stakingAmounts[2][0];
    resultStorage.expectedAccumulatedYield2 = 0;
    resultStorage.expectedYield2 += stakingAmounts[2][0]
      * depositProfile2Apr / decimals * 20 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 6)).to.equal(roundTo(resultStorage.expectedAccumulatedYield2, 6));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield2 , 5));

    // deposit 3
    resultStorage.expectedAmount3 = stakingAmounts[3][0] + stakingAmounts[3][1];
    resultStorage.expectedAccumulatedYield3 = 0;
    resultStorage.expectedYield3 = resultStorage.expectedAmount3
      * depositProfile3Apr / decimals * 20 / 365
      * depositProfile3DepositUsdRate / depositProfile3YieldUsdRate;
    result = await stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield3, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(result, 3))
      .to.equal(roundTo(resultStorage.expectedYield3, 3));

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits(unstakingAmounts[2][0].toString()), 2);
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakingAmounts[1][1].toString()), 1);

    await hre.timeAndMine.increaseTime('12 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    // deposit 1
    resultStorage.expectedAmount1 += stakingAmounts[1][1];
    resultStorage.expectedAccumulatedYield1 = resultStorage.expectedYield1;
    resultStorage.expectedYield1 += resultStorage.expectedAmount1
      * depositProfile1Apr / decimals * 12 / 365;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount1, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield1, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield1 , 5));

    // deposit 2
    resultStorage.expectedAmount2 -= unstakingAmounts[2][0];
    resultStorage.expectedAccumulatedYield2 = resultStorage.expectedYield2
      / depositProfile2DepositUsdRate * depositProfile2YieldUsdRate;
    resultStorage.expectedYield2 += resultStorage.expectedAmount2
      * depositProfile2Apr / decimals * 12 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield2, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield2 , 5));

    // deposit 3
    resultStorage.expectedAmount3;
    resultStorage.expectedAccumulatedYield3 = 0;
    resultStorage.expectedYield3 += resultStorage.expectedAmount3
      * depositProfile3Apr / decimals * 12 / 365
      * depositProfile3DepositUsdRate / depositProfile3YieldUsdRate;
    result = await stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield3, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(result, 3))
      .to.equal(roundTo(resultStorage.expectedYield3, 3));

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakingAmounts[2][1].toString()), 2);
    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits(unstakingAmounts[3][0].toString()), 3);
    await stakingContract.connect(signers[0])
      .reStake(1);
    await expect(
      stakingContract.connect(signers[0])
      .reStake(2)
    ).to.be.revertedWith('Restaking is not available for this type of deposit');

    await expect(
      stakingContract.connect(signers[0])
      .reStake(3)
    ).to.be.revertedWith('Restaking is not available for this type of deposit');

    await hre.timeAndMine.increaseTime('7 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    // deposit 1
    resultStorage.expectedAmount1 += resultStorage.expectedYield1;
    resultStorage.expectedAccumulatedYield1 = 0;
    resultStorage.expectedYield1 = resultStorage.expectedAmount1
      * depositProfile1Apr / decimals * 7 / 365;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount1, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield1, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield1 , 5));

    // deposit 2
    resultStorage.expectedAmount2 += stakingAmounts[2][1];
    resultStorage.expectedAccumulatedYield2 = resultStorage.expectedYield2
      / depositProfile2DepositUsdRate * depositProfile2YieldUsdRate;
    resultStorage.expectedYield2 += resultStorage.expectedAmount2
      * depositProfile2Apr / decimals * 7 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield2, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield2 , 4));

    // deposit 3
    resultStorage.expectedAmount3 -= unstakingAmounts[3][0];
    resultStorage.expectedAccumulatedYield3 = resultStorage.expectedYield3
      / depositProfile3DepositUsdRate * depositProfile3YieldUsdRate;
    resultStorage.expectedYield3 += resultStorage.expectedAmount3
      * depositProfile3Apr / decimals * 7 / 365
      * depositProfile3DepositUsdRate / depositProfile3YieldUsdRate;
    result = await stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 3)).to.equal(roundTo(resultStorage.expectedAccumulatedYield3, 3));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(result, 3))
      .to.equal(roundTo(resultStorage.expectedYield3, 3));

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits(unstakingAmounts[1][1].toString()), 1);

    await hre.timeAndMine.increaseTime('10 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    // deposit 1
    resultStorage.expectedAmount1 -= unstakingAmounts[1][1];
    resultStorage.expectedAccumulatedYield1 = resultStorage.expectedYield1;
    resultStorage.expectedYield1 += resultStorage.expectedAmount1
      * depositProfile1Apr / decimals * 10 / 365;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount1, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield1, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield1 , 5));

    // deposit 2
    resultStorage.expectedAmount2;
    resultStorage.expectedAccumulatedYield2;
    resultStorage.expectedYield2 += resultStorage.expectedAmount2
      * depositProfile2Apr / decimals * 10 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield2, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield2 , 4));

    // deposit 3
    resultStorage.expectedAmount3;
    resultStorage.expectedAccumulatedYield3;
    resultStorage.expectedYield3 += resultStorage.expectedAmount3
      * depositProfile3Apr / decimals * 10 / 365
      * depositProfile3DepositUsdRate / depositProfile3YieldUsdRate;
    result = await stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 3)).to.equal(roundTo(resultStorage.expectedAccumulatedYield3, 3));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(result, 3))
      .to.equal(roundTo(resultStorage.expectedYield3, 3));

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits(unstakingAmounts[2][1].toString()), 2);
    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits(unstakingAmounts[3][1].toString()), 3);

    await hre.timeAndMine.increaseTime('15 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    // deposit 1
    resultStorage.expectedAmount1;
    resultStorage.expectedAccumulatedYield1;
    resultStorage.expectedYield1 += resultStorage.expectedAmount1
      * depositProfile1Apr / decimals * 15 / 365;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount1, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield1, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield1 , 5));

    // deposit 2
    resultStorage.expectedAmount2 -= unstakingAmounts[2][1];
    resultStorage.expectedAccumulatedYield2 = resultStorage.expectedYield2
      / depositProfile2DepositUsdRate * depositProfile2YieldUsdRate;
    resultStorage.expectedYield2 += resultStorage.expectedAmount2
      * depositProfile2Apr / decimals * 15 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield2, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield2 , 4));

    // deposit 3
    resultStorage.expectedAmount3 -= unstakingAmounts[3][1];
    resultStorage.expectedAccumulatedYield3 = resultStorage.expectedYield3
      / depositProfile3DepositUsdRate * depositProfile3YieldUsdRate;
    resultStorage.expectedYield3 += resultStorage.expectedAmount3
      * depositProfile3Apr / decimals * 15 / 365
      * depositProfile3DepositUsdRate / depositProfile3YieldUsdRate;
    result = await stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 6)).to.equal(roundTo(resultStorage.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 3)).to.equal(roundTo(resultStorage.expectedAccumulatedYield3, 3));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(result, 2))
      .to.equal(roundTo(resultStorage.expectedYield3, 2));
  });

  it("Withdraw yield", async function () {
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);
    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer - 100);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer + 200);

    await hre.timeAndMine.increaseTime('300 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedYield = 100
      * depositProfile1Apr / decimals * 300 / 365;
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    await expect(
      stakingContract.connect(signers[0])
        .withdrawYield(ethers.utils.parseUnits((resultStorage.expectedYield * 1.001).toString()), 1)
    ).to.be.revertedWith('Not enough yield at deposit');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits(resultStorage.expectedYield.toString()), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(
      initialTransfer - 100 + resultStorage.expectedYield
    );
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(
      initialTransfer + 200 - resultStorage.expectedYield
    );

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result.amount))).to.equal(100);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 5)).to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(0);

    await stakingContract.connect(signers[1])
      .withdrawYieldAll(1);

    result = await etnaContract.balanceOf(signers[1].address);
    expect(roundTo(Number(ethers.utils.formatUnits(result)), 5)).to.equal(
      roundTo(initialTransfer - 100 + resultStorage.expectedYield, 5)
    );
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(roundTo(Number(ethers.utils.formatUnits(result)), 5)).to.equal(
      roundTo(initialTransfer + 200 - resultStorage.expectedYield * 2, 5)
    );

    result = await stakingContract.getDeposit(2);
    expect(Number(ethers.utils.formatUnits(result.amount))).to.equal(100);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 5)).to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(0);
  });

  it("Upgrade / downgrade", async function () {
    const stakedAmount = 100;

    await stakingContract.connect(signers[10])
      .addDepositProfile(
        etnaContract.address,
        etnaContract.address,
        1,
        depositProfile1Apr,
        0,
        downgradeTax,
        depositProfile1DepositUsdRate,
        depositProfile1YieldUsdRate,
        1,
        lockTime
      );
    await stakingContract.connect(signers[10])
      .setDepositProfileUpgradeProfileId(1, 4);
    await stakingContract.connect(signers[10])
      .setDepositProfileDowngradeProfileId(4, 1);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakedAmount.toString()), 1);

    await hre.timeAndMine.increaseTime('31 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedAmount = stakedAmount;
    resultStorage.expectedAccumulatedYield = 0;
    resultStorage.expectedYield = stakedAmount
      * depositProfile1Apr / decimals * 31 / 365
      * depositProfile1DepositUsdRate / depositProfile1YieldUsdRate;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    await expect(
      stakingContract.connect(signers[0])
        .downgrade(1)
      ).to.be.revertedWith('Upgrade for this deposit profile is not possible');

    await stakingContract.connect(signers[0])
      .upgrade(1);

    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedYield, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    result = await stakingContract.getDeposit(2);
    expect(Number(result.depositProfileId)).to.equal(4);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(4, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(0);

    await stakingContract.connect(signers[0])
      .downgrade(4);

    result = await stakingContract.getDepositProfileRateData(4)
    resultStorage.expectedAmount *= (1 - downgradeTax / decimals);
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedYield, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    result = await stakingContract.getDeposit(2);
    expect(Number(result.depositProfileId)).to.equal(4);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(0);
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(4, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(0);
  });

  it("Dynamically changed APR", async function () {
    const stakedAmount1 = 134;
    const stakedAmount2 = 218;
    const depositProfile2AprNew = 3200;

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakedAmount1.toString()), 2);

    await hre.timeAndMine.increaseTime('137 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.expectedAmount = stakedAmount1;
    resultStorage.expectedAccumulatedYield = 0;
    resultStorage.expectedYield = stakedAmount1
      * depositProfile2Apr / decimals * 137 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    )), 4)).to.equal(roundTo(resultStorage.expectedAccumulatedYield, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 5))
      .to.equal(roundTo(resultStorage.expectedYield, 5));

    await stakingContract.connect(signers[10])
      .setDepositProfileApr(2, depositProfile2AprNew);

    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield, 4));

    await hre.timeAndMine.increaseTime('215 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.compoundYield = resultStorage.expectedYield
      / depositProfile2DepositUsdRate * depositProfile2YieldUsdRate;
    resultStorage.expectedYield += (stakedAmount1 + resultStorage.compoundYield)
      * depositProfile2AprNew / decimals * 215 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield, 4));

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits(stakedAmount2.toString()), 2);

    resultStorage.expectedAmount = stakedAmount1 + stakedAmount2;
    resultStorage.expectedYield;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 4))
      .to.equal(roundTo(resultStorage.expectedYield, 4));

    await hre.timeAndMine.increaseTime('94 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    resultStorage.yieldWithoutUsdRate = resultStorage.expectedYield
      / depositProfile2DepositUsdRate * depositProfile2YieldUsdRate;
    resultStorage.expectedAmount = stakedAmount1 + stakedAmount2;
    resultStorage.expectedYield += (stakedAmount1 + stakedAmount2)
      * depositProfile2AprNew / decimals * 94 / 365
      * depositProfile2DepositUsdRate / depositProfile2YieldUsdRate;
    result = await stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      result.amount
    )), 4)).to.equal(roundTo(resultStorage.expectedAmount, 4));
    result = Number(ethers.utils.formatUnits(
      await stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(result, 3))
      .to.equal(roundTo(resultStorage.expectedYield, 3));
  });

  it("Withdraw admin", async function () {
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer - 100);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer + 100);
    result = await etnaContract.balanceOf(signers[10].address);
    let ownerBalance = Number(ethers.utils.formatUnits(result));

    await stakingContract.connect(signers[10])
      .adminWithdrawToken(ethers.utils.parseUnits('10'), etnaContract.address);

    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialTransfer + 100 - 10);
    result = await etnaContract.balanceOf(signers[10].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(ownerBalance + 10);
  });

  it("Safe mode", async function () {
    await stakingContract.connect(signers[10])
      .adminWithdrawToken(
        ethers.utils.parseUnits(initialTransfer.toString()),
        etnaContract.address
      );
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);
    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    await hre.timeAndMine.increaseTime('300 days');
    await signers[0].sendTransaction({
      to: signers[1].address,
      value: 0
    });

    await expect(
      stakingContract.connect(signers[0])
        .withdrawYield(ethers.utils.parseUnits('1'), 1)
    ).to.be.revertedWith('Not enough contract balance (safe mode)');

    await expect(
      stakingContract.connect(signers[10])
      .adminWithdrawToken(
        ethers.utils.parseUnits('1'),
        etnaContract.address
      )
    ).to.be.revertedWith('Not enough contract balance (safe mode)');

    await stakingContract.connect(signers[10])
      .setSafeMode(false);

    await stakingContract.connect(signers[10])
      .adminWithdrawToken(
        ethers.utils.parseUnits('1'),
        etnaContract.address
      );

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('1'), 1);
  });

  it("Set user deposit", async function () {
    const amount = 50;
    const yieldAmount = 10;
    const unlock = 10;

    await stakingContract.connect(signers[10])
      .addToManagers(signers[9].address);
    await stakingContract.connect(signers[9])
      .setUserDeposit(
        signers[0].address,
        1,
        ethers.utils.parseUnits(amount.toString()),
        ethers.utils.parseUnits(yieldAmount.toString()),
        unlock
      );
    await stakingContract.connect(signers[9])
      .setUserDeposit(
        signers[1].address,
        3,
        ethers.utils.parseUnits(amount.toString()),
        ethers.utils.parseUnits(yieldAmount.toString()),
        unlock
      );
    await stakingContract.connect(signers[9])
      .setUserDeposit(
        signers[2].address,
        2,
        ethers.utils.parseUnits(amount.toString()),
        ethers.utils.parseUnits(yieldAmount.toString()),
        unlock
      );
    result = await stakingContract.getDeposit(1);
    expect(result.userAddress).to.equal(signers[0].address);
    expect(Number(result.depositProfileId)).to.equal(1);
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(result.unlock)).to.equal(unlock);

    result = await stakingContract.getDeposit(2);
    expect(result.userAddress).to.equal(signers[1].address);
    expect(Number(result.depositProfileId)).to.equal(3);
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(result.unlock)).to.equal(unlock);
    result = await stakingContract.getUserDeposit(
      signers[2].address,
      1
    );
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(0);
    expect(Number(result.unlock)).to.equal(0);
    result = await stakingContract.getUserDeposit(
      signers[2].address,
      2
    );
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(result.unlock)).to.equal(unlock);
    await stakingContract.connect(signers[9])
      .setUserDeposit(
        signers[0].address,
        1,
        ethers.utils.parseUnits((amount * 2).toString()),
        ethers.utils.parseUnits((yieldAmount * 3).toString()),
        unlock
      );
    result = await stakingContract.getDeposit(1);
    expect(result.userAddress).to.equal(signers[0].address);
    expect(Number(result.depositProfileId)).to.equal(1);
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount * 2);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount * 3);
    expect(Number(result.unlock)).to.equal(unlock);

    let addresses = [];
    let profileIds = [];
    let amounts = [];
    let yieldAmounts = [];
    let unlocks = [];

    for (let i = 3; i <= 42; i ++) {
      addresses.push(signers[i].address);
      profileIds.push(1);
      amounts.push(ethers.utils.parseUnits(amount.toString()));
      yieldAmounts.push(ethers.utils.parseUnits(yieldAmount.toString()));
      unlocks.push(unlock);
    }
    for (let i = 43; i <= 82; i ++) {
      addresses.push(signers[i - 40].address);
      profileIds.push(2);
      amounts.push(ethers.utils.parseUnits((amount * 2).toString()));
      yieldAmounts.push(ethers.utils.parseUnits((yieldAmount * 2).toString()));
      unlocks.push(unlock);
    }
    for (let i = 83; i <= 102; i ++) {
      addresses.push(signers[i - 80].address);
      profileIds.push(3);
      amounts.push(ethers.utils.parseUnits((amount * 3).toString()));
      yieldAmounts.push(ethers.utils.parseUnits((yieldAmount * 3).toString()));
      unlocks.push(unlock);
    }
    await stakingContract.connect(signers[9])
      .setUserDepositMultiple(
        addresses,
        profileIds,
        amounts,
        yieldAmounts,
        unlocks
      );
    result = await stakingContract.getDeposit(6);
    expect(result.userAddress).to.equal(signers[5].address);
    expect(Number(result.depositProfileId)).to.equal(1);
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(result.unlock)).to.equal(unlock);

    result = await stakingContract.getUserDeposit(
      signers[6].address,
      1
    );
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(result.unlock)).to.equal(unlock);

    result = await stakingContract.getUserDeposit(
      signers[6].address,
      2
    );
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount * 2);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount * 2);
    expect(Number(result.unlock)).to.equal(unlock);

    result = await stakingContract.getUserDeposit(
      signers[6].address,
      3
    );
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount * 3);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount * 3);
    expect(Number(result.unlock)).to.equal(unlock);

    result = await stakingContract.getDepositProfileExtra(1);
    expect(Number(result.stakers)).to.equal(41);

    addresses = [];
    profileIds = [];
    amounts = [];
    yieldAmounts = [];
    unlocks = [];

    for (let i = 1; i <= 100; i ++) {
      addresses.push(signers[i + 50].address);
      profileIds.push(1);
      amounts.push(ethers.utils.parseUnits(amount.toString()));
      yieldAmounts.push(ethers.utils.parseUnits(yieldAmount.toString()));
      unlocks.push(unlock);
    }
    await stakingContract.connect(signers[9])
      .setUserDepositMultiple(
        addresses,
        profileIds,
        amounts,
        yieldAmounts,
        unlocks
      );

    result = await stakingContract.getUserDeposit(
      signers[150].address,
      1
    );
    expect(Number(ethers.utils.formatUnits(
      result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(result.unlock)).to.equal(unlock);
  });

  it("Manager settings", async function () {
    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileApr(1, 11)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileWithdrawYieldTax(3, 22)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileDowngradeTax(1, 33)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileDepositUsdRate(1, 44)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileYieldUsdRate(1, 55)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileWeight(1, 66)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileLockTime(1, 77)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileName(1, 'name')
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileDepositCurrency(1, 'depositCurrency')
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileYieldCurrency(1, 'yieldCurrency')
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileLink(1, 'link')
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setDepositProfileStatus(1, false)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setSafeMode(false)
    ).to.be.revertedWith('Caller is not the manager');

    await expect(
      stakingContract.connect(signers[9])
        .setTaxReceiverAddress(signers[0].address)
    ).to.be.revertedWith('Caller is not the manager');

    await stakingContract.connect(signers[10])
      .addToManagers(signers[9].address);

    await stakingContract.connect(signers[9])
      .setDepositProfileApr(1, 11);

    await stakingContract.connect(signers[9])
      .setDepositProfileWithdrawYieldTax(3, 22);

    await stakingContract.connect(signers[9])
      .setDepositProfileDowngradeTax(1, 33);

    await stakingContract.connect(signers[9])
      .setDepositProfileDepositUsdRate(1, 44);

    await stakingContract.connect(signers[9])
      .setDepositProfileYieldUsdRate(1, 55);

    await stakingContract.connect(signers[9])
      .setDepositProfileWeight(1, 66);

    await stakingContract.connect(signers[9])
      .setDepositProfileLockTime(1, 77);

    await stakingContract.connect(signers[9])
      .setDepositProfileName(1, 'name');

    await stakingContract.connect(signers[9])
      .setDepositProfileDepositCurrency(1, 'depositCurrency');

    await stakingContract.connect(signers[9])
      .setDepositProfileYieldCurrency(1, 'yieldCurrency');

    await stakingContract.connect(signers[9])
      .setDepositProfileLink(1, 'link');

    await stakingContract.connect(signers[9])
      .setDepositProfileStatus(1, false);

    await stakingContract.connect(signers[9])
      .setSafeMode(false);
    result = await stakingContract
      .getSafeMode();
    expect(result).to.be.false;

    await stakingContract.connect(signers[9])
      .setSafeMode(true);
    result = await stakingContract
      .getSafeMode();
    expect(result).to.be.true;

    await stakingContract.connect(signers[9])
      .setTaxReceiverAddress(signers[0].address);
    result = await stakingContract.connect(signers[9])
      .getTaxReceiverAddress();
    expect(result).to.equal(signers[0].address);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}
