const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('accessVault.js - Access vault testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.manager = d.signers[9];
    d.balances = {};
    d.zero = '0x0000000000000000000000000000000000000000';
    d.borrowingFee = 1000;
    d.minimalStake = 10000;
    d.borrowingPowerData = [
      15000, 20000, 25000, 30000, 40000, 50000
    ];
    d.initialTransfer = 10000;
    d.exchangeRouter = {
      address: d.signers[7].address // todo should be replaced for real exchange router contract
    };
    d.BEP20Token = await ethers.getContractFactory("BEP20Token");
    d.busd = await d.BEP20Token.connect(d.owner).deploy(
      d.owner.address, 'BUSD', 'BUSD', ethers.utils.parseUnits('1000000000'), 18
    );
    await d.busd.deployed();
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

    d.usdt = await d.BEP20Token.connect(d.owner).deploy(
      d.owner.address, 'USDT', 'USDT', ethers.utils.parseUnits('1000000000'), 18
    );
    await d.usdt.deployed();
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

    d.etna = await d.BEP20Token.connect(d.owner).deploy(
      d.owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000000'), 18
    );
    await d.etna.deployed();
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
    await d.busd.connect(d.owner).transfer(
      d.borrowingLending.address, ethers.utils.parseUnits('1000000')
    );
    await d.usdt.connect(d.owner).transfer(
      d.borrowingLending.address, ethers.utils.parseUnits('1000000')
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

    d.AccessVault = await ethers.getContractFactory("AccessVault");
    d.accessVaultImplementation = await d.AccessVault.connect(d.owner).deploy();
    await d.accessVaultImplementation.deployed();

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

    await d.borrowingLending.connect(d.owner).setAccessVault(d.accessVault.address);

    await d.accessVault.connect(d.owner).addToManagers(
      d.manager.address
    );
    await d.accessVault.connect(d.manager).setStablecoinProfileId(
      d.busd.address, 1
    );
    await d.accessVault.connect(d.manager).setStablecoinProfileId(
      d.usdt.address, 2
    );
    expect(Number(
      await d.accessVault.getStablecoinsNumber()
    )).to.equal(2);
    await d.accessVault.connect(d.manager).setStablecoinProfileId(
      d.usdt.address, 2
    );
    expect(Number(
      await d.accessVault.getStablecoinsNumber()
    )).to.equal(2);
    await d.accessVault.connect(d.manager).setStablecoinProfileId(
      d.usdt.address, 0
    );
    expect(Number(
      await d.accessVault.getStablecoinsNumber()
    )).to.equal(1);
    expect(
      await d.accessVault.getStablecoinByIndex(0)
    ).to.equal(d.busd.address);
    await d.accessVault.connect(d.manager).setStablecoinProfileId(
      d.usdt.address, 2
    );
    expect(
      await d.accessVault.getStablecoinByIndex(1)
    ).to.equal(d.usdt.address);
    await d.accessVault.connect(d.manager).setTokenAvailable(
      d.etna.address, true
    );
    await d.accessVault.connect(d.manager).setExchangeRouter(
      d.exchangeRouter.address
    );
  });

  // Test case
  it('Access vault initialization', async function () {
    expect(await d.accessVault.owner())
      .to.equal(d.owner.address);
    d.result = await d.accessVault.getContractAddresses();
    expect(d.result.borrowingLendingContract)
      .to.equal(d.borrowingLending.address);
    expect(d.result.borrowingPowerContract)
      .to.equal(d.borrowingPower.address);
    expect(d.result.baaBeaconContract)
      .to.equal(d.upgradeableBeacon.address);
    expect(d.result.exchangeRouterContract)
      .to.equal(d.exchangeRouter.address);
    d.result = await d.accessVault.getFactors();
    expect(Number(d.result.borrowingFeeFactor))
      .to.equal(d.borrowingFee);
  });

  it('Access vault baa deployment', async function () {
    expect(await d.accessVault.getUserBaaAddress(
      d.signers[0].address, d.busd.address, d.etna.address
    )).to.equal(d.zero);
    await expect(
      d.accessVault.connect(d.signers[0]).deployBaa(d.etna.address, d.busd.address)
    ).to.be.revertedWith('3.1');
    await expect(
      d.accessVault.connect(d.signers[0]).deployBaa(d.busd.address, d.busd.address)
    ).to.be.revertedWith('3.2');
    await d.accessVault.connect(d.signers[0]).deployBaa(d.busd.address, d.etna.address);
    await expect(
      d.accessVault.connect(d.signers[0]).deployBaa(d.busd.address, d.etna.address)
    ).to.be.revertedWith('3.3');

    d.baaProxy = {
      address: await d.accessVault.getUserBaaAddress(
        d.signers[0].address, d.busd.address, d.etna.address
      ),
    };
    d.result = await d.accessVault.getBaaAddresses(
      d.baaProxy.address
    );
    expect(d.result.ownerAddress)
      .to.equal(d.signers[0].address);
    d.result = await d.accessVault.getBaaAddresses(d.baaProxy.address);
    expect(d.result.ownerAddress).to.equal(d.signers[0].address);
    d.baaProxy = new ethers.Contract(
      d.baaProxy.address,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
   d.result = await d.baaProxy.getAddresses();
   expect(d.result.accessVaultAddress)
     .to.equal(d.accessVaultProxy.address);
    expect(d.result.exchangeRouterAddress)
      .to.equal(d.exchangeRouter.address);
    expect(d.result.stablecoinAddress)
      .to.equal(d.busd.address);
    expect(d.result.tokenAddress)
      .to.equal(d.etna.address);
   expect(await  d.baaProxy.owner())
     .to.equal(d.signers[0].address);
  });

  it('Fund Access vault from Borrowing lending contract and return assets', async function () {
    d.balances.borrowingLendingBusdBalance = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.borrowingLending.address)
    ));
    d.balances.borrowingLendingUsdtBalance = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.borrowingLending.address)
    ));
    d.balances.accessVaultBusdBalance = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ));
    d.balances.accessVaultUsdtBalance = Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.accessVault.address)
    ));
    d.busdFund = 1568;
    d.busdReturn = 982;
    d.usdtFund = 1257;
    d.usdtReturn = 724;

    await d.borrowingLending.connect(d.owner).accessVaultFund(
      d.busd.address, ethers.utils.parseUnits(d.busdFund.toString())
    );
    await d.borrowingLending.connect(d.owner).accessVaultFund(
      d.usdt.address, ethers.utils.parseUnits(d.usdtFund.toString())
    );
    expect(Number(ethers.utils.formatUnits(
      await d.borrowingLending.getAccessVaultFund(d.busd.address)
    ))).to.equal(d.busdFund);
    expect(Number(ethers.utils.formatUnits(
      await d.borrowingLending.getAccessVaultFund(d.usdt.address)
    ))).to.equal(d.usdtFund);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.borrowingLending.address)
    ))).to.equal(d.balances.borrowingLendingBusdBalance - d.busdFund);
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.borrowingLending.address)
    ))).to.equal(d.balances.borrowingLendingBusdBalance - d.usdtFund);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ))).to.equal(d.balances.accessVaultBusdBalance + d.busdFund);
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.accessVault.address)
    ))).to.equal(d.balances.accessVaultBusdBalance + d.usdtFund);
    await d.borrowingLending.connect(d.owner).accessVaultReturn(
      d.busd.address, ethers.utils.parseUnits(d.busdReturn.toString())
    );
    await d.borrowingLending.connect(d.owner).accessVaultReturn(
      d.usdt.address, ethers.utils.parseUnits(d.usdtReturn.toString())
    );

    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.borrowingLending.address)
    ))).to.equal(d.balances.borrowingLendingBusdBalance - d.busdFund + d.busdReturn);
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.borrowingLending.address)
    ))).to.equal(d.balances.borrowingLendingBusdBalance - d.usdtFund + d.usdtReturn);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ))).to.equal(d.balances.accessVaultBusdBalance + d.busdFund - d.busdReturn);
    expect(Number(ethers.utils.formatUnits(
      await d.usdt.balanceOf(d.accessVault.address)
    ))).to.equal(d.balances.accessVaultBusdBalance + d.usdtFund - d.usdtReturn);
    await d.borrowingLending.connect(d.owner).accessVaultFund(
      d.busd.address, ethers.utils.parseUnits((d.busdFund - d.busdReturn).toString())
    );
    await d.borrowingLending.connect(d.owner).accessVaultFund(
      d.usdt.address, ethers.utils.parseUnits((d.usdtFund - d.usdtReturn).toString())
    );
  });

  it('Access vault admin functions', async function () {
    await d.busd.connect(d.owner)
      .transfer(d.accessVault.address, ethers.utils.parseUnits('10000'));
    await d.accessVault.connect(d.owner)
      .removeFromManagers(d.manager.address);
    expect(
      await d.accessVault.isManager(d.manager.address)
    ).to.be.false;
    await d.accessVault.connect(d.owner)
      .addToManagers(d.manager.address);
    expect(
      await d.accessVault.isManager(d.manager.address)
    ).to.be.true;
    d.balances.ownerBusdBalance = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.owner.address)
    ));
     d.balances.accessVault = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ));
    d.withdrawnAmount = 1234;
    await d.accessVault.connect(d.owner)
      .adminWithdraw(d.busd.address, ethers.utils.parseUnits(d.withdrawnAmount.toString()));
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.owner.address)
    ))).to.equal(d.balances.ownerBusdBalance + d.withdrawnAmount);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ))).to.equal( d.balances.accessVault - d.withdrawnAmount);
    // admin withdraw from BAA
    await d.accessVault.connect(d.signers[0]).deployBaa(d.busd.address, d.etna.address);
    d.baaProxy = {
      address: await d.accessVault.getUserBaaAddress(
        d.signers[0].address, d.busd.address, d.etna.address
      ),
    };
    await d.busd.connect(d.owner)
      .transfer(d.baaProxy.address, ethers.utils.parseUnits('10000'));
    d.balances.ownerBusdBalance = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.owner.address)
    ));
    d.balances.baaProxyBalance = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.baaProxy.address)
    ));
    await d.accessVault.connect(d.owner)
      .adminWithdrawBaa(
        d.baaProxy.address,
        d.busd.address,
        ethers.utils.parseUnits(d.withdrawnAmount.toString())
      );

    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.baaProxy.address)
    ))).to.equal(d.balances.baaProxyBalance - d.withdrawnAmount);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.owner.address)
    ))).to.equal(d.balances.ownerBusdBalance);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ))).to.equal(d.balances.accessVault);
  });

  it('Access vault borrowing power', async function () {
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[5].address)
    )).to.equal(d.borrowingPowerData[0]);
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[0].address)
    )).to.equal(d.borrowingPowerData[1]);
    await d.etna.connect(d.owner).transfer(d.signers[0].address, 1);
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[0].address)
    )).to.equal(d.borrowingPowerData[1]);
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[1].address)
    )).to.equal(d.borrowingPowerData[2]);
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[2].address)
    )).to.equal(d.borrowingPowerData[2]);
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[3].address)
    )).to.equal(d.borrowingPowerData[3]);
    expect(Number(
      await d.borrowingPower.getUserBorrowingPower(d.signers[4].address)
    )).to.equal(d.borrowingPowerData[5]);
  });

  it('Baa deposit/borrow, return loan', async function () {
    await d.busd.connect(d.owner).transfer(
      d.accessVault.address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    await d.accessVault.connect(d.signers[0]).deployBaa(d.busd.address, d.etna.address);
    d.baaProxy = {
      address: await d.accessVault.getUserBaaAddress(
        d.signers[0].address, d.busd.address, d.etna.address
      ),
    }
    d.baaProxy = new ethers.Contract(
      d.baaProxy.address,
      d.baa.interface.format(ethers.utils.FormatTypes.json),
      d.signers[0]
    );
    d.loan = 1000;
    d.balances.s0Balance = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.signers[0].address)
    ));
    d.balances.accessVault = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ));
    d.balances.baaProxy = Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.baaProxy.address)
    ));
    d.borrowingPower = Number(ethers.utils.formatUnits(
      await d.borrowingPower.getUserBorrowingPower(d.signers[0].address), 4
    ));
    d.deposit = d.loan / d.borrowingPower;
    await d.busd.connect(d.signers[0]).approve(
      d.accessVault.address, ethers.utils.parseUnits(d.deposit.toString())
    );
    await d.accessVault.connect(d.signers[0]).borrow(
      d.baaProxy.address,
      ethers.utils.parseUnits(d.loan.toString())
    );
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.signers[0].address)
    ))).to.equal(d.balances.s0Balance - d.deposit);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.baaProxy.address)
    ))).to.equal(d.balances.baaProxy + d.loan);
    expect(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    ))).to.equal(d.balances.accessVault + d.deposit - d.loan);
    await hre.timeAndMine.increaseTime('10 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });
    d.result = await d.accessVault.getFactors();
    d.borrowingFeeFactor = Number(ethers.utils.formatUnits(d.result.borrowingFeeFactor, 4));
    d.expectedFee = d.loan * d.borrowingFeeFactor * 10 / 365;
    d.actualFee = Number(ethers.utils.formatUnits(
      await d.accessVault.calculateFee(d.baaProxy.address, true)
    ));
    expect(roundTo(d.expectedFee, 4)).to.equal(roundTo(d.actualFee, 4));
    await d.accessVault.connect(d.signers[0]).returnLoan(
      d.baaProxy.address, ethers.utils.parseUnits(d.loan.toString())
    );
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.baaProxy.address)
    )), 4)).to.equal(0);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.busd.balanceOf(d.accessVault.address)
    )), 4)).to.equal(roundTo(d.balances.accessVault + d.actualFee / d.borrowingPower, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.accessVault.getOwedAmount(d.baaProxy.address)
    )), 4)).to.equal(roundTo(d.actualFee, 4));
    d.result = await d.accessVault.getBaaData(d.baaProxy.address);
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.depositAmount
    )), 4)).to.equal(roundTo(d.actualFee / d.borrowingPower, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.loanAmount
    )), 4)).to.equal(roundTo(d.actualFee, 4));
    expect(roundTo(Number(ethers.utils.formatUnits(
      d.result.accumulatedFee
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