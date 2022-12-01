const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
const initialEtnaTransfer = 50000;
const batchLimit = 50;
const zeroAddress = '0x0000000000000000000000000000000000000000';
let tokensArray, brandToken, mtbContract, nEtnaContract, erc20CollateralContract, erc20Collateral2Contract, marketplaceContract, nftContract, borrowing1Contract, borrowing2Contract, borrowing3Contract, collateralContract, nftCollateralContract, blContract, rewardContract, result;

const collateralProfileLiquidationFactor = 2000;
const collateral1ProfileUsdRate = 0.5;
const collateral1ProfileBorrowingFactor = 2500;
const collateral2ProfileUsdRate = 0.2;
const collateral2ProfileBorrowingFactor = 1500;
const collateral3ProfileUsdRate = 600;
const collateral3ProfileBorrowingFactor = 5000;
const collateral4ProfileUsdRate = 0.2;
const collateral4ProfileBorrowingFactor = 1500;
const collateral5ProfileUsdRate = 0.01;
const collateral5ProfileBorrowingFactor = 1000;

const duration = 365 * 24 * 3600;
let rewardPool = 100000;
const d = {};

describe("bugFix-1.js - checking possible bug (instant yield increasing after borrowing)", function () {
  beforeEach(async function () {
    d.signers = await ethers.getSigners();

    d.owner = d.signers[10];
    d.ratesUpdater = d.signers[9];

    const Rates = await ethers.getContractFactory("Rates");
    d.ratesContract = await Rates.deploy(
      d.owner.address,
      d.ratesUpdater.address
    );
    await d.ratesContract.deployed();

    const ERC20 = await ethers.getContractFactory("BEP20Token");
    brandToken = await ERC20.deploy(
      d.owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18
    );
    await brandToken.deployed();

    await brandToken.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    mtbContract = await ERC20.deploy(
      d.owner.address, 'ETNA', 'ETNA', ethers.utils.parseUnits('1000000'), 18
    );
    await mtbContract.deployed();

    await mtbContract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    nEtnaContract = await ERC20.deploy(
      d.owner.address, 'NETNA', 'NETNA', ethers.utils.parseUnits('1000000'), 18
    );
    await nEtnaContract.deployed();

    erc20CollateralContract = await ERC20.deploy(
      d.owner.address, 'TEST', 'TEST', ethers.utils.parseUnits('1000000'), 18
    );
    await erc20CollateralContract.deployed();

    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    erc20CollateralContract = await ERC20.deploy(
      d.owner.address, 'TEST', 'TEST', ethers.utils.parseUnits('1000000'), 18
    );
    await erc20CollateralContract.deployed();

    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    erc20Collateral2Contract = await ERC20.deploy(
      d.owner.address, 'TEST2', 'TEST2', ethers.utils.parseUnits('1000000'), 8
    );
    await erc20Collateral2Contract.deployed();

    await erc20Collateral2Contract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));

    borrowing1Contract = await ERC20.deploy(
      d.owner.address, 'BUSD', 'BUSD', ethers.utils.parseUnits('1000000'), 6
    );
    await borrowing1Contract.deployed();

    await borrowing1Contract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.owner)
      .transfer(d.signers[7].address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));

    borrowing2Contract = await ERC20.deploy(
      d.owner.address, 'BUSD', 'BUSD', ethers.utils.parseUnits('1000000'), 18
    );
    await borrowing2Contract.deployed();

    await borrowing2Contract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    borrowing3Contract = await ERC20.deploy(
      d.owner.address, 'USDC', 'USDC', ethers.utils.parseUnits('1000000'), 6
    );
    await borrowing3Contract.deployed();

    await borrowing3Contract.connect(d.owner)
      .transfer(d.signers[0].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.owner)
      .transfer(d.signers[1].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.owner)
      .transfer(d.signers[2].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));

    await borrowing3Contract.connect(d.owner)
      .transfer(d.signers[3].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.owner)
      .transfer(d.signers[4].address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));

    d.ProxyAdmin = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin"
    );
    d.proxyAdmin = await d.ProxyAdmin.connect(d.owner).deploy();
    await d.proxyAdmin.deployed();

    const BorrowingLending = await ethers.getContractFactory("BorrowingLending");
    d.blImplementation = await BorrowingLending.connect(d.owner).deploy();
    await d.blImplementation.deployed();

    d.ABI = [
      "function initialize(address, uint16, uint16, uint16, uint16, uint16)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      2000,
      4000,
      500,
      1000,
      3000
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.blProxy = await d.Proxy.connect(d.owner).deploy(
      d.blImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.blProxy.deployed();

    // connect to blProxy contract using blImplementation ABI
    blContract = new ethers.Contract(
      d.blProxy.address,
      d.blImplementation.interface.format(ethers.utils.FormatTypes.json),
      d.blImplementation.provider
    );

    await blContract.connect(d.owner)
      .setRatesContract(
        d.ratesContract.address
      );

    const Collateral = await ethers.getContractFactory("Collateral");
    d.collateralImplementation = await Collateral.connect(d.owner).deploy();
    await d.collateralImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, address, address)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address, // owner
      brandToken.address,
      nEtnaContract.address,
      blContract.address,
      d.ratesContract.address
    ]);

    d.collateralProxy = await d.Proxy.connect(d.owner).deploy(
      d.collateralImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.collateralProxy.deployed();

    // connect to collateralProxy contract using collateralImplementation ABI
    collateralContract = new ethers.Contract(
      d.collateralProxy.address,
      d.collateralImplementation.interface.format(ethers.utils.FormatTypes.json),
      d.collateralImplementation.provider
    );

    await blContract.connect(d.owner)
      .setCollateralContract(
        collateralContract.address
      );

    await brandToken.connect(d.signers[0])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.signers[1])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.signers[2])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.signers[3])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.signers[4])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.owner)
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    await mtbContract.connect(d.signers[0])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.signers[1])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.signers[2])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.signers[3])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.signers[4])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await mtbContract.connect(d.owner)
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    await erc20CollateralContract.connect(d.signers[0])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.signers[1])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.signers[2])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.signers[3])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.signers[4])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await erc20CollateralContract.connect(d.owner)
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    await erc20Collateral2Contract.connect(d.signers[0])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.signers[1])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.signers[2])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.signers[3])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.signers[4])
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));
    await erc20Collateral2Contract.connect(d.owner)
      .approve(collateralContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 8));

    await borrowing1Contract.connect(d.signers[0])
      .approve(blContract.address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.signers[1])
      .approve(blContract.address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.signers[2])
      .approve(blContract.address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.signers[3])
      .approve(blContract.address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.signers[4])
      .approve(blContract.address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));
    await borrowing1Contract.connect(d.signers[7])
      .approve(blContract.address, ethers.utils.parseUnits(
        initialEtnaTransfer.toString(), 6
      ));

    await borrowing2Contract.connect(d.signers[0])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.signers[1])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.signers[2])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.signers[3])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await borrowing2Contract.connect(d.signers[4])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    await borrowing3Contract.connect(d.signers[0])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.signers[1])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.signers[2])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.signers[3])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));
    await borrowing3Contract.connect(d.signers[4])
      .approve(blContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString(), 6));

    await blContract.connect(d.owner).addToManagers(d.signers[9].address);
    await collateralContract.connect(d.owner).addToManagers(d.signers[9].address);
    await expect(
      blContract.connect(d.signers[0]).addBorrowingProfile(borrowing1Contract.address)
    ).to.be.revertedWith('63');

    await blContract.connect(d.signers[9])
      .addBorrowingProfile(borrowing1Contract.address);

    d.result = await blContract.getUsdRateData(borrowing1Contract.address);
    expect(Number(ethers.utils.formatUnits(d.result.rate, 30))).to.equal(1);
    expect(d.result.externalRates).to.be.false;

    await blContract.connect(d.signers[9])
      .addBorrowingProfile(borrowing2Contract.address);
    d.result = await blContract.getUsdRateData(borrowing2Contract.address);
    expect(Number(ethers.utils.formatUnits(d.result.rate))).to.equal(1);
    expect(d.result.externalRates).to.be.false;

    await collateralContract.connect(d.signers[9]).addCollateralProfile(
      erc20CollateralContract.address,
      collateral1ProfileBorrowingFactor,
      1,
      false
    );
    await collateralContract.connect(d.signers[9]).addCollateralProfile(
      brandToken.address,
      collateral2ProfileBorrowingFactor,
      2,
      true
    );
    await collateralContract.connect(d.signers[9]).addCollateralProfile(
      zeroAddress,
      collateral3ProfileBorrowingFactor,
      0,
      false
    );

    await collateralContract.connect(d.signers[9]).addCollateralProfile(
      nEtnaContract.address,
      collateral4ProfileBorrowingFactor,
      4,
      true
    );
    await collateralContract.connect(d.signers[9]).addCollateralProfile(
      mtbContract.address,
      collateral5ProfileBorrowingFactor,
      3,
      false
    );

    await d.ratesContract.connect(d.owner)
      .setUsdRate(
        erc20CollateralContract.address,
        ethers.utils.parseUnits(collateral1ProfileUsdRate.toString())
      );
    await d.ratesContract.connect(d.owner)
      .setUsdRate(
        brandToken.address,
        ethers.utils.parseUnits(collateral2ProfileUsdRate.toString())
      );
    await d.ratesContract.connect(d.owner)
      .setUsdRate(
        mtbContract.address,
        ethers.utils.parseUnits(collateral5ProfileUsdRate.toString())
      );

    await d.ratesContract.connect(d.owner)
      .setUsdRate(
        nEtnaContract.address,
        ethers.utils.parseUnits(collateral4ProfileUsdRate.toString())
      );
    await d.ratesContract.connect(d.owner)
      .setUsdRate(
        zeroAddress,
        ethers.utils.parseUnits(collateral3ProfileUsdRate.toString())
      );

    result = await blContract.getBorrowingProfilesNumber();
    expect(Number(result)).to.equal(2);
    result = await collateralContract.getCollateralProfilesNumber();
    expect(Number(result)).to.equal(5);
    result = await blContract.getBorrowingProfile(1);
    expect(result.contractAddress).to.equal(borrowing1Contract.address);
    expect(Number(result.totalBorrowed)).to.equal(0);
    expect(Number(result.totalLent)).to.equal(0);
    expect(result.active).to.be.true;

    result = await blContract.getBorrowingProfile(2);
    expect(result.contractAddress).to.equal(borrowing2Contract.address);
    expect(Number(result.totalBorrowed)).to.equal(0);
    expect(Number(result.totalLent)).to.equal(0);
    expect(result.active).to.be.true;

    result = await collateralContract.getCollateralProfile(1);
    expect(result.contractAddress).to.equal(erc20CollateralContract.address);
    expect(Number(result.borrowingFactor)).to.equal(collateral1ProfileBorrowingFactor);
    expect(Number(result.total)).to.equal(0);
    expect(Number(result.order)).to.equal(1);
    expect(result.active).to.be.true;

    result = await collateralContract.getUsdRate(erc20CollateralContract.address);
    expect(Number(ethers.utils.formatUnits(result)))
      .to.equal(collateral1ProfileUsdRate);

    result = await collateralContract.getCollateralProfile(2);
    expect(result.contractAddress).to.equal(brandToken.address);
    expect(Number(result.borrowingFactor)).to.equal(collateral2ProfileBorrowingFactor);
    expect(Number(result.total)).to.equal(0);
    expect(Number(result.order)).to.equal(2);
    expect(result.active).to.be.true;
    result = await collateralContract.getUsdRate(brandToken.address);
    expect(Number(ethers.utils.formatUnits(result)))
      .to.equal(collateral2ProfileUsdRate);

    result = await collateralContract.getCollateralProfile(3);
    expect(result.contractAddress).to.equal(zeroAddress);
    expect(Number(result.borrowingFactor)).to.equal(collateral3ProfileBorrowingFactor);
    expect(Number(result.total)).to.equal(0);
    expect(Number(result.order)).to.equal(0);
    expect(result.active).to.be.true;
    result = await collateralContract.getUsdRate(zeroAddress);
    expect(Number(ethers.utils.formatUnits(result)))
      .to.equal(collateral3ProfileUsdRate);

    result = await collateralContract.getCollateralProfile(4);
    expect(result.contractAddress).to.equal(nEtnaContract.address);
    expect(Number(result.borrowingFactor)).to.equal(collateral4ProfileBorrowingFactor);
    expect(Number(result.total)).to.equal(0);
    expect(Number(result.order)).to.equal(4);
    expect(result.active).to.be.true;
    result = await collateralContract.getUsdRate(nEtnaContract.address);
    expect(Number(ethers.utils.formatUnits(result)))
      .to.equal(collateral4ProfileUsdRate);

    result = await collateralContract.getCollateralProfile(5);
    expect(result.contractAddress).to.equal(mtbContract.address);
    expect(Number(result.borrowingFactor)).to.equal(collateral5ProfileBorrowingFactor);
    expect(Number(result.total)).to.equal(0);
    expect(Number(result.order)).to.equal(3);
    expect(result.active).to.be.true;
    result = await collateralContract.getUsdRate(mtbContract.address);
    expect(Number(ethers.utils.formatUnits(result)))
      .to.equal(collateral5ProfileUsdRate);

    const Nft = await ethers.getContractFactory("CyclopsTokens");
    nftContract = await Nft.connect(d.owner).deploy();
    await nftContract.deployed();

    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplaceContract = await Marketplace.connect(d.owner).deploy(nftContract.address, brandToken.address, 0);
    await marketplaceContract.deployed();

    const NftCollateral = await ethers.getContractFactory("NftCollateral");
    d.nftCollateralImplementation = await NftCollateral.connect(d.owner).deploy();
    await d.nftCollateralImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, address)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);

    d.calldata = d.iface.encodeFunctionData("initialize", [
      marketplaceContract.address,
      nftContract.address,
      collateralContract.address,
      d.owner.address
    ]);

    d.nftCollateralProxy = await d.Proxy.connect(d.owner).deploy(
      d.nftCollateralImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.nftCollateralProxy.deployed();

    // connect to nftCollateralProxy contract using nftCollateralImplementation ABI
    nftCollateralContract = new ethers.Contract(
      d.nftCollateralProxy.address,
      d.nftCollateralImplementation.interface.format(ethers.utils.FormatTypes.json),
      d.nftCollateralImplementation.provider
    );

    const totalSupply = await nEtnaContract.totalSupply();
    await nEtnaContract.connect(d.owner)
      .transfer(nftCollateralContract.address, totalSupply);

    await collateralContract.connect(d.signers[9])
      .setNftCollateralContract(nftCollateralContract.address);

    await nftContract.connect(d.owner).transferPublishRight(marketplaceContract.address);
    await brandToken.connect(d.signers[0]).approve(marketplaceContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.signers[1]).approve(marketplaceContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));
    await brandToken.connect(d.signers[2]).approve(marketplaceContract.address, ethers.utils.parseUnits(initialEtnaTransfer.toString()));

    await marketplaceContract.connect(d.owner).setExternalPriceCurve();
    await marketplaceContract.connect(d.owner).addNFTProfile(
      1, ethers.utils.parseUnits('11'), ethers.utils.parseUnits('10'), 'https://test/1', 1000
    );

    await marketplaceContract.connect(d.owner).addNFTProfile(
      2, ethers.utils.parseUnits('22'), ethers.utils.parseUnits('20'), 'https://test/2', 1000
    );
    await marketplaceContract.connect(d.owner).addNFTProfile(
      3, ethers.utils.parseUnits('33'), ethers.utils.parseUnits('30'), 'https://test/3', 1000
    );

    await marketplaceContract.connect(d.signers[0]).buyNFT(1);
    await marketplaceContract.connect(d.signers[0]).buyNFT(2);
    await marketplaceContract.connect(d.signers[0]).buyNFT(3);

    await marketplaceContract.connect(d.signers[1]).buyNFT(1);
    await marketplaceContract.connect(d.signers[1]).buyNFT(2);
    await marketplaceContract.connect(d.signers[1]).buyNFT(3);

    tokensArray = [];
    for (let i = 7; i <= 7 + batchLimit - 1; i ++) {
      let profileId = 1;
      if (i < 10) profileId = 3;
      else if (i < 13) profileId = 2;
      await marketplaceContract.connect(d.signers[2]).buyNFT(profileId);
      tokensArray.push(i);
    }

    await nftContract.connect(d.signers[0]).setApprovalForAll(
      nftCollateralContract.address, true
    );
    await nftContract.connect(d.signers[1]).setApprovalForAll(
      nftCollateralContract.address, true
    );
    await nftContract.connect(d.signers[2]).setApprovalForAll(
      nftCollateralContract.address, true
    );

    const Reward = await ethers.getContractFactory("Reward");

    d.rewardImplementation = await Reward.connect(d.owner).deploy();
    await d.rewardImplementation.deployed();

    d.ABI = [
      "function initialize(address, address, address, address, uint256, uint256, uint256)"
    ];
    d.iface = new ethers.utils.Interface(d.ABI);
    d.calldata = d.iface.encodeFunctionData("initialize", [
      d.owner.address,
      brandToken.address,
      blContract.address,
      d.ratesContract.address,
      duration,
      ethers.utils.parseUnits(rewardPool.toString()),
      3000
    ]);

    d.Proxy = await ethers.getContractFactory(
      "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
    );
    d.rewardProxy = await d.Proxy.connect(d.owner).deploy(
      d.rewardImplementation.address,
      d.proxyAdmin.address,
      d.calldata
    );
    await d.rewardProxy.deployed();

    // connect to rewardProxy contract using rewardImplementation ABI
    rewardContract = new ethers.Contract(
      d.rewardProxy.address,
      d.rewardImplementation.interface.format(ethers.utils.FormatTypes.json),
      d.rewardImplementation.provider
    );

    await brandToken.connect(d.owner).transfer(
      rewardContract.address, ethers.utils.parseUnits('100000')
    );
    await blContract.connect(d.owner)
      .setRewardContract(rewardContract.address);

    expect(await blContract.getRewardContract()).to.equal(rewardContract.address);
    expect(Number(await rewardContract.getRewardPercentage(1)))
      .to.equal(5000);
    expect(Number(await rewardContract.getRewardPercentage(2)))
      .to.equal(5000);
  });

  it("Check", async function () {
    await blContract.connect(d.signers[0]).lend(
      1, ethers.utils.parseUnits('100', 6)
    );
    d.index = Number(
      await blContract.getUsersLendingIndex(d.signers[0].address, 1)
    );

    await hre.timeAndMine.increaseTime('100 days');
    await d.signers[0].sendTransaction({
      to: d.signers[0].address,
      value: 0
    });
    d.yield = await blContract.getLendingYield(d.index, true);
    await blContract.connect(d.signers[0]).withdrawLendingYield(
      1, d.yield
    );

    d.yield = Number(ethers.utils.formatUnits(
      await blContract.getLendingYield(d.index, true), 6
    ));
    await collateralContract.connect(d.signers[0]).depositCollateral(
      3, 0, {value: ethers.utils.parseUnits('100')}
    );
    await blContract.connect(d.signers[0]).borrow(
      1, ethers.utils.parseUnits('25', 6), false
    );
    d.yield1 = Number(ethers.utils.formatUnits(
      await blContract.getLendingYield(d.index, true), 6
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
