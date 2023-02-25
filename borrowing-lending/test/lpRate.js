const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};
const { alchemyApiKey } = require('../secrets.json');
const hre = require("hardhat");
const path = require("path");
d.networkName = hre.network.name;
const jsonPath = path.join(__dirname, `../deployed-contracts/${d.networkName}.json`);
const deployedContracts = require(jsonPath);
d.addresses = {
  lpEtnaMatic: '0x116829711e57d77116a19e5cDc26B00DBDC05e14',
  etna: '0x015C425f6dfabC31E1464cC4339954339f096061',
};

// Start test block
describe('lpRate.js - Rate contract testing (setting LP rate)', function () {
  beforeEach(async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyApiKey.polygonMainnet}`,
            blockNumber: 35786817,
          },
        },
      ],
    });
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];

    d.Rates = await ethers.getContractFactory("Rates");
    d.rates = await d.Rates.connect(d.owner).deploy(
      d.owner.address,
      d.owner.address,
    );
    await d.rates.deployed();
    d.oldRates = await d.Rates.attach(deployedContracts.rates.latest);

    d.BEP20Token = await ethers.getContractFactory('BEP20Token');
    d.etna = await d.BEP20Token.attach(d.addresses.etna);

    d.UniswapV2Pair = await ethers.getContractFactory('UniswapV2Pair');
    d.lpEtnaMatic = await d.UniswapV2Pair.attach(d.addresses.lpEtnaMatic);
  });

  // Test case
  it('Setting LP rate', async function () {
    await d.rates.connect(d.owner).saveLpUsdRate(
      d.accessVault.address, ethers.utils.parseUnits(d.initialTransfer.toString())
    );
    d.oldRate = Number(ethers.utils.formatUnits(
      await d.oldRates.getUsdRate(d.lpEtnaMatic.address)
    ));
    d.rate = Number(ethers.utils.formatUnits(
      await d.rates.getUsdRate(d.lpEtnaMatic.address)
    ));
    expect(roundTo(d.oldRate, 4)).to.equal(roundTo(d.rate, 4));
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}