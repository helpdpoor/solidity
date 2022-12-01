const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const d = {};
const initialTransfer = 1000;
const depositProfile1Apr = 1000;
const depositProfile2Apr = 2000;
const depositProfile3Apr = 2000;
const depositProfile4Apr = 10000;
const token1UsdRate = 1000;
const token2UsdRate = 1000;
const token3UsdRate = 2000;
const lpUsdRate = 2000;
const downgradeTax = 1000;
const withdrawYieldTax = 1000;
const lockTime = 3600 * 24 * 3;
const decimals = 10000;
const { alchemyApiKey } = require('../secrets.json');

const profileTypes = {
  ERC20_TOKEN: 1,
  LP_FARMING: 2,
}

beforeEach(async function () {
  // await hre.network.provider.request({
  //   method: "hardhat_reset",
  //   params: [
  //     {
  //       forking: {
  //         jsonRpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey.polygonMainnet}`,
  //         blockNumber: 35424350,
  //       },
  //     },
  //   ],
  // });
  d.signers = await ethers.getSigners();
  d.owner = d.signers[10];
  d.taxReceiver = d.signers[5];
  d.user1 = d.signers[0];
  d.user2 = d.signers[1];
  d.user3 = d.signers[2];
  d.user4 = d.signers[3];
  d.user5 = d.signers[4];
  const Rates = await ethers.getContractFactory("Rates");
  d.rates = await Rates.deploy(
    d.owner.address,
    d.owner.address
  );
  await d.rates.deployed();
  
  const ERC20 = await ethers.getContractFactory("ERC20Token");
  d.token1 = await ERC20.deploy(d.owner.address, 'TOKEN1', 'TOKEN1', ethers.utils.parseUnits('1000000'), 18);
  await d.token1.deployed();
  
  await d.token1.connect(d.owner).transfer(d.user1.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.owner).transfer(d.user2.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.owner).transfer(d.user3.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.owner).transfer(d.user4.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.owner).transfer(d.user5.address, ethers.utils.parseUnits(initialTransfer.toString()));

  d.token2 = await ERC20.deploy(d.owner.address, 'TOKEN2', 'TOKEN2', ethers.utils.parseUnits('1000000'), 18);
  await d.token2.deployed();
  await d.token2.connect(d.owner).transfer(d.user1.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.owner).transfer(d.user2.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.owner).transfer(d.user3.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.owner).transfer(d.user4.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.owner).transfer(d.user5.address, ethers.utils.parseUnits(initialTransfer.toString()));

  d.token3 = await ERC20.deploy(d.owner.address, 'TOKEN3', 'TOKEN3', ethers.utils.parseUnits('1000000', 6), 6);
  await d.token3.deployed();
  await d.token3.connect(d.owner).transfer(d.user1.address, ethers.utils.parseUnits(initialTransfer.toString(), 6));
  await d.token3.connect(d.owner).transfer(d.user2.address, ethers.utils.parseUnits(initialTransfer.toString(), 6));
  await d.token3.connect(d.owner).transfer(d.user3.address, ethers.utils.parseUnits(initialTransfer.toString(), 6));
  await d.token3.connect(d.owner).transfer(d.user4.address, ethers.utils.parseUnits(initialTransfer.toString(), 6));
  await d.token3.connect(d.owner).transfer(d.user5.address, ethers.utils.parseUnits(initialTransfer.toString(), 6));
  
  d.lpToken = await ERC20.deploy(d.owner.address, 'LP token', 'LP token', ethers.utils.parseUnits('1000000'), 18);
  await d.lpToken.deployed();
  await d.lpToken.connect(d.owner).transfer(d.user1.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.owner).transfer(d.user2.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.owner).transfer(d.user3.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.owner).transfer(d.user4.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.owner).transfer(d.user5.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await d.rates.connect(d.owner).setUsdRate(
    d.token1.address, token1UsdRate
  );
  await d.rates.connect(d.owner).setUsdRate(
    d.token2.address, token2UsdRate
  );
  await d.rates.connect(d.owner).setUsdRate(
    d.token3.address, token3UsdRate
  );
  await d.rates.connect(d.owner).setUsdRate(
    d.lpToken.address, lpUsdRate
  );

  const Staking = await ethers.getContractFactory("Staking");
  d.stakingImplementation = await Staking.connect(d.owner).deploy();
  await d.stakingImplementation.deployed();

  d.ProxyAdmin = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
  );
  d.proxyAdmin = await d.ProxyAdmin.connect(d.owner).deploy();
  await d.proxyAdmin.deployed();

  d.ABI = [
    "function initialize(address, address, address)"
  ];
  d.iface = new ethers.utils.Interface(d.ABI);
  d.calldata = d.iface.encodeFunctionData("initialize", [
    d.owner.address,
    d.taxReceiver.address,
    d.rates.address
  ]);

  d.Proxy = await ethers.getContractFactory(
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
  );
  d.stakingProxy = await d.Proxy.connect(d.owner).deploy(
    d.stakingImplementation.address,
    d.proxyAdmin.address,
    d.calldata
  );
  await d.stakingProxy.deployed();

  d.stakingContract = await Staking.attach(d.stakingProxy.address);

  await d.token1.connect(d.owner).transfer(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.owner).transfer(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token3.connect(d.owner).transfer(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString(), 6));

  await d.token1.connect(d.user1).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.user2).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.user3).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.user4).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token1.connect(d.user5).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await d.token2.connect(d.user1).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.user2).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.user3).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.user4).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token2.connect(d.user5).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await d.token3.connect(d.user1).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token3.connect(d.user2).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token3.connect(d.user3).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token3.connect(d.user4).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.token3.connect(d.user5).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await d.lpToken.connect(d.user1).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.user2).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.user3).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.user4).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));
  await d.lpToken.connect(d.user5).approve(d.stakingContract.address, ethers.utils.parseUnits(initialTransfer.toString()));

  await d.stakingContract.connect(d.owner)
    .addDepositProfile(
      d.token1.address,
      d.token1.address,
      profileTypes.ERC20_TOKEN,
      depositProfile1Apr,
      0, // withdrawYieldTax
      downgradeTax,
      1, // weight
      lockTime
    );
  await d.stakingContract.connect(d.owner)
    .setDepositProfileData(
      1,
      'ETNA Bronze Vault',
      'ETNA',
      'ETNA',
      '',
      true
    );

  await d.stakingContract.connect(d.owner)
    .addDepositProfile(
      d.token1.address,
      d.token2.address,
      profileTypes.ERC20_TOKEN,
      depositProfile2Apr,
      0,
      downgradeTax,
      2,
      lockTime
    );
  await d.stakingContract.connect(d.owner)
    .setDepositProfileData(
      2,
      'ETNA Bronze Vault',
      'ETNA',
      'MTB',
      '',
      true
    );

  await d.stakingContract.connect(d.owner)
    .addDepositProfile(
      d.token1.address,
      d.token3.address,
      profileTypes.ERC20_TOKEN,
      depositProfile3Apr,
      withdrawYieldTax,
      downgradeTax,
      3,
      lockTime
    );
  await d.stakingContract.connect(d.owner)
    .setDepositProfileData(
      3,
      'Different decimals',
      '18',
      '6',
      '',
      true
    );

  await d.stakingContract.connect(d.owner)
    .addDepositProfile(
      d.lpToken.address,
      d.token3.address,
      profileTypes.LP_FARMING,
      depositProfile4Apr,
      withdrawYieldTax,
      downgradeTax,
      4,
      lockTime
    );
  await d.stakingContract.connect(d.owner)
    .setDepositProfileData(
      4,
      'LP Vault',
      'MTB',
      'MTB',
      '',
      true
    );

  await d.stakingContract.connect(d.owner)
    .setSafeMode(true);
});

describe("Testing Staking contract", function () {
  it("Managing profiles", async function () {
    await expect(
      d.stakingContract.connect(d.user1)
        .addDepositProfile(
          d.token2.address,
          d.token1.address,
          profileTypes.ERC20_TOKEN,
          depositProfile1Apr,
          withdrawYieldTax,
          downgradeTax,
          5,
          lockTime
        )
    )
      .to.be.revertedWith('Caller is not authorized for this action');

    expect(Number(await d.stakingContract.getDepositProfilesNumber())).to.equal(4);

    d.result = await d.stakingContract.getDepositProfile(1);
    expect(d.result.depositContractAddress).to.equal(d.token1.address);
    expect(d.result.yieldContractAddress).to.equal(d.token1.address);
    expect(Number(d.result.lockTime)).to.equal(lockTime);
    expect(Number(d.result.tvl)).to.equal(0);
    expect(d.result.active).to.be.true;

    d.result = await d.stakingContract.getDepositProfileExtra(1);
    expect(Number(d.result.weight)).to.equal(1);
    expect(d.result.name).to.equal("ETNA Bronze Vault");
    expect(d.result.depositCurrency).to.equal("ETNA");
    expect(d.result.yieldCurrency).to.equal("ETNA");
    expect(d.result.link).to.equal("");

    d.result = await d.stakingContract.getDepositProfileRateData(1);
    expect(Number(d.result.apr)).to.equal(depositProfile1Apr);
    expect(Number(d.result.withdrawYieldTax)).to.equal(0);
    expect(Number(d.result.downgradeTax)).to.equal(downgradeTax);
    expect(Number(d.result.depositUsdRate)).to.equal(token1UsdRate);
    expect(Number(d.result.yieldUsdRate)).to.equal(token1UsdRate);

    await d.stakingContract.connect(d.owner)
      .setDepositProfileLockTime(3, 2);
    await d.stakingContract.connect(d.owner)
      .setDepositProfileStatus(3, false);

    d.result = await d.stakingContract.getDepositProfile(3);
    expect(Number(d.result.lockTime)).to.equal(2);
    expect(d.result.active).to.be.false;

    await d.stakingContract.connect(d.owner)
      .setDepositProfileName(3, '1');
    await d.stakingContract.connect(d.owner)
      .setDepositProfileDepositCurrency(3, '2');
    await d.stakingContract.connect(d.owner)
      .setDepositProfileYieldCurrency(3, '3');
    await d.stakingContract.connect(d.owner)
      .setDepositProfileLink(3, '4');
    await d.stakingContract.connect(d.owner)
      .setDepositProfileWeight(3, 2);

    d.result = await d.stakingContract.getDepositProfileExtra(3);
    expect(d.result.name).to.equal("1");
    expect(d.result.depositCurrency).to.equal("2");
    expect(d.result.yieldCurrency).to.equal("3");
    expect(d.result.link).to.equal("4");
    expect(d.result.weight).to.equal(2);

    await expect(
      d.stakingContract.connect(d.owner)
        .setDepositProfileWithdrawYieldTax(2, 300)
    )
      .to.be.revertedWith('Tax for yield withdrawal can be set for LP Farming vaults only');

    await d.stakingContract.connect(d.owner)
      .setDepositProfileApr(4, 11);
    await d.stakingContract.connect(d.owner)
      .setDepositProfileWithdrawYieldTax(4, 22);
    await d.stakingContract.connect(d.owner)
      .setDepositProfileDowngradeTax(4, 33);
    await d.rates.connect(d.owner)
      .setUsdRate(d.lpToken.address, 44);
    await d.rates.connect(d.owner)
      .setUsdRate(d.token3.address, 55);

    d.result = await d.stakingContract.getDepositProfileRateData(4);
    expect(Number(d.result.apr)).to.equal(11);
    expect(Number(d.result.withdrawYieldTax)).to.equal(22);
    expect(Number(d.result.downgradeTax)).to.equal(33);

    d.result = await d.stakingContract.getDepositProfileRateData(4);
    expect(Number(d.result.depositUsdRate)).to.equal(44);
    expect(Number(d.result.yieldUsdRate)).to.equal(55);
  });

  it("Simple staking", async function () {
    const stakedAmount = 100;

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakedAmount.toString()), 2);

    d.expectedAmount = stakedAmount;
    d.expectedAccumulatedYield = 0;
    d.expectedYield = 0;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield, 4));

    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    await hre.timeAndMine.increaseTime('31 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedAmount = stakedAmount;
    d.expectedAccumulatedYield = 0;
    d.expectedYield = stakedAmount
      * depositProfile2Apr / decimals * 31 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    const yieldRate = Number(await d.rates['getUsdRate(address)'](d.token2.address));
    await d.rates.connect(d.owner).setUsdRate(d.token2.address, yieldRate * 2);

    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield / 2, 5));
    await d.rates.connect(d.owner).setUsdRate(d.token2.address, yieldRate);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    await hre.timeAndMine.increaseTime('150 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedYield += stakedAmount
      * depositProfile2Apr / decimals * 150 / 365
      * token1UsdRate / token2UsdRate;
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 4))
      .to.equal(roundTo(d.expectedYield, 4));

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakedAmount.toString()), 2);

    d.expectedAmount = stakedAmount + stakedAmount;
    d.expectedAccumulatedYield = d.expectedYield
      / token1UsdRate * token2UsdRate;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.calculateYield(1)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    await hre.timeAndMine.increaseTime('100 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedYield += (stakedAmount + stakedAmount)
      * depositProfile2Apr / decimals * 100 / 365
      * token1UsdRate / token2UsdRate;
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
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

    d.result = await d.stakingContract.getDepositsNumber();
    expect(Number(d.result)).to.equal(0);

    d.result = await d.token1.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer);
    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer);
    d.result = await d.token2.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer);
    d.result = await d.token2.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer);
    d.result = await d.lpToken.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer);

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakingAmounts[1][0].toString()), 1);

    d.result = await d.token1.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer - stakingAmounts[1][0]);
    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer + stakingAmounts[1][0]);

    d.result = await d.stakingContract.getDepositsNumber();
    expect(Number(d.result)).to.equal(1);

    d.result = await d.stakingContract.getDeposit(1);
    expect(d.result.userAddress).to.equal(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(stakingAmounts[1][0]);
    expect(Number(ethers.utils.formatUnits(d.result.accumulatedYield))).to.equal(0);

    d.result = await d.stakingContract.getUserDeposit(d.user1.address, 1);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(stakingAmounts[1][0]);
    expect(Number(ethers.utils.formatUnits(d.result.accumulatedYield))).to.equal(0);

    d.result = await d.stakingContract.calculateYield(1);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(0);

    await hre.timeAndMine.increaseTime(`10 days`);
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedYield1 = stakingAmounts[1][0]
      * depositProfile1Apr / decimals * 10 / 365;
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.calculateYield(1)
    ));
    expect(roundTo(d.result, 6))
      .to.equal(roundTo(d.expectedYield1 , 6));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 6))
      .to.equal(roundTo(d.expectedYield1 , 6));
    d.result = await d.stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(d.result.accumulatedYield))).to.equal(0);

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakingAmounts[2][0].toString()), 2);

    d.result = await d.stakingContract.getDeposit(2);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(stakingAmounts[2][0]);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 6)).to.equal(0);
    d.result = await d.stakingContract.calculateYield(2);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 6))
      .to.equal(0);
    await hre.timeAndMine.increaseTime('20 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakingAmounts[3][0].toString()), 3);

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakingAmounts[3][1].toString()), 3);

    // deposit 1
    d.expectedAmount1 = stakingAmounts[1][0];
    d.expectedAccumulatedYield1 = d.expectedYield1;
    d.expectedYield1 += stakingAmounts[1][0]
      * depositProfile1Apr / decimals * 20 / 365;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount1, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 6)).to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 6))
      .to.equal(roundTo(d.expectedYield1 , 6));

    // deposit 2
    d.expectedAmount2 = stakingAmounts[2][0];
    d.expectedAccumulatedYield2 = 0;
    d.expectedYield2 = stakingAmounts[2][0]
      * depositProfile2Apr / decimals * 20 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 6)).to.equal(roundTo(d.expectedAccumulatedYield2, 6));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 6))
      .to.equal(roundTo(d.expectedYield2 , 6));

    // deposit 3
    d.expectedAmount3 = stakingAmounts[3][0] + stakingAmounts[3][1];
    d.expectedAccumulatedYield3 = 0;
    d.expectedYield3 = 0;
    d.result = await d.stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield3, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(d.result, 4))
      .to.equal(roundTo(d.expectedYield3, 4));
    await d.stakingContract.connect(d.user1)
      .unStake(ethers.utils.parseUnits(unstakingAmounts[1][0].toString()), 1);

    await hre.timeAndMine.increaseTime('20 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    // deposit 1
    d.expectedAmount1 = stakingAmounts[1][0] - unstakingAmounts[1][0];
    d.expectedAccumulatedYield1 = d.expectedYield1;
    d.expectedYield1 += d.expectedAmount1
      * depositProfile1Apr / decimals * 20 / 365;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount1, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 6)).to.equal(roundTo(d.expectedAccumulatedYield1, 6));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield1 , 5));

    // deposit 2
    d.expectedAmount2 = stakingAmounts[2][0];
    d.expectedAccumulatedYield2 = 0;
    d.expectedYield2 += stakingAmounts[2][0]
      * depositProfile2Apr / decimals * 20 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 6)).to.equal(roundTo(d.expectedAccumulatedYield2, 6));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield2 , 5));

    // deposit 3
    d.expectedAmount3 = stakingAmounts[3][0] + stakingAmounts[3][1];
    d.expectedAccumulatedYield3 = 0;
    d.expectedYield3 = d.expectedAmount3
      * depositProfile3Apr / decimals * 20 / 365
      * token1UsdRate / token3UsdRate;
    d.result = await d.stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield3, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield3, 3));

    await d.stakingContract.connect(d.user1)
      .unStake(ethers.utils.parseUnits(unstakingAmounts[2][0].toString()), 2);
    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakingAmounts[1][1].toString()), 1);

    await hre.timeAndMine.increaseTime('12 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    // deposit 1
    d.expectedAmount1 += stakingAmounts[1][1];
    d.expectedAccumulatedYield1 = d.expectedYield1;
    d.expectedYield1 += d.expectedAmount1
      * depositProfile1Apr / decimals * 12 / 365;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount1, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield1, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield1 , 5));

    // deposit 2
    d.expectedAmount2 -= unstakingAmounts[2][0];
    d.expectedAccumulatedYield2 = d.expectedYield2
      / token1UsdRate * token2UsdRate;
    d.expectedYield2 += d.expectedAmount2
      * depositProfile2Apr / decimals * 12 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield2, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield2 , 5));

    // deposit 3
    d.expectedAmount3;
    d.expectedAccumulatedYield3 = 0;
    d.expectedYield3 += d.expectedAmount3
      * depositProfile3Apr / decimals * 12 / 365
      * token1UsdRate / token3UsdRate;
    d.result = await d.stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield3, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield3, 3));

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakingAmounts[2][1].toString()), 2);
    await d.stakingContract.connect(d.user1)
      .unStake(ethers.utils.parseUnits(unstakingAmounts[3][0].toString()), 3);
    await d.stakingContract.connect(d.user1)
      .reStake(1);
    await expect(
      d.stakingContract.connect(d.user1)
      .reStake(2)
    ).to.be.revertedWith('Restaking is not available for this type of deposit');

    await expect(
      d.stakingContract.connect(d.user1)
      .reStake(3)
    ).to.be.revertedWith('Restaking is not available for this type of deposit');

    await hre.timeAndMine.increaseTime('7 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    // deposit 1
    d.expectedAmount1 += d.expectedYield1;
    d.expectedAccumulatedYield1 = 0;
    d.expectedYield1 = d.expectedAmount1
      * depositProfile1Apr / decimals * 7 / 365;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount1, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield1, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield1 , 5));

    // deposit 2
    d.expectedAmount2 += stakingAmounts[2][1];
    d.expectedAccumulatedYield2 = d.expectedYield2
      / token1UsdRate * token2UsdRate;
    d.expectedYield2 += d.expectedAmount2
      * depositProfile2Apr / decimals * 7 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield2, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 4))
      .to.equal(roundTo(d.expectedYield2 , 4));

    // deposit 3
    d.expectedAmount3 -= unstakingAmounts[3][0];
    d.expectedAccumulatedYield3 = d.expectedYield3
      / token1UsdRate * token3UsdRate;
    d.expectedYield3 += d.expectedAmount3
      * depositProfile3Apr / decimals * 7 / 365
      * token1UsdRate / token3UsdRate;
    d.result = await d.stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 3)).to.equal(roundTo(d.expectedAccumulatedYield3, 3));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield3, 3));

    await d.stakingContract.connect(d.user1)
      .unStake(ethers.utils.parseUnits(unstakingAmounts[1][1].toString()), 1);

    await hre.timeAndMine.increaseTime('10 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    // deposit 1
    d.expectedAmount1 -= unstakingAmounts[1][1];
    d.expectedAccumulatedYield1 = d.expectedYield1;
    d.expectedYield1 += d.expectedAmount1
      * depositProfile1Apr / decimals * 10 / 365;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount1, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield1, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield1 , 5));

    // deposit 2
    d.expectedAmount2;
    d.expectedAccumulatedYield2;
    d.expectedYield2 += d.expectedAmount2
      * depositProfile2Apr / decimals * 10 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield2, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 4))
      .to.equal(roundTo(d.expectedYield2 , 4));

    // deposit 3
    d.expectedAmount3;
    d.expectedAccumulatedYield3;
    d.expectedYield3 += d.expectedAmount3
      * depositProfile3Apr / decimals * 10 / 365
      * token1UsdRate / token3UsdRate;
    d.result = await d.stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 3)).to.equal(roundTo(d.expectedAccumulatedYield3, 3));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield3, 3));

    await d.stakingContract.connect(d.user1)
      .unStake(ethers.utils.parseUnits(unstakingAmounts[2][1].toString()), 2);
    await d.stakingContract.connect(d.user1)
      .unStake(ethers.utils.parseUnits(unstakingAmounts[3][1].toString()), 3);

    await hre.timeAndMine.increaseTime('15 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    // deposit 1
    d.expectedAmount1;
    d.expectedAccumulatedYield1;
    d.expectedYield1 += d.expectedAmount1
      * depositProfile1Apr / decimals * 15 / 365;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount1, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield1, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield1 , 5));

    // deposit 2
    d.expectedAmount2 -= unstakingAmounts[2][1];
    d.expectedAccumulatedYield2 = d.expectedYield2
      / token1UsdRate * token2UsdRate;
    d.expectedYield2 += d.expectedAmount2
      * depositProfile2Apr / decimals * 15 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(2);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount2, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield2, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 4))
      .to.equal(roundTo(d.expectedYield2 , 4));

    // deposit 3
    d.expectedAmount3 -= unstakingAmounts[3][1];
    d.expectedAccumulatedYield3 = d.expectedYield3
      / token1UsdRate * token3UsdRate;
    d.expectedYield3 += d.expectedAmount3
      * depositProfile3Apr / decimals * 15 / 365
      * token1UsdRate / token3UsdRate;
    d.result = await d.stakingContract.getDeposit(3);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 6)).to.equal(roundTo(d.expectedAmount3, 6));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 3)).to.equal(roundTo(d.expectedAccumulatedYield3, 3));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(3, true)
    ));
    expect(roundTo(d.result, 2))
      .to.equal(roundTo(d.expectedYield3, 2));
  });

  it("Withdraw yield", async function () {
    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits('100'), 1);
    await d.stakingContract.connect(d.user2)
      .stake(ethers.utils.parseUnits('100'), 1);

    d.result = await d.token1.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer - 100);
    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer + 200);

    await hre.timeAndMine.increaseTime('300 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedYield = 100
      * depositProfile1Apr / decimals * 300 / 365;
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(2, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    await expect(
      d.stakingContract.connect(d.user1)
        .withdrawYield(ethers.utils.parseUnits((d.expectedYield * 1.001).toString()), 1)
    ).to.be.revertedWith('Not enough yield at deposit');

    await d.stakingContract.connect(d.user1)
      .withdrawYield(ethers.utils.parseUnits(d.expectedYield.toString()), 1);

    d.result = await d.token1.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(
      initialTransfer - 100 + d.expectedYield
    );
    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(
      initialTransfer + 200 - d.expectedYield
    );

    d.result = await d.stakingContract.getDeposit(1);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(100);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 5)).to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(0);

    await d.stakingContract.connect(d.user2)
      .withdrawYieldAll(1);

    d.result = await d.token1.balanceOf(d.user2.address);
    expect(roundTo(Number(ethers.utils.formatUnits(d.result)), 5)).to.equal(
      roundTo(initialTransfer - 100 + d.expectedYield, 5)
    );
    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(roundTo(Number(ethers.utils.formatUnits(d.result)), 5)).to.equal(
      roundTo(initialTransfer + 200 - d.expectedYield * 2, 5)
    );

    d.result = await d.stakingContract.getDeposit(2);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(100);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 5)).to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(0);
  });

  it("Upgrade / downgrade", async function () {
    const stakedAmount = 100;

    await d.stakingContract.connect(d.owner)
      .addDepositProfile(
        d.token1.address,
        d.token1.address,
        1,
        depositProfile1Apr,
        0,
        downgradeTax,
        1,
        lockTime
      );
    await d.stakingContract.connect(d.owner)
      .setDepositProfileData(
        5,
        'LP Vault',
        'MTB',
        'MTB',
        '',
        true
      );
    await d.stakingContract.connect(d.owner)
      .setDepositProfileUpgradeProfileId(1, 5);
    await d.stakingContract.connect(d.owner)
      .setDepositProfileDowngradeProfileId(5, 1);

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakedAmount.toString()), 1);

    await hre.timeAndMine.increaseTime('31 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedAmount = stakedAmount;
    d.expectedAccumulatedYield = 0;
    d.expectedYield = stakedAmount
      * depositProfile1Apr / decimals * 31 / 365
      * token1UsdRate / token1UsdRate;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    await expect(
      d.stakingContract.connect(d.user1)
        .downgrade(1)
      ).to.be.revertedWith('Upgrade for this deposit profile is not possible');

    await d.stakingContract.connect(d.user1)
      .upgrade(1);

    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedYield, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    d.result = await d.stakingContract.getDeposit(2);
    expect(Number(d.result.depositProfileId)).to.equal(5);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(5, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(0);

    await d.stakingContract.connect(d.user1)
      .downgrade(5);

    d.result = await d.stakingContract.getDepositProfileRateData(5)
    d.expectedAmount *= (1 - downgradeTax / decimals);
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedYield, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    d.result = await d.stakingContract.getDeposit(2);
    expect(Number(d.result.depositProfileId)).to.equal(5);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(0);
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(4, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(0);
  });

  it("Dynamically changed APR", async function () {
    const stakedAmount1 = 134;
    const stakedAmount2 = 218;
    const depositProfile2AprNew = 3200;

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakedAmount1.toString()), 2);

    await hre.timeAndMine.increaseTime('137 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.expectedAmount = stakedAmount1;
    d.expectedAccumulatedYield = 0;
    d.expectedYield = stakedAmount1
      * depositProfile2Apr / decimals * 137 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    )), 4)).to.equal(roundTo(d.expectedAccumulatedYield, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 5))
      .to.equal(roundTo(d.expectedYield, 5));

    await d.stakingContract.connect(d.owner)
      .setDepositProfileApr(2, depositProfile2AprNew);

    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 4))
      .to.equal(roundTo(d.expectedYield, 4));

    await hre.timeAndMine.increaseTime('215 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.compoundYield = d.expectedYield
      / token1UsdRate * token2UsdRate;
    d.expectedYield += (stakedAmount1 + d.compoundYield)
      * depositProfile2AprNew / decimals * 215 / 365
      * token1UsdRate / token2UsdRate;
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield, 3));

    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits(stakedAmount2.toString()), 2);

    d.expectedAmount = stakedAmount1 + stakedAmount2;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield, 3));

    await hre.timeAndMine.increaseTime('94 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    d.yieldWithoutUsdRate = d.expectedYield
      / token1UsdRate * token2UsdRate;
    d.expectedAmount = stakedAmount1 + stakedAmount2;
    d.expectedYield += (stakedAmount1 + stakedAmount2)
      * depositProfile2AprNew / decimals * 94 / 365
      * token1UsdRate / token2UsdRate;
    d.result = await d.stakingContract.getDeposit(1);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.amount
    )), 4)).to.equal(roundTo(d.expectedAmount, 4));
    d.result = Number(ethers.utils.formatUnits(
      await d.stakingContract.getDepositYield(1, true)
    ));
    expect(roundTo(d.result, 3))
      .to.equal(roundTo(d.expectedYield, 3));
  });

  it("Withdraw admin", async function () {
    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits('100'), 1);

    d.result = await d.token1.balanceOf(d.user1.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer - 100);
    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer + 100);
    d.result = await d.token1.balanceOf(d.owner.address);
    let ownerBalance = Number(ethers.utils.formatUnits(d.result));

    await d.stakingContract.connect(d.owner)
      .adminWithdrawToken(ethers.utils.parseUnits('10'), d.token1.address);

    d.result = await d.token1.balanceOf(d.stakingContract.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(initialTransfer + 100 - 10);
    d.result = await d.token1.balanceOf(d.owner.address);
    expect(Number(ethers.utils.formatUnits(d.result))).to.equal(ownerBalance + 10);
  });

  it("Safe mode", async function () {
    await d.stakingContract.connect(d.owner)
      .adminWithdrawToken(
        ethers.utils.parseUnits(initialTransfer.toString()),
        d.token1.address
      );
    await d.stakingContract.connect(d.user1)
      .stake(ethers.utils.parseUnits('100'), 1);
    await d.stakingContract.connect(d.user2)
      .stake(ethers.utils.parseUnits('100'), 1);

    await hre.timeAndMine.increaseTime('300 days');
    await d.user1.sendTransaction({
      to: d.user2.address,
      value: 0
    });

    await expect(
      d.stakingContract.connect(d.user1)
        .withdrawYield(ethers.utils.parseUnits('1'), 1)
    ).to.be.revertedWith('Not enough contract balance (safe mode)');

    await expect(
      d.stakingContract.connect(d.owner)
      .adminWithdrawToken(
        ethers.utils.parseUnits('1'),
        d.token1.address
      )
    ).to.be.revertedWith('Not enough contract balance (safe mode)');

    await d.stakingContract.connect(d.owner)
      .setSafeMode(false);

    await d.stakingContract.connect(d.owner)
      .adminWithdrawToken(
        ethers.utils.parseUnits('1'),
        d.token1.address
      );

    await d.stakingContract.connect(d.user1)
      .withdrawYield(ethers.utils.parseUnits('1'), 1);
  });

  it("Set user deposit", async function () {
    const amount = 50;
    const yieldAmount = 10;
    const unlock = 10;

    await d.stakingContract.connect(d.owner)
      .grantRole('MANAGER', d.signers[9].address);
    await d.stakingContract.connect(d.owner)
      .setEditMode(true);
    await d.stakingContract.connect(d.signers[9])
      .setUserDeposit(
        d.user1.address,
        1,
        ethers.utils.parseUnits(amount.toString()),
        ethers.utils.parseUnits(yieldAmount.toString()),
        unlock
      );
    await d.stakingContract.connect(d.signers[9])
      .setUserDeposit(
        d.user2.address,
        3,
        ethers.utils.parseUnits(amount.toString()),
        ethers.utils.parseUnits(yieldAmount.toString()),
        unlock
      );
    await d.stakingContract.connect(d.signers[9])
      .setUserDeposit(
        d.user3.address,
        2,
        ethers.utils.parseUnits(amount.toString()),
        ethers.utils.parseUnits(yieldAmount.toString()),
        unlock
      );
    d.result = await d.stakingContract.getDeposit(1);
    expect(d.result.userAddress).to.equal(d.user1.address);
    expect(Number(d.result.depositProfileId)).to.equal(1);
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(d.result.unlock)).to.equal(unlock);

    d.result = await d.stakingContract.getDeposit(2);
    expect(d.result.userAddress).to.equal(d.user2.address);
    expect(Number(d.result.depositProfileId)).to.equal(3);
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(d.result.unlock)).to.equal(unlock);
    d.result = await d.stakingContract.getUserDeposit(
      d.user3.address,
      1
    );
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(0);
    expect(Number(d.result.unlock)).to.equal(0);
    d.result = await d.stakingContract.getUserDeposit(
      d.user3.address,
      2
    );
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(d.result.unlock)).to.equal(unlock);
    await d.stakingContract.connect(d.signers[9])
      .setUserDeposit(
        d.user1.address,
        1,
        ethers.utils.parseUnits((amount * 2).toString()),
        ethers.utils.parseUnits((yieldAmount * 3).toString()),
        unlock
      );
    d.result = await d.stakingContract.getDeposit(1);
    expect(d.result.userAddress).to.equal(d.user1.address);
    expect(Number(d.result.depositProfileId)).to.equal(1);
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount * 2);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount * 3);
    expect(Number(d.result.unlock)).to.equal(unlock);

    let addresses = [];
    let profileIds = [];
    let amounts = [];
    let yieldAmounts = [];
    let unlocks = [];

    for (let i = 3; i <= 42; i ++) {
      addresses.push(d.signers[i].address);
      profileIds.push(1);
      amounts.push(ethers.utils.parseUnits(amount.toString()));
      yieldAmounts.push(ethers.utils.parseUnits(yieldAmount.toString()));
      unlocks.push(unlock);
    }
    for (let i = 43; i <= 82; i ++) {
      addresses.push(d.signers[i - 40].address);
      profileIds.push(2);
      amounts.push(ethers.utils.parseUnits((amount * 2).toString()));
      yieldAmounts.push(ethers.utils.parseUnits((yieldAmount * 2).toString()));
      unlocks.push(unlock);
    }
    for (let i = 83; i <= 102; i ++) {
      addresses.push(d.signers[i - 80].address);
      profileIds.push(3);
      amounts.push(ethers.utils.parseUnits((amount * 3).toString()));
      yieldAmounts.push(ethers.utils.parseUnits((yieldAmount * 3).toString()));
      unlocks.push(unlock);
    }
    await d.stakingContract.connect(d.signers[9])
      .setUserDepositMultiple(
        addresses,
        profileIds,
        amounts,
        yieldAmounts,
        unlocks
      );
    d.result = await d.stakingContract.getDeposit(6);
    expect(d.result.userAddress).to.equal(d.taxReceiver.address);
    expect(Number(d.result.depositProfileId)).to.equal(1);
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(d.result.unlock)).to.equal(unlock);

    d.result = await d.stakingContract.getUserDeposit(
      d.signers[6].address,
      1
    );
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(d.result.unlock)).to.equal(unlock);

    d.result = await d.stakingContract.getUserDeposit(
      d.signers[6].address,
      2
    );
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount * 2);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount * 2);
    expect(Number(d.result.unlock)).to.equal(unlock);

    d.result = await d.stakingContract.getUserDeposit(
      d.signers[6].address,
      3
    );
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount * 3);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount * 3);
    expect(Number(d.result.unlock)).to.equal(unlock);

    d.result = await d.stakingContract.getDepositProfileExtra(1);
    expect(Number(d.result.stakers)).to.equal(41);

    addresses = [];
    profileIds = [];
    amounts = [];
    yieldAmounts = [];
    unlocks = [];

    for (let i = 1; i <= 100; i ++) {
      addresses.push(d.signers[i + 50].address);
      profileIds.push(1);
      amounts.push(ethers.utils.parseUnits(amount.toString()));
      yieldAmounts.push(ethers.utils.parseUnits(yieldAmount.toString()));
      unlocks.push(unlock);
    }
    await d.stakingContract.connect(d.signers[9])
      .setUserDepositMultiple(
        addresses,
        profileIds,
        amounts,
        yieldAmounts,
        unlocks
      );

    d.result = await d.stakingContract.getUserDeposit(
      d.signers[150].address,
      1
    );
    expect(Number(ethers.utils.formatUnits(
      d.result.amount
    ))).to.equal(amount);
    expect(Number(ethers.utils.formatUnits(
      d.result.accumulatedYield
    ))).to.equal(yieldAmount);
    expect(Number(d.result.unlock)).to.equal(unlock);
  });

  it("Manager settings", async function () {
    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileApr(1, 11)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileWithdrawYieldTax(3, 22)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileDowngradeTax(1, 33)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileWeight(1, 66)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileLockTime(1, 77)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileName(1, 'name')
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileDepositCurrency(1, 'depositCurrency')
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileYieldCurrency(1, 'yieldCurrency')
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileLink(1, 'link')
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setDepositProfileStatus(1, false)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setSafeMode(false)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await expect(
      d.stakingContract.connect(d.signers[9])
        .setTaxReceiverAddress(d.user1.address)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await d.stakingContract.connect(d.owner)
      .grantRole('MANAGER', d.signers[9].address);

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileApr(1, 11);

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileWithdrawYieldTax(4, 22);

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileDowngradeTax(1, 33);

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileWeight(1, 66);

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileLockTime(1, 77);

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileName(1, 'name');

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileDepositCurrency(1, 'depositCurrency');

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileYieldCurrency(1, 'yieldCurrency');

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileLink(1, 'link');

    await d.stakingContract.connect(d.signers[9])
      .setDepositProfileStatus(1, false);

    await d.stakingContract.connect(d.signers[9])
      .setSafeMode(false);
    d.result = await d.stakingContract
      .getSafeMode();
    expect(d.result).to.be.false;

    await d.stakingContract.connect(d.signers[9])
      .setSafeMode(true);
    d.result = await d.stakingContract
      .getSafeMode();
    expect(d.result).to.be.true;

    await d.stakingContract.connect(d.signers[9])
      .setTaxReceiverAddress(d.user1.address);
    d.result = await d.stakingContract.connect(d.signers[9])
      .getTaxReceiverAddress();
    expect(d.result).to.equal(d.user1.address);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}
