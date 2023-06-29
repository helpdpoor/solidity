const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const BL = await ethers.getContractFactory("BorrowingLendingContract");
  const iface = BL.interface;
  const txs = [
    '0xa04328be6377bc53df702261bc599ce4b91e364713d948795dfea91173a83c05',
    '0x3268dae8e6b65a4ba4c0aca248931798370f3f4e786cca2da605e33bce5ef62f',
    '0xf1907eff99214db702ea1ef467ef62e74e9979b3d7030ff08edb03ed77abcce6',
    '0xf098501868568e16d956f1fcc1d4a396d900dfe3903db705633521468caf47fc',
    '0xb8b144f5df550c747d8ee31c82a87c88ef4e6465fb3c4eaca460d66ef0d48c60',
    '0xed1eef5bee4f73b90139cb32de5fc22615e29ac59b6f0fc75b930bba4c4b280a',
    '0xcef01f6b139aa67c6bf1638f3d5844cca98365a8a524cbc265700ce986c7f91d',
    '0xca1a0d6ac70d77740a615eb2a0e09bdb36e0104aa3ca8c8635ce729169a302a6',
    '0xff515c6b3de1a9993005893669cd10bdda6c8c7b7f32ecebff97bd897aebf6f5',
    '0x16b496f04d4d097d08272ec122eabd20cb2fc083b29bd3aa4a70d1be90fead70',
    '0x0ec8a62a0e0fdc0a1fdacc998816ce68d705595d8ae2aad0998301cd0616044d',
    '0x715614950da0366adee69cc010c6c83bfce2ae94092df01aca11c12ea5e8d900',
    '0x2913c81160d37084cff0ae97042d51950810e722b7f1bb5979e45e84a60eb700',
    '0x69de0954e001715bf177d6f3bd070e89321df23cfd5427f89ce825c6a93fc998',
    '0x9e62b0f6cb070b9709aa9cda70f76c840c8a773dcad6f7b61695811830043597',
    '0x94437bbf77f8b1422d0c88e973102e07d485e0616deaa620c03db11a0dfef0ce',
    '0x1bec237edefe887592e2ee9f7625413e947644d56865fcf322eeb83439f16e14',
    '0xb300ab3378bf4367d2f193a3f9f0e1903b2f5f6d10d9dbde89e666b99925a8ad',
    '0x13cc65cb35a9215676ede63ff79804f1c918a1eee9df543044d41adfdda3399b',
    '0x81e0a8b6c497a77a7cdb65d95b68053beb1768bb681e45be8e59f485d0d9cced',
    '0xb0700343f1fab84abe9e2c0716b369aee9abdc3840fbb2253232169733edeb5c',
    '0xa4362c32afbe5fd5b70356f09c1cd04fb8a720b0256a955af6548846e2a9a8b6',
    '0x7e7122a7841ab3f9ebaffcc14dc6336bcc662bc0c3290a63fc064bdef64b4e34',
    '0x48ec2ba31cfdce7e51fa3dac8dc3ccaa7949528dfa2e10d5049d4e5327015241',
    '0x9449c3c30aa805032ccef77a96e85adf82aca833bca965f31aa41479d687fe59',
    '0x8023e8a826f3eb10e6978470f98f2e751b02d9646b519c602dfbd077f2333d45',
    '0x6ad4da1aa5520733b39b2614ef9a5ec4a36e01a08ebef910da08ae7c4631fe41',
    '0xf860718660b3d9a8b45485f82629ef7f485b84672f1502d2c49d06a2c1697d48',
    '0xe3eb4d72f51dc2d160117bbfedd5c7ad2b71632cc141720d4d9c9f23a031a2b5',
    '0x0eff60cee6decc008845e0fcb6d1f78d379cfb76eb3a9a1a3ed8100fad56997b',
    '0x8e973609072331654dde6ab10a6a6a95169e525dacc0743ffa3c00e22f05db1c',
    '0x439521b627c3e0c2fd30eb3b75537f8e4a1eedaa29cbda8a0cdb3648fa43e006',
    '0x9819f47910f989b13a67cb91b6ad88b85edf688d7961dc73d811f0840aeb73b1',
    '0xef664e0ed93dc8690e6eae4cec42f50fb0906691b36ba86af931e97d2c87cef1',
    '0xb2b0f52aafad70e101ebd87c2d8eecfd6a7027d978fbff4ee8a4bf948ef11d67',
    '0xf61c5bc54a06d8fff68f732160c53a2b97338d787dde44c940331739452735af',
    '0x122ef82a822e0618e634d6fb0e53a426fcf0fca23f13290c5f0307e1ffab7c46',
    '0x7601e7bcc2753d13295b2f72628ff9a4f299db7e709a9ef49c72bb3e891ac640',
    '0x216c34c20699f1f8b1bffd54ab418597e7785d61c171f8ab8f3f8aaa48d43958',
    '0x4ed1117b379330c7b2639deae20e914fa9de287d63394d5a04265b5d78da9880',
    '0x19b610387b64ab305e97f632171864f89912f5fa47a8134db151e8063c7888b5',
    '0x34e2e1f15898ecb6f5ed65a1de3fb4e5067b82b58dcef4ebf457a60a0b21ca88',
    '0x52b915ee4ef39eb608eb90f881eef792127f3d78a531c59d4e590f5b4e52f928',
    '0x567518ddd89d2f51ae2871aaff03dfbf79a6190632eb533dfb78e4606de1b36c',
    '0x35f3292d4846ca34d11dc2cc5478e01c66740a894b93e93f8e4cc9c772b636dd',
    '0x1e61b0322d3fe8ea550fed8b1b1fcd49858d970bc5a8ef4d30226c07366f1a28',
    '0x7bb6d4bf362809bc84cbc3f96b0e0f405e9556f8188795f1bd4153c5902c170c',
    '0x9e93da1c718d58e7a2cb1a922e436b7ed9c3ad118ac9704f1a592da1bf0d4c86',
  ];
  const data = [];
  for (const tx of txs) {
    const txReceipt = await ethers.provider.getTransactionReceipt(tx);
    if (txReceipt.status != 1) {
      console.log('txReceipt.status', txReceipt.status);
      continue;
    }
    const txDetails = await ethers.provider.getTransaction(tx);
    const block = await ethers.provider.getBlock(txDetails.blockNumber);
    const parsed = iface.parseTransaction(txDetails);
    if (parsed.name === 'borrow') continue;
    const txData = {
      name: parsed.name,
      timestamp: block.timestamp
    }
    if (parsed.name === 'lend') {
      txData.profileId = Number(parsed.args.borrowingProfileIndex);
      txData.amount = Number(ethers.utils.formatUnits(parsed.args.amount))
    }
    if (parsed.name === 'withdrawLendingYield') {
      continue;
    }
    if (parsed.name === 'withdrawLending') {
      continue;
    }
    data.push(txData);
  }
  console.log(data);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });