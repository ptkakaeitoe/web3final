const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT marketplace and staking", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("ProjectToken")).deploy();
    const curve = await (await ethers.getContractFactory("BondingCurve")).deploy(token);
    await token.setMinter(curve);
    const cards = await (await ethers.getContractFactory("CardNFT")).deploy("ipfs://example/{id}.json");
    await cards.setPackContract(owner);
    const market = await (await ethers.getContractFactory("NFTMarketplace")).deploy(cards);
    const staking = await (await ethers.getContractFactory("NFTStaking")).deploy(token, cards);
    await cards.mint(alice, 0);
    await cards.mint(alice, 1);
    return { owner, alice, bob, token, curve, cards, market, staking };
  }

  it("lists, purchases, and pays for an ERC-1155 card", async function () {
    const { alice, bob, cards, market } = await deployFixture();
    const price = ethers.parseEther("0.01");
    await cards.connect(alice).setApprovalForAll(market, true);
    await expect(market.connect(alice).list(0, 1, price)).to.emit(market, "Listed");
    await expect(market.connect(bob).buy(0, { value: price }))
      .to.emit(market, "Purchased").withArgs(0, bob.address);
    expect(await cards.balanceOf(bob, 0)).to.equal(1);
  });

  it("lets sellers cancel active listings", async function () {
    const { alice, cards, market } = await deployFixture();
    await cards.connect(alice).setApprovalForAll(market, true);
    await market.connect(alice).list(0, 1, ethers.parseEther("0.01"));
    await expect(market.connect(alice).cancel(0)).to.emit(market, "Cancelled").withArgs(0);
    expect((await market.listings(0)).active).to.equal(false);
  });

  it("accrues funded MYST rewards and returns staked cards", async function () {
    const { owner, alice, token, curve, cards, staking } = await deployFixture();
    const amount = ethers.parseEther("100");
    const cost = await curve.quoteBuy(amount);
    await curve.buy(amount, cost, { value: cost });
    await token.approve(staking, amount);
    await staking.fundRewards(amount);

    await cards.connect(alice).setApprovalForAll(staking, true);
    await staking.connect(alice).stake(1, 1);
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine");
    expect(await staking.pendingReward(alice, 1)).to.be.closeTo(ethers.parseEther("3"), ethers.parseEther("0.001"));
    await expect(staking.connect(alice).unstake(1, 1)).to.emit(staking, "Unstaked");
    expect(await cards.balanceOf(alice, 1)).to.equal(1);
    expect(await token.balanceOf(alice)).to.be.closeTo(ethers.parseEther("3"), ethers.parseEther("0.001"));
  });

  it("claims rewards from all active staking positions at once", async function () {
    const { alice, token, curve, cards, staking } = await deployFixture();
    const funding = ethers.parseEther("100");
    const cost = await curve.quoteBuy(funding);
    await curve.buy(funding, cost, { value: cost });
    await token.approve(staking, funding);
    await staking.fundRewards(funding);

    await cards.connect(alice).setApprovalForAll(staking, true);
    await staking.connect(alice).stake(0, 1);
    await staking.connect(alice).stake(1, 1);
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await staking.connect(alice).claimAll();
    expect(await token.balanceOf(alice)).to.be.closeTo(
      ethers.parseEther("4"),
      ethers.parseEther("0.001")
    );
    expect(await staking.pendingReward(alice, 0)).to.be.closeTo(0, ethers.parseEther("0.001"));
    expect(await staking.pendingReward(alice, 1)).to.be.closeTo(0, ethers.parseEther("0.001"));
  });
});
