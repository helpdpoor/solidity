const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {
  addedTime: 0,
};

// Start test block
describe('test.js - Airdrop contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.manager = d.signers[9];
    d.signer = d.signers[8];
    d.users = [d.signers[2], d.signers[3], d.signers[4]];
    d.amount = 100;
    d.totalAmount = 10000;
    d.balances = {};
    d.newBalances = {};

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");
    
    d.syntrum = await d.ERC20Token.connect(d.owner).deploy(
      d.owner.address,
      `Syntrum`,
      `Syntrum`,
      ethers.utils.parseUnits('1000000000')
    );
    await d.syntrum.deployed();

    d.SyntrumAirdrop = await ethers.getContractFactory("SyntrumAirdrop");
    d.syntrumAirdrop = await d.SyntrumAirdrop.connect(d.owner).deploy(
      d.owner.address,
      d.manager.address,
      d.signer.address,
      d.syntrum.address,
      ethers.utils.parseUnits(d.amount.toString())
    );
    await d.syntrumAirdrop.deployed();

    await d.syntrumAirdrop.connect(d.owner).grantRole('MANAGER', d.manager.address);
    await d.syntrumAirdrop.connect(d.owner).grantRole('SIGNER', d.signer.address);

    await d.syntrum.connect(d.owner).transfer(
      d.syntrumAirdrop.address, ethers.utils.parseUnits(d.totalAmount.toString())
    );
  });

  // Test case
  it('Airdrop testing', async function () {
    await expect(
      d.syntrumAirdrop.connect(d.users[0]).setAirdropStatus(false)
    ).to.be.revertedWith('Caller is not authorized');
    await d.syntrumAirdrop.connect(d.manager).setAirdropStatus(false);
    await expect(
      d.syntrumAirdrop.connect(d.users[0]).receiveEarnings([])
    ).to.be.revertedWith('Airdrop is not active');
    await d.syntrumAirdrop.connect(d.manager).setAirdropStatus(true);
    await expect(
      d.syntrumAirdrop.connect(d.users[0]).receiveEarnings([])
    ).to.be.revertedWith('ECDSA: invalid signature length');

    const abiCoder = new ethers.utils.AbiCoder();
    d.message = abiCoder.encode(
      ["address"],
      [d.users[0].address]
    );
    d.hashedMessage = ethers.utils.keccak256(d.message);
    d.messageHashBinary = ethers.utils.arrayify(d.hashedMessage);
    d.signature = await d.owner.signMessage(d.messageHashBinary);
    await expect(
      d.syntrumAirdrop.connect(d.users[0]).receiveEarnings(d.signature)
    ).to.be.revertedWith('Signature is not valid');
    d.signature = await d.signer.signMessage(d.messageHashBinary);
    d.balances[0] = Number(ethers.utils.formatUnits(
      await d.syntrum.balanceOf(d.users[0].address)
    ));
    d.balances[1] = Number(ethers.utils.formatUnits(
      await d.syntrum.balanceOf(d.users[0].address)
    ));
    d.balances[2] = Number(ethers.utils.formatUnits(
      await d.syntrum.balanceOf(d.users[0].address)
    ));
    await d.syntrumAirdrop.connect(d.users[0]).receiveEarnings(d.signature);
    await expect(
      d.syntrumAirdrop.connect(d.users[0]).receiveEarnings(d.signature)
    ).to.be.revertedWith('Caller already received earnings');
    expect(Number(ethers.utils.formatUnits(
      await d.syntrum.balanceOf(d.users[0].address)
    ))).to.equal(d.balances[0] + d.amount);

    d.message = abiCoder.encode(
      ["address"],
      [d.users[1].address]
    );
    d.hashedMessage = ethers.utils.keccak256(d.message);
    d.messageHashBinary = ethers.utils.arrayify(d.hashedMessage);
    d.signature = await d.signer.signMessage(d.messageHashBinary);
    await d.syntrumAirdrop.connect(d.users[1]).receiveEarnings(d.signature);
    await expect(
      d.syntrumAirdrop.connect(d.users[1]).receiveEarnings(d.signature)
    ).to.be.revertedWith('Caller already received earnings');
    expect(Number(ethers.utils.formatUnits(
      await d.syntrum.balanceOf(d.users[1].address)
    ))).to.equal(d.balances[1] + d.amount);

    d.message = abiCoder.encode(
      ["address"],
      [d.users[2].address]
    );
    d.hashedMessage = ethers.utils.keccak256(d.message);
    d.messageHashBinary = ethers.utils.arrayify(d.hashedMessage);
    d.signature = await d.signer.signMessage(d.messageHashBinary);
    await d.syntrumAirdrop.connect(d.users[2]).receiveEarnings(d.signature);
    await expect(
      d.syntrumAirdrop.connect(d.users[2]).receiveEarnings(d.signature)
    ).to.be.revertedWith('Caller already received earnings');
    expect(Number(ethers.utils.formatUnits(
      await d.syntrum.balanceOf(d.users[2].address)
    ))).to.equal(d.balances[2] + d.amount);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}