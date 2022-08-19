const { expect } = require('chai');
const { ethers } = require("hardhat");

const d = {};

// Start test block
describe('Deployer contract testing', function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();
    d.owner = d.signers[10];
    d.feeReceiver = d.signers[9];
    d.totalSupply = 1000000;
    d.zero = '0x0000000000000000000000000000000000000000';
    d.feeAmount = 10;
    d.feeDiscount = 10; //%
    d.rates = {
      native: 100,
      token: 5,
    }
    d.feeTransfer = d.feeAmount / d.rates.native + d.feeAmount / d.rates.token;

    d.PaymentToken = await ethers.getContractFactory("PaymentToken");
    d.paymentToken = await d.PaymentToken.deploy(
      d.owner.address,
      ethers.utils.parseUnits(d.totalSupply.toString()),
      'Payment token',
      'Payment token'
    );
    await d.paymentToken.deployed();
    await d.paymentToken.connect(d.owner).transfer(
      d.signers[0].address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );
    await d.paymentToken.connect(d.owner).transfer(
      d.signers[1].address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );
    await d.paymentToken.connect(d.owner).transfer(
      d.signers[2].address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );

    d.Rates = await ethers.getContractFactory("Rates");
    d.ratesContract = await d.Rates.deploy(
      d.owner.address,
      d.owner.address
    );
    await d.ratesContract.deployed();
    await d.ratesContract.connect(d.owner).setUsdRate(
      d.zero, ethers.utils.parseUnits(d.rates.native.toString())
    );
    await d.ratesContract.connect(d.owner).setUsdRate(
      d.paymentToken.address, ethers.utils.parseUnits(d.rates.token.toString())
    );
  });

  it('Deploying ERC721', async function () {
    d.name = 'Token';
    d.symbol = 'TN';
    d.tokenId = 123;
    d.tokenUri = '456';
    d.ERC721Implementation = await ethers.getContractFactory("ERC721Implementation");
    d.FactoryERC721 = await ethers.getContractFactory("FactoryERC721");
    d.factoryERC721 = await d.FactoryERC721.deploy(
      d.owner.address,
      d.ratesContract.address,
      d.paymentToken.address,
      d.feeReceiver.address,
      ethers.utils.parseUnits(d.feeAmount.toString()),
      d.feeDiscount * 100
    );
    await d.factoryERC721.deployed();

    await d.paymentToken.connect(d.signers[0]).approve(
      d.factoryERC721.address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );
    await d.paymentToken.connect(d.signers[1]).approve(
      d.factoryERC721.address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );
    await d.paymentToken.connect(d.signers[2]).approve(
      d.factoryERC721.address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );

    d.balance = Number(ethers.utils.formatUnits(
      await d.factoryERC721.provider.getBalance(d.feeReceiver.address)
    ));

    tx = await d.factoryERC721.connect(d.signers[0]).createToken(
      d.name,
      d.symbol,
      true,
      {value: ethers.utils.parseUnits(d.rates.native.toString())}
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.erc721Token = await d.ERC721Implementation.attach(d.tokenAddress);
      break;
    }
    expect(Number(ethers.utils.formatUnits(
      await d.factoryERC721.provider.getBalance(d.feeReceiver.address)
    ))).to.equal(d.balance + (d.feeAmount / d.rates.native));

    expect(
      await d.erc721Token.owner()
    ).to.equal(d.signers[0].address);
    expect(
       await d.erc721Token.name()
    ).to.equal(d.name);
    expect(
       await d.erc721Token.symbol()
    ).to.equal(d.symbol);
    await expect(
      d.erc721Token.connect(d.signers[1]).mint(
        d.signers[1].address,
        d.tokenId,
        d.tokenUri
      )
    ).to.be.revertedWith('Caller is not authorized for this action');
    await d.erc721Token.connect(d.signers[0]).mint(
      d.signers[1].address,
      d.tokenId,
      d.tokenUri
    );
    expect(
       await d.erc721Token.ownerOf(d.tokenId)
    ).to.equal(d.signers[1].address);
    expect(
       await d.erc721Token.tokenURI(d.tokenId)
    ).to.equal(d.tokenUri);
  });

  it('Deploying ERC1155', async function () {
    d.commonUri = 'https://test.com/{id}.json';
    d.tokenUri = 'https://test.com/1.json';
    d.amount = 12536;
    d.tokenIds = [1, 2, 3, 5, 12];
    d.tokenUris = ['q', 'w', 'f'];
    d.amounts = [12536, 23574, 2, 256 ,35];
    d.ERC1155Implementation = await ethers.getContractFactory("ERC1155Implementation");
    d.FactoryERC1155 = await ethers.getContractFactory("FactoryERC1155");
    d.factoryERC1155 = await d.FactoryERC1155.deploy(
      d.owner.address,
      d.ratesContract.address,
      d.paymentToken.address,
      d.feeReceiver.address,
      ethers.utils.parseUnits(d.feeAmount.toString()),
      d.feeDiscount * 100
    );
    await d.factoryERC1155.deployed();

    await d.paymentToken.connect(d.signers[0]).approve(
      d.factoryERC1155.address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );
    await d.paymentToken.connect(d.signers[1]).approve(
      d.factoryERC1155.address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );
    await d.paymentToken.connect(d.signers[2]).approve(
      d.factoryERC1155.address, ethers.utils.parseUnits(d.feeTransfer.toString())
    );

    d.balance = Number(ethers.utils.formatUnits(
      await d.paymentToken.balanceOf(d.feeReceiver.address)
    ));

    tx = await d.factoryERC1155.connect(d.signers[0]).createToken(
      d.commonUri,
      false
    );
    tx = await tx.wait();
    for (let i = 0; i < tx.events.length; i ++) {
      const event = tx.events[i];
      if (event.event !== 'ContractDeployed') continue;
      d.tokenAddress = event.args.tokenAddress;
      d.erc1155Token = await d.ERC1155Implementation.attach(d.tokenAddress);
      break;
    }
    expect(Number(ethers.utils.formatUnits(
      await d.paymentToken.balanceOf(d.feeReceiver.address)
    ))).to.equal(d.balance + d.feeAmount * (100 - d.feeDiscount) / d.rates.token / 100);
    expect(
      await d.erc1155Token.owner()
    ).to.equal(d.signers[0].address);
    expect(
      await d.erc1155Token.uri(d.tokenId)
    ).to.equal(d.commonUri);
    await expect(
      d.erc1155Token.connect(d.signers[1]).setTokenURI(
        d.tokenId,
        d.tokenUri
      )
    ).to.be.revertedWith('Caller is not authorized for this action');
    await d.erc1155Token.connect(d.signers[0]).setTokenURI(
      d.tokenId,
      d.tokenUri
    );
    expect(
      await d.erc1155Token.uri(d.tokenId)
    ).to.equal(d.tokenUri);
    expect(
      await d.erc1155Token.uri(d.tokenId + 1)
    ).to.equal(d.commonUri);
    await expect(
      d.erc1155Token.connect(d.signers[1])['mint(address,uint256,uint256)'](
        d.signers[1].address,
        d.tokenId,
        d.amount
      )
    ).to.be.revertedWith('Caller is not authorized for this action');
    await d.erc1155Token.connect(d.signers[0])['mint(address,uint256,uint256)'](
      d.signers[1].address,
      d.tokenId,
      d.amount
    );
    expect(Number(
      await d.erc1155Token.balanceOf(d.signers[0].address, d.tokenId)
    )).to.equal(0);
    expect(Number(
      await d.erc1155Token.balanceOf(d.signers[1].address, d.tokenId)
    )).to.equal(d.amount);
    await d.erc1155Token.connect(d.signers[0])['mintBatch(address,uint256[],uint256[],string[])'](
      d.signers[0].address,
      d.tokenIds,
      d.amounts,
      d.tokenUris
    );
    expect(
      await d.erc1155Token.uri(d.tokenIds[0])
    ).to.equal(d.tokenUris[0]);
    expect(
      await d.erc1155Token.uri(d.tokenIds[1])
    ).to.equal(d.tokenUris[1]);
    expect(
      await d.erc1155Token.uri(d.tokenIds[2])
    ).to.equal(d.tokenUris[2]);
    expect(
      await d.erc1155Token.uri(d.tokenIds[3])
    ).to.equal(d.commonUri);
    expect(
      await d.erc1155Token.uri(d.tokenIds[4])
    ).to.equal(d.commonUri);
    d.result = await d.erc1155Token.balanceOfBatch(
      [
        d.signers[1].address,
        d.signers[0].address,
        d.signers[1].address,
        d.signers[0].address,
        d.signers[1].address,
        d.signers[0].address,
        d.signers[1].address,
        d.signers[0].address,
        d.signers[1].address,
        d.signers[0].address,
        d.signers[1].address,
        d.signers[0].address
      ],
      [
        d.tokenId,
        d.tokenId,
        d.tokenIds[0],
        d.tokenIds[0],
        d.tokenIds[1],
        d.tokenIds[1],
        d.tokenIds[2],
        d.tokenIds[2],
        d.tokenIds[3],
        d.tokenIds[3],
        d.tokenIds[4],
        d.tokenIds[4]
      ]
    );
    expect(Number(d.result[0])).to.equal(d.amount);
    expect(Number(d.result[1])).to.equal(0);
    expect(Number(d.result[2])).to.equal(0);
    expect(Number(d.result[3])).to.equal(d.amounts[0]);
    expect(Number(d.result[4])).to.equal(0);
    expect(Number(d.result[5])).to.equal(d.amounts[1]);
    expect(Number(d.result[6])).to.equal(0);
    expect(Number(d.result[7])).to.equal(d.amounts[2]);
    expect(Number(d.result[8])).to.equal(0);
    expect(Number(d.result[9])).to.equal(d.amounts[3]);
    expect(Number(d.result[10])).to.equal(0);
    expect(Number(d.result[11])).to.equal(d.amounts[4]);
  });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.round(a * b) / b;
}