const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const hre = require("hardhat");
chai.use(chaiAsPromised);
const expect = chai.expect;
const { ethers } = require("hardhat");
let signers, p2eContract, etnaContract, mtbContract,
  owner, gameSigner, manager, taxReceiver, result = {},
  payload = {}, message, signedMessage;
const taxBurningAddress = '0x000000000000000000000000000000000000dEaD';
const totalSupply = 1000000;
const initialTransfer = 1000;
const gamePrice = 3;
const metabolismPrice = 5;
const gamesPerPeriod = 7;
const decimals = 10000;
const parameters = {
  winAmounts : [2, 3, 4, 5],
  winAmountsAdjusted: [],
  depletions: [5, 6, 7, 8],
  thresholds: [210,230,270,300],
}
for (const winAmount of parameters.winAmounts) {
  parameters.winAmountsAdjusted.push(
    ethers.utils.parseUnits(winAmount.toString())
  );
}

beforeEach(async function () {
  signers = await ethers.getSigners();
  owner = signers[10];
  gameSigner = signers[7];
  manager = signers[8];
  taxReceiver = signers[9];

  const ERC20 = await ethers.getContractFactory("testToken");
  etnaContract = await ERC20.connect(owner).deploy(
    owner.address,
    'name',
    'symbol',
    ethers.utils.parseUnits(totalSupply.toString())
  );
  await etnaContract.deployed();

  await etnaContract.connect(owner).transfer(
    signers[0].address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await etnaContract.connect(owner).transfer(
    signers[1].address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await etnaContract.connect(owner).transfer(
    signers[2].address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );

  mtbContract = await ERC20.connect(owner).deploy(
    owner.address,
    'name',
    'symbol',
    ethers.utils.parseUnits(totalSupply.toString())
  );
  await mtbContract.deployed();

  await mtbContract.connect(owner).transfer(
    signers[0].address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await mtbContract.connect(owner).transfer(
    signers[1].address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await mtbContract.connect(owner).transfer(
    signers[2].address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );

  const P2E = await ethers.getContractFactory("p2e");
  p2eContract = await P2E.connect(owner).deploy(
    etnaContract.address,
    mtbContract.address,
    gameSigner.address,
    taxReceiver.address,
    ethers.utils.parseUnits(gamePrice.toString()),
    ethers.utils.parseUnits(metabolismPrice.toString()),
    parameters.winAmountsAdjusted,
    parameters.depletions,
    parameters.thresholds
  );
  await p2eContract.deployed();
  await etnaContract.connect(owner).transfer(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await mtbContract.connect(owner).transfer(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await etnaContract.connect(signers[0]).approve(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await etnaContract.connect(signers[1]).approve(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await etnaContract.connect(signers[2]).approve(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await mtbContract.connect(signers[0]).approve(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await mtbContract.connect(signers[1]).approve(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await mtbContract.connect(signers[2]).approve(
    p2eContract.address,
    ethers.utils.parseUnits(initialTransfer.toString())
  );
  await p2eContract.connect(owner).addToManagers(manager.address);
});

describe("Testing p2e contract", function () {
  it("Game flow", async function () {
    payload.userAddress = signers[1].address;
    payload.gameNumber = 3;
    payload.strength = 1;
    payload.level = 2;
    payload.serialNumber = 2;
    payload.characterId = 1;
    payload.data = formatData(payload, getSwitcher());
    signedMessage = await signMessage(signers[0], payload);

    expect(Number(
      await p2eContract.getAvailableGames(signers[1].address)
    )).to.equal(gamesPerPeriod);

    await expect(
      p2eContract.connect(signers[0]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      )
    ).to.be.revertedWith('Signature is not valid');

    signedMessage = await signMessage(signers[7], payload);
    await expect(
      p2eContract.connect(signers[0]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      )
    ).to.be.revertedWith('Caller is not authorized');

    signedMessage = await signMessage(signers[7], payload);
    await expect(
      p2eContract.connect(signers[1]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      )
    ).to.be.revertedWith('Serial number mismatch');

    payload.serialNumber = 0;
    for (let i = 0; i < gamesPerPeriod; i ++) {
      payload.strength = i + 1;
      payload.serialNumber ++;
      payload.data = formatData(payload, getSwitcher());
      signedMessage = await signMessage(signers[7], payload);
      await p2eContract.connect(signers[1]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      );

      expect(Number(
        await p2eContract.getAvailableGames(signers[1].address)
      )).to.equal(gamesPerPeriod - i - 1);
    }
    payload.serialNumber ++;
    signedMessage = await signMessage(signers[7], payload);
    await expect(
      p2eContract.connect(signers[1]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      )
    ).to.be.revertedWith('This account hit 24 hours limit.');

    result.winAmount = parameters.winAmounts[payload.level - 1];
    result.expectedS1Win = result.winAmount * 5;
    expect(
      Number(ethers.utils.formatUnits(await p2eContract.getUserWin(signers[1].address)))
    ).to.equal(result.expectedS1Win);

    payload.serialNumber = 0;
    payload.userAddress = signers[2].address;
    for (let i = 0; i < gamesPerPeriod; i ++) {
      payload.strength = i + 1;
      payload.serialNumber ++;
      payload.data = formatData(payload, getSwitcher());
      signedMessage = await signMessage(signers[7], payload);
      await p2eContract.connect(signers[2]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      );
    }
    payload.serialNumber ++;
    signedMessage = await signMessage(signers[7], payload);
    await expect(
      p2eContract.connect(signers[2]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      )
    ).to.be.revertedWith('This account hit 24 hours limit.');
    result.taxBurningAddressBalance = Number(ethers.utils.formatUnits(
      await etnaContract.balanceOf(taxBurningAddress)
    ));
    result.p2eBalance = Number(ethers.utils.formatUnits(
      await etnaContract.balanceOf(p2eContract.address)
    ));
    await p2eContract.connect(signers[2]).payForGame();
    expect(Number(ethers.utils.formatUnits(
      await etnaContract.balanceOf(taxBurningAddress)
    ))).to.equal(result.taxBurningAddressBalance + gamePrice);
    expect(Number(ethers.utils.formatUnits(
      await etnaContract.balanceOf(p2eContract.address)
    ))).to.equal(result.p2eBalance);
    await expect(
      p2eContract.connect(signers[2]).payForGame()
    ).to.be.revertedWith('Your have already paid for a game');
    payload.serialNumber --;
    for (let i = 0; i < gamesPerPeriod; i ++) {
      payload.strength = i + 1;
      payload.serialNumber ++;
      payload.data = formatData(payload, getSwitcher());
      signedMessage = await signMessage(signers[7], payload);
      await p2eContract.connect(signers[2]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      );
    }
    result.expectedS2Win = result.winAmount * 10;
    expect(
      Number(ethers.utils.formatUnits(await p2eContract.getUserWin(signers[2].address)))
    ).to.equal(result.expectedS2Win);

    payload.serialNumber ++;
    signedMessage = await signMessage(signers[7], payload);
    await expect(
      p2eContract.connect(signers[2]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      )
    ).to.be.revertedWith('This account hit 24 hours limit.');

    await p2eContract.connect(signers[1]).withdrawWinAll();
    result.withdrawTax = Number(
      await p2eContract.getCurrentWithdrawTax(signers[1].address)
    ) / decimals;
    result.taxAmount = result.expectedS1Win * result.withdrawTax;
    result.signers1Balance = Number(ethers.utils.formatUnits(
      await mtbContract.balanceOf(signers[1].address)
    ));
    expect(roundTo(result.signers1Balance, 8)).to.equal(roundTo(
      initialTransfer + result.expectedS1Win - result.taxAmount, 8
    ));
    expect(
      Number(ethers.utils.formatUnits(await mtbContract.balanceOf(p2eContract.address)))
    ).to.equal(initialTransfer - result.expectedS1Win);
    result.taxBurningPercentage = Number(
      await p2eContract.getTaxBurningPercentage()
    ) / decimals;
    result.toBeBurned = result.taxAmount * result.taxBurningPercentage;
    result.taxAmount -= result.toBeBurned;
    result.taxReceiverBalance = Number(ethers.utils.formatUnits(
      await mtbContract.balanceOf(taxReceiver.address)
    ));
    expect(roundTo(result.taxReceiverBalance, 8))
      .to.equal(roundTo(result.taxAmount, 8));
    result.burningAddress = await p2eContract.getTaxBurningAddress();
    result.burningAddressBalance = Number(ethers.utils.formatUnits(
      await mtbContract.balanceOf(result.burningAddress)
    ));
    expect(roundTo(result.burningAddressBalance, 8))
      .to.equal(roundTo(result.toBeBurned, 8));

    result.metabolismAmount = 100;
    await p2eContract.connect(signers[1]).payForMetabolism(result.metabolismAmount);
    expect(Number(
      await p2eContract.getPaidMetabolism(signers[1].address)
    )).to.equal(result.metabolismAmount);
    expect(Number(
      await p2eContract.getPaidMetabolism(signers[0].address)
    )).to.equal(0);

    result.paidAmount = result.metabolismAmount * metabolismPrice;
    expect(roundTo(Number(ethers.utils.formatUnits(
      await mtbContract.balanceOf(signers[1].address)
    )), 8)).to.equal(roundTo(
      result.signers1Balance - result.paidAmount, 8
    ));
    expect(
      Number(ethers.utils.formatUnits(await mtbContract.balanceOf(p2eContract.address)))
    ).to.equal(initialTransfer - result.expectedS1Win);
    result.toBeBurned = result.paidAmount * result.taxBurningPercentage;
    result.paidAmount -= result.toBeBurned;
    expect(
      roundTo(Number(ethers.utils.formatUnits(
        await mtbContract.balanceOf(taxReceiver.address)
      )), 8)
    ).to.equal(roundTo(result.taxReceiverBalance + result.paidAmount, 8));
    expect(
      roundTo(Number(ethers.utils.formatUnits(
        await mtbContract.balanceOf(result.burningAddress)
      )), 8)
    ).to.equal(roundTo(result.burningAddressBalance + result.toBeBurned, 8));
  });

  it("Get available games testing", async function () {
    payload.userAddress = signers[1].address;
    payload.gameNumber = 3;
    payload.strength = 1;
    payload.level = 2;
    payload.serialNumber = 0;
    payload.characterId = 1;
    payload.data = formatData(payload, getSwitcher());
    result.gamesAvailable = gamesPerPeriod;
    expect(Number(
      await p2eContract.getAvailableGames(signers[1].address)
    )).to.equal(result.gamesAvailable);

    signedMessage = await signMessage(signers[7], payload);

    for (let i = 0; i < 2; i ++) {
      payload.serialNumber ++;
      payload.data = formatData(payload, getSwitcher());
      signedMessage = await signMessage(signers[7], payload);
      await p2eContract.connect(signers[1]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      );
      result.gamesAvailable --;
      expect(Number(
        await p2eContract.getAvailableGames(signers[1].address)
      )).to.equal(result.gamesAvailable);
    }
    await p2eContract.connect(signers[1]).payForGame();
    result.gamesAvailable += gamesPerPeriod;
    expect(Number(
      await p2eContract.getAvailableGames(signers[1].address)
    )).to.equal(result.gamesAvailable);

    for (let i = 0; i < 12; i ++) {
      payload.serialNumber ++;
      payload.data = formatData(payload, getSwitcher());
      signedMessage = await signMessage(signers[7], payload);
      await p2eContract.connect(signers[1]).playGame(
        payload.userAddress,
        payload.serialNumber,
        payload.characterId,
        payload.data,
        signedMessage
      );
      result.gamesAvailable --;
      expect(Number(
        await p2eContract.getAvailableGames(signers[1].address)
      )).to.equal(result.gamesAvailable);
    }
    await p2eContract.connect(signers[1]).payForGame();
    result.gamesAvailable += gamesPerPeriod;
    expect(Number(
      await p2eContract.getAvailableGames(signers[1].address)
    )).to.equal(result.gamesAvailable);
  });

  // it("Manager settings", async function () {
  //   expect(
  //     await p2eContract.isManager(owner.address)
  //   ).to.be.true;
  //   expect(
  //     await p2eContract.isManager(manager.address)
  //   ).to.be.true;
  //   expect(
  //     await p2eContract.isManager(signers[0].address)
  //   ).to.be.false;
  //   await expect(
  //     p2eContract.connect(signers[0]).setTaxBurningPercentage(11)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setGamePrice(22)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setMetabolismPrice(33)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setGamePerPeriodNumber(44)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setWithdrawTax(55)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setWithdrawTaxResetPeriod(66)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setTaxBurningAddress(signers[0].address)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setTaxReceiverAddress(signers[1].address)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setGameSignerAddress(signers[2].address)
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setGameData(
  //       [11,22,33],
  //       [111,222,333],
  //       [1111,2222,3333],
  //     )
  //   ).to.be.revertedWith('Caller is not the manager');
  //   await expect(
  //     p2eContract.connect(signers[0]).setSafeMode(true)
  //   ).to.be.revertedWith('Caller is not the manager');
  //
  //   await p2eContract.connect(manager).setTaxBurningPercentage(11);
  //   await p2eContract.connect(manager).setGamePrice(22);
  //   await p2eContract.connect(manager).setMetabolismPrice(33);
  //   await p2eContract.connect(manager).setGamePerPeriodNumber(44);
  //   await p2eContract.connect(manager).setWithdrawTax(55);
  //   await p2eContract.connect(manager).setWithdrawTaxResetPeriod(66);
  //   await p2eContract.connect(manager).setTaxBurningAddress(signers[0].address);
  //   await p2eContract.connect(manager).setTaxReceiverAddress(signers[1].address);
  //   await p2eContract.connect(manager).setGameSignerAddress(signers[2].address);
  //   await p2eContract.connect(manager).setGameData(
  //     [11,22,33],
  //     [111,222,333],
  //     [1111,2222,3333],
  //   );
  //   await p2eContract.connect(manager).setSafeMode(true);
  //   expect(Number(
  //     await p2eContract.getTaxBurningPercentage()
  //   )).to.equal(11);
  //   expect(Number(
  //     await p2eContract.getGamePrice()
  //   )).to.equal(22);
  //   expect(Number(
  //     await p2eContract.getMetabolismPrice()
  //   )).to.equal(33);
  //   expect(Number(
  //     await p2eContract.getGamePerPeriodNumber()
  //   )).to.equal(44);
  //   expect(Number(
  //     await p2eContract.getWithdrawTax()
  //   )).to.equal(55);
  //   expect(Number(
  //     await p2eContract.getWithdrawTaxResetPeriod()
  //   )).to.equal(66);
  //   expect(
  //     await p2eContract.getTaxBurningAddress()
  //   ).to.equal(signers[0].address);
  //   expect(
  //     await p2eContract.getTaxReceiverAddress()
  //   ).to.equal(signers[1].address);
  //   result.gameData = await p2eContract.getGameData();
  //   expect(result.gameData.winAmounts.length).to.equal(3);
  //   expect(result.gameData.winAmounts[0]).to.equal(11);
  //   expect(result.gameData.winAmounts[1]).to.equal(22);
  //   expect(result.gameData.winAmounts[2]).to.equal(33);
  //   expect(result.gameData.depletions.length).to.equal(3);
  //   expect(result.gameData.depletions[0]).to.equal(111);
  //   expect(result.gameData.depletions[1]).to.equal(222);
  //   expect(result.gameData.depletions[2]).to.equal(333);
  //   expect(result.gameData.thresholds.length).to.equal(3);
  //   expect(result.gameData.thresholds[0]).to.equal(1111);
  //   expect(result.gameData.thresholds[1]).to.equal(2222);
  //   expect(result.gameData.thresholds[2]).to.equal(3333);
  //   expect(
  //     await p2eContract.getSafeMode()
  //   ).to.be.true;
  //   await p2eContract.connect(manager).setSafeMode(false);
  //   expect(
  //     await p2eContract.getSafeMode()
  //   ).to.be.false;
  //
  //   const amount = 123;
  //   const ownerBalance = Number(ethers.utils.formatUnits(
  //     await mtbContract.balanceOf(owner.address)
  //   ));
  //   await expect(
  //     p2eContract.connect(manager).adminWithdraw(
  //       mtbContract.address,
  //       ethers.utils.parseUnits(amount.toString())
  //     )
  //   ).to.be.revertedWith('Caller is not the owner');
  //   await p2eContract.connect(owner).adminWithdraw(
  //     mtbContract.address,
  //     ethers.utils.parseUnits(amount.toString())
  //   );
  //   expect(Number(ethers.utils.formatUnits(
  //     await mtbContract.balanceOf(p2eContract.address)
  //   ))).to.equal(initialTransfer - amount);
  //   expect(Number(ethers.utils.formatUnits(
  //     await mtbContract.balanceOf(owner.address)
  //   ))).to.equal(ownerBalance + amount);
  //   expect(Number(ethers.utils.formatUnits(
  //     await p2eContract.getTokenBalance(mtbContract.address)
  //   ))).to.equal(initialTransfer - amount);
  // });
});

function roundTo(a, b) {
  a = Number(a);
  b = Number(b);
  if (isNaN(a) || !(b > 0)) return null;
  b = 10 ** b;
  return Math.floor(a * b) / b;
}

function signMessage (signer, payload) {
  const abiCoder = new ethers.utils.AbiCoder();
  const message = abiCoder.encode(
    [ "address", "uint256", "uint256", "uint256", "uint256", "uint256" ],
    [
      payload.userAddress,
      payload.gameNumber,
      payload.level,
      payload.serialNumber,
      payload.strength,
      payload.characterId
    ]
  );
  let hashedMessage = ethers.utils.keccak256(message);
  let messageHashBinary = ethers.utils.arrayify(hashedMessage);
  return signer.signMessage(messageHashBinary);
}

function formatData(payload, i) {
  let data;
  if (i < 2) {
    data = String(i)
      + valueToString(payload.gameNumber, 5)
      + valueToString(payload.level, 5)
      + valueToString(payload.strength, 5);
  } else if (i < 4) {
    data = String(i)
      + valueToString(payload.gameNumber, 5)
      + valueToString(payload.strength, 5)
      + valueToString(payload.level, 5);
  } else if (i < 6) {
    data = String(i)
      + valueToString(payload.level, 5)
      + valueToString(payload.gameNumber, 5)
      + valueToString(payload.strength, 5);
  } else if (i < 8) {
    data = String(i)
      + valueToString(payload.level, 5)
      + valueToString(payload.strength, 5)
      + valueToString(payload.gameNumber, 5);
  } else if (i < 9) {
    data = String(i)
      + valueToString(payload.strength, 5)
      + valueToString(payload.gameNumber, 5)
      + valueToString(payload.level, 5);
  } else {
    data = String(i)
      + valueToString(payload.strength, 5)
      + valueToString(payload.level, 5)
      + valueToString(payload.gameNumber, 5);
  }
  return Number(data);
}

function valueToString (value, length) {
  let result = String(value);
  let initialLength = result.length;
  for (let i = 0; i < length - initialLength; i ++) {
    result = '0' + result;
  }
  return result;
}

function getSwitcher() {
  let random = Math.floor(Math.random() * 10) + 1;
  if (!(random > 0)) random = 7;
  if (!(random < 10)) random = 3;
  return random;
}
