const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const zeroAddress = '0x0000000000000000000000000000000000000000';
const { alchemyApiKey } = require('../secrets.json');
const d = {};

describe("priceFeed.js - Testing rates contract", function () {
  beforeEach(async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey.ethereumMainnet}`,
            blockNumber: 14852260,
          },
        },
      ],
    });
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.ratesUpdater = d.signers[9];

    const Rates = await ethers.getContractFactory("Rates");
    d.ratesContract = await Rates.deploy(
      d.owner.address,
      d.ratesUpdater.address
    );
    await d.ratesContract.deployed();

    d.chainLinkFeedEthUsd = {
      address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      abi: [
        {"inputs":[{"internalType":"address","name":"_aggregator","type":"address"},{"internalType":"address","name":"_accessController","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"int256","name":"current","type":"int256"},{"indexed":true,"internalType":"uint256","name":"roundId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"updatedAt","type":"uint256"}],"name":"AnswerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"roundId","type":"uint256"},{"indexed":true,"internalType":"address","name":"startedBy","type":"address"},{"indexed":false,"internalType":"uint256","name":"startedAt","type":"uint256"}],"name":"NewRound","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"OwnershipTransferRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[],"name":"acceptOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"accessController","outputs":[{"internalType":"contract AccessControllerInterface","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"aggregator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_aggregator","type":"address"}],"name":"confirmAggregator","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"description","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_roundId","type":"uint256"}],"name":"getAnswer","outputs":[{"internalType":"int256","name":"","type":"int256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint80","name":"_roundId","type":"uint80"}],"name":"getRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_roundId","type":"uint256"}],"name":"getTimestamp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"latestAnswer","outputs":[{"internalType":"int256","name":"","type":"int256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"latestRound","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"latestRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"latestTimestamp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"","type":"uint16"}],"name":"phaseAggregators","outputs":[{"internalType":"contract AggregatorV2V3Interface","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"phaseId","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_aggregator","type":"address"}],"name":"proposeAggregator","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"proposedAggregator","outputs":[{"internalType":"contract AggregatorV2V3Interface","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint80","name":"_roundId","type":"uint80"}],"name":"proposedGetRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proposedLatestRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_accessController","type":"address"}],"name":"setController","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
      ]
    }

    d.chainLinkFeed = new ethers.Contract(
      d.chainLinkFeedEthUsd.address,
      d.chainLinkFeedEthUsd.abi,
      d.ratesContract.provider
    );
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

    d.BEP20Token = await ethers.getContractFactory("BEP20Token");
    d.usdt = await d.BEP20Token.attach(d.addresses.usdt);

    d.PancakeRouter = await ethers.getContractFactory('PancakeRouter');
    d.router = await d.PancakeRouter.attach(d.addresses.router);

    await d.router.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.usdt], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('10')}
    );

    d.lpFeedWethUsdt = {
      address: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
      abi: [
        {"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MINIMUM_LIQUIDITY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"burn","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"kLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"liquidity","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"price0CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"price1CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"skim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount0Out","type":"uint256"},{"internalType":"uint256","name":"amount1Out","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"swap","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sync","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}
      ]
    }

    d.lpFeed = new ethers.Contract(
      d.lpFeedWethUsdt.address,
      d.lpFeedWethUsdt.abi,
      d.ratesContract.provider
    );
  });

  it("Set manual rate", async function () {
    await d.ratesContract.connect(d.owner).setUsdRate(
      zeroAddress,
      ethers.utils.parseUnits('1.23')
    );
    expect(Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](zeroAddress, false)
    ))).to.equal(
      1.23
    );
    expect(Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](zeroAddress, true)
    ))).to.equal(
      1.23
    );
  });

  it("Set chainLink rate", async function () {
    await d.ratesContract.connect(d.owner).setChainLink(
      d.addresses.weth,
      d.chainLinkFeed.address
    );
    d.rate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.result = await d.chainLinkFeed.latestRoundData();
    d.answer = Number(ethers.utils.formatUnits(d.result.answer, 8));
    expect(roundTo(d.rate, 1)).to.equal(roundTo(d.answer, 1));
  });

  it("Set lp rate", async function () {
    await d.ratesContract.connect(d.owner).setLp(
      d.addresses.weth,
      d.lpFeed.address
    );
    d.result = await d.ratesContract.getLpRateData(d.addresses.weth);
    expect(Number(d.result.lastRateTime)).to.be.greaterThan(0);
    expect(Number(d.result.lastRate)).to.be.greaterThan(0);
    expect(Number(d.result.decimals0)).to.equal(18);
    expect(Number(d.result.decimals1)).to.equal(6);
    expect(d.result.reversed).to.be.false;
    d.rate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.result = await d.lpFeed.getReserves();
    d.lpRate = Number(d.result._reserve1 * 10 ** 12)
      / Number(d.result._reserve0);
    expect(roundToPrecision(d.rate, 8)).to.equal(roundToPrecision(d.lpRate, 8));

    await d.usdt.connect(d.owner).approve(d.router.address, ethers.utils.parseUnits('100', 6));
    await d.router.connect(d.owner).swapExactTokensForTokens(
      ethers.utils.parseUnits('100', 6),
      0,
      [d.addresses.usdt, d.addresses.weth],
      d.owner.address,
      d.neverLate
    );

    d.rate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.rateReal = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, true)
    ));
    expect(roundToPrecision(d.rate, 4)).to.equal(roundToPrecision(d.rateReal, 4));
    expect(roundToPrecision(d.rate, 8)).to.not.equal(roundToPrecision(d.rateReal, 8));

    await d.ratesContract.connect(d.owner).setLp(
      d.addresses.usdt,
      d.lpFeed.address
    );
    d.result = await d.ratesContract.getLpRateData(d.addresses.usdt);
    expect(Number(d.result.lastRateTime)).to.be.greaterThan(0);
    expect(Number(d.result.lastRate)).to.be.greaterThan(0);
    expect(Number(d.result.decimals0)).to.equal(18);
    expect(Number(d.result.decimals1)).to.equal(6);
    expect(d.result.reversed).to.be.true;
    d.rate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.usdt, false), 30
    ));
    d.result = await d.lpFeed.getReserves();
    d.lpRate = Number(d.result._reserve0) / Number(d.result._reserve1 * 10 ** 12);
    expect(roundToPrecision(d.rate, 8)).to.equal(roundToPrecision(d.lpRate, 8));

    await d.ratesContract.connect(d.owner).setAlias(
      d.addresses.dai,
      d.addresses.usdt
    );

    d.rateDai = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.dai, false), 30
    ));

    expect(d.rate).to.equal(d.rateDai);
  });

  it("Update lp rate", async function () {
    await d.ratesContract.connect(d.owner).setLp(
      d.addresses.weth,
      d.lpFeed.address
    );

    await d.usdt.connect(d.owner).approve(d.router.address, ethers.utils.parseUnits('100', 6));
    await d.router.connect(d.owner).swapExactTokensForTokens(
      ethers.utils.parseUnits('100', 6),
      0,
      [d.addresses.usdt, d.addresses.weth],
      d.owner.address,
      d.neverLate
    );

    d.rate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.rateReal = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, true)
    ));
    expect(roundToPrecision(d.rate, 4)).to.equal(roundToPrecision(d.rateReal, 4));
    expect(roundToPrecision(d.rate, 8)).to.not.equal(roundToPrecision(d.rateReal, 8));

    await expect(
      d.ratesContract.connect(d.signers[0]).saveUsdRate(d.addresses.weth)
    ).to.be.revertedWith('Caller is not authorized for this action');

    await d.ratesContract.connect(d.ratesUpdater).saveUsdRate(d.addresses.weth);

    d.rate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.rateReal = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, true)
    ));
    expect(roundToPrecision(d.rate, 4)).to.equal(roundToPrecision(d.rateReal, 4));
    expect(roundToPrecision(d.rate, 8)).to.not.equal(roundToPrecision(d.rateReal, 8));

    await hre.timeAndMine.increaseTime('1 hour');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    await d.ratesContract.connect(d.ratesUpdater).saveUsdRate(d.addresses.weth);

    d.newRate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.newRateReal = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, true)
    ));
    expect(roundToPrecision(d.newRate, 8)).to.equal(roundToPrecision(d.rate, 8));

    await hre.timeAndMine.increaseTime('1 hour');
    await d.signers[0].sendTransaction({
      to: d.signers[1].address,
      value: 0
    });

    await d.ratesContract.connect(d.ratesUpdater).saveUsdRate(d.addresses.weth);

    d.newRate = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, false)
    ));
    d.newRateReal = Number(ethers.utils.formatUnits(
      await d.ratesContract['getUsdRate(address,bool)'](d.addresses.weth, true)
    ));

    expect(roundToPrecision(d.newRate, 8)).to.not.equal(roundToPrecision(d.rate, 8));
    expect(roundToPrecision(d.newRate, 8)).to.equal(roundToPrecision(d.rateReal, 8));
    expect(roundToPrecision(d.newRate, 8)).to.equal(roundToPrecision(d.newRateReal, 8));
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}

function roundToPrecision(a, b) {
  a = Number(a);
  b = Number(b);
  if (a === 0) return 0;
  if (isNaN(a) || !(b > 0)) return null;
  const log10 = Math.floor(Math.log10(a));
  const factor = 10 ** (log10 + 1);
  a /= factor;
  b = 10 ** b;
  return roundTo((Math.floor(a * b) / b) * factor, 10);
}
