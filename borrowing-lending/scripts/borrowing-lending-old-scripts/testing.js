// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const OWNER = '0x5011f31d9969Fb0B31766435829Df66Afa04D6FA';
  const NATIVE = '0x0000000000000000000000000000000000000000';
  const ETNA = '0x2D55E8637851D9106993439Eb9c8C6dB37525f2F';
  const NETNA = '0x60850619b6335328f013aae1e5576C7A28Bec3d4';
  const BUSD = '0x37ce40B509b65176e4cda0b9936863177B1c020C';
  const USDT = '0xa6437182423E8f24e6B69DE6e7e8B12397e6457a';
  const NFT = '0x0186F8cDFe676D4Ca5EDc6f3aE4400Ca269f0F3a';
  const ETNA_BUSD = '0x458d4F8Eee678599F2Eafe1E3db6Aafa72B2a815';
  const BNB_BUSD = '0xf9C04582d8359Bbb3fe56C19E7F05EA92d2629ae';
  const PROXY = '0x82ABFfDC8283bFF0919478EE6e9271f2e7D0fBa7';
  const BL = '0x25D5a047a8f0c5AF0c2f0E0b916f9e7DdDF69A10';
  const COLLATERAL = '0x6256f71d4604b637aD1d66488c715621Ba714071';
  const NFT_COLLATERAL = '0xaF6D794c516b179ACc779af2206df2978baA6292';
  const REWARD = '0xC0e080F90159B3AA24c8706241517B99c63b37Db';
  const MARKETPLACE = '0x0f6296c3f3FCd5931dD542Dcd1f4EEAf6eEe4DD9';

  const OLD_BL = '0xAF5E36fB34337BDA49621C80509e21cC1DFA1D1F';
  const OLD_COLLATERAL = '0x52EFCfc99eE9212945CBf1108844C180c7377e4B';
  const OLD_NFT_COLLATERAL = '0x3D6712b64eF1BEa77F59D9516AF2240764048931';
  // const OLD_REWARD = '0xFfdA9fb5aa08ae774691E7Ef74C43457c34E27c2';
  const OLD_REWARD = '0xAd1Fd331E454e82a505306a4CA19CdbA19D50186';

  const LP = await ethers.getContractFactory("LPToken");
  const lpEtnaBusdContract = await LP.attach(
    ETNA_BUSD
  );
  const lpBnbBusdContract = await LP.attach(
    BNB_BUSD
  );

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxyContract = await Proxy.attach(
    PROXY
  );

  const BorrowingLending = await ethers.getContractFactory("BorrowingLendingContract");
  const oldBlContract = await BorrowingLending.attach(
    OLD_BL
  );
  const blContract = await BorrowingLending.attach(
    BL
  );

  const Collateral = await ethers.getContractFactory("CollateralWithLiquidationContract");
  const oldCollateralContract = await Collateral.attach(
    OLD_COLLATERAL
  );
  const collateralContract = await Collateral.attach(
    COLLATERAL
  );

  const NftCollateral = await ethers.getContractFactory("NftCollateral");
  const oldNftCollateralContract = await NftCollateral.attach(
    OLD_NFT_COLLATERAL
  );
  const nftCollateralContract = await NftCollateral.attach(
    NFT_COLLATERAL
  );

  const RewardPerBlock = await ethers.getContractFactory("RewardPerBlock");
  const oldRewardContract = await RewardPerBlock.attach(
    OLD_REWARD
  );
  const rewardContract = await RewardPerBlock.attach(
    REWARD
  );

  const ERC20 = await ethers.getContractFactory("BEP20Token");
  const busdContract = await ERC20.attach(
    ETNA
  );
  const usdtContract = await ERC20.attach(
    ETNA
  );
  const etnaContract = await ERC20.attach(
    ETNA
  );
  const netnaContract = await ERC20.attach(
    NETNA
  );

  // const Nft = await ethers.getContractFactory("CyclopsTokens");
  // const nftContract = await Nft.attach(
  //   NFT
  // );
  // let amount = await etnaContract.balanceOf(oldRewardContract.address);
  // const tx = await oldRewardContract.adminWithdrawToken(
  //   amount, etnaContract.address
  // );
  // console.log(tx); return;
  // let result;
  // result = await collateralContract.getAvailableCollateralAmount(
  //   '0x3664f86Bb3113089A5cFcB563E185921c5736d4c',
  //   2
  // );
  // console.log(ethers.utils.formatUnits(result));
  // result = await collateralContract.getAvailableCollateralAmount(
  //   '0xB67c21C44fBD66AcA78e93F843d8bde98Af73762',
  //   2
  // );
  // console.log(ethers.utils.formatUnits(result));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
