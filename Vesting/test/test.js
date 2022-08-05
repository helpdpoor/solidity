const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('Vesting contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.feeReceiver = d.signers[9];
    d.allocationCreator = d.signers[8];
    d.feeAmount = 0.05;
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

    d.Token = await ethers.getContractFactory("Token");
    d.vestingToken = await d.Token.deploy(
      d.allocationCreator.address,
      ethers.utils.parseUnits('1000000'),
      'Vesting token',
      'Vesting token'
    );
    await d.vestingToken.deployed();

    d.feeToken = await d.Token.deploy(
      d.owner.address,
      ethers.utils.parseUnits('1000000'),
      'Fee token',
      'Fee token'
    );
    await d.feeToken.deployed();

    await d.feeToken.connect(d.owner).transfer(
      d.allocationCreator.address,
      ethers.utils.parseUnits('100')
    );
  });

  it('Vesting', async function () {
    d.decimals = 18;
    d.blockNumber = await ethers.provider.getBlockNumber();
    d.block = await ethers.provider.getBlock(d.blockNumber);
    d.now = d.block.timestamp;

    d.Vesting = await ethers.getContractFactory("Vesting");
    d.vestingImplementation = await d.Vesting.deploy();
    await d.vestingImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, uint256, uint256)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      d.zero,
      d.feeReceiver.address,
      ethers.utils.parseUnits(d.feeAmount.toString()),
      d.feeDiscount
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.vestingProxy = await d.Proxy.deploy(
      d.vestingImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.vestingProxy.deployed();

    d.vesting = await d.Vesting.attach(d.vestingProxy.address);

    await d.feeToken.connect(d.allocationCreator).approve(
      d.vesting.address,
      ethers.utils.parseUnits('100')
    );
    await d.vestingToken.connect(d.allocationCreator).approve(
      d.vesting.address,
      ethers.utils.parseUnits('1000000')
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
      await d.vesting.provider.getBalance(d.feeReceiver.address)
    ));

    await d.vesting.connect(d.allocationCreator).register(
      d.uint8Data,
      d.uint256Data,
      d.addressData,
      d.stringData,
      d.vestingToken.address,
      true,
      {value: ethers.utils.parseUnits(d.feeAmount.toString())}
    );

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.provider.getBalance(d.feeReceiver.address)
    ))).to.equal(d.balance + d.feeAmount);

    expect(Number(ethers.utils.formatUnits(
      await d.vestingToken.balanceOf(d.vesting.address), d.decimals
    ))).to.equal(d.allocation1Amount + d.allocation2Amount + d.allocation3Amount + d.allocation4Amount);

    expect(Number(
      await d.vesting.getUserAllocationId(
        d.signers[0].address,
        d.vestingToken.address
      )
    )).to.equal(1);

    expect(Number(
      await d.vesting.getUserAllocationId(
        d.signers[1].address,
        d.vestingToken.address
      )
    )).to.equal(2);

    expect(Number(
      await d.vesting.getUserAllocationId(
        d.signers[2].address,
        d.vestingToken.address
      )
    )).to.equal(3);

    d.result = await d.vesting.getAllocationData(2);

    expect(d.result.receiver).to.equal(d.signers[1].address);
    expect(d.result.token).to.equal(d.vestingToken.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(d.allocation2Amount);
    expect(Number(d.result.withdrawnAmount)).to.equal(0);
    expect(Number(d.result.vestingStagesNumber)).to.equal(1);
    expect(d.result.name).to.equal('Lockup');

    d.result = await d.vesting.getAllocationVestingData(2, 0);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(500);
    expect(Number(d.result.unlockTime)).to.equal(d.now + 5 * d.day - 10);

    d.result = await d.vesting.getAllocationData(4);
    expect(d.result.receiver).to.equal(d.signers[3].address);
    expect(d.result.token).to.equal(d.vestingToken.address);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(d.allocation4Amount);
    expect(Number(d.result.withdrawnAmount)).to.equal(0);
    expect(Number(d.result.vestingStagesNumber)).to.equal(2);
    expect(d.result.name).to.equal('Vesting 2');

    d.result = await d.vesting.getAllocationVestingData(4, 1);
    expect(Number(ethers.utils.formatUnits(d.result.amount))).to.equal(2500);
    expect(Number(d.result.unlockTime)).to.equal(d.now + 20 * d.day - 10);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[0].address,
        d.vestingToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[1].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[2].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[3].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('1 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[0].address,
        d.vestingToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[1].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[2].address,
        d.vestingToken.address
      )
    ))).to.equal(1000);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[3].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('1 day');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[0].address,
        d.vestingToken.address
      )
    ))).to.equal(d.allocation1Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[1].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[2].address,
        d.vestingToken.address
      )
    ))).to.equal(3000);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[3].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    await d.vesting.connect(d.signers[0]).withdraw(d.vestingToken.address);
    await expect(
      d.vesting.connect(d.signers[0]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.vesting.connect(d.signers[1]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.vesting.connect(d.signers[2]).withdraw(d.vestingToken.address);
    await expect(
      d.vesting.connect(d.signers[2]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.vesting.connect(d.signers[3]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[0].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[1].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[2].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[3].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    await hre.timeAndMine.increaseTime('3 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[0].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[1].address,
        d.vestingToken.address
      )
    ))).to.equal(d.allocation2Amount);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[2].address,
        d.vestingToken.address
      )
    ))).to.equal(1000);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[3].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    await expect(
      d.vesting.connect(d.signers[0]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.vesting.connect(d.signers[1]).withdraw(d.vestingToken.address);
    await expect(
      d.vesting.connect(d.signers[1]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.vesting.connect(d.signers[2]).withdraw(d.vestingToken.address);
    await expect(
      d.vesting.connect(d.signers[2]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.vesting.connect(d.signers[3]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    await hre.timeAndMine.increaseTime('30 days');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[0].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[1].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[2].address,
        d.vestingToken.address
      )
    ))).to.equal(0);

    expect(Number(ethers.utils.formatUnits(
      await d.vesting.getAvailable(
        d.signers[3].address,
        d.vestingToken.address
      )
    ))).to.equal(d.allocation4Amount);

    await expect(
      d.vesting.connect(d.signers[0]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.vesting.connect(d.signers[1]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await expect(
      d.vesting.connect(d.signers[2]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');
    await d.vesting.connect(d.signers[3]).withdraw(d.vestingToken.address);
    await expect(
      d.vesting.connect(d.signers[3]).withdraw(d.vestingToken.address)
    ).to.be.revertedWith('Nothing to withdraw');

    expect(Number(ethers.utils.formatUnits(
      await d.vestingToken.balanceOf(d.vesting.address), d.decimals
    ))).to.equal(0);
    expect(Number(ethers.utils.formatUnits(
      await d.vestingToken.balanceOf(d.signers[0].address), d.decimals
    ))).to.equal(d.allocation1Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.vestingToken.balanceOf(d.signers[1].address), d.decimals
    ))).to.equal(d.allocation2Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.vestingToken.balanceOf(d.signers[2].address), d.decimals
    ))).to.equal(d.allocation3Amount);
    expect(Number(ethers.utils.formatUnits(
      await d.vestingToken.balanceOf(d.signers[3].address), d.decimals
    ))).to.equal(d.allocation4Amount);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}