const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};
d.addresses = {
  bl: '0xD7baC58d0555215c5F05f166D39CBf706C988343',
  collateral: '0x5E57b7f620f24879A11d8a1A2f17c0DD22997975',
  reward: '0xA4AE614B6a78b641324e416AeBa9573984fCf0A0',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
}
d.neverLate = 10000000000;
const { alchemyApiKey } = require('../secrets.json');
const hre = require("hardhat");

// Start test block
describe('bugFix-2.js - checking possible bug (instant yield increasing after borrowing)', function () {
  beforeEach(async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey.polygonMainnet}`,
            blockNumber: 35424350,
          },
        },
      ],
    });
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];

    d.Router = await ethers.getContractFactory('PancakeRouter');
    d.router = await d.Router.attach(d.addresses.router);

    await d.router.connect(d.owner).swapExactETHForTokens(
      0, [d.addresses.weth, d.addresses.usdc], d.owner.address, d.neverLate,
      {value: ethers.utils.parseUnits('500')}
    );
    d.ERC20 = await ethers.getContractFactory("BEP20Token");
    d.usdc = await d.ERC20.attach(d.addresses.usdc);

    await d.usdc.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits('100', 6)
    );

    d.BL = await ethers.getContractFactory("BorrowingLendingContract");
    d.blContract = await d.BL.attach(d.addresses.bl);

    await d.usdc.connect(d.signers[0]).approve(
      d.blContract.address, ethers.utils.parseUnits('100', 6)
    );

    d.Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
    d.collateralContract = await d.Collateral.attach(d.addresses.collateral);

    d.Reward = await ethers.getContractFactory("RewardPerBlock");
    d.rewardContract = await d.Reward.attach(d.addresses.reward);
  });

  // Test case
  it('Check', async function () {
    await d.blContract.connect(d.signers[0]).lend(
      1, ethers.utils.parseUnits('100', 6)
    );
    d.index = Number(
      await d.blContract.getUsersLendingIndex(d.signers[0].address, 1)
    );

    await hre.timeAndMine.increaseTime('100 days');
    await d.signers[0].sendTransaction({
      to: d.signers[0].address,
      value: 0
    });

    d.yield = await d.blContract.getLendingYield(d.index, true);
    await d.blContract.connect(d.signers[0]).withdrawLendingYield(
      1, d.yield
    );

    d.yield = Number(ethers.utils.formatUnits(
      await d.blContract.getLendingYield(d.index, true), 6
    ));
    await d.collateralContract.connect(d.signers[0]).depositCollateral(
      1, 0, {value: ethers.utils.parseUnits('500')}
    );
    await d.blContract.connect(d.signers[0]).borrow(
      1, ethers.utils.parseUnits('25', 6), false
    );
    d.yield1 = Number(ethers.utils.formatUnits(
      await d.blContract.getLendingYield(d.index, true), 6
    ));
    console.log(d.yield, d.yield1);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}