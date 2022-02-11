const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialEtnaTransfer = 1000;
let signers, etnaContract, erc20Contract, wrongDecimalsContract, lpContract, stakingContract, result, tempResult;

beforeEach(async function () {
  signers = await ethers.getSigners();

  const ETNA = await ethers.getContractFactory("BEP20Token");
  etnaContract = await ETNA.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18);
  await etnaContract.deployed();
  await etnaContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  const ERC20 = await ethers.getContractFactory("BEP20Token");
  erc20Contract = await ERC20.deploy(signers[10].address, 'ERC20 token', 'ERC20 token', ethers.utils.parseUnits('1000000'), 18);
  await erc20Contract.deployed();
  await erc20Contract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  const WrongDecimals = await ethers.getContractFactory("BEP20Token");
  wrongDecimalsContract = await WrongDecimals.deploy(signers[10].address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 0);
  await wrongDecimalsContract.deployed();

  const LP = await ethers.getContractFactory("LPToken");
  lpContract = await LP.deploy(signers[10].address, 'LP token', 'LP token', ethers.utils.parseUnits('1000000'), 18);
  await lpContract.deployed();
  await lpContract.connect(signers[10]).transfer(signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  const Staking = await ethers.getContractFactory("Staking");
  stakingContract = await Staking.connect(signers[10]).deploy(
    etnaContract.address,
    signers[10].address // owner
  );
  await stakingContract.deployed();
  await etnaContract.connect(signers[10]).transfer(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[10]).transfer(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[10]).transfer(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  await etnaContract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await etnaContract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  await erc20Contract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await erc20Contract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  await lpContract.connect(signers[0]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[1]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[2]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[3]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
  await lpContract.connect(signers[4]).approve(stakingContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

  await stakingContract.connect(signers[10])
    .adminAddDepositProfile(
      etnaContract.address,
      1,
      1000,
      0,
      100,
      1,
      3600 * 24 * 7,
      'ETNA Earth Vault',
      true,
      true
    );

  await stakingContract.connect(signers[10])
    .adminAddDepositProfile(
      erc20Contract.address,
      2,
      2000,
      0,
      100,
      2,
      3600 * 24 * 14,
      'ERC20 Silver Vault',
      true,
      false
    );

  await stakingContract.connect(signers[10])
    .adminSetSafeMode(true);
});

describe("Testing Staking contract", function () {
  it("Managing profiles", async function () {
    await expect(
      stakingContract.connect(signers[0])
        .adminAddDepositProfile(
          etnaContract.address,
          1,
          3000,
          0,
          100,
          3,
          3600 * 24 * 30,
          'ETNA Platinum Vault',
          true,
          true
        )
    )
      .to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      stakingContract.connect(signers[10])
        .adminAddDepositProfile(
          wrongDecimalsContract.address,
          2,
          3000,
          0,
          100,
          3,
          3600 * 24 * 30,
          'ETNA Platinum Vault',
          true,
          true
        )
    )
      .to.be.revertedWith('Only for tokens with decimals 18');

    result = await stakingContract.getDepositProfilesNumber();
    expect(Number(result)).to.equal(2);

    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        etnaContract.address,
        1,
        3000,
        1000,
        100,
        3,
        3600 * 24 * 30,
        'ETNA Platinum Vault',
        true,
        true
      );

    await expect(
      stakingContract.connect(signers[10])
        .adminAddDepositProfile(
          wrongDecimalsContract.address,
          3,
          3000,
          1000,
          100,
          3,
          3600 * 24 * 30,
          'ETNA Platinum Vault',
          true,
          true
        )
    )
      .to.be.revertedWith('Only for tokens with decimals 18');

    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        erc20Contract.address,
        2,
        4000,
        1000,
        100,
        4,
        3600 * 24 * 60,
        'ERC20 Vault',
        true,
        false
      );

    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        lpContract.address,
        3,
        11000,
        1000,
        200,
        4,
        3600 * 24 * 60,
        'LP Vault',
        true,
        false
      );

    result = await stakingContract.getDepositProfilesNumber();
    expect(Number(result)).to.equal(5);

    result = await stakingContract.getDepositProfile(3);
    expect(result[0]).to.equal(etnaContract.address);
    expect(Number(result[1])).to.equal(1);
    expect(Number(result[2])).to.equal(3000);
    expect(Number(result[3])).to.equal(0);
    expect(Number(result[4])).to.equal(0);
    expect(Number(result[5])).to.equal(3600 * 24 * 30);
    expect(result[6]).to.be.true;

    result = await stakingContract.getDepositProfileExtra(3);
    expect(Number(result[0])).to.equal(3);
    expect(result[1]).to.equal("ETNA Platinum Vault");
    expect(result[2]).to.equal("ETNA");

    result = await stakingContract.getDepositProfile(4);
    expect(result[0]).to.equal(erc20Contract.address);
    expect(Number(result[1])).to.equal(2);
    expect(Number(result[2])).to.equal(4000);
    expect(Number(result[3])).to.equal(0);
    expect(Number(result[4])).to.equal(0);
    expect(Number(result[5])).to.equal(3600 * 24 * 60);
    expect(result[6]).to.be.false;

    result = await stakingContract.getDepositProfileExtra(4);
    expect(Number(result[0])).to.equal(4);
    expect(result[1]).to.equal("ERC20 Vault");
    expect(result[2]).to.equal("ETNA");

    result = await stakingContract.getDepositProfile(5);
    expect(result[0]).to.equal(lpContract.address);
    expect(Number(result[1])).to.equal(3);
    expect(Number(result[2])).to.equal(11000);
    expect(Number(result[3])).to.equal(1000);
    expect(Number(result[4])).to.equal(0);
    expect(Number(result[5])).to.equal(3600 * 24 * 60);
    expect(result[6]).to.be.false;

    result = await stakingContract.getDepositProfileExtra(5);
    expect(Number(result[0])).to.equal(4);
    expect(result[1]).to.equal("LP Vault");
    expect(result[2]).to.equal("ETNA");

    await stakingContract.connect(signers[10])
      .adminSetDepositCurrency(5, 'LP mod');

    await stakingContract.connect(signers[10])
      .adminSetDepositLink(5, 'https://google.com');

    await stakingContract.connect(signers[10])
      .adminSetDepositApr(5, 12000);

    result = await stakingContract.getDepositProfileExtra(5);
    expect(result[2]).to.equal("LP mod");
    expect(result[4]).to.equal("https://google.com");

    result = await stakingContract.getDepositProfile(5);
    expect(Number(result[2])).to.equal(12000);


    await stakingContract.connect(signers[10])
      .adminSetDepositApr(3, 7000);

    result = await stakingContract.getDepositProfile(3);
    expect(Number(result[2])).to.equal(7000);

    await expect(
      stakingContract.connect(signers[10])
        .adminSetDepositTax(3, 300)
    )
      .to.be.revertedWith('Tax can be set for LP tokens only');

    await expect(
      stakingContract.connect(signers[10])
        .adminSetDepositTax(4, 300)
    )
      .to.be.revertedWith('Tax can be set for LP tokens only');

    await stakingContract.connect(signers[10])
      .adminSetDepositTax(5, 300);

    result = await stakingContract.getDepositProfile(5);
    expect(Number(result[3])).to.equal(300);

    await expect(
      stakingContract.connect(signers[10])
        .adminSetDepositRate(3, 8000)
    )
      .to.be.revertedWith('Rate can be set for ERC20 tokens only');

    await expect(
      stakingContract.connect(signers[10])
        .adminSetDepositRate(5, 8000)
    )
      .to.be.revertedWith('Rate can be set for ERC20 tokens only');

    await stakingContract.connect(signers[10])
      .adminSetDepositRate(4, 8000);

    result = await stakingContract.getDepositProfileRate(4);
    expect(Number(result)).to.equal(8000);

    await stakingContract.connect(signers[10])
      .adminSetDepositLockTime(4, 10);

    result = await stakingContract.getDepositProfile(4);
    expect(Number(result[5])).to.equal(10);

    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(4, false);

    result = await stakingContract.getDepositProfile(4);
    expect(result[6]).to.be.false;

    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(4, true);

    result = await stakingContract.getDepositProfile(4);
    expect(result[6]).to.be.true;

    await stakingContract.connect(signers[10])
      .adminSetDepositWeight(4, 25);

    result = await stakingContract.getDepositProfileExtra(4);
    expect(Number(result[0])).to.equal(25);

    await stakingContract.connect(signers[10])
      .adminSetDepositName(4, 'New name');

    result = await stakingContract.getDepositProfileExtra(4);
    expect(result[1]).to.equal('New name');
  });
  it("Stake ETNA", async function () {
    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(0);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 10);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 10);

    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(1);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(10);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.getUserDeposit(signers[0].address, 1);
    expect(Number(result[0])).to.equal(1);
    expect(Number(result[1])).to.equal(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(10);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await hre.timeAndMine.increaseTime('10 days');

    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.0273);
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 1);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(20);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.0273);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await hre.timeAndMine.increaseTime('20 days');

    await stakingContract.connect(signers[2])
      .stake(ethers.utils.parseUnits('10'), 1);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.1095);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(20);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.0273);

    result = await stakingContract.getDeposit(2);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(2);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.5479);

    result = await stakingContract.getDepositProfile(1);
    expect(Number(ethers.utils.formatUnits(result[4]))).to.equal(130);
  });
  it("unStake ETNA", async function () {
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 10);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 10);

    result = await stakingContract.getDepositProfile(1);
    expect(Number(ethers.utils.formatUnits(result[4]))).to.equal(10);

    await expect(
      stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 1)
    ).to.be.revertedWith('Deposit is locked');

    await hre.timeAndMine.increaseTime('6 days');

    await expect(
      stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 1)
    ).to.be.revertedWith('Deposit is locked');

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 1);

    result = await stakingContract.getDepositProfile(1);
    expect(Number(ethers.utils.formatUnits(result[4]))).to.equal(20);

    await hre.timeAndMine.increaseTime('6 days');

    await expect(
      stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 1)
    ).to.be.revertedWith('Deposit is locked');

    await hre.timeAndMine.increaseTime('2 days');
    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 1);

    result = await stakingContract.getDepositProfile(1);
    expect(Number(ethers.utils.formatUnits(result[4]))).to.equal(19);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 10 - 10 + 1);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 10 + 10 - 1);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(19);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.0602);
  });
  it("reStake ETNA", async function () {
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);
    await stakingContract.connect(signers[2])
      .stake(ethers.utils.parseUnits('30'), 1);

    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(2, true);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 2);

    await hre.timeAndMine.increaseTime('6 days');

    await stakingContract.connect(signers[0])
      .reStake(1);

    await expect(
      stakingContract.connect(signers[0])
        .reStake(2)
    ).to.be.revertedWith('Available for ETNA deposits only');

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[2])) * 10000) / 10000;
    expect(tempResult).to.equal(100.1643);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.getDepositProfile(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[4])) * 10000) / 10000;
    expect(tempResult).to.equal(130.1643);

    await hre.timeAndMine.increaseTime('2 days');

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100 + 1);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 + 30 - 1);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[2])) * 10000) / 10000;
    expect(tempResult).to.equal(99.1643);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.0548);
  });
  it("Withdraw yield ETNA", async function () {
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);

    await hre.timeAndMine.increaseTime('300 days');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('5'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 95);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 95);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(3.2191);
  });
  it("Stake ERC20", async function () {
    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(0);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);

    await expect(
      stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2)
    ).to.be.revertedWith('This deposit profile is disabled');

    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(2, true);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 10);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 10);

    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(1);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(2);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(10);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.getUserDeposit(signers[0].address, 2);
    expect(Number(result[0])).to.equal(1);
    expect(Number(result[1])).to.equal(2);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(10);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await hre.timeAndMine.increaseTime('10 days');

    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.0547);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(20);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.0547);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await hre.timeAndMine.increaseTime('20 days');

    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('10'), 1);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.2191);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(20);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.0547);

    result = await stakingContract.getDeposit(2);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(110);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.5479);

    result = await stakingContract.calculateYield(2);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0);
  });
  it("unStake ERC20", async function () {
    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(2, true);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 10);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 10);

    await expect(
      stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 2)
    ).to.be.revertedWith('Deposit is locked');

    await hre.timeAndMine.increaseTime('13 days');

    await expect(
      stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 2)
    ).to.be.revertedWith('Deposit is locked');

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2);

    await hre.timeAndMine.increaseTime('13 days');

    await expect(
      stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 2)
    ).to.be.revertedWith('Deposit is locked');

    await hre.timeAndMine.increaseTime('2 days');

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('1'), 2);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 10 - 10 + 1);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 10 + 10 - 1);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(2);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(19);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(0.2356);
  });
  it("Withdraw yield ERC20", async function () {
    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(2, true);

    await stakingContract.connect(signers[10])
      .adminSetDepositRate(2, 200);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 2);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);
    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);

    await hre.timeAndMine.increaseTime('300 days');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('5'), 2);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);
    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 5);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 5);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(2);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(27.8767);

    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        erc20Contract.address,
        2,
        2000,
        0,
        100,
        2,
        3600 * 24 * 14,
        'ERC20 Silver Vault',
        false,
        true
      );

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 3);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100 - 100);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 + 100);

    await hre.timeAndMine.increaseTime('300 days');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('5'), 3);

    result = await erc20Contract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100 - 100 + 5);
    result = await erc20Contract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 + 100 - 5);
    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 5);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 5);

    result = await stakingContract.getDeposit(2);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(3);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(11.4383);
  });
  it("Stake LP Token", async function () {
    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        lpContract.address,
        2,
        3000,
        1000,
        200,
        3,
        3600 * 24 * 30,
        'LP Vault',
        true,
        true
      );

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 3);

    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await lpContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);

    result = await stakingContract.getDepositsNumber();
    expect(Number(result)).to.equal(1);
    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(3);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.getUserDeposit(signers[0].address, 3);
    expect(Number(result[0])).to.equal(1);
    expect(Number(result[1])).to.equal(3);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);

    await hre.timeAndMine.increaseTime('10 days');

    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[5]))).to.equal(0);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(1.6438);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 3);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(110);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(1.6438);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);
  });
  it("unStake LP Token", async function () {
    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        lpContract.address,
        3,
        3000,
        1500,
        200,
        3,
        3600 * 24 * 30,
        'LP Vault',
        true,
        true
      );

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 3);

    await hre.timeAndMine.increaseTime('20 days');

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('10'), 3);

    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100 + 10);
    result = await lpContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 - 10);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 3);

    await hre.timeAndMine.increaseTime('20 days');

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('10'), 3);

    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100 + 10 - 100 + 10);
    result = await lpContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 - 10 + 100 - 10);

    await hre.timeAndMine.increaseTime('11 days');

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('10'), 3);

    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100 + 10 - 100 + 10 + 10);
    result = await lpContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 - 10 + 100 - 10 - 10);

    result = await stakingContract.getWithdrawTaxAmount();
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);
  });
  it("Withdraw yield LP Token", async function () {
    await stakingContract.connect(signers[10])
      .adminAddDepositProfile(
        lpContract.address,
        3,
        3000,
        2000,
        200,
        3,
        3600 * 24 * 110,
        'LP Vault',
        true,
        true
      );

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 3);

    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await lpContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);
    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer);

    await hre.timeAndMine.increaseTime('100 days');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('1'), 3);

    result = await lpContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await lpContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);
    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 0.8);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 0.8);

    await hre.timeAndMine.increaseTime('20 days');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('1'), 3);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 1.8);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 1.8);

    await hre.timeAndMine.increaseTime('180 days');

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('5'), 3);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 6.8);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 6.8);

    result = await stakingContract.getDeposit(1);
    expect(result[0]).to.equal(signers[0].address);
    expect(Number(result[1])).to.equal(3);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(100);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 10000) / 10000;
    expect(tempResult).to.equal(91.6301);
  });
  it("Dynamically changed rate", async function () {
    await stakingContract.connect(signers[10])
      .adminSetDepositStatus(2, true);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2);

    await hre.timeAndMine.increaseTime('10 days');

    await stakingContract.connect(signers[10])
      .adminSetDepositApr(2, 3000);
    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.0547);

    await hre.timeAndMine.increaseTime('20 days');
    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('10'), 2);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.22);

    await stakingContract.connect(signers[10])
      .adminSetDepositApr(2, 4000);
    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 10000) / 10000;
    expect(tempResult).to.equal(0.22);

    await hre.timeAndMine.increaseTime('15 days');

    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await stakingContract.calculateYield(1);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result)) * 1000) / 1000;
    expect(tempResult).to.equal(0.388);

    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('10'), 2);

    result = await stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(result[2]))).to.equal(20);
    tempResult = Math.floor(Number(ethers.utils.formatUnits(result[5])) * 1000) / 1000;
    expect(tempResult).to.equal(0.388);

    result = await stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(0);
  });
  it("Withdraw admin", async function () {
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);

    result = await etnaContract.balanceOf(signers[0].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer - 100);
    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100);
    result = await etnaContract.balanceOf(signers[10].address);
    let ownerBalance = Number(ethers.utils.formatUnits(result));

    await stakingContract.connect(signers[10])
      .adminWithdrawToken(ethers.utils.parseUnits('10'), etnaContract.address);

    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 - 10);
    result = await etnaContract.balanceOf(signers[10].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(ownerBalance + 10);

    await stakingContract.connect(signers[10])
      .adminWithdrawEtna(ethers.utils.parseUnits('20'));

    result = await etnaContract.balanceOf(stakingContract.address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(initialEtnaTransfer + 100 - 10 - 20);
    result = await etnaContract.balanceOf(signers[10].address);
    expect(Number(ethers.utils.formatUnits(result))).to.equal(ownerBalance + 10 + 20);
  });
  it("Safe mode", async function () {
    await stakingContract.connect(signers[10])
      .adminWithdrawEtna(ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await stakingContract.connect(signers[0])
      .stake(ethers.utils.parseUnits('100'), 1);
    await stakingContract.connect(signers[1])
      .stake(ethers.utils.parseUnits('100'), 1);

    await hre.timeAndMine.increaseTime('300 days');

    await stakingContract.connect(signers[0])
      .unStake(ethers.utils.parseUnits('100'), 1);

    await expect(
      stakingContract.connect(signers[0])
        .withdrawYield(ethers.utils.parseUnits('1'), 1)
    ).to.be.revertedWith('Not enough contract balance (safe mode)');

    await expect(
      stakingContract.connect(signers[10])
      .adminWithdrawEtna(ethers.utils.parseUnits('1'))
    ).to.be.revertedWith('Not enough contract balance (safe mode)');

    await stakingContract.connect(signers[10])
      .adminSetSafeMode(false);

    await stakingContract.connect(signers[10])
      .adminWithdrawEtna(ethers.utils.parseUnits('1'));

    await stakingContract.connect(signers[0])
      .withdrawYield(ethers.utils.parseUnits('1'), 1);
  });
  it("Admin settings", async function () {
    await stakingContract.connect(signers[10])
      .adminSetEtnaContract(signers[10].address);

    result = await stakingContract.getEtnaContract();
    expect(result).to.equal(signers[10].address);

    await stakingContract.connect(signers[10])
      .adminSetEtnaContract(etnaContract.address);

    result = await stakingContract.getEtnaContract();
    expect(result).to.equal(etnaContract.address);
  });
});
