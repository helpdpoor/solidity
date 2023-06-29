const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('test.js - Sale contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.manager = d.signers[9];
    d.users = [d.signers[1], d.signers[2], d.signers[3]];
    d.balances = {};
    d.newBalances = {};
    d.initialTransfer = 100000;
    d.roundData = [
      [
        ethers.utils.parseUnits('0.065'),
        ethers.utils.parseUnits('0.075'),
        ethers.utils.parseUnits('0.085'),
        ethers.utils.parseUnits('0.095'),
      ],
      [
        Math.round((new Date('2023-07-03T12:00')).getTime() / 1000),
        Math.round((new Date('2023-07-24T12:00')).getTime() / 1000),
        Math.round((new Date('2023-08-07T12:00')).getTime() / 1000),
        Math.round((new Date('2023-08-21T12:00')).getTime() / 1000),
      ],
      [
        3 * 7 * 24 * 3600,
        2 * 7 * 24 * 3600,
        2 * 7 * 24 * 3600,
        2 * 7 * 24 * 3600,
      ],
      [
        ethers.utils.parseUnits('5000000'),
        ethers.utils.parseUnits('5000000'),
        ethers.utils.parseUnits('5000000'),
        ethers.utils.parseUnits('5000000'),
      ],
    ];
    d.precision = 7;
    d.paymentTokens = {
      native: {
        contract: {
          address: '0x0000000000000000000000000000000000000000',
        },
        rate: 100,
        weight: 1,
        paymentAmount: 12.3,
        purchaseAmount: 235,
      },
      busd: {
        rate: 0.9,
        weight: 2,
        paymentAmount: 257,
        purchaseAmount: 17.6,
      },
      usdt: {
        rate: 1.1,
        weight: 3,
        paymentAmount: 39.85,
        purchaseAmount: 718,
      },
    };
    d.syntrumToken = {}

    d.Rates = await ethers.getContractFactory("Rates");
    d.rates = await d.Rates.connect(d.owner).deploy(
      d.owner.address,
      d.owner.address,
    );
    await d.rates.deployed();

    d.ERC20Token = await ethers.getContractFactory("ERC20Token");
    
    d.syntrumToken.contract = await d.ERC20Token.connect(d.owner).deploy(
      d.owner.address,
      'SYNTRUM',
      'SYNTRUM',
      ethers.utils.parseUnits('1000000000')
    );
    await d.syntrumToken.contract.deployed();
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

    d.Sale = await ethers.getContractFactory("Sale");

    d.sale = await d.Sale.connect(d.owner).deploy(
      d.owner.address,
      d.owner.address,
      d.rates.address, 
      d.syntrumToken.contract.address,
      d.owner.address
    );
    await d.sale.deployed();

    await d.syntrumToken.contract.connect(d.owner).transfer(
      d.sale.address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );

    await d.sale.connect(d.owner).setRoundsData(
      d.roundData[0],
      d.roundData[1],
      d.roundData[2],
      d.roundData[3],
    );

    for (const token in d.paymentTokens) {
      await d.sale.connect(d.owner).addPaymentProfile(
        d.paymentTokens[token].contract.address,
        0,
        d.paymentTokens[token].weight,
        token.toUpperCase(),
        token.toUpperCase()
      );
      if (
        typeof d.paymentTokens[token].contract.connect === 'undefined'
      ) continue;
      for (let i = 0; i < d.users.length; i++) {
        const user = d.users[i];
        await d.paymentTokens[token].contract.connect(user).approve(
          d.sale.address, ethers.utils.parseUnits(d.initialTransfer.toString())
        );
      }
    }
  });

  // Test case
  it('Settings', async function () {
    for (let i = 0; i < d.roundData[0].length; i ++) {
      d.result = await d.sale.getRoundData(i + 1);
      expect(d.result.usdRate)
        .to.equal(d.roundData[0][i]);
      expect(Number(d.result.startTime))
        .to.equal(d.roundData[1][i]);
      expect(Number(d.result.duration))
        .to.equal(d.roundData[2][i]);
      expect(Number(d.result.endTime))
        .to.equal(d.roundData[1][i] + d.roundData[2][i]);
      expect(Number(ethers.utils.formatUnits(d.result.maxAllocation)))
        .to.equal(Number(ethers.utils.formatUnits(d.roundData[3][i])));
    }
  });

  // Test case
  it('Calculation testing', async function () {
    d.balances.users = {};
    d.balances.owner = {};
    for (const token in d.paymentTokens) {
      if (typeof d.paymentTokens[token].contract.connect === 'undefined') {
        d.native = true;
        d.precision = 2;
        d.balances.owner[token] = Number(ethers.utils.formatUnits(
          await d.provider.getBalance(d.owner.address)
        ));
      } else {
        d.native = false;
        d.precision = 7;
        d.balances.owner[token] = Number(ethers.utils.formatUnits(
          await d.paymentTokens[token].contract.balanceOf(d.owner.address)
        ));
      }
      for (let i = 0; i < d.users.length; i++) {
        if (!d.balances.users[i]) d.balances.users[i] = {};
        if (d.native) {
          d.balances.users[i][token] = Number(ethers.utils.formatUnits(
            await d.provider.getBalance(d.users[i].address)
          ));
        } else {
          d.balances.users[i][token] = Number(ethers.utils.formatUnits(
            await d.paymentTokens[token].contract.balanceOf(d.users[i].address)
          ));
        }
      }

      if (!d.paymentTokens[token].results) d.paymentTokens[token].results = {};
      d.paymentTokens[token].results.purchaseAmount =
        Number(ethers.utils.formatUnits(
          await d.sale.getPurchaseAmount(
            d.paymentTokens[token].weight,
            ethers.utils.parseUnits(
              d.paymentTokens[token].paymentAmount.toString()
            )
          )
        ));

      expect(d.paymentTokens[token].results.purchaseAmount, d.precision)
        .to.equal(0);

      d.paymentTokens[token].results.paymentAmountUsd =
        Number(ethers.utils.formatUnits(
          await d.sale.getUsdPaymentAmount(
            d.paymentTokens[token].weight,
            ethers.utils.parseUnits(
              d.paymentTokens[token].paymentAmount.toString()
            )
          )
        ));
      d.expected = d.paymentTokens[token].paymentAmount
        * d.paymentTokens[token].rate;
      expect(roundTo(d.paymentTokens[token].results.paymentAmountUsd, d.precision))
        .to.equal(roundTo(d.expected, d.precision));
    }
    for (let i = 0; i < d.roundData[0].length; i ++) {
      const now = Number(await d.sale.getTimestamp());
      const startTime = Number(d.roundData[1][i]);
      const timeShift = startTime - now;
      await hre.timeAndMine.increaseTime(`${timeShift + 1} seconds`);
      await d.users[0].sendTransaction({
        to: d.users[0].address,
        value: 0
      });
      const usdRate = Number(ethers.utils.formatUnits(d.roundData[0][i]));
      for (const token in d.paymentTokens) {
        if (typeof d.paymentTokens[token].contract.connect === 'undefined') {
          d.native = true;
          d.precision = 2;
          d.balances.owner[token] = Number(ethers.utils.formatUnits(
            await d.provider.getBalance(d.owner.address)
          ));
        } else {
          d.native = false;
          d.precision = 7;
          d.balances.owner[token] = Number(ethers.utils.formatUnits(
            await d.paymentTokens[token].contract.balanceOf(d.owner.address)
          ));
        }
        for (let i = 0; i < d.users.length; i++) {
          if (!d.balances.users[i]) d.balances.users[i] = {};
          if (d.native) {
            d.balances.users[i][token] = Number(ethers.utils.formatUnits(
              await d.provider.getBalance(d.users[i].address)
            ));
          } else {
            d.balances.users[i][token] = Number(ethers.utils.formatUnits(
              await d.paymentTokens[token].contract.balanceOf(d.users[i].address)
            ));
          }
        }

        if (!d.paymentTokens[token].results) d.paymentTokens[token].results = {};
        d.paymentTokens[token].results.purchaseAmount =
          Number(ethers.utils.formatUnits(
            await d.sale.getPurchaseAmount(
              d.paymentTokens[token].weight,
              ethers.utils.parseUnits(
                d.paymentTokens[token].paymentAmount.toString()
              )
            )
          ));
        d.expected = d.paymentTokens[token].paymentAmount
          * d.paymentTokens[token].rate
          / usdRate;

        expect(roundTo(d.paymentTokens[token].results.purchaseAmount, d.precision))
          .to.equal(roundTo(d.expected, d.precision));

        d.paymentTokens[token].results.paymentAmountUsd =
          Number(ethers.utils.formatUnits(
            await d.sale.getUsdPaymentAmount(
              d.paymentTokens[token].weight,
              ethers.utils.parseUnits(
                d.paymentTokens[token].paymentAmount.toString()
              )
            )
          ));
        d.expected = d.paymentTokens[token].paymentAmount
          * d.paymentTokens[token].rate;
        expect(roundTo(d.paymentTokens[token].results.paymentAmountUsd, d.precision))
          .to.equal(roundTo(d.expected, d.precision));

        d.paymentTokens[token].results.paymentAmount =
          Number(ethers.utils.formatUnits(
            await d.sale.getPaymentAmount(
              d.paymentTokens[token].weight,
              ethers.utils.parseUnits(
                d.paymentTokens[token].purchaseAmount.toString()
              )
            )
          ));
        d.expected = d.paymentTokens[token].purchaseAmount
          * usdRate
          / d.paymentTokens[token].rate;
        expect(roundTo(d.paymentTokens[token].results.paymentAmount, d.precision))
          .to.equal(roundTo(d.expected, d.precision));
      }
    }
  });

  it('Sale testing', async function () {
    const usdRate = Number(ethers.utils.formatUnits(d.roundData[0][3]));
    d.balances.users = {};
    d.newBalances.users = {};
    for (let i = 0; i < d.users.length; i ++) {
      d.balances.users[i] = {
        syntrumToken: Number(ethers.utils.formatUnits(
          await d.syntrumToken.contract.balanceOf(d.users[i].address)
        ))
      };
    }
    d.balances.owner = {
      syntrumToken: Number(ethers.utils.formatUnits(
        await d.syntrumToken.contract.balanceOf(d.owner.address)
      ))
    };

    await expect(
      d.sale.connect(d.users[0]).purchase(
        1,
        ethers.utils.parseUnits('1'),
        d.users[1].address,
        []
      )
    ).to.be.revertedWith('Sale is in private mode');
    await d.sale.connect(d.owner).setPublic(true);

    d.totalSold = 0;
    d.purchased = {};
    for (const token in d.paymentTokens) {
      if (typeof d.paymentTokens[token].contract.connect === 'undefined') {
        d.native = true;
        d.precision = 2;
        d.balances.owner[token] = Number(ethers.utils.formatUnits(
          await d.provider.getBalance(d.owner.address)
        ));
      } else {
        d.native = false;
        d.precision = 7;
        d.balances.owner[token] = Number(ethers.utils.formatUnits(
          await d.paymentTokens[token].contract.balanceOf(d.owner.address)
        ));
      }
      for (let i = 0; i < d.users.length; i ++) {
        if (!d.balances.users[i]) d.balances.users[i] = {};
        if (d.native) {
          d.precision = 2;
          d.balances.users[i][token] = Number(ethers.utils.formatUnits(
            await d.provider.getBalance(d.users[i].address)
          ));
        } else {
          d.precision = 7;
          d.balances.users[i][token] = Number(ethers.utils.formatUnits(
            await d.paymentTokens[token].contract.balanceOf(d.users[i].address)
          ));
        }
        if (d.native) {
          d.precision = 2;
          d.options = {
            value: ethers.utils.parseUnits(
              d.paymentTokens[token].paymentAmount.toString()
            )
          };
        } else {
          d.precision = 7;
          d.options = {};
        }
        await d.sale.connect(d.users[0]).purchase(
          d.paymentTokens[token].weight,
          ethers.utils.parseUnits(d.paymentTokens[token].paymentAmount.toString()),
          d.users[i].address,
          [],
          d.options
        );
        if (typeof d.purchased[i] === 'undefined') d.purchased[i] = 0;
        d.sold = d.paymentTokens[token].paymentAmount
          * d.paymentTokens[token].rate
          / usdRate;
        d.purchased[i] += d.sold;
        d.totalSold += d.sold;

        expect(roundTo(Number(ethers.utils.formatUnits(
          await d.sale.getUserPurchased(d.users[i].address)
        )), d.precision)).to.equal(roundTo(d.purchased[i], d.precision));

        expect(roundTo(Number(ethers.utils.formatUnits(
          await d.sale.getUserAvailable(d.users[i].address)
        )), d.precision)).to.equal(roundTo(d.purchased[i], d.precision));
      }
    }
    for (let i = 0; i < d.users.length; i ++) {
      await d.sale.connect(d.users[i]).withdrawAvailable();

      expect(
        Number(ethers.utils.formatUnits(
          await d.sale.getUserPurchased(d.users[i].address)
        ))
        -
        Number(ethers.utils.formatUnits(
          await d.sale.getUserWithdrawn(d.users[i].address)
        ))
      ).to.equal(0);

      expect(Number(ethers.utils.formatUnits(
        await d.sale.getUserAvailable(d.users[i].address)
      ))).to.equal(0);
    }
    d.newBalances.owner = {
      syntrumToken: Number(ethers.utils.formatUnits(
        await d.syntrumToken.contract.balanceOf(d.owner.address)
      ))
    };
    d.native = false;
    for (const token in d.paymentTokens) {
      if (typeof d.paymentTokens[token].contract.connect === 'undefined') {
        d.native = true;
        d.precision = 2;
        d.newBalances.owner[token] = Number(ethers.utils.formatUnits(
          await d.provider.getBalance(d.owner.address)
        ));
      } else {
        d.native = false;
        d.precision = 7;
        d.newBalances.owner[token] = Number(ethers.utils.formatUnits(
          await d.paymentTokens[token].contract.balanceOf(d.owner.address)
        ));
      }
      expect(roundTo(
        d.newBalances.owner[token] - d.balances.owner[token], d.precision
      )).to.equal(roundTo(d.paymentTokens[token].paymentAmount * 3, d.precision));

      for (let i = 0; i < d.users.length; i ++) {
        if (!d.newBalances.users[i]) d.newBalances.users[i] = {};
        if (d.native) {
          d.precision = 2;
          d.newBalances.users[i][token] = Number(ethers.utils.formatUnits(
            await d.provider.getBalance(d.users[i].address)
          ));
        } else {
          d.precision = 7;
          d.newBalances.users[i][token] = Number(ethers.utils.formatUnits(
            await d.paymentTokens[token].contract.balanceOf(d.users[i].address)
          ));
        }
        if (i === 0) {
          expect(roundTo(
            d.balances.users[i][token] - d.newBalances.users[i][token], d.precision
          )).to.equal(roundTo(d.paymentTokens[token].paymentAmount * 3, d.precision));
        }
      }
    }
  });

  it('Vesting testing', async function () {
    const usdRate = Number(ethers.utils.formatUnits(d.roundData[0][3]));
    d.timestamp = Number(await d.sale.getTimestamp());
    d.vesting = [
      {
        time: d.timestamp + 3600,
        percent: 20
      },
      {
        time: d.timestamp + 3600 * 2,
        percent: 30
      },
      {
        time: d.timestamp + 3600 * 3,
        percent: 50
      }
    ];
    d.balance = Number(ethers.utils.formatUnits(
      await d.syntrumToken.contract.balanceOf(d.users[0].address)
    ));
    await d.sale.connect(d.owner).setPublic(true);

    await d.sale.connect(d.users[0]).purchase(
      d.paymentTokens.usdt.weight,
      ethers.utils.parseUnits(d.paymentTokens.usdt.paymentAmount.toString()),
      d.users[0].address,
      []
    );

    d.purchased = d.paymentTokens.usdt.paymentAmount
      * d.paymentTokens.usdt.rate
      / usdRate;

    d.timeArray = [];
    d.percentageArray = [];

    for (let i = 0; i < d.vesting.length; i ++) {
      d.timeArray.push(d.vesting[i].time);
      d.percentageArray.push(Math.round(d.vesting[i].percent * 100));
    }

    await d.sale.connect(d.owner).setTokenReleaseStageData(
      d.timeArray, d.percentageArray
    );

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.sale.getUserPurchased(d.users[0].address)
    )), 8)).to.equal(roundTo(d.purchased, 8));
    expect(Number(ethers.utils.formatUnits(
      await d.sale.getUserAvailable(d.users[0].address)
    ))).to.equal(0);

    await expect(
      d.sale.connect(d.users[0]).withdrawAvailable()
    ).to.be.revertedWith('No tokens available for withdraw');

    hre.timeAndMine.increaseTime('1 hour');
    await d.users[0].sendTransaction({
      to: d.users[0].address,
      value: 0
    });

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.sale.getUserAvailable(d.users[0].address)
    )), 8)).to.equal(roundTo(
      d.purchased * d.vesting[0].percent / 100, 8
    ));

    await d.sale.connect(d.users[0]).withdrawAvailable();
    expect(Number(ethers.utils.formatUnits(
      await d.sale.getUserAvailable(d.users[0].address)
    ))).to.equal(0);

    d.balance += d.purchased * d.vesting[0].percent / 100;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumToken.contract.balanceOf(d.users[0].address)
    )), 8)).to.equal(roundTo(d.balance, 8));

    hre.timeAndMine.increaseTime('1 hour');
    await d.users[0].sendTransaction({
      to: d.users[0].address,
      value: 0
    });

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.sale.getUserAvailable(d.users[0].address)
    )), 8)).to.equal(roundTo(
      d.purchased * d.vesting[1].percent / 100, 8
    ));

    hre.timeAndMine.increaseTime('1 hour');
    await d.users[0].sendTransaction({
      to: d.users[0].address,
      value: 0
    });

    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.sale.getUserAvailable(d.users[0].address)
    )), 8)).to.equal(roundTo(
      d.purchased * (d.vesting[1].percent + d.vesting[2].percent) / 100, 8
    ));

    await d.sale.connect(d.users[0]).withdrawAvailable();
    expect(Number(ethers.utils.formatUnits(
      await d.sale.getUserAvailable(d.users[0].address)
    ))).to.equal(0);

    d.balance += d.purchased * (d.vesting[1].percent + d.vesting[2].percent) / 100;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await d.syntrumToken.contract.balanceOf(d.users[0].address)
    )), 8)).to.equal(roundTo(d.balance, 8));
  });

  it('Whitelist testing', async function () {
    await expect(
      d.sale.connect(d.users[0]).purchase(
        d.paymentTokens.usdt.weight,
        ethers.utils.parseUnits('1'),
        d.users[0].address,
        []
      )
    ).to.be.revertedWith('Sale is in private mode');
    expect(await d.sale.isWhitelisted(d.users[0].address)).to.be.false;

    await d.sale.connect(d.owner).addToWhitelist(d.users[0].address);
    expect(await d.sale.isWhitelisted(d.users[0].address)).to.be.true;

    d.sale.connect(d.users[0]).purchase(
      d.paymentTokens.usdt.weight,
      ethers.utils.parseUnits('1'),
      d.users[0].address,
      []
    );

    await d.sale.connect(d.owner).removeFromWhitelist(d.users[0].address);
    expect(await d.sale.isWhitelisted(d.users[0].address)).to.be.false;

    await d.sale.connect(d.owner).addToWhitelistMultiple([
      d.users[0].address,
      d.users[1].address,
      d.users[2].address
    ]);
    expect(await d.sale.isWhitelisted(d.users[0].address)).to.be.true;
    expect(await d.sale.isWhitelisted(d.users[1].address)).to.be.true;
    expect(await d.sale.isWhitelisted(d.users[2].address)).to.be.true;

    await d.sale.connect(d.owner).removeFromWhitelistMultiple([
      d.users[0].address,
      d.users[1].address,
      d.users[2].address
    ]);
    expect(await d.sale.isWhitelisted(d.users[0].address)).to.be.false;
    expect(await d.sale.isWhitelisted(d.users[1].address)).to.be.false;
    expect(await d.sale.isWhitelisted(d.users[2].address)).to.be.false;
    await expect(
      d.sale.connect(d.users[0]).purchase(
        d.paymentTokens.usdt.weight,
        ethers.utils.parseUnits('1'),
        d.users[0].address,
        []
      )
    ).to.be.revertedWith('Sale is in private mode');

    const abiCoder = new ethers.utils.AbiCoder();
    const message = abiCoder.encode(
      ["address"],
      [d.users[0].address]
    );
    let hashedMessage = ethers.utils.keccak256(message);
    let messageHashBinary = ethers.utils.arrayify(hashedMessage);
    const signature = await d.owner.signMessage(messageHashBinary);

    await expect(
      d.sale.connect(d.users[0]).purchase(
        d.paymentTokens.usdt.weight,
        ethers.utils.parseUnits('1'),
        d.users[0].address,
        signature
      )
    ).to.be.revertedWith('Signature is not valid');

    await d.sale.connect(d.owner).grantRole('SIGNER', d.owner.address);
    await d.sale.connect(d.users[0]).purchase(
      d.paymentTokens.usdt.weight,
      ethers.utils.parseUnits('1'),
      d.users[0].address,
      signature
    );

    await expect(
      d.sale.connect(d.users[1]).purchase(
        d.paymentTokens.usdt.weight,
        ethers.utils.parseUnits('1'),
        d.users[1].address,
        signature
      )
    ).to.be.revertedWith('Signature is not valid');
  });

  it('Inner rates testing', async function () {
    const usdRate = Number(ethers.utils.formatUnits(d.roundData[0][3]));
    await d.sale.connect(d.owner).setInnerRate(
      d.paymentTokens.usdt.contract.address,
      ethers.utils.parseUnits(
        (d.paymentTokens.usdt.rate * 2).toString()
      )
    );
    d.balances.users = {};
    d.newBalances.users = {};
    for (let i = 0; i < d.users.length; i ++) {
      d.balances.users[i] = {
        syntrumToken: Number(ethers.utils.formatUnits(
          await d.syntrumToken.contract.balanceOf(d.users[i].address)
        ))
      };
    }
    d.balances.owner = {
      syntrumToken: Number(ethers.utils.formatUnits(
        await d.syntrumToken.contract.balanceOf(d.owner.address)
      ))
    };

    await expect(
      d.sale.connect(d.users[0]).purchase(
        1,
        ethers.utils.parseUnits('1'),
        d.users[0].address,
        []
      )
    ).to.be.revertedWith('Sale is in private mode');
    await d.sale.connect(d.owner).setPublic(true);

    d.totalSold = 0;
    d.purchased = {};
    const token = 'usdt';

    d.native = false;
    d.precision = 7;
    d.balances.owner[token] = Number(ethers.utils.formatUnits(
      await d.paymentTokens[token].contract.balanceOf(d.owner.address)
    ));

    for (let i = 0; i < d.users.length; i ++) {
      if (!d.balances.users[i]) d.balances.users[i] = {};

      d.balances.users[i][token] = Number(ethers.utils.formatUnits(
        await d.paymentTokens[token].contract.balanceOf(d.users[i].address)
      ));

      d.options = {};

      await d.sale.connect(d.users[i]).purchase(
        d.paymentTokens[token].weight,
        ethers.utils.parseUnits(d.paymentTokens[token].paymentAmount.toString()),
        d.users[i].address,
        [],
        d.options
      );
      if (typeof d.purchased[i] === 'undefined') d.purchased[i] = 0;
      d.sold = d.paymentTokens[token].paymentAmount
        * (d.paymentTokens[token].rate * 2)
        / usdRate;
      d.purchased[i] += d.sold;
      d.totalSold += d.sold;

      expect(roundTo(Number(ethers.utils.formatUnits(
        await d.sale.getUserPurchased(d.users[i].address)
      )), d.precision)).to.equal(roundTo(d.purchased[i], d.precision));

      expect(roundTo(Number(ethers.utils.formatUnits(
        await d.sale.getUserAvailable(d.users[i].address)
      )), d.precision)).to.equal(roundTo(d.purchased[i], d.precision));
    }

    for (let i = 0; i < d.users.length; i ++) {
      await d.sale.connect(d.users[i]).withdrawAvailable();

      expect(
        Number(ethers.utils.formatUnits(
          await d.sale.getUserPurchased(d.users[i].address)
        ))
        -
        Number(ethers.utils.formatUnits(
          await d.sale.getUserWithdrawn(d.users[i].address)
        ))
      ).to.equal(0);

      expect(Number(ethers.utils.formatUnits(
        await d.sale.getUserAvailable(d.users[i].address)
      ))).to.equal(0);
    }
    d.newBalances.owner = {
      syntrumToken: Number(ethers.utils.formatUnits(
        await d.syntrumToken.contract.balanceOf(d.owner.address)
      ))
    };

    d.native = false;
    d.precision = 7;
    d.newBalances.owner[token] = Number(ethers.utils.formatUnits(
      await d.paymentTokens[token].contract.balanceOf(d.owner.address)
    ));

    expect(roundTo(
      d.newBalances.owner[token] - d.balances.owner[token], d.precision
    )).to.equal(roundTo(d.paymentTokens[token].paymentAmount * 3, d.precision));

    for (let i = 0; i < d.users.length; i ++) {
      if (!d.newBalances.users[i]) d.newBalances.users[i] = {};

      d.newBalances.users[i][token] = Number(ethers.utils.formatUnits(
        await d.paymentTokens[token].contract.balanceOf(d.users[i].address)
      ));

      expect(roundTo(
        d.balances.users[i][token] - d.newBalances.users[i][token], d.precision
      )).to.equal(roundTo(d.paymentTokens[token].paymentAmount, d.precision));
    }
  });

  it('Limits check', async function () {
    const usdRate = d.roundData[0][3];
    await d.sale.connect(d.owner).setPublic(true);
    const tokenRate = ethers.utils.parseUnits(d.paymentTokens.busd.rate.toString());
    const aboveLimit = d.roundData[3][0]
      .add(d.roundData[3][1])
      .add(d.roundData[3][2])
      .add(d.roundData[3][3])
      .add('10000')
      .mul(usdRate)
      .div(tokenRate);
    const underLimit = d.roundData[3][0]
      .add(d.roundData[3][1])
      .add(d.roundData[3][2])
      .add(d.roundData[3][3])
      .sub('10000')
      .mul(usdRate)
      .div(tokenRate);
    await expect(
      d.sale.connect(d.users[0]).purchase(
        2,
        aboveLimit,
        d.users[0].address,
        []
      )
    ).to.be.revertedWith('Round pool size exceeded');
    await d.sale.connect(d.owner).setMaxPurchaseAmount('1000');
    await expect(
      d.sale.connect(d.users[0]).purchase(
        2,
        '1000',
        d.users[0].address,
        []
      )
    ).to.be.revertedWith('Max purchase amount exceeded');
    d.sale.connect(d.users[0]).purchase(
      2,
      '10',
      d.users[0].address,
      []
    )
    await d.sale.connect(d.owner).setMaxPurchaseAmount('0');
    d.sale.connect(d.users[0]).purchase(
      2,
      underLimit,
      d.users[0].address,
      []
    )
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}