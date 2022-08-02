const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('Deployer contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.feeReceiver = d.signers[9];
    d.tokenDeployer = d.signers[8];
    d.feeAmountSimple = 0.01;
    d.feeAmountAdvanced = 0.05;
    d.zero = '0x0000000000000000000000000000000000000000';
    d.day = 3600 * 24;
    d.name = 'Token';
    d.symbol = 'TN';
    d.decimals = 8;
    d.totalSupply = 1000000;
    d.feeDiscount = 1000;

    d.ProxyAdmin = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
    );
    d.proxyAdmin = await d.ProxyAdmin.deploy();
    await d.proxyAdmin.deployed();
  });

  it('Vesting', async function () {
    d.decimals = 18;
    d.blockNumber = await ethers.provider.getBlockNumber();
    d.block = await ethers.provider.getBlock(d.blockNumber);
    d.now = d.block.timestamp;

    d.Deployer = await ethers.getContractFactory("Deployer");
    d.deployerImplementation = await d.Deployer.deploy();
    await d.deployerImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, uint256, uint256, uint256)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.zero,
      d.feeReceiver.address,
      ethers.utils.parseUnits(d.feeAmountSimple.toString()),
      ethers.utils.parseUnits(d.feeAmountAdvanced.toString()),
      d.feeDiscount
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.deployerProxy = await d.Proxy.deploy(
      d.deployerImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.deployerProxy.deployed();

    d.deployer = await d.Deployer.attach(d.deployerProxy.address);

    d.allocationsNumber = 4;
    d.VestingStagesNumbers = [0,1,3,2];
    d.uint8Data = [d.allocationsNumber].concat(d.VestingStagesNumbers);
    d.allocation1Amount = 1000;
    d.allocation2Amount = 2100;
    d.allocation3Amount = 4000;
    d.allocation4Amount = 6200;
    d.allocationAmounts = [
      ethers.utils.parseUnits(d.allocation1Amount.toString()),
      ethers.utils.parseUnits(d.allocation2Amount.toString()),
      ethers.utils.parseUnits(d.allocation3Amount.toString()),
      ethers.utils.parseUnits(d.allocation4Amount.toString()),
    ];
    d.vestingData = [
      ethers.utils.parseUnits('500'),
      d.now + 5 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + d.day - 10,
      ethers.utils.parseUnits('2000'),
      d.now + 2 * d.day - 10,
      ethers.utils.parseUnits('3000'),
      d.now + 3 * d.day - 10,
      ethers.utils.parseUnits('1500'),
      d.now + 10 * d.day - 10,
      ethers.utils.parseUnits('2500'),
      d.now + 20 * d.day - 10,
    ];
    d.uint256Data = d.allocationAmounts.concat(d.vestingData);
    d.addressData = [
      d.signers[0].address,
      d.signers[1].address,
      d.signers[2].address,
      d.signers[3].address,
    ];
    d.stringData = [
      'No lockup',
      'Lockup',
      'Vesting 1',
      'Vesting 2',
    ];

    d.balance = Number(ethers.utils.formatUnits(
      await d.deployer.provider.getBalance(d.feeReceiver.address)
    ));

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");
    let tx = await d.deployer.connect(d.tokenDeployer).deploySimple(
      d.tokenDeployer.address,
      ethers.utils.parseUnits(d.totalSupply.toString(), d.decimals),
      d.decimals,
      d.name,
      d.symbol,
      true,
      {value: ethers.utils.parseUnits(d.feeAmountSimple.toString())}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.simpleToken = await d.ERC20Token.attach(d.tokenAddress);
      break;
    }
    expect(Number(ethers.utils.formatUnits(
      await d.deployer.provider.getBalance(d.feeReceiver.address)
    ))).to.equal(d.balance + d.feeAmountSimple);

    tx = await d.deployer.deployAdvanced(
      d.uint8Data,
      d.uint256Data,
      d.addressData,
      d.stringData,
      d.tokenDeployer.address,
      ethers.utils.parseUnits(d.totalSupply.toString(), d.decimals),
      d.decimals,
      d.name,
      d.symbol,
      d.true,
      {value: ethers.utils.parseUnits(d.feeAmountAdvanced.toString())}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.advancedToken = await d.ERC20Token.attach(d.tokenAddress);
      break;
    }
    expect(Number(ethers.utils.formatUnits(
      await d.deployer.provider.getBalance(d.feeReceiver.address)
    ))).to.equal(d.balance + d.feeAmountSimple + d.feeAmountAdvanced);

    expect(
      await d.simpleToken.name()
    ).to.equal(d.name);
    expect(
      await d.simpleToken.symbol()
    ).to.equal(d.symbol);
    expect(Number(
      await d.simpleToken.decimals()
    )).to.equal(d.decimals);
    expect(Number(ethers.utils.formatUnits(
      await d.simpleToken.totalSupply(), d.decimals
    ))).to.equal(d.totalSupply);
    expect(Number(ethers.utils.formatUnits(
      await d.simpleToken.balanceOf(d.tokenDeployer.address), d.decimals
    ))).to.equal(d.totalSupply);

    expect(
      await d.advancedToken.name()
    ).to.equal(d.name);
    expect(
      await d.advancedToken.symbol()
    ).to.equal(d.symbol);
    expect(Number(
      await d.advancedToken.decimals()
    )).to.equal(d.decimals);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.totalSupply(), d.decimals
    ))).to.equal(d.totalSupply);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.tokenDeployer.address), d.decimals
    ))).to.equal(d.totalSupply - (d.allocation1Amount + d.allocation2Amount + d.allocation3Amount + d.allocation4Amount));
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.deployer.address), d.decimals
    ))).to.equal(d.allocation1Amount + d.allocation2Amount + d.allocation3Amount + d.allocation4Amount);
    expect(Number(
      await d.deployer.getUserAllocationId(
        d.signers[0].address,
        d.advancedToken.address
      )
    )).to.equal(1);
    expect(Number(
      await d.deployer.getUserAllocationId(
        d.signers[1].address,
        d.advancedToken.address
      )
    )).to.equal(2);
    expect(Number(
      await d.deployer.getUserAllocationId(
        d.signers[2].address,
        d.advancedToken.address
      )
    )).to.equal(3);
    d.result = await d.deployer.getAllocationData(2);
    expect(d.result.receiver).to.equal(d.signers[1].address);
    expect(d.result.token).to.equal(d.advancedToken.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(d.allocation2Amount);
    expect(Number(d.result.withdrawnAmount)).to.equal(0);
    expect(Number(d.result.vestingStagesNumber)).to.equal(1);
    expect(d.result.name).to.equal('Lockup');

    d.result = await d.deployer.getAllocationVestingData(2, 0);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(500);
    expect(Number(d.result.unlockTime)).to.equal(d.now + 5 * d.day - 10);

    d.result = await d.deployer.getAllocationData(4);
    expect(d.result.receiver).to.equal(d.signers[3].address);
    expect(d.result.token).to.equal(d.advancedToken.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(d.allocation4Amount);
    expect(Number(d.result.withdrawnAmount)).to.equal(0);
    expect(Number(d.result.vestingStagesNumber)).to.equal(2);
    expect(d.result.name).to.equal('Vesting 2');

    d.result = await d.deployer.getAllocationVestingData(4, 1);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(2500);
    expect(Number(d.result.unlockTime)).to.equal(d.now + 20 * d.day - 10);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('1 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(1000);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('1 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(3000);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('3 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation2Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(1000);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await expect(
      d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    await hre.timeAndMine.increaseTime('30 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation4Amount);

    await expect(
      d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.deployer.address), d.decimals
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[0].address), d.decimals
    ))).to.equal(d.allocation1Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[1].address), d.decimals
    ))).to.equal(d.allocation2Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[2].address), d.decimals
    ))).to.equal(d.allocation3Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[3].address), d.decimals
    ))).to.equal(d.allocation4Amount);
  });

  it('Vesting fee in tokens', async function () {
    d.decimals = 18;
    d.blockNumber = await ethers.provider.getBlockNumber();
    d.block = await ethers.provider.getBlock(d.blockNumber);
    d.now = d.block.timestamp;

    d.PaymentToken = await ethers.getContractFactory("PaymentToken");
    d.paymentToken = await d.PaymentToken.deploy(
      d.owner.address,
      ethers.utils.parseUnits(d.totalSupply.toString()),
      'Payment token',
      'Payment token'
    );
    await d.paymentToken.deployed();
    await d.paymentToken.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits((d.feeAmountSimple + d.feeAmountAdvanced).toString())
    );
    await d.paymentToken.connect(d.owner).transfer(
      d.signers[1].address, ethers.utils.parseUnits((d.feeAmountSimple + d.feeAmountAdvanced).toString())
    );
    await d.paymentToken.connect(d.owner).transfer(
      d.signers[2].address, ethers.utils.parseUnits((d.feeAmountSimple + d.feeAmountAdvanced).toString())
    );

    d.Deployer = await ethers.getContractFactory("Deployer");
    d.deployerImplementation = await d.Deployer.deploy();
    await d.deployerImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, uint256, uint256, uint256)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.paymentToken.address,
      d.feeReceiver.address,
      ethers.utils.parseUnits(d.feeAmountSimple.toString()),
      ethers.utils.parseUnits(d.feeAmountAdvanced.toString()),
      d.feeDiscount
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.deployerProxy = await d.Proxy.deploy(
      d.deployerImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.deployerProxy.deployed();

    d.deployer = await d.Deployer.attach(d.deployerProxy.address);

    await d.paymentToken.connect(d.signers[0]).approve(
      d.deployer.address, ethers.utils.parseUnits((d.feeAmountSimple + d.feeAmountAdvanced).toString())
    );
    await d.paymentToken.connect(d.signers[1]).approve(
      d.deployer.address, ethers.utils.parseUnits((d.feeAmountSimple + d.feeAmountAdvanced).toString())
    );
    await d.paymentToken.connect(d.signers[2]).approve(
      d.deployer.address, ethers.utils.parseUnits((d.feeAmountSimple + d.feeAmountAdvanced).toString())
    );

    d.allocationsNumber = 4;
    d.VestingStagesNumbers = [0,1,3,2];
    d.uint8Data = [d.allocationsNumber].concat(d.VestingStagesNumbers);
    d.allocation1Amount = 1000;
    d.allocation2Amount = 2100;
    d.allocation3Amount = 4000;
    d.allocation4Amount = 6200;
    d.allocationAmounts = [
      ethers.utils.parseUnits(d.allocation1Amount.toString()),
      ethers.utils.parseUnits(d.allocation2Amount.toString()),
      ethers.utils.parseUnits(d.allocation3Amount.toString()),
      ethers.utils.parseUnits(d.allocation4Amount.toString()),
    ];
    d.vestingData = [
      ethers.utils.parseUnits('500'),
      d.now + 5 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + d.day - 10,
      ethers.utils.parseUnits('2000'),
      d.now + 2 * d.day - 10,
      ethers.utils.parseUnits('3000'),
      d.now + 3 * d.day - 10,
      ethers.utils.parseUnits('1500'),
      d.now + 10 * d.day - 10,
      ethers.utils.parseUnits('2500'),
      d.now + 20 * d.day - 10,
    ];
    d.uint256Data = d.allocationAmounts.concat(d.vestingData);
    d.addressData = [
      d.signers[0].address,
      d.signers[1].address,
      d.signers[2].address,
      d.signers[3].address,
    ];
    d.stringData = [
      'No lockup',
      'Lockup',
      'Vesting 1',
      'Vesting 2',
    ];

    d.balance = Number(ethers.utils.formatUnits(
      await d.paymentToken.balanceOf(d.feeReceiver.address)
    ));

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");
    let tx = await d.deployer.deploySimple(
      d.tokenDeployer.address,
      ethers.utils.parseUnits(d.totalSupply.toString(), d.decimals),
      d.decimals,
      d.name,
      d.symbol,
      false,
      {}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.simpleToken = await d.ERC20Token.attach(d.tokenAddress);
      break;
    }
    expect(Number(ethers.utils.formatUnits(
      await d.paymentToken.balanceOf(d.feeReceiver.address)
    ))).to.equal(d.balance + d.feeAmountSimple * (10000 - d.feeDiscount) / 10000);

    tx = await d.deployer.deployAdvanced(
      d.uint8Data,
      d.uint256Data,
      d.addressData,
      d.stringData,
      d.tokenDeployer.address,
      ethers.utils.parseUnits(d.totalSupply.toString(), d.decimals),
      d.decimals,
      d.name,
      d.symbol,
      false,
      {}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.advancedToken = await d.ERC20Token.attach(d.tokenAddress);
      break;
    }

    expect(Number(ethers.utils.formatUnits(
      await d.paymentToken.balanceOf(d.feeReceiver.address)
    ))).to.equal(roundTo(
      d.balance + (d.feeAmountSimple + d.feeAmountAdvanced) * (10000 - d.feeDiscount) / 10000, 8
    ));

    expect(
      await d.simpleToken.name()
    ).to.equal(d.name);
    expect(
      await d.simpleToken.symbol()
    ).to.equal(d.symbol);
    expect(Number(
      await d.simpleToken.decimals()
    )).to.equal(d.decimals);
    expect(Number(ethers.utils.formatUnits(
      await d.simpleToken.totalSupply(), d.decimals
    ))).to.equal(d.totalSupply);
    expect(Number(ethers.utils.formatUnits(
      await d.simpleToken.balanceOf(d.tokenDeployer.address), d.decimals
    ))).to.equal(d.totalSupply);

    expect(
      await d.advancedToken.name()
    ).to.equal(d.name);
    expect(
      await d.advancedToken.symbol()
    ).to.equal(d.symbol);
    expect(Number(
      await d.advancedToken.decimals()
    )).to.equal(d.decimals);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.totalSupply(), d.decimals
    ))).to.equal(d.totalSupply);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.tokenDeployer.address), d.decimals
    ))).to.equal(d.totalSupply - (d.allocation1Amount + d.allocation2Amount + d.allocation3Amount + d.allocation4Amount));
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.deployer.address), d.decimals
    ))).to.equal(d.allocation1Amount + d.allocation2Amount + d.allocation3Amount + d.allocation4Amount);
    expect(Number(
      await d.deployer.getUserAllocationId(
        d.signers[0].address,
        d.advancedToken.address
      )
    )).to.equal(1);
    expect(Number(
      await d.deployer.getUserAllocationId(
        d.signers[1].address,
        d.advancedToken.address
      )
    )).to.equal(2);
    expect(Number(
      await d.deployer.getUserAllocationId(
        d.signers[2].address,
        d.advancedToken.address
      )
    )).to.equal(3);
    d.result = await d.deployer.getAllocationData(2);
    expect(d.result.receiver).to.equal(d.signers[1].address);
    expect(d.result.token).to.equal(d.advancedToken.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(d.allocation2Amount);
    expect(Number(d.result.withdrawnAmount)).to.equal(0);
    expect(Number(d.result.vestingStagesNumber)).to.equal(1);
    expect(d.result.name).to.equal('Lockup');

    d.result = await d.deployer.getAllocationVestingData(2, 0);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(500);
    expect(Number(d.result.unlockTime)).to.equal(d.now + 5 * d.day - 10);

    d.result = await d.deployer.getAllocationData(4);
    expect(d.result.receiver).to.equal(d.signers[3].address);
    expect(d.result.token).to.equal(d.advancedToken.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(d.allocation4Amount);
    expect(Number(d.result.withdrawnAmount)).to.equal(0);
    expect(Number(d.result.vestingStagesNumber)).to.equal(2);
    expect(d.result.name).to.equal('Vesting 2');

    d.result = await d.deployer.getAllocationVestingData(4, 1);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(2500);
    expect(Number(d.result.unlockTime)).to.equal(d.now + 20 * d.day - 10);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('1 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(1000);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('1 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(3000);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('3 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation2Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(1000);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    await expect(
      d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    await hre.timeAndMine.increaseTime('30 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[0].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[1].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[2].address,
        d.advancedToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.deployer.getAvailable(
        d.signers[3].address,
        d.advancedToken.address
      )
    ))).to.equal(d.allocation4Amount);

    await expect(
      d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address);
    await expect(
      d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.deployer.address), d.decimals
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[0].address), d.decimals
    ))).to.equal(d.allocation1Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[1].address), d.decimals
    ))).to.equal(d.allocation2Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[2].address), d.decimals
    ))).to.equal(d.allocation3Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.advancedToken.balanceOf(d.signers[3].address), d.decimals
    ))).to.equal(d.allocation4Amount);
  });

  it('Vesting limit', async function () {
    d.decimals = 18;

    d.allocationsNumber = 10;
    d.VestingStagesNumbers = [10,10,10,10,10,10,10,10,10,10];
    d.uint8Data = [d.allocationsNumber].concat(d.VestingStagesNumbers);
    d.allocationAmount = 10000;
    d.allocationAmounts = [
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
      ethers.utils.parseUnits(d.allocationAmount.toString()),
    ];
    d.vestingData = [
      ethers.utils.parseUnits('1000'),
      d.now + 1 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 2 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 3 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 4 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 5 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 6 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 7 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 8 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 9 * d.day - 10,
      ethers.utils.parseUnits('1000'),
      d.now + 10 * d.day - 10,
    ];
    d.uint256Data = d.allocationAmounts
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData)
      .concat(d.vestingData);
    d.addressData = [
      d.signers[0].address,
      d.signers[1].address,
      d.signers[2].address,
      d.signers[3].address,
      d.signers[4].address,
      d.signers[5].address,
      d.signers[6].address,
      d.signers[7].address,
      d.signers[8].address,
      d.signers[9].address,
    ];
    d.stringData = [
      'Vesting 1',
      'Vesting 2',
      'Vesting 3',
      'Vesting 4',
      'Vesting 5',
      'Vesting 6',
      'Vesting 7',
      'Vesting 8',
      'Vesting 9',
      'Vesting 10',
    ];

    d.Deployer = await ethers.getContractFactory("Deployer");
    d.deployerImplementation = await d.Deployer.deploy();
    await d.deployerImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, uint256, uint256, uint256)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.zero,
      d.feeReceiver.address,
      ethers.utils.parseUnits(d.feeAmountSimple.toString()),
      ethers.utils.parseUnits(d.feeAmountAdvanced.toString()),
      d.feeDiscount
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.deployerProxy = await d.Proxy.deploy(
      d.deployerImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.deployerProxy.deployed();

    d.deployer = await d.Deployer.attach(d.deployerProxy.address);

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");
    let tx = await d.deployer.deploySimple(
      d.tokenDeployer.address,
      ethers.utils.parseUnits(d.totalSupply.toString(), d.decimals),
      d.decimals,
      d.name,
      d.symbol,
      true,
      {value: ethers.utils.parseUnits(d.feeAmountSimple.toString())}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.simpleToken = await d.ERC20Token.attach(d.tokenAddress);
      break;
    }

    tx = await d.deployer.deployAdvanced(
      d.uint8Data,
      d.uint256Data,
      d.addressData,
      d.stringData,
      d.tokenDeployer.address,
      ethers.utils.parseUnits(d.totalSupply.toString(), d.decimals),
      d.decimals,
      d.name,
      d.symbol,
      true,
      {value: ethers.utils.parseUnits(d.feeAmountAdvanced.toString())}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.advancedToken = await d.ERC20Token.attach(d.tokenAddress);
      break;
    }

    await hre.timeAndMine.increaseTime('10 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    await d.deployer.connect(d.signers[0]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[1]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[2]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[3]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[4]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[5]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[6]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[7]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[8]).withdraw(d.advancedToken.address);
    await d.deployer.connect(d.signers[9]).withdraw(d.advancedToken.address);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}