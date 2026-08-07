const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MysteryCurve", function () {
  async function deployFixture() {
    const [owner, alice, treasury] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ProjectToken");
    const token = await Token.deploy();
    const Curve = await ethers.getContractFactory("BondingCurve");
    const curve = await Curve.deploy(token);
    await token.setMinter(curve);

    const Cards = await ethers.getContractFactory("CardNFT");
    const cards = await Cards.deploy("ipfs://example/{id}.json");
    const Pack = await ethers.getContractFactory("MysteryPack");
    const pack = await Pack.deploy(token, cards, treasury);
    await cards.setPackContract(pack);

    return { owner, alice, treasury, token, curve, cards, pack };
  }

  async function buyTokens(curve, buyer, count) {
    const amount = ethers.parseEther(String(count));
    const cost = await curve.quoteBuy(amount);
    await curve.connect(buyer).buy(amount, cost, { value: cost });
    return { amount, cost };
  }

  it("starts at 1,000,000 tokens per ETH and increases price with supply", async function () {
    const { alice, token, curve } = await deployFixture();
    expect(await curve.currentPrice()).to.equal(ethers.parseEther("0.000001"));

    const { amount, cost } = await buyTokens(curve, alice, 1_000);
    expect(await token.balanceOf(alice)).to.equal(amount);
    expect(cost).to.equal(ethers.parseEther("0.0010004995"));
    expect(await curve.currentPrice()).to.equal(ethers.parseEther("0.000001001"));
  });

  it("returns the same curve area when tokens are sold immediately", async function () {
    const { alice, token, curve } = await deployFixture();
    const { amount, cost } = await buyTokens(curve, alice, 500);
    const quotedReturn = await curve.quoteSell(amount);
    expect(quotedReturn).to.equal(cost);

    await curve.connect(alice).sell(amount, quotedReturn);
    expect(await token.balanceOf(alice)).to.equal(0);
    expect(await ethers.provider.getBalance(curve)).to.equal(0);
  });

  it("rejects fractional-token curve trades", async function () {
    const { curve } = await deployFixture();
    await expect(curve.quoteBuy(ethers.parseEther("1.5")))
      .to.be.revertedWithCustomError(curve, "WholeTokensOnly");
  });

  it("buys a discounted token pack, reveals a card, and pays its reward", async function () {
    const { alice, token, curve, cards, pack } = await deployFixture();
    await buyTokens(curve, alice, 2_000);

    await token.connect(alice).approve(pack, ethers.parseEther("1000"));
    await expect(pack.connect(alice).buyWithToken())
      .to.emit(pack, "PackPurchased")
      .withArgs(0, alice.address, true);
    expect(await token.balanceOf(pack)).to.equal(ethers.parseEther("1000"));

    await ethers.provider.send("hardhat_mine", ["0x2"]);
    await expect(pack.connect(alice).openPack(0)).to.emit(pack, "PackOpened");

    const totalCards =
      (await cards.balanceOf(alice, 0)) +
      (await cards.balanceOf(alice, 1)) +
      (await cards.balanceOf(alice, 2)) +
      (await cards.balanceOf(alice, 3));
    expect(totalCards).to.equal(1);
    expect(await token.balanceOf(alice)).to.be.greaterThan(ethers.parseEther("1000"));
  });

  it("supports ETH-paid packs when the reward pool is funded", async function () {
    const { owner, alice, treasury, token, curve, pack } = await deployFixture();
    await buyTokens(curve, owner, 500);
    await token.approve(pack, ethers.parseEther("500"));
    await pack.fundRewards(ethers.parseEther("500"));

    const before = await ethers.provider.getBalance(treasury);
    await pack.connect(alice).buyWithEth({ value: ethers.parseEther("0.002") });
    expect(await ethers.provider.getBalance(treasury)).to.equal(
      before + ethers.parseEther("0.002")
    );

    await ethers.provider.send("hardhat_mine", ["0x2"]);
    await expect(pack.connect(alice).openPack(0)).to.emit(pack, "PackOpened");
  });

  it("rejects ETH packs that would leave the reward pool underfunded", async function () {
    const { alice, pack } = await deployFixture();
    await expect(
      pack.connect(alice).buyWithEth({ value: ethers.parseEther("0.002") })
    ).to.be.revertedWithCustomError(pack, "InsufficientRewardPool");
  });

  it("only lets the owner withdraw MYST above the unopened-pack reserve", async function () {
    const { owner, alice, treasury, token, curve, pack } = await deployFixture();
    await buyTokens(curve, alice, 1_000);
    await token.connect(alice).approve(pack, ethers.parseEther("1000"));
    await pack.connect(alice).buyWithToken();

    expect(await pack.rewardReserve()).to.equal(ethers.parseEther("500"));
    expect(await pack.withdrawableSurplus()).to.equal(ethers.parseEther("500"));
    await expect(pack.connect(alice).withdrawSurplus(1))
      .to.be.revertedWithCustomError(pack, "OwnableUnauthorizedAccount");
    await expect(pack.withdrawSurplus(ethers.parseEther("501")))
      .to.be.revertedWithCustomError(pack, "InsufficientRewardPool");

    await expect(pack.withdrawSurplus(ethers.parseEther("500")))
      .to.emit(pack, "SurplusWithdrawn")
      .withArgs(treasury.address, ethers.parseEther("500"));
    expect(await token.balanceOf(pack)).to.equal(ethers.parseEther("500"));
    expect(await pack.rewardReserve()).to.equal(ethers.parseEther("500"));

    await ethers.provider.send("hardhat_mine", ["0x2"]);
    await expect(pack.connect(alice).openPack(0)).to.emit(pack, "PackOpened");
  });

  it("buys multiple token-paid packs atomically", async function () {
    const { alice, token, curve, pack } = await deployFixture();
    await buyTokens(curve, alice, 5_000);
    await token.connect(alice).approve(pack, ethers.parseEther("5000"));

    await expect(pack.connect(alice).buyWithTokenBatch(5))
      .to.emit(pack, "PackPurchased")
      .withArgs(4, alice.address, true);
    expect(await pack.nextPackId()).to.equal(5);
    expect(await pack.unopenedPackCount()).to.equal(5);
    expect(await pack.rewardReserve()).to.equal(ethers.parseEther("2500"));
  });

  it("buys multiple ETH-paid packs atomically when fully funded", async function () {
    const { owner, alice, token, curve, pack } = await deployFixture();
    await buyTokens(curve, owner, 1_500);
    await token.approve(pack, ethers.parseEther("1500"));
    await pack.fundRewards(ethers.parseEther("1500"));

    await pack.connect(alice).buyWithEthBatch(3, {
      value: ethers.parseEther("0.006"),
    });
    expect(await pack.nextPackId()).to.equal(3);
    expect(await pack.unopenedPackCount()).to.equal(3);
  });

  it("rejects empty or oversized pack batches", async function () {
    const { alice, pack } = await deployFixture();
    await expect(pack.connect(alice).buyWithTokenBatch(0))
      .to.be.revertedWithCustomError(pack, "InvalidQuantity");
    await expect(pack.connect(alice).buyWithTokenBatch(21))
      .to.be.revertedWithCustomError(pack, "InvalidQuantity");
  });

  it("prevents opening in the purchase block window or opening twice", async function () {
    const { alice, token, curve, pack } = await deployFixture();
    await buyTokens(curve, alice, 1_000);
    await token.connect(alice).approve(pack, ethers.parseEther("1000"));
    await pack.connect(alice).buyWithToken();

    await expect(pack.connect(alice).openPack(0))
      .to.be.revertedWithCustomError(pack, "RevealNotReady");
    await ethers.provider.send("hardhat_mine", ["0x2"]);
    await pack.connect(alice).openPack(0);
    await expect(pack.connect(alice).openPack(0))
      .to.be.revertedWithCustomError(pack, "AlreadyOpened");
  });

  it("allows recovery reveals after the original block hash expires", async function () {
    const { alice, token, curve, cards, pack } = await deployFixture();
    await buyTokens(curve, alice, 1_000);
    await token.connect(alice).approve(pack, ethers.parseEther("1000"));
    await pack.connect(alice).buyWithToken();

    await ethers.provider.send("hardhat_mine", ["0x102"]);
    await expect(pack.connect(alice).openPack(0)).to.emit(pack, "PackOpened");

    const totalCards =
      (await cards.balanceOf(alice, 0)) +
      (await cards.balanceOf(alice, 1)) +
      (await cards.balanceOf(alice, 2)) +
      (await cards.balanceOf(alice, 3));
    expect(totalCards).to.equal(1);
  });

  it("uses 50/25/20/5 rarity boundaries", async function () {
    const { pack } = await deployFixture();
    expect(await pack.rarityForRoll(0)).to.equal(3);
    expect(await pack.rarityForRoll(499)).to.equal(3);
    expect(await pack.rarityForRoll(500)).to.equal(2);
    expect(await pack.rarityForRoll(2_499)).to.equal(2);
    expect(await pack.rarityForRoll(2_500)).to.equal(1);
    expect(await pack.rarityForRoll(4_999)).to.equal(1);
    expect(await pack.rarityForRoll(5_000)).to.equal(0);
    expect(await pack.rarityForRoll(9_999)).to.equal(0);
    await expect(pack.rarityForRoll(10_000)).to.be.revertedWithCustomError(pack, "InvalidRoll");
  });
});
