const {ethers} = require("hardhat");
const owner = '0x614379E5A8817a0b24f4eAa8583B0f55403C1F31';
const paymentToken = '0x82473782776675707aF074c4964828EB23cA3b0e';
const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
const tokenAddresses = {
  BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  NATIVE: '0x0000000000000000000000000000000000000000',
  ZERO: '0x0000000000000000000000000000000000000000',
  ETNA: '0x51f35073ff7cf54c9e86b7042e59a8cc9709fc46',
  NETNA: '0x279020017E7aa4cD7E35273CcF3DB2223475d7B3',
  MTB: '0x36C618F869050106e1F64d777395baF7d56A9Ead',
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  OxPAD: '0x94733910a43D412DDaD505a8772839AA77aC1b6d',
  NFT: '0x83C454FF387cebbC3CbAa5a7a44F412F4FA63c0E',
  MARKETPLACE: '0x9cFFF32674745b4738306E87cCb14de18eABC6a7',
};

const lpPairs = {
  ETNA_BUSD: '0xa1A1dC3A23882E33F41943EC620A2F68A6703fCC',
  MTB_BUSD: '0x591582D30f23Ed3C1FC2ADbf82b37Ef5CE1131Bd',
  OxPAD_BUSD: '0xEEd9d7D32BC8218025f263e85eA60d33c8dbAf09',
};

const chainLinkFeeds = {
  BNB: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
  BTC: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
  ETH: '0x2A3796273d47c4eD363b361D3AEFb7F7E2A13782',
  CAKE: '0xB6064eD41d4f67e353768aA239cA86f4F73665a1',
};

const factors = {
  NATIVE: 4000,
  ETNA: 2000,
  MTB: 1500,
  NETNA: 1500,
  BTCB: 5000,
  ETH: 5000,
  CAKE: 3000,
  OxPAD: 1500,
};

// settings for reward contract
const DURATION = 365 * 24 * 3600;
const POOL_SIZE = 5000000;

// settings for borrowing-lending contract
const aprBorrowingMin = 700;
const aprBorrowingMax = 1400;
const aprBorrowingFix = 300;
const aprLendingMin = 500;
const aprLendingMax = 1000;

async function main() {
  const contractAddress = '0xd9772B0fD1AAE2f2efD67748ba63378796218c4B';
  const ABI = [
    "function initialize(address, address, address, address)"
  ];
  const iface = new ethers.utils.Interface(ABI);
  const calldata = iface.encodeFunctionData("initialize", [
    tokenAddresses.MARKETPLACE,
    tokenAddresses.NFT,
    '0xbeE1BD28dB9171f83c92f4445EF1359F4e71F86f',
    OWNER
  ]);
  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      // OWNER,
      // OWNER
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });