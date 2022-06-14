const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};
const { alchemyApiKey } = require('../secrets.json');

// Start test block
describe('Swap testing', function () {
  beforeEach(async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}`,
            blockNumber: 14852260,
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
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      chiliz: '0x3506424F91fD33084466F402d5D97f05F8e3b4AF',
    };
    d.initialTransfer = 1000;

    d.PancakeRouter = await ethers.getContractFactory('PancakeRouter');
    d.router = await d.PancakeRouter.attach(d.addresses.router);
    // uniswap mainnnet router
    d.UniswapV2Factory = await ethers.getContractFactory('UniswapV2Factory');
    d.factory = await d.UniswapV2Factory.attach(d.addresses.factory);

    await d.router.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.usdt], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('10')}
    );
    await d.router.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.dai], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('10')}
    );
    await d.router.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.chiliz], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('10')}
    );

    d.ExchangeRouterPancakeSwap = await ethers.getContractFactory("ExchangeRouterPancakeSwap");
    d.exchangeRouterPancakeSwap = await d.ExchangeRouterPancakeSwap.connect(d.owner).deploy(
      d.owner.address,
      d.router.address,
      d.factory.address
    );
    await d.exchangeRouterPancakeSwap.deployed();

    d.ExchangeRouterProxyAdmin = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
    );
    d.exchangeRouterProxyAdmin = await d.ExchangeRouterProxyAdmin.connect(d.owner).deploy();
    await d.exchangeRouterProxyAdmin.deployed();
    // console.log("Exchange router proxy admin deployed to:", d.exchangeRouterProxyAdmin.address);

    d.ExchangeRouter = await ethers.getContractFactory("ExchangeRouter");
    d.exchangeRouter = await d.ExchangeRouter.connect(d.owner).deploy();
    await d.exchangeRouter.deployed();
    // console.log("Exchange router deployed to:", d.exchangeRouter.address);

    d.ABI = [
      "function initialize(address newOwner, address defaultImplementation)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.exchangeRouterPancakeSwap.address
    ]);
    d.ExchangeRouterProxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );

    d.exchangeRouterProxy = await d.ExchangeRouterProxy.connect(d.owner).deploy(
      d.exchangeRouter.address,
      d.exchangeRouterProxyAdmin.address,
      d.calldata
    );
    await d.exchangeRouterProxy.deployed();
    // console.log("Exchange router proxy deployed to:", d.exchangeRouterProxy.address);

    d.exchangeRouterConnect = new ethers.Contract(
      d.exchangeRouterProxy.address,
      d.exchangeRouter.interface.format(ethers.utils.FormatTypes.json),
      d.exchangeRouterProxy.provider
    );

    d.BEP20Token = await ethers.getContractFactory("BEP20Token");
    d.busd = await d.BEP20Token.attach(d.addresses.dai);
    await d.busd.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.busd.connect(d.owner).transfer(
      d.signers[1].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.busd.connect(d.owner).transfer(
      d.signers[2].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.busd.connect(d.owner).transfer(
      d.signers[3].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.busd.connect(d.owner).transfer(
      d.signers[4].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );

    d.usdt = await d.BEP20Token.attach(d.addresses.usdt);
    await d.usdt.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.usdt.connect(d.owner).transfer(
      d.signers[1].address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.usdt.connect(d.owner).transfer(
      d.signers[2].address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.usdt.connect(d.owner).transfer(
      d.signers[3].address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.usdt.connect(d.owner).transfer(
      d.signers[4].address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );

    d.etna = await d.BEP20Token.attach(d.addresses.chiliz);
    await d.etna.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.etna.connect(d.owner).transfer(
      d.signers[1].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.etna.connect(d.owner).transfer(
      d.signers[2].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.etna.connect(d.owner).transfer(
      d.signers[3].address, ethers.utils.parseUnits(d.initialTransfer.toString())
  );
    await d.etna.connect(d.owner).transfer(
      d.signers[4].address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );

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

    d.BorrowingLending= await ethers.getContractFactory("BorrowingLending");
    d.borrowingLending = await d.BorrowingLending.connect(d.owner).deploy(
      d.busd.address, d.usdt.address
    );
    await d.borrowingLending.deployed();
    // console.log("Borrowing Lending deployed to:", d.borrowingLending.address);
    await d.busd.connect(d.owner).transfer(
      d.borrowingLending.address, ethers.utils.parseUnits('10000')
    );
    await d.usdt.connect(d.owner).transfer(
      d.borrowingLending.address, ethers.utils.parseUnits('10000', 6)
    );

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
      d.etna.address,
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

    d.AccessVaultProxyAdmin = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
    );
    d.accessVaultProxyAdmin = await d.AccessVaultProxyAdmin.connect(d.owner).deploy();
    await d.accessVaultProxyAdmin.deployed();
    // console.log("Access vault proxy admin deployed to:", d.accessVaultProxyAdmin.address);

    d.AccessVault = await ethers.getContractFactory("AccessVault");
    d.accessVault = await d.AccessVault.connect(d.owner).deploy();
    await d.accessVault.deployed();
    // console.log("Access vault deployed to:", d.accessVault.address);

    d.ABI = [
      "function initialize(address newOwner, address borrowingLendingAddress, address borrowingPowerAddress, address baaBeaconAddress, uint256 borrowingFee)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.borrowingLending.address,
      d.borrowingPower.address,
      d.upgradeableBeacon.address,
      d.borrowingFee
    ]);

    d.AccessVaultProxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.accessVaultProxy = await d.AccessVaultProxy.connect(d.owner).deploy(
      d.accessVault.address,
      d.accessVaultProxyAdmin.address,
      d.calldata
    );
    await d.accessVaultProxy.deployed();
    // console.log("Access vault proxy deployed to:", d.accessVaultProxy.address);

    d.accessVaultConnect = new ethers.Contract(
      d.accessVaultProxy.address,
      d.accessVault.interface.format(ethers.utils.FormatTypes.json),
      d.accessVaultProxy.provider
    );
    await d.accessVaultConnect.connect(d.owner).addToManagers(
      d.manager.address
    );
    await d.accessVaultConnect.connect(d.manager).setStablecoinProfileId(
      d.busd.address, 1
    );
    await d.accessVaultConnect.connect(d.manager).setStablecoinProfileId(
      d.usdt.address, 2
    );
    await d.accessVaultConnect.connect(d.manager).setTokenAvailable(
      d.etna.address, true
    );
    await d.accessVaultConnect.connect(d.manager).setExchangeRouter(
      d.exchangeRouterConnect.address
    );
    await d.accessVaultConnect.connect(d.manager).setNegativeFactor(
      d.negativeFactor
    );
  });

  // Test case
  it('Baa swap', async function () {
    d.loan = 100;
    await d.busd.connect(d.owner).transfer(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.usdt.connect(d.owner).transfer(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0])
      .deployBaa(d.busd.address, d.etna.address);
    d.baaBusdAddress = await d.accessVaultConnect.getUserBaaAddress(
      d.signers[0].address, d.busd.address, d.etna.address
    );
    d.baaBusd = new ethers.Contract(
      d.baaBusdAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.accessVaultConnect.connect(d.signers[0])
      .deployBaa(d.usdt.address, d.etna.address);
    d.baaUsdtAddress = await d.accessVaultConnect.getUserBaaAddress(
      d.signers[0].address, d.usdt.address, d.etna.address
    );
    d.baaUsdt = new ethers.Contract(
      d.baaUsdtAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.busd.connect(d.signers[0]).approve(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.loan.toString())
    );
    await d.accessVaultConnect.connect(d.signers[0]).borrow(
      d.baaBusd.address,
      ethers.utils.parseUnits(d.loan.toString())
    );
    await expect(
      d.baaBusd.swap(
        ethers.utils.parseUnits(d.loan.toString()),
        0,
        1,
        false
      )
    ).to.be.reverted; // pair does not exists
    await d.usdt.connect(d.signers[0]).approve(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await d.baaUsdt.connect(d.signers[0]).swap(
      ethers.utils.parseUnits(d.loan.toString(), 6),
      0,
      1,
      false
    );
  });

  it('Margin swap', async function () {
    d.loan = 100;
    d.marginAmount = 30;
    d.marginRate = 0.11;
    d.marginRateBelow = 0.12;
    d.marginSwapFee = 0.1
    await d.busd.connect(d.owner).transfer(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.accessVaultConnect.connect(d.owner).setMarginSwapFee(ethers.utils.parseUnits(
      d.marginSwapFee.toString()
    ));
    await d.usdt.connect(d.owner).transfer(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0])
      .deployBaa(d.busd.address, d.etna.address);
    d.baaBusdAddress = await d.accessVaultConnect.getUserBaaAddress(
      d.signers[0].address, d.busd.address, d.etna.address
    );
    d.baaBusd = new ethers.Contract(
      d.baaBusdAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.accessVaultConnect.connect(d.signers[0])
      .deployBaa(d.usdt.address, d.etna.address);
    d.baaUsdtAddress = await d.accessVaultConnect.getUserBaaAddress(
      d.signers[0].address, d.usdt.address, d.etna.address
    );
    d.baaUsdt = new ethers.Contract(
      d.baaUsdtAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.usdt.connect(d.signers[0]).approve(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await expect(
        d.accessVaultConnect.connect(d.signers[0]).setMarginSwap(
          d.baaBusd.address,
          ethers.utils.parseUnits(d.marginAmount.toString(), 6),
          ethers.utils.parseUnits(d.marginRate.toString(), 6),
          false,
          true,
          true
        )
      ).to.be.revertedWith('13.1');
    await d.accessVaultConnect.connect(d.signers[0]).setMarginSwap(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.marginAmount.toString(), 6),
      ethers.utils.parseUnits(d.marginRate.toString(), 6),
      false,
      true,
      true,
      {value: ethers.utils.parseUnits(d.marginSwapFee.toString())}
    );
    d.balances.owner_bnb = Number(ethers.utils.formatUnits(
      await ethers.provider.getBalance(d.owner.address)
    ));
    d.balances.accessVaultConnect_bnb = Number(ethers.utils.formatUnits(
      await ethers.provider.getBalance(d.accessVaultConnect.address)
    ));
    await d.accessVaultConnect.connect(d.owner).adminWithdraw(
      d.zero,
      ethers.utils.parseUnits(d.marginSwapFee.toString())
    );
    expect(roundTo(Number(ethers.utils.formatUnits(
      await ethers.provider.getBalance(d.owner.address)
    )), 3)).to.equal(roundTo(d.balances.owner_bnb + d.marginSwapFee, 3));

    expect(Number(ethers.utils.formatUnits(
      await ethers.provider.getBalance(d.accessVaultConnect.address)
    ))).to.equal(0);

    await d.accessVaultConnect.connect(d.owner).setMarginSwapFee(0);
    d.result = await d.accessVaultConnect.getMarginSwapData(d.baaUsdt.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount, 6))).to.equal(d.marginAmount);
    expect(Number(ethers.utils.formatUnits(d.result.marginRate, 6))).to.equal(d.marginRate);
    expect(d.result.reversed).to.be.false;
    expect(d.result.below).to.be.true;
    expect(d.result.active).to.be.true;
    await expect(
      d.accessVaultConnect.connect(d.manager).proceedMarginSwap(
        d.baaBusd.address
      )
    ).to.be.revertedWith('15.1');
    await expect(
      d.accessVaultConnect.connect(d.manager).proceedMarginSwap(
        d.baaUsdt.address
      )
    ).to.be.revertedWith('15.3');
    await d.accessVaultConnect.connect(d.signers[0]).setMarginSwap(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.marginAmount.toString(), 6),
      ethers.utils.parseUnits(d.marginRate.toString(), 6),
      false,
      false,
      true
    );
    await d.accessVaultConnect.connect(d.manager).proceedMarginSwap(
      d.baaUsdt.address
    );
    d.result = await d.accessVaultConnect.getMarginSwapData(d.baaUsdt.address);
    expect(d.result.active).to.be.false;
    await expect(
      d.accessVaultConnect.connect(d.manager).proceedMarginSwap(
        d.baaUsdt.address
      )
    ).to.be.revertedWith('15.1');
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ))).to.equal(d.loan - d.marginAmount);
    expect(Number(ethers.utils.formatUnits(
      await d.etna.balanceOf(d.baaUsdt.address)
    ))).to.be.lessThanOrEqual(d.marginAmount / d.marginRate);
    await d.accessVaultConnect.connect(d.signers[0]).setMarginSwap(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.marginAmount.toString(), 6),
      ethers.utils.parseUnits(d.marginRateBelow.toString(), 6),
      false,
      true,
      true
    );
    d.result = await d.accessVaultConnect.getMarginSwapData(d.baaUsdt.address);
    expect(d.result.active).to.be.true;
    d.etnaBalanceBaa = Number(ethers.utils.formatUnits(
      await d.etna.balanceOf(d.baaUsdt.address)
    ));
    await d.accessVaultConnect.connect(d.manager).proceedMarginSwap(
      d.baaUsdt.address
    );
    d.result = await d.accessVaultConnect.getMarginSwapData(d.baaUsdt.address);
    expect(d.result.active).to.be.false;
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ))).to.equal(d.loan - d.marginAmount - d.marginAmount);
    expect(Number(ethers.utils.formatUnits(
      await d.etna.balanceOf(d.baaUsdt.address)
    ))).to.be.greaterThanOrEqual(d.etnaBalanceBaa + d.marginAmount / d.marginRateBelow);
  });

  it('Liquidation', async function () {
    d.loan = 100;
    await d.usdt.connect(d.owner).transfer(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0])
      .deployBaa(d.usdt.address, d.etna.address);
    d.baaUsdtAddress = await d.accessVaultConnect.getUserBaaAddress(
      d.signers[0].address, d.usdt.address, d.etna.address
    );
    d.baaUsdt = new ethers.Contract(
      d.baaUsdtAddress,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    await d.usdt.connect(d.signers[0]).approve(
      d.accessVaultConnect.address, ethers.utils.parseUnits((d.loan * 3).toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.manager).setBorrowingFeeFactor(5000);
    expect(
      await d.accessVaultConnect.atLiquidation(
        d.exchangeRouterPancakeSwap.address, d.baaUsdt.address, false
      )
    ).to.be.false;
    await hre.timeAndMine.increaseTime('240 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });
    expect(
      await d.accessVaultConnect.atLiquidation(
        d.exchangeRouterPancakeSwap.address, d.baaUsdt.address, false
      )
    ).to.be.true;
    await expect(
      d.baaUsdt.connect(d.signers[0]).swap(
        ethers.utils.parseUnits(d.loan.toString(), 6),
        0,
        1,
        false
      )
    ).to.be.revertedWith('BAA is at liquidation');
    await d.accessVaultConnect.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    expect(
      await d.accessVaultConnect.atLiquidation(
        d.exchangeRouterPancakeSwap.address, d.baaUsdt.address, false
      )
    ).to.be.false;
    await expect(
      d.baaUsdt.connect(d.signers[0]).swap(
        ethers.utils.parseUnits(d.loan.toString(), 6),
        0,
        1,
        false
      )
    ).to.be.revertedWith('Fee payment is expired');
    await d.accessVaultConnect.connect(d.signers[0]).payFee(d.baaUsdt.address);
    await d.baaUsdt.connect(d.signers[0]).swap(
      ethers.utils.parseUnits(d.loan.toString(), 6),
      0,
      1,
      false
    );
    expect(
      await d.accessVaultConnect.atLiquidation(
        d.exchangeRouterPancakeSwap.address, d.baaUsdt.address, false
      )
    ).to.be.false;
    await expect(
      d.accessVaultConnect.connect(d.manager).liquidate(
        d.baaUsdt.address
      )
    ).to.be.revertedWith('22.2');
    await hre.timeAndMine.increaseTime('220 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });
    expect(
      await d.accessVaultConnect.atLiquidation(
        d.exchangeRouterPancakeSwap.address, d.baaUsdt.address, false
      )
    ).to.be.true;
    await d.accessVaultConnect.connect(d.manager).liquidate(
      d.baaUsdt.address
    );
    d.remains = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ));
    expect(d.remains).to.be.greaterThan(0);
    d.balances.s0_usdt = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.signers[0].address), 6
    ));
    await d.baaUsdt.connect(d.signers[0]).userWithdraw();
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.signers[0].address), 6
    )), 6)).to.equal(roundTo(d.balances.s0_usdt + d.remains, 6));
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ))).to.equal(0);
  });

  it('Return loan after swap', async function () {
    await d.usdt.connect(d.owner).transfer(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.initialTransfer.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0]).deployBaa(d.usdt.address, d.etna.address);
    d.baaUsdt = {
      address: await d.accessVaultConnect.getUserBaaAddress(
        d.signers[0].address, d.usdt.address, d.etna.address
      ),
    }
    d.baaUsdt = new ethers.Contract(
      d.baaUsdt.address,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    d.loan = 1000;
    d.borrowingPowerFactor = Number(ethers.utils.formatUnits(
      await d.borrowingPower.getUserBorrowingPower(d.signers[0].address), 4
    ));
    d.deposit = d.loan / d.borrowingPowerFactor;
    await d.usdt.connect(d.signers[0]).approve(
      d.accessVaultConnect.address, ethers.utils.parseUnits(d.deposit.toString(), 6)
    );
    await d.accessVaultConnect.connect(d.signers[0]).borrow(
      d.baaUsdt.address,
      ethers.utils.parseUnits(d.loan.toString(), 6)
    );
    d.owed = Number(ethers.utils.formatUnits(
      await d.accessVaultConnect.getOwedAmount(d.baaUsdt.address), 6
    ));

    await hre.timeAndMine.increaseTime('30 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    d.balances.s0_usdt = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.signers[0].address), 6
    ));
    d.balances.baaUsdt_usdt = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ));

    d.fee = Number(ethers.utils.formatUnits(
      await d.accessVaultConnect.calculateFee(d.baaUsdt.address, true), 6
    ));

    await d.usdt.connect(d.signers[0]).approve(
      d.accessVaultConnect.address, ethers.utils.parseUnits((d.fee * 1.1).toFixed(6), 6)
    );

    await d.accessVaultConnect.connect(d.signers[0]).payFee(
      d.baaUsdt.address
    );

    await d.baaUsdt.connect(d.signers[0]).swap(
      ethers.utils.parseUnits(d.loan.toString(), 6),
      0,
      1,
      false
    );
    d.balances.baaUsdt_etna = Number(ethers.utils.formatUnits(
      await d.etna.balanceOf(d.baaUsdt.address)
    ));
    d.balances.baaUsdt_usdt = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ));

    await d.baaUsdt.swap(
      ethers.utils.parseUnits(((d.balances.baaUsdt_etna / 2).toFixed(6))),
      0,
      1,
      true
    );
    d.balances.baaUsdt_etna = Number(ethers.utils.formatUnits(
      await d.etna.balanceOf(d.baaUsdt.address)
    ));
    d.balances.baaUsdt_usdt = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    ));

    d.balances.accessVault = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.accessVaultConnect.address), 6
    ));

    await d.accessVaultConnect.connect(d.signers[0]).returnLoan(
      d.baaUsdt.address, ethers.utils.parseUnits(
        (d.balances.baaUsdt_usdt / 2).toFixed(6), 6
      )
    );
    d.balances.accessVault = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.accessVaultConnect.address), 6
    ));

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.baaUsdt.address), 6
    )), 4)).to.equal(roundTo(d.balances.baaUsdt_usdt / 2, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.accessVaultConnect.address), 6
    )), 4)).to.equal(roundTo(d.balances.accessVault, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.accessVaultConnect.getOwedAmount(d.baaUsdt.address), 6
    )), 4)).to.equal(roundTo(d.owed - d.balances.baaUsdt_usdt / 2, 4));
    d.owed = d.owed - d.balances.baaUsdt_usdt / 2;
    d.result = await d.accessVaultConnect.getBaaData(d.baaUsdt.address);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.depositAmount, 6
    )), 4)).to.equal(roundTo(d.owed / d.borrowingPowerFactor, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.loanAmount, 6
    )), 4)).to.equal(roundTo(d.owed, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedFee, 6
    )), 4)).to.equal(0);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}