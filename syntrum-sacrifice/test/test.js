const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('test.js - Sacrifice contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.manager = d.signers[9];
    d.users = [d.signers[1], d.signers[2], d.signers[3]];
    d.balances = {};
    d.newBalances = {};
    d.initialTransfer = 10000;
    d.tokens = {
      etna: {
        rate: 0.02,
        ratio: 0.9,
        weight: 1,
        amountIn: 7,
      },
      mtb: {
        rate: 0.005,
        ratio: 0.7,
        weight: 2,
        amountIn: 11,
      },
      syntrum: {
        rate: 0.2,
      },
    };

    d.Rates = await ethers.getContractFactory("Rates");
    d.rates = await d.Rates.connect(d.owner).deploy(
      d.owner.address,
      d.owner.address,
    );
    await d.rates.deployed();

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");

    for (const token in d.tokens) {
      const rate = d.tokens[token].rate;
      d.tokens[token].contract = await d.ERC20Token.connect(d.owner).deploy(
        d.owner.address,
        token.toUpperCase(),
        token.toUpperCase(),
        ethers.utils.parseUnits('1000000000')
      );
      await d.tokens[token].contract.deployed();

      await d.rates.connect(d.owner).setUsdRate(
        d.tokens[token].contract.address,
        ethers.utils.parseUnits(rate.toString())
      );

      if (typeof d.tokens[token].ratio === 'undefined') continue;
      for (let i = 0; i < d.users.length; i ++) {
        const user = d.users[i];
        await d.tokens[token].contract.connect(d.owner).transfer(
          user.address, ethers.utils.parseUnits(d.initialTransfer.toString())
        );
      }
    }

    d.Sacrifice = await ethers.getContractFactory("Sacrifice");
    d.sacrifice = await d.Sacrifice.connect(d.owner).deploy(
      d.owner.address,
      d.owner.address,
      d.rates.address, 
      d.tokens.syntrum.contract.address,
      d.owner.address
    );
    await d.sacrifice.deployed();

    await d.tokens.syntrum.contract.connect(d.owner).transfer(
      d.sacrifice.address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );

    for (const token in d.tokens) {
      if (typeof d.tokens[token].ratio === 'undefined') continue;
      for (let i = 0; i < d.users.length; i++) {
        const user = d.users[i];
        await d.tokens[token].contract.connect(user).approve(
          d.sacrifice.address, ethers.utils.parseUnits(d.initialTransfer.toString())
        );
      }
      d.sacrifice.connect(d.owner).addToken(
        d.tokens[token].contract.address,
        ethers.utils.parseUnits(d.tokens[token].ratio.toString()),
        d.tokens[token].weight,
        token.toUpperCase()
      );
    }
  });

  // Test case
  it('Initial data testing', async function () {
    for (const token in d.tokens) {
      expect(Number(ethers.utils.formatUnits(
        await d.rates['getUsdRate(address)'](d.tokens[token].contract.address)
      ))).to.equal(d.tokens[token].rate);

      if (typeof d.tokens[token].ratio === 'undefined') continue;
      d.index = Number(
        await d.sacrifice.getTokenIndex(d.tokens[token].contract.address)
      );
      d.tokenData1 = await d.sacrifice['getToken(uint8)'](
        d.index
      );
      d.tokenData2 = await d.sacrifice['getToken(address)'](
        d.tokens[token].contract.address
      );
      expect(d.tokenData1.tokenAddress).to.equal(d.tokenData2.tokenAddress);
      expect(d.tokenData2.tokenAddress).to.equal(d.tokens[token].contract.address);
      expect(d.tokenData2.name).to.equal(token.toUpperCase());
      expect(Number(ethers.utils.formatUnits(
        d.tokenData2.ratio
      ))).to.equal(d.tokens[token].ratio);
      expect(Number(d.tokenData2.weight)).to.equal(d.tokens[token].weight);
      expect(d.tokenData2.active).to.be.true;
    }
  });

  it('Exchange testing', async function () {
    d.balances.users = {};
    d.balances.owner = {};
    for (const token in d.tokens) {
      d.balances.owner[token] = Number(ethers.utils.formatUnits(
        await d.tokens[token].contract.balanceOf(d.owner.address)
      ));
      for (let i = 0; i < d.users.length; i ++) {
        if (!d.balances.users[i]) d.balances.users[i] = {};
        d.balances.users[i][token] = Number(ethers.utils.formatUnits(
          await d.tokens[token].contract.balanceOf(d.users[i].address)
        ));
      }

      if (typeof d.tokens[token].ratio === 'undefined') continue;
      d.tokens[token].amountOut = Number(ethers.utils.formatUnits(
        await d.sacrifice.exchangeAmount(
          d.tokens[token].contract.address,
          ethers.utils.parseUnits(d.tokens[token].amountIn.toString())
        )
      ));
      d.expected = d.tokens[token].amountIn
        * d.tokens[token].ratio
        * d.tokens[token].rate
        / d.tokens.syntrum.rate;
      expect(roundTo(d.tokens[token].amountOut, 8))
        .to.equal(roundTo(d.expected, 8));
    }

    await d.sacrifice.connect(d.users[0]).exchange(
      d.tokens.etna.contract.address,
      ethers.utils.parseUnits(d.tokens.etna.amountIn.toString())
    );

    await d.sacrifice.connect(d.users[1]).exchange(
      d.tokens.mtb.contract.address,
      ethers.utils.parseUnits(d.tokens.mtb.amountIn.toString())
    );

    await d.sacrifice.connect(d.users[2]).exchange(
      d.tokens.mtb.contract.address,
      ethers.utils.parseUnits(d.tokens.mtb.amountIn.toString())
    );

    d.newBalances.users = {};
    d.newBalances.owner = {};
    for (const token in d.tokens) {
      d.newBalances.owner[token] = Number(ethers.utils.formatUnits(
        await d.tokens[token].contract.balanceOf(d.owner.address)
      ));
      for (let i = 0; i < d.users.length; i ++) {
        if (!d.newBalances.users[i]) d.newBalances.users[i] = {};
        d.newBalances.users[i][token] = Number(ethers.utils.formatUnits(
          await d.tokens[token].contract.balanceOf(d.users[i].address)
        ));
      }
    }

    expect(roundTo(d.newBalances.owner.syntrum, 8)).to.equal(
      roundTo(d.balances.owner.syntrum, 8)
    );
    expect(roundTo(d.newBalances.owner.etna, 8)).to.equal(
      roundTo(d.balances.owner.etna + d.tokens.etna.amountIn, 8)
    );
    expect(roundTo(d.newBalances.owner.mtb, 8)).to.equal(
      roundTo(d.balances.owner.mtb + 2 * d.tokens.mtb.amountIn, 8)
    );

    expect(roundTo(d.newBalances.users[0].syntrum, 8)).to.equal(
      roundTo(d.balances.users[0].syntrum + d.tokens.etna.amountOut, 8)
    );
    expect(roundTo(d.newBalances.users[0].etna, 8)).to.equal(
      roundTo(d.balances.users[0].etna - d.tokens.etna.amountIn, 8)
    );
    expect(roundTo(d.newBalances.users[0].mtb, 8)).to.equal(
      roundTo(d.balances.users[0].mtb, 8)
    );

    expect(roundTo(d.newBalances.users[1].syntrum, 8)).to.equal(
      roundTo(d.balances.users[1].syntrum + d.tokens.mtb.amountOut, 8)
    );
    expect(roundTo(d.newBalances.users[1].etna, 8)).to.equal(
      roundTo(d.balances.users[1].etna, 8)
    );
    expect(roundTo(d.newBalances.users[1].mtb, 8)).to.equal(
      roundTo(d.balances.users[1].mtb - d.tokens.mtb.amountIn, 8)
    );

    expect(roundTo(d.newBalances.users[2].syntrum, 8)).to.equal(
      roundTo(d.balances.users[2].syntrum + d.tokens.mtb.amountOut, 8)
    );
    expect(roundTo(d.newBalances.users[2].etna, 8)).to.equal(
      roundTo(d.balances.users[2].etna, 8)
    );
    expect(roundTo(d.newBalances.users[2].mtb, 8)).to.equal(
      roundTo(d.balances.users[2].mtb - d.tokens.mtb.amountIn, 8)
    );
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}