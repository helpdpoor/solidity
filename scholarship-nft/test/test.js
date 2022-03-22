const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
let signers, nftContract, nftDistributionContract, result = {};

beforeEach(async function () {
  signers = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("ERC721Scholarship");
  nftContract = await NFT.connect(signers[10]).deploy(
    'name', 'symbol', 0
  );
  await nftContract.deployed();

  const NFT_Distribution = await ethers.getContractFactory("ERC721ScholarshipDistribution");
  nftDistributionContract = await NFT_Distribution.connect(signers[10]).deploy(
    nftContract.address
  );
  await nftDistributionContract.deployed();

  await nftContract.connect(signers[10]).addRole(
    nftDistributionContract.address,
    1
  );
  await nftDistributionContract.connect(signers[10]).addToManagers(
    signers[9].address
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeURI(
    1, 'uri-1'
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeURI(
    2, 'uri-2'
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeURI(
    3, 'uri-3'
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeURI(
    4, 'uri-4'
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeURI(
    5, 'uri-5'
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeMetabolism(
    1, 11111
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeMetabolism(
    2, 22222
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeMetabolism(
    3, 33333
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeMetabolism(
    4, 44444
  );
  await nftDistributionContract.connect(signers[9]).setTokenTypeMetabolism(
    5, 55555
  );
});

describe("Testing Scholarship NFT contract", function () {
  it("Airdrop", async function () {
    const addresses = [];
    const tokenTypeIds = [];
    for (let i = 0; i < 20; i ++) {
      addresses.push(signers[i].address);
      addresses.push(signers[i].address);
      addresses.push(signers[i].address);
      addresses.push(signers[i].address);
      addresses.push(signers[i].address);
      tokenTypeIds.push(1);
      tokenTypeIds.push(2);
      tokenTypeIds.push(3);
      tokenTypeIds.push(4);
      tokenTypeIds.push(5);
    }
    await nftDistributionContract.proceedAirdrop (
      addresses,
      tokenTypeIds
    );
    result.tokensNumber = Number(
      await nftDistributionContract.getTokensNumber(signers[0].address)
    );
    expect(result.tokensNumber).to.equal(5);
    result.tokensNumber = Number(
      await nftDistributionContract.getTokensNumber(signers[19].address)
    );
    expect(result.tokensNumber).to.equal(5);
    result.tokenDetails = await nftDistributionContract.getTokenDetails(
      signers[15].address,
      2
    );
    expect(Number(result.tokenDetails.tokenTypeId)).to.equal(2);
    expect(result.tokenDetails.tokenURI).to.equal('uri-2');

    await nftDistributionContract.connect(signers[4]).mintAirdrop(2);
    result.contractBalance = Number(
      await nftContract.totalSupply()
    );
    expect(result.contractBalance).to.equal(1);
    result.userBalance = Number(
      await nftContract.balanceOf(signers[4].address)
    );
    expect(result.userBalance).to.equal(1);
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 0)
    );
    expect(result.tokenId).to.equal(1);
    result.tokenOwner = await nftContract.ownerOf(1);
    expect(result.tokenOwner).to.equal(signers[4].address);
    result.tokenURI = await nftContract.tokenURI(1);
    expect(result.tokenURI).to.equal('uri-2');
    result.tokenTypeId = Number(
      await nftDistributionContract.getTokenTypeId(1)
    );
    expect(result.tokenTypeId).to.equal(2);
    result.metabolism = Number(
      await nftDistributionContract.getTokenMetabolism(1)
    );
    expect(result.metabolism).to.equal(22222);

    await nftDistributionContract.connect(signers[4]).mintAirdropAll();

    result.contractBalance = Number(
      await nftContract.totalSupply()
    );
    expect(result.contractBalance).to.equal(5);
    result.userBalance = Number(
      await nftContract.balanceOf(signers[4].address)
    );
    expect(result.userBalance).to.equal(5);
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 0)
    );
    expect(result.tokenId).to.equal(1);
    result.tokenOwner = await nftContract.ownerOf(1);
    expect(result.tokenOwner).to.equal(signers[4].address);
    result.tokenURI = await nftContract.tokenURI(1);
    expect(result.tokenURI).to.equal('uri-2');
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 1)
    );
    expect(result.tokenId).to.equal(2);
    result.tokenOwner = await nftContract.ownerOf(2);
    expect(result.tokenOwner).to.equal(signers[4].address);
    result.tokenURI = await nftContract.tokenURI(2);
    expect(result.tokenURI).to.equal('uri-1');
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 2)
    );
    expect(result.tokenId).to.equal(3);
    result.tokenOwner = await nftContract.ownerOf(3);
    expect(result.tokenOwner).to.equal(signers[4].address);
    result.tokenURI = await nftContract.tokenURI(3);
    expect(result.tokenURI).to.equal('uri-3');
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 3)
    );
    expect(result.tokenId).to.equal(4);
    result.tokenOwner = await nftContract.ownerOf(4);
    expect(result.tokenOwner).to.equal(signers[4].address);
    result.tokenURI = await nftContract.tokenURI(4);
    expect(result.tokenURI).to.equal('uri-4');
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 4)
    );
    expect(result.tokenId).to.equal(5);
    result.tokenOwner = await nftContract.ownerOf(5);
    expect(result.tokenOwner).to.equal(signers[4].address);
    result.tokenURI = await nftContract.tokenURI(5);
    expect(result.tokenURI).to.equal('uri-5');

    await expect(
      nftContract.connect(signers[4])['safeTransferFrom(address,address,uint256)'](
        signers[4].address,
        signers[0].address,
        2
      )
    ).to.be.revertedWith('Caller is not authorized');

    await nftContract.connect(signers[10]).addRole(signers[4].address, 1);

    await nftContract.connect(signers[4])['safeTransferFrom(address,address,uint256)'](
      signers[4].address,
      signers[0].address,
      2
    );
    result.tokenOwner = await nftContract.ownerOf(2);
    expect(result.tokenOwner).to.equal(signers[0].address);

    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 0)
    );
    expect(result.tokenId).to.equal(1);
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 1)
    );
    expect(result.tokenId).to.equal(5);
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 2)
    );
    expect(result.tokenId).to.equal(3);
    result.tokenId = Number(
      await nftContract.tokenOfOwnerByIndex(signers[4].address, 3)
    );
    expect(result.tokenId).to.equal(4);

    await nftDistributionContract.connect(signers[5]).mintAirdrop(5);
    result.contractBalance = Number(
      await nftContract.totalSupply()
    );
    expect(result.contractBalance).to.equal(6);
    result.tokenOwner = await nftContract.ownerOf(6);
    expect(result.tokenOwner).to.equal(signers[5].address);
    result.tokenURI = await nftContract.tokenURI(6);
    expect(result.tokenURI).to.equal('uri-5');

    await expect(
      nftDistributionContract.connect(signers[5]).mintAirdrop(5)
    ).to.be.revertedWith('Token with this index has already been minted');
    await expect(
      nftDistributionContract.connect(signers[5]).mintAirdrop(6)
    ).to.be.revertedWith('Index is not valid');
  });

  it("Manager settings", async function () {
    await nftDistributionContract.connect(signers[10])
      .addToManagers(signers[9].address);

    await nftDistributionContract.connect(signers[9])
      .setTokenTypeURI(123, '---');
    result.uri = await nftDistributionContract.getTokenTypeURI(123);
    expect(result.uri).to.equal('---');

    await nftDistributionContract.connect(signers[9])
      .setBatchLimit(51);
    result.batchLimit = Number(
      await nftDistributionContract.getBatchLimit()
    );
    expect(result.batchLimit).to.equal(51);

    await nftDistributionContract.connect(signers[9])
      .setMintingBatchLimit(52);
    result.batchLimit = Number(
      await nftDistributionContract.getMintingBatchLimit()
    );
    expect(result.batchLimit).to.equal(52);

    await nftDistributionContract.connect(signers[9])
      .setNftContractAddress(signers[3].address);
    result.address = await nftDistributionContract.getNftContractAddress();
    expect(result.address).to.equal(signers[3].address);

    await nftDistributionContract.connect(signers[9])
      .setTokenTypeMetabolism(2, 1256);
    result.metabolism = Number(
      await nftDistributionContract.getTokenTypeMetabolism(2)
    );
    expect(result.metabolism).to.equal(1256);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.floor(a * b) / b;
}
