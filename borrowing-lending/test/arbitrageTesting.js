const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};
const { alchemyApiKey } = require('../secrets.json');

// Start test block
describe('arbitrageTesting.js - Arbitrage testing', function () {
  beforeEach(async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey.ethereumMainnet}`,
            blockNumber: 15730377,
          },
        },
      ],
    });
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.manager = d.signers[9];
    d.balances = {};
    d.zero = '0x0000000000000000000000000000000000000000';
    d.borrowingFee = 1000;
    d.minimalStake = 10000;
    d.negativeFactor = 6000;
    d.borrowingPowerData = [
      15000, 20000, 25000, 30000, 40000, 50000
    ];
    d.neverLate = 10000000000;
    d.addresses = {
      router1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      router2: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      ape: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
    };
    d.initialTransfer = 10;
    d.activationFee = 0.1;

    d.PancakeRouter = await ethers.getContractFactory('PancakeRouter');
    d.router1 = await d.PancakeRouter.attach(d.addresses.router1);
    d.router2 = await d.PancakeRouter.attach(d.addresses.router2);

    await d.router1.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.usdt], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('0.1')}
    );

    d.UniSwapConnector = await ethers.getContractFactory("UniSwapConnector");
    d.uniSwapConnector = await d.UniSwapConnector.connect(d.owner).deploy(
      d.owner.address,
      d.router1.address,
      d.addresses.weth
    );
    await d.uniSwapConnector.deployed();
    d.sushiSwapConnector = await d.UniSwapConnector.connect(d.owner).deploy(
      d.owner.address,
      d.router2.address,
      d.addresses.weth
    );
    await d.sushiSwapConnector.deployed();

    d.ExchangeRouter = await ethers.getContractFactory("ExchangeRouter");
    d.exchangeRouter = await d.ExchangeRouter.connect(d.owner).deploy(
      d.owner.address,
      d.uniSwapConnector.address
    );
    await d.exchangeRouter.deployed();
    await d.exchangeRouter.connect(d.owner)
      .registerDexConnector(d.sushiSwapConnector.address, true);
    // console.log("Exchange router deployed to:", d.exchangeRouter.address);

    d.BEP20Token = await ethers.getContractFactory("BEP20Token");
    d.usdt = await d.BEP20Token.attach(d.addresses.usdt);
    await d.usdt.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );

    d.ape = await d.BEP20Token.attach(d.addresses.ape);

    d.Baa = await ethers.getContractFactory("Baa");
    d.baa = await d.Baa.connect(d.owner).deploy();
    await d.baa.deployed();
    // console.log("Baa deployed to:", d.baa.address);

    // d.UpgradeableBeacon = await ethers.getContractFactory("UpgradeableBeacon");
    d.UpgradeableBeacon = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol:UpgradeableBeacon"
    );
    d.upgradeableBeacon = await d.UpgradeableBeacon.connect(d.owner).deploy(d.baa.address);
    await d.upgradeableBeacon.deployed();
    // console.log("Beacon deployed to:", d.upgradeableBeacon.address);

    d.ProxyAdmin = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
    );
    d.proxyAdmin = await d.ProxyAdmin.connect(d.owner).deploy();
    await d.proxyAdmin.deployed();

    const BorrowingLending = await ethers.getContractFactory("BorrowingLending");
    d.blImplementation = await BorrowingLending.connect(d.owner).deploy();
    await d.blImplementation.deployed();

    d.ABI = [
      "function initialize(address, uint16, uint16, uint16, uint16, uint16)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      2000,
      4000,
      500,
      1000,
      3000
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.blProxy = await d.Proxy.connect(d.owner).deploy(
      d.blImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.blProxy.deployed();

    // connect to blProxy contract using blImplementation ABI
    d.borrowingLending = new ethers.Contract(
      d.blProxy.address,
      d.blImplementation.interface.format(ethers.utils.FormatTypes.json),
      d.blImplementation.provider
    );
    // console.log("Borrowing Lending deployed to:", d.borrowingLending.address);

    d.Staking = await ethers.getContractFactory("Staking");
    d.staking = await d.Staking.connect(d.owner).deploy();
    await d.staking.deployed();
    // console.log("Staking deployed to:", d.staking.address);
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[1].address, 1, ethers.utils.parseUnits(d.minimalStake.toString())
    );
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[1].address, 2, ethers.utils.parseUnits(d.minimalStake.toString())
    );
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[2].address, 2, ethers.utils.parseUnits(d.minimalStake.toString())
    );
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[3].address, 3, ethers.utils.parseUnits(d.minimalStake.toString())
    );
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[4].address, 4, ethers.utils.parseUnits(d.minimalStake.toString())
    );
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[4].address, 5, ethers.utils.parseUnits(d.minimalStake.toString())
    );
    await d.staking.connect(d.owner).setUserDeposit(
      d.signers[4].address, 6, ethers.utils.parseUnits(d.minimalStake.toString())
    );

    d.BorrowingPower = await ethers.getContractFactory('BorrowingPower');
    d.borrowingPower = await d.BorrowingPower.connect(d.owner).deploy(
      d.ape.address,
      d.staking.address,
      d.minimalStake
    );
    await d.borrowingPower.connect(d.owner).setBronzeStakingProfileIds(
      [1,2]
    );
    await d.borrowingPower.connect(d.owner).setSilverStakingProfileIds(
      [3]
    );
    await d.borrowingPower.connect(d.owner).setGoldStakingProfileIds(
      [4,5]
    );
    await d.borrowingPower.connect(d.owner).setPlatinumStakingProfileIds(
      [6,7,8]
    );
    await d.borrowingPower.connect(d.owner).setBorrowingPowerData(
      d.borrowingPowerData
    );

    d.AccessVault = await ethers.getContractFactory("AccessVault");
    d.accessVaultImplementation = await d.AccessVault.connect(d.owner).deploy();
    await d.accessVaultImplementation.deployed();

    d.ABI = [
      "function initialize(address newOwner, address borrowingLendingAddress, address borrowingPowerAddress, address baaBeaconAddress, address exchangeRouterAddress, uint256 borrowingFee)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.borrowingLending.address,
      d.borrowingPower.address,
      d.upgradeableBeacon.address,
      d.exchangeRouter.address,
      d.borrowingFee
    ]);

    d.accessVaultProxy = await d.Proxy.connect(d.owner).deploy(
      d.accessVaultImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.accessVaultProxy.deployed();
    // console.log("Access vault proxy deployed to:", d.accessVaultProxy.address);

    d.accessVault = new ethers.Contract(
      d.accessVaultProxy.address,
      d.accessVaultImplementation.interface.format(ethers.utils.FormatTypes.json),
      d.accessVaultImplementation.provider
    );

    await d.usdt.connect(d.owner).transfer(
      d.accessVault.address, ethers.utils.parseUnits('100', 6)
    );

    await d.borrowingLending.connect(d.owner).setAccessVault(d.accessVault.address);

    await d.accessVault.connect(d.owner).addToManagers(
      d.manager.address
    );
    await d.accessVault.connect(d.manager).setStablecoinProfileId(
      d.usdt.address, 2
    );
    await d.accessVault.connect(d.manager).setTokenAvailable(
      d.ape.address, true
    );
    await d.accessVault.connect(d.manager).setNegativeFactor(
      d.negativeFactor
    );
  });

  // Test case
  it('Arbitrage testing', async function () {
    d.loan = 10;
    await d.accessVault.connect(d.signers[0])
      .deployBaa(
        d.usdt.address,
        d.ape.address
      );
    d.baaUsdtAddress = await d.accessVault.getUserBaaAddress(
      d.signers[0].address, d.usdt.address, d.ape.address
    );
    d.baaUsdt = new ethers.Contract(
      d.baaUsdtAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.usdt.connect(d.signers[0]).approve(
      d.accessVault.address, ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await d.accessVault.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );

    d.amount1 = await d.uniSwapConnector['getSwapAmount(address,address,uint256)'](
      d.usdt.address,
      d.ape.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    d.amount2 = await d.uniSwapConnector['getSwapAmount(address[],uint256)'](
      [d.usdt.address,d.addresses.weth,d.ape.address],
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    expect(ethers.utils.formatUnits(d.amount1)).to.equal(ethers.utils.formatUnits(d.amount2));

    await d.router2.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.ape], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('1')}
    );

    d.signers[0].balance = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ));

    await d.baaUsdt.connect(d.signers[0])
      ['arbitrage(address,address,uint256,uint256,uint256,uint256,bool)'](
      d.uniSwapConnector.address,
      d.sushiSwapConnector.address,
      ethers.utils.parseUnits(d.loan.toString(), 6),
      ethers.utils.parseUnits((d.loan / 10).toString(), 6),
      600,
      600,
      false
    );

    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ))).to.be.greaterThan(d.signers[0].balance + d.loan / 10);
  });

  it('Arbitrage testing arbitrary path', async function () {
    d.loan = 10;
    await d.accessVault.connect(d.signers[0])
      .deployBaa(
        d.usdt.address,
        d.ape.address
      );
    d.baaUsdtAddress = await d.accessVault.getUserBaaAddress(
      d.signers[0].address, d.usdt.address, d.ape.address
    );
    d.baaUsdt = new ethers.Contract(
      d.baaUsdtAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.usdt.connect(d.signers[0]).approve(
      d.accessVault.address, ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await d.accessVault.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );

    await d.router2.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.ape], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('1')}
    );

    d.signers[0].balance = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ));

    await d.baaUsdt.connect(d.signers[0])
      ['arbitrage(address,address,address[],address[],uint256,uint256,uint256,uint256)'](
      d.uniSwapConnector.address,
      d.sushiSwapConnector.address,
      [d.usdt.address, d.addresses.weth, d.ape.address],
      [d.ape.address, d.addresses.weth, d.usdt.address],
      ethers.utils.parseUnits(d.loan.toString(), 6),
      ethers.utils.parseUnits((d.loan / 10).toString(), 6),
      600,
      600
    );

    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ))).to.be.greaterThan(d.signers[0].balance + d.loan / 10);
  });

  it('Estimating arbitrage profit amount', async function () {
    d.amountIn = 10;

    expect(Number(ethers.utils.formatUnits(
      await d.exchangeRouter['getArbitrageProfit(address,address,address,address,uint256)'](
        d.usdt.address,
        d.ape.address,
        d.uniSwapConnector.address,
        d.sushiSwapConnector.address,
        ethers.utils.parseUnits(d.amountIn.toString(), 6)
      ), 6
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.exchangeRouter['getArbitrageProfit(address[],address[],address,address,uint256)'](
        [d.usdt.address, d.addresses.weth, d.ape.address],
        [d.ape.address, d.addresses.weth, d.usdt.address],
        d.uniSwapConnector.address,
        d.sushiSwapConnector.address,
        ethers.utils.parseUnits(d.amountIn.toString(), 6)
      ), 6
    ))).to.equal(0);

    await d.router2.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.ape], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('1')}
    );

    expect(Number(ethers.utils.formatUnits(
      await d.exchangeRouter['getArbitrageProfit(address,address,address,address,uint256)'](
        d.usdt.address,
        d.ape.address,
        d.uniSwapConnector.address,
        d.sushiSwapConnector.address,
        ethers.utils.parseUnits(d.amountIn.toString(), 6)
      ), 6
    ))).to.be.greaterThan(0);

    expect(Number(ethers.utils.formatUnits(
      await d.exchangeRouter['getArbitrageProfit(address[],address[],address,address,uint256)'](
        [d.usdt.address, d.addresses.weth, d.ape.address],
        [d.ape.address, d.addresses.weth, d.usdt.address],
        d.uniSwapConnector.address,
        d.sushiSwapConnector.address,
        ethers.utils.parseUnits(d.amountIn.toString(), 6)
      ), 6
    ))).to.be.greaterThan(0);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}