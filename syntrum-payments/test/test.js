const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('test.js - Payments contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.manager = d.signers[9];
    d.signer = d.signers[8];
    d.receiver = d.signers[7];
    d.users = [d.signers[0], d.signers[1]];
    d.balances = {};
    d.initialTransfer = 10000;
    d.paymentTokens = {
      busd: {
        rate: 0.9,
        weight: 1,
        paymentAmount: 257,
        purchaseAmount: 17.6,
      },
      usdt: {
        rate: 1.1,
        weight: 2,
        paymentAmount: 39.85,
        purchaseAmount: 718,
      },
    };
    d.orders = [
      {
        id: 3,
        price: 210,
      },
      {
        id: 5,
        price: 132,
      },
    ];

    d.Rates = await ethers.getContractFactory("Rates");
    d.rates = await d.Rates.connect(d.owner).deploy(
      d.owner.address,
      d.owner.address,
    );
    await d.rates.deployed();

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");

    for (const token in d.paymentTokens) {
      const rate = d.paymentTokens[token].rate;
      if (!d.paymentTokens[token].contract) {
        d.paymentTokens[token].contract = await d.ERC20Token.connect(d.owner).deploy(
          d.owner.address,
          token.toUpperCase(),
          token.toUpperCase(),
          ethers.utils.parseUnits('1000000000')
        );
        await d.paymentTokens[token].contract.deployed();
        if (!d.provider) d.provider = d.paymentTokens[token].contract.provider;
        for (let i = 0; i < d.users.length; i ++) {
          const user = d.users[i];
          await d.paymentTokens[token].contract.connect(d.owner).transfer(
            user.address, ethers.utils.parseUnits(d.initialTransfer.toString())
          );
        }
      }

      await d.rates.connect(d.owner).setUsdRate(
        d.paymentTokens[token].contract.address,
        ethers.utils.parseUnits(rate.toString())
      );
    }

    d.Payments = await ethers.getContractFactory("Payments");

    d.payments = await d.Payments.connect(d.owner).deploy(
      d.owner.address,
      d.manager.address,
      d.signer.address,
      d.rates.address,
      d.receiver.address
    );
    await d.payments.deployed();

    for (const token in d.paymentTokens) {
      d.payments.connect(d.manager).addPaymentProfile(
        d.paymentTokens[token].contract.address,
        0,
        d.paymentTokens[token].weight,
        token.toUpperCase(),
        token.toUpperCase()
      );

      for (let i = 0; i < d.users.length; i++) {
        const user = d.users[i];
        await d.paymentTokens[token].contract.connect(user).approve(
          d.payments.address, ethers.utils.parseUnits(d.initialTransfer.toString())
        );
      }
    }
  });

  // Test case
  it('Payment testing', async function () {
    await expect(
      d.payments.connect(d.users[0]).pay(
        d.paymentTokens.usdt.weight,
        d.orders[0].id,
        ethers.utils.parseUnits(d.orders[0].price.toString()),
        []
      )
    ).to.be.revertedWith('Signature is not valid');

    d.balances.busd = {};
    d.balances.usdt = {};
    d.balances.busd[d.users[0].address] = Number(ethers.utils.formatUnits(
      await d.paymentTokens.busd.contract.balanceOf(d.users[0].address)
    ));
    d.balances.usdt[d.users[0].address] = Number(ethers.utils.formatUnits(
      await d.paymentTokens.usdt.contract.balanceOf(d.users[0].address)
    ));
    d.balances.busd[d.users[1].address] = Number(ethers.utils.formatUnits(
      await d.paymentTokens.busd.contract.balanceOf(d.users[1].address)
    ));
    d.balances.usdt[d.users[1].address] = Number(ethers.utils.formatUnits(
      await d.paymentTokens.usdt.contract.balanceOf(d.users[1].address)
    ));
    d.balances.busd[d.receiver.address] = Number(ethers.utils.formatUnits(
      await d.paymentTokens.busd.contract.balanceOf(d.receiver.address)
    ));
    d.balances.usdt[d.receiver.address] = Number(ethers.utils.formatUnits(
      await d.paymentTokens.usdt.contract.balanceOf(d.receiver.address)
    ));

    const abiCoder = new ethers.utils.AbiCoder();
    let message = abiCoder.encode(
      ["uint256", "uint256"],
      [d.orders[0].id, ethers.utils.parseUnits(d.orders[0].price.toString())]
    );
    let hashedMessage = ethers.utils.keccak256(message);
    let messageHashBinary = ethers.utils.arrayify(hashedMessage);
    let signature = await d.owner.signMessage(messageHashBinary);

    await expect(
      d.payments.connect(d.users[0]).pay(
        d.paymentTokens.busd.weight,
        d.orders[0].id,
        ethers.utils.parseUnits(d.orders[0].price.toString()),
        signature
      )
    ).to.be.revertedWith('Signature is not valid');

    signature = await d.signer.signMessage(messageHashBinary);

    await expect(
      d.payments.connect(d.users[0]).pay(
        d.paymentTokens.busd.weight,
        d.orders[0].id,
        ethers.utils.parseUnits((d.orders[0].price * 1.001).toString()),
        signature
      )
    ).to.be.revertedWith('Signature is not valid');

    d.tx = await d.payments.connect(d.users[0]).pay(
      d.paymentTokens.busd.weight,
      d.orders[0].id,
      ethers.utils.parseUnits(d.orders[0].price.toString()),
      signature
    );
    d.tx = await d.tx.wait();
    for (let i = 0; i < d.tx.events.length; i ++) {
      const event = d.tx.events[i];
      if (event.topics[0].slice(0, 10) !== '0x8f7a5517') continue;
      expect(event.args.userAddress).to.equal(d.users[0].address);
      expect(event.args.paymentToken).to.equal(d.paymentTokens.busd.contract.address);
      expect(Number(event.args.orderId)).to.equal(d.orders[0].id);
      expect(Number(ethers.utils.formatUnits(event.args.usdPaidAmount)))
        .to.equal(d.orders[0].price);
      expect(roundTo(Number(ethers.utils.formatUnits(event.args.paidAmount)), 8))
        .to.equal(roundTo(d.orders[0].price / d.paymentTokens.busd.rate, 8));
    }

    await expect(
      d.payments.connect(d.users[0]).pay(
        d.paymentTokens.busd.weight,
        d.orders[0].id,
        ethers.utils.parseUnits(d.orders[0].price.toString()),
        signature
      )
    ).to.be.revertedWith('Order is already paid');

    message = abiCoder.encode(
      ["uint256", "uint256"],
      [d.orders[1].id, ethers.utils.parseUnits(d.orders[1].price.toString())]
    );
    hashedMessage = ethers.utils.keccak256(message);
    messageHashBinary = ethers.utils.arrayify(hashedMessage);
    signature = await d.signer.signMessage(messageHashBinary);

    d.tx = await d.payments.connect(d.users[1]).pay(
      d.paymentTokens.usdt.weight,
      d.orders[1].id,
      ethers.utils.parseUnits(d.orders[1].price.toString()),
      signature
    );
    d.tx = await d.tx.wait();
    for (let i = 0; i < d.tx.events.length; i ++) {
      const event = d.tx.events[i];
      if (event.topics[0].slice(0, 10) !== '0x8f7a5517') continue;
      expect(event.args.userAddress).to.equal(d.users[1].address);
      expect(event.args.paymentToken).to.equal(d.paymentTokens.usdt.contract.address);
      expect(Number(event.args.orderId)).to.equal(d.orders[1].id);
      expect(Number(ethers.utils.formatUnits(event.args.usdPaidAmount)))
        .to.equal(d.orders[1].price);
      expect(roundTo(Number(ethers.utils.formatUnits(event.args.paidAmount)), 8))
        .to.equal(roundTo(d.orders[1].price / d.paymentTokens.usdt.rate, 8));
    }

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.paymentTokens.busd.contract.balanceOf(d.users[0].address)
    )), 8)).to.equal(roundTo(d.balances.busd[d.users[0].address] - d.orders[0].price / d.paymentTokens.busd.rate, 8));
    expect(Number(ethers.utils.formatUnits(
      await d.paymentTokens.usdt.contract.balanceOf(d.users[0].address)
    ))).to.equal(d.balances.usdt[d.users[0].address]);
    expect(Number(ethers.utils.formatUnits(
      await d.paymentTokens.busd.contract.balanceOf(d.users[1].address)
    ))).to.equal(d.balances.busd[d.users[1].address]);
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.paymentTokens.usdt.contract.balanceOf(d.users[1].address)
    )), 8)).to.equal(roundTo(d.balances.usdt[d.users[1].address] - d.orders[1].price / d.paymentTokens.usdt.rate, 8));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.paymentTokens.busd.contract.balanceOf(d.receiver.address)
    )), 8)).to.equal(roundTo(d.balances.busd[d.receiver.address] + d.orders[0].price / d.paymentTokens.busd.rate, 8));
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.paymentTokens.usdt.contract.balanceOf(d.receiver.address)
    )), 8)).to.equal(roundTo(d.balances.usdt[d.receiver.address] + d.orders[1].price / d.paymentTokens.usdt.rate, 8));
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}