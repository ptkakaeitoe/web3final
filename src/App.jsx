import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import Brand from "./components/Brand";
import SiteNav from "./components/SiteNav";
import AppOverlays from "./components/AppOverlays";
import MarketplacePage from "./pages/MarketplacePage";
import StakingPage from "./pages/StakingPage";
import MainExperience from "./pages/MainExperience";
import {
  cardsAbi,
  curveAbi,
  marketplaceAbi,
  packAbi,
  stakingAbi,
  tokenAbi,
} from "./abis";
import { rarities } from "./data/rarities";
import deployment from "../deployments/sepolia.json";
import "./styles.css";

const SEPOLIA_HEX_CHAIN_ID = "0xaa36a7";

function readableError(error) {
  return (
    error?.reason ||
    error?.shortMessage ||
    error?.info?.error?.message ||
    error?.message ||
    "Transaction failed."
  );
}

export default function App() {
  const getPageFromHash = () => {
    const route = window.location.hash.slice(1);
    return [
      "home",
      "shop",
      "my-packs",
      "collection",
      "marketplace",
      "staking",
    ].includes(route)
      ? route
      : "home";
  };
  const [page, setPage] = useState(getPageFromHash);
  const [account, setAccount] = useState("");
  const [connectionMode, setConnectionMode] = useState(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState(2450);
  const [amount, setAmount] = useState("1000");
  const [boxQuantity, setBoxQuantity] = useState(1);
  const [mode, setMode] = useState("buy");
  const [cards, setCards] = useState(["0", "0", "0", "0"]);
  const [ownedPacks, setOwnedPacks] = useState([]);
  const [status, setStatus] = useState("");
  const [celebration, setCelebration] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [liveQuote, setLiveQuote] = useState("");
  const [listings, setListings] = useState([]);
  const [stakedCards, setStakedCards] = useState(["0", "0", "0", "0"]);
  const [pendingRewards, setPendingRewards] = useState(["0", "0", "0", "0"]);
  const [marketTokenId, setMarketTokenId] = useState(0);
  const [listingPrice, setListingPrice] = useState("0.001");
  const [marketFilter, setMarketFilter] = useState("all");
  const [marketSort, setMarketSort] = useState("low");
  const mainPages = ["home", "shop", "my-packs", "collection"];
  const isMainPage = mainPages.includes(page);
  const featuresDeployed = Boolean(
    deployment.marketplace && deployment.staking
  );
  const previewQuote = useMemo(() => {
    const tokenAmount = Number(amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0)
      return "Enter an amount";
    return `${(tokenAmount * 0.000001).toFixed(6)} ETH`;
  }, [amount]);
  const mystBundleEthValue = boxQuantity * 1000 * 0.000001;
  const ethBundleCost = boxQuantity * 0.002;
  const mystDiscount = Math.round(
    (1 - mystBundleEthValue / ethBundleCost) * 100
  );

  function connect() {
    setConnectOpen(true);
  }

  function connectPreview() {
    setConnectionMode("preview");
    setAccount("preview");
    setBalance(2450);
    setOwnedPacks([]);
    setCards(["1", "1", "0", "0"]);
    setStakedCards(["0", "0", "0", "0"]);
    setPendingRewards(["0", "0", "0", "0"]);
    setListings([
      {
        id: 0,
        seller: "0x8b21a37c941F61E043fC5c9e98515F2a0C937A11",
        tokenId: 2n,
        amount: 1n,
        price: parseEther("0.004"),
        active: true,
      },
      {
        id: 1,
        seller: "0x49a71B8D55b4C21c91e83aA28F1c79E688cC0124",
        tokenId: 3n,
        amount: 1n,
        price: parseEther("0.012"),
        active: true,
      },
    ]);
    setConnectOpen(false);
    setStatus(
      "Preview mode enabled. Actions are simulated locally and do not use Sepolia."
    );
  }

  async function getLiveContracts(requestAccounts = false) {
    if (!window.ethereum)
      throw new Error(
        "No EVM wallet detected. Install or enable a wallet extension, or use Preview mode."
      );
    const provider = new BrowserProvider(window.ethereum);
    if (requestAccounts) await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== deployment.chainId) {
      await provider.send("wallet_switchEthereumChain", [
        { chainId: SEPOLIA_HEX_CHAIN_ID },
      ]);
    }
    const signer = await provider.getSigner();
    return {
      provider,
      signer,
      address: await signer.getAddress(),
      token: new Contract(deployment.token, tokenAbi, signer),
      curve: new Contract(deployment.bondingCurve, curveAbi, signer),
      pack: new Contract(deployment.mysteryPack, packAbi, signer),
      cardsContract: new Contract(deployment.cardNFT, cardsAbi, signer),
      marketplace: featuresDeployed
        ? new Contract(deployment.marketplace, marketplaceAbi, signer)
        : null,
      staking: featuresDeployed
        ? new Contract(deployment.staking, stakingAbi, signer)
        : null,
    };
  }

  async function refreshLiveState() {
    const { address, token, pack, cardsContract, marketplace, staking } =
      await getLiveContracts();
    const [tokenBalance, nextPackId, ...cardBalances] = await Promise.all([
      token.balanceOf(address),
      pack.nextPackId(),
      ...rarities.map((_, id) => cardsContract.balanceOf(address, id)),
    ]);
    const packRows = await Promise.all(
      Array.from({ length: Number(nextPackId) }, async (_, id) => {
        const row = await pack.packs(id);
        return row.owner.toLowerCase() === address.toLowerCase()
          ? { id: String(id), opened: row.opened }
          : null;
      })
    );
    setAccount(address);
    setBalance(Number(formatEther(tokenBalance)));
    setCards(cardBalances.map((value) => value.toString()));
    setOwnedPacks(packRows.filter(Boolean).reverse());
    if (marketplace && staking) {
      const listingCount = Number(await marketplace.nextListingId());
      const [listingRows, positions, rewards] = await Promise.all([
        Promise.all(
          Array.from({ length: listingCount }, (_, id) =>
            marketplace.listings(id).then((row) => ({
              id,
              seller: row.seller,
              tokenId: row.tokenId,
              amount: row.amount,
              price: row.price,
              active: row.active,
            }))
          )
        ),
        Promise.all(rarities.map((_, id) => staking.stakes(address, id))),
        Promise.all(
          rarities.map((_, id) => staking.pendingReward(address, id))
        ),
      ]);
      setListings(listingRows.filter((row) => row.active));
      setStakedCards(positions.map((row) => row.amount.toString()));
      setPendingRewards(rewards.map((value) => formatEther(value)));
    }
  }

  async function runFeature(action) {
    if (connectionMode !== "live" || !featuresDeployed) {
      setStatus(
        "Marketplace and staking require the updated contracts to be deployed on Sepolia."
      );
      return;
    }
    setBusy(true);
    try {
      await action(await getLiveContracts());
      await refreshLiveState();
      setStatus("Transaction confirmed on Sepolia.");
    } catch (error) {
      setStatus(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  function listCard() {
    if (connectionMode === "preview") {
      if (!Number.isFinite(Number(listingPrice)) || Number(listingPrice) <= 0)
        return setStatus("Enter a valid ETH price.");
      const id =
        listings.reduce(
          (highest, listing) => Math.max(highest, Number(listing.id)),
          -1
        ) + 1;
      setListings((current) => [
        ...current,
        {
          id,
          seller: account,
          tokenId: BigInt(marketTokenId),
          amount: 1n,
          price: parseEther(listingPrice),
          active: true,
        },
      ]);
      setStatus("Preview listing published locally.");
      return;
    }
    runFeature(async ({ cardsContract, marketplace }) => {
      if (
        !(await cardsContract.isApprovedForAll(account, deployment.marketplace))
      ) {
        setStatus(
          "Approve the marketplace in your wallet, then confirm the listing."
        );
        await (
          await cardsContract.setApprovalForAll(deployment.marketplace, true)
        ).wait();
      }
      await (
        await marketplace.list(marketTokenId, 1, parseEther(listingPrice))
      ).wait();
    });
  }

  function buyListing(listing) {
    if (connectionMode === "preview") {
      const id = Number(listing.tokenId);
      setListings((current) =>
        current.filter((item) => item.id !== listing.id)
      );
      setCards((current) =>
        current.map((count, index) =>
          index === id ? String(Number(count) + 1) : count
        )
      );
      setStatus(`${rarities[id].creature} purchased in Preview mode.`);
      return;
    }
    runFeature(async ({ marketplace }) => {
      await (
        await marketplace.buy(listing.id, { value: listing.price })
      ).wait();
    });
  }

  function cancelListing(listingId) {
    if (connectionMode === "preview") {
      setListings((current) =>
        current.filter((listing) => listing.id !== listingId)
      );
      setStatus("Preview listing cancelled.");
      return;
    }
    runFeature(async ({ marketplace }) => {
      await (await marketplace.cancel(listingId)).wait();
    });
  }

  function stakeCard(tokenId) {
    if (connectionMode === "preview") {
      if (Number(cards[tokenId]) < 1)
        return setStatus("You do not own this Brickling.");
      setCards((current) =>
        current.map((value, id) =>
          id === tokenId ? String(Number(value) - 1) : value
        )
      );
      setStakedCards((current) =>
        current.map((value, id) =>
          id === tokenId ? String(Number(value) + 1) : value
        )
      );
      setStatus("Brickling staked locally. Rewards now accrue every second.");
      return;
    }
    runFeature(async ({ cardsContract, staking }) => {
      if (
        !(await cardsContract.isApprovedForAll(account, deployment.staking))
      ) {
        setStatus("Approve staking in your wallet, then confirm the deposit.");
        await (
          await cardsContract.setApprovalForAll(deployment.staking, true)
        ).wait();
      }
      await (await staking.stake(tokenId, 1)).wait();
    });
  }

  function claimStake(tokenId) {
    if (connectionMode === "preview") {
      const reward = Number(pendingRewards[tokenId]);
      if (reward <= 0) return setStatus("No preview rewards to claim yet.");
      setBalance((current) => current + reward);
      setPendingRewards((current) =>
        current.map((value, id) => (id === tokenId ? "0" : value))
      );
      setStatus(`${reward} MYST claimed in Preview mode.`);
      return;
    }
    runFeature(async ({ staking }) => {
      await (await staking.claim(tokenId)).wait();
    });
  }

  function claimAllStakes() {
    if (connectionMode === "preview") {
      const reward = pendingRewards.reduce(
        (total, value) => total + Number(value),
        0
      );
      if (reward <= 0) return setStatus("No preview rewards to claim yet.");
      setBalance((current) => current + reward);
      setPendingRewards((current) => current.map(() => "0"));
      setStatus(`${reward.toFixed(6)} MYST claimed in Preview mode.`);
      return;
    }
    runFeature(async ({ staking }) => {
      await (await staking.claimAll()).wait();
    });
  }

  function unstakeCard(tokenId) {
    if (connectionMode === "preview") {
      if (Number(stakedCards[tokenId]) < 1) return;
      setStakedCards((current) =>
        current.map((value, id) =>
          id === tokenId ? String(Number(value) - 1) : value
        )
      );
      setCards((current) =>
        current.map((value, id) =>
          id === tokenId ? String(Number(value) + 1) : value
        )
      );
      setStatus("Brickling returned to your preview wallet.");
      return;
    }
    runFeature(async ({ staking }) => {
      await (await staking.unstake(tokenId, 1)).wait();
    });
  }

  async function connectLive() {
    setBusy(true);
    try {
      const { address } = await getLiveContracts(true);
      setConnectionMode("live");
      setAccount(address);
      setConnectOpen(false);
      await refreshLiveState();
      setStatus("Wallet connected to Mystery Club on Sepolia.");
    } catch (error) {
      setStatus(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  async function trade() {
    const tokenAmount = Number(amount);
    if (!Number.isSafeInteger(tokenAmount) || tokenAmount <= 0) {
      setStatus("Enter a whole MYST amount greater than zero.");
      return;
    }
    if (mode === "sell" && tokenAmount > balance) {
      setStatus(
        `You only have ${balance.toLocaleString()} MYST available to sell.`
      );
      return;
    }
    if (connectionMode === "preview") {
      const nextBalance =
        mode === "buy" ? balance + tokenAmount : balance - tokenAmount;
      setBalance(nextBalance);
      setCelebration({
        type: "trade",
        mode,
        amount: tokenAmount,
        eth: previewQuote.replace(" ETH", ""),
        preview: true,
      });
      playSound("success");
      return;
    }
    setBusy(true);
    try {
      const { curve } = await getLiveContracts();
      const value = parseEther(String(tokenAmount));
      const quoted =
        mode === "buy"
          ? await curve.quoteBuy(value)
          : await curve.quoteSell(value);
      const transaction =
        mode === "buy"
          ? await curve.buy(value, quoted, { value: quoted })
          : await curve.sell(value, quoted);
      setStatus("Transaction submitted. Waiting for Sepolia confirmation…");
      await transaction.wait();
      await refreshLiveState();
      setCelebration({
        type: "trade",
        mode,
        amount: tokenAmount,
        eth: formatEther(quoted),
        preview: false,
      });
      playSound("success");
    } catch (error) {
      setStatus(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  const playSound = useCallback(
    (kind = "tap") => {
      if (!soundOn && kind !== "enable") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const notes =
        kind === "success"
          ? [523, 659]
          : kind === "enable"
          ? [440, 660]
          : [360];
      oscillator.type = kind === "tap" ? "square" : "sine";
      oscillator.frequency.setValueAtTime(notes[0], context.currentTime);
      if (notes[1])
        oscillator.frequency.exponentialRampToValueAtTime(
          notes[1],
          context.currentTime + 0.09
        );
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.055,
        context.currentTime + 0.012
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.14
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
      oscillator.onended = () => context.close();
    },
    [soundOn]
  );

  const playRevealSound = useCallback(() => {
    if (!soundOn) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const master = context.createGain();
    master.gain.setValueAtTime(0.7, context.currentTime);
    master.connect(context.destination);

    const build = context.createOscillator();
    const buildGain = context.createGain();
    build.type = "triangle";
    build.frequency.setValueAtTime(95, context.currentTime);
    build.frequency.exponentialRampToValueAtTime(
      280,
      context.currentTime + 0.85
    );
    buildGain.gain.setValueAtTime(0.0001, context.currentTime);
    buildGain.gain.exponentialRampToValueAtTime(
      0.045,
      context.currentTime + 0.12
    );
    buildGain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + 0.9
    );
    build.connect(buildGain);
    buildGain.connect(master);
    build.start();
    build.stop(context.currentTime + 0.92);

    [523, 659, 784, 1046].forEach((frequency, index) => {
      const tone = context.createOscillator();
      const toneGain = context.createGain();
      const start = context.currentTime + 0.78 + index * 0.09;
      tone.type = index === 3 ? "sine" : "triangle";
      tone.frequency.setValueAtTime(frequency, start);
      toneGain.gain.setValueAtTime(0.0001, start);
      toneGain.gain.exponentialRampToValueAtTime(
        index === 3 ? 0.13 : 0.075,
        start + 0.025
      );
      toneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
      tone.connect(toneGain);
      toneGain.connect(master);
      tone.start(start);
      tone.stop(start + 0.5);
    });
    window.setTimeout(() => context.close(), 1600);
  }, [soundOn]);

  useEffect(() => {
    const updatePage = () => {
      const nextPage = getPageFromHash();
      setPage(nextPage);
      window.setTimeout(() => {
        if (
          nextPage === "home" ||
          nextPage === "marketplace" ||
          nextPage === "staking"
        ) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          document
            .getElementById(nextPage)
            ?.scrollIntoView({ behavior: "smooth" });
        }
      }, 20);
    };
    window.addEventListener("hashchange", updatePage);
    updatePage();
    return () => window.removeEventListener("hashchange", updatePage);
  }, []);

  useEffect(() => {
    const items = document.querySelectorAll(".reveal-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleUiClick = (event) => {
      if (event.target.closest("button:not(:disabled), a")) playSound("tap");
    };
    document.addEventListener("click", handleUiClick);
    return () => document.removeEventListener("click", handleUiClick);
  }, [playSound]);

  useEffect(() => {
    if (!status || celebration) return undefined;
    const timeout = window.setTimeout(() => setStatus(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [status, celebration]);

  useEffect(() => {
    if (
      connectionMode !== "live" ||
      !Number.isSafeInteger(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setLiveQuote("");
      return undefined;
    }
    let cancelled = false;
    const updateQuote = async () => {
      try {
        const { curve } = await getLiveContracts();
        const value = parseEther(amount);
        const result =
          mode === "buy"
            ? await curve.quoteBuy(value)
            : await curve.quoteSell(value);
        if (!cancelled) setLiveQuote(`${formatEther(result)} ETH`);
      } catch {
        if (!cancelled) setLiveQuote("Quote unavailable");
      }
    };
    updateQuote();
    return () => {
      cancelled = true;
    };
  }, [amount, mode, connectionMode]);

  useEffect(() => {
    if (connectionMode !== "live" || !window.ethereum?.on) return undefined;
    const resetConnection = () => {
      setAccount("");
      setConnectionMode(null);
      setStatus("Wallet account or network changed. Please reconnect.");
    };
    window.ethereum.on("accountsChanged", resetConnection);
    window.ethereum.on("chainChanged", resetConnection);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", resetConnection);
      window.ethereum.removeListener?.("chainChanged", resetConnection);
    };
  }, [connectionMode]);

  useEffect(() => {
    if (page !== "staking" || !connectionMode) return undefined;
    let cancelled = false;

    if (connectionMode === "preview") {
      const rates = [1, 3, 8, 20];
      const timer = window.setInterval(() => {
        setPendingRewards((current) =>
          current.map((value, id) =>
            String(
              Number(value) + (Number(stakedCards[id]) * rates[id]) / 86400
            )
          )
        );
      }, 1000);
      return () => window.clearInterval(timer);
    }

    if (!featuresDeployed) return undefined;
    const refreshPendingRewards = async () => {
      try {
        const { address, staking } = await getLiveContracts();
        const rewards = await Promise.all(
          rarities.map((_, id) => staking.pendingReward(address, id))
        );
        if (!cancelled)
          setPendingRewards(rewards.map((value) => formatEther(value)));
      } catch {
        // Keep the last successful values during temporary RPC failures.
      }
    };
    refreshPendingRewards();
    const timer = window.setInterval(refreshPendingRewards, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [page, connectionMode, featuresDeployed, stakedCards]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) playSound("enable");
  }

  async function buyBox(currency) {
    if (connectionMode === "live") {
      setBusy(true);
      try {
        const { token, pack } = await getLiveContracts();
        if (currency === "MYST") {
          const packPrice = await pack.TOKEN_PRICE();
          const totalPrice = packPrice * BigInt(boxQuantity);
          const walletBalance = await token.balanceOf(account);
          if (walletBalance < totalPrice) {
            setStatus(
              `You need ${formatEther(totalPrice)} MYST for ${boxQuantity} box${
                boxQuantity > 1 ? "es" : ""
              }, but your wallet has ${Number(
                formatEther(walletBalance)
              ).toLocaleString()} MYST.`
            );
            return;
          }
          const allowance = await token.allowance(
            account,
            deployment.mysteryPack
          );
          if (allowance < totalPrice) {
            setStatus(
              `Approve ${(
                boxQuantity * 1000
              ).toLocaleString()} MYST once, then confirm ${boxQuantity} box purchase${
                boxQuantity > 1 ? "s" : ""
              }.`
            );
            await (
              await token.approve(deployment.mysteryPack, totalPrice)
            ).wait();
          }
        }
        if (currency === "MYST") {
          await (await pack.buyWithTokenBatch(boxQuantity)).wait();
        } else {
          const price = await pack.ETH_PRICE();
          await (
            await pack.buyWithEthBatch(boxQuantity, {
              value: price * BigInt(boxQuantity),
            })
          ).wait();
        }
        await refreshLiveState();
        setCelebration({
          type: "box",
          quantity: boxQuantity,
          currency,
          live: true,
        });
        playSound("success");
      } catch (error) {
        setStatus(readableError(error));
      } finally {
        setBusy(false);
      }
      return;
    }
    const mystCost = boxQuantity * 1000;
    if (currency === "MYST" && balance < mystCost) {
      setStatus(
        `You need ${mystCost.toLocaleString()} MYST to buy ${boxQuantity} box${
          boxQuantity > 1 ? "es" : ""
        }. Buy more MYST first.`
      );
      return;
    }
    if (currency === "MYST") setBalance((current) => current - mystCost);
    const firstId =
      ownedPacks.reduce(
        (highest, pack) => Math.max(highest, Number(pack.id)),
        0
      ) + 1;
    const newBoxes = Array.from({ length: boxQuantity }, (_, offset) => ({
      id: String(firstId + offset),
      opened: false,
      paidWith: currency,
    }));
    setOwnedPacks((current) => [...newBoxes.reverse(), ...current]);
    setStatus(
      `${boxQuantity} Mystery Box${
        boxQuantity > 1 ? "es" : ""
      } purchased with ${currency}. Your stack is ready on the build bench.`
    );
    setCelebration({
      type: "box",
      id: firstId,
      quantity: boxQuantity,
      currency,
    });
    playSound("success");
  }

  async function revealBox(packId) {
    if (connectionMode === "live") {
      setBusy(true);
      try {
        const { pack } = await getLiveContracts();
        const transaction = await pack.openPack(packId);
        setStatus("Reveal submitted. Waiting for Sepolia confirmation…");
        const receipt = await transaction.wait();
        const openedLog = receipt.logs
          .map((log) => {
            try {
              return pack.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((log) => log?.name === "PackOpened");
        const rarityId = Number(openedLog?.args.rarity ?? 0);
        const rarity = rarities[rarityId];
        await refreshLiveState();
        setCelebration({
          type: "reveal",
          packId,
          rarityId,
          rarity,
          preview: false,
        });
        playRevealSound();
      } catch (error) {
        setStatus(readableError(error));
      } finally {
        setBusy(false);
      }
      return;
    }
    const roll = Math.random() * 100;
    let cumulativeChance = 0;
    const rarityId = rarities.findIndex((rarity) => {
      cumulativeChance += rarity.chance;
      return roll < cumulativeChance;
    });
    const rarity = rarities[rarityId];
    setOwnedPacks((current) =>
      current.map((pack) =>
        pack.id === packId ? { ...pack, opened: true, rarityId } : pack
      )
    );
    setCards((current) =>
      current.map((count, id) =>
        id === rarityId ? String(Number(count) + 1) : count
      )
    );
    setBalance((current) => current + rarity.reward);
    setStatus(
      `Box #${packId} revealed ${rarity.creature} — ${rarity.name}! You received ${rarity.reward} MYST.`
    );
    setCelebration({ type: "reveal", packId, rarityId, rarity, preview: true });
    playRevealSound();
  }

  function closeCelebration(targetSection) {
    setCelebration(null);
    setStatus("");
    if (targetSection) window.location.hash = targetSection;
  }

  const collectionEntries = rarities.map((rarity, id) => ({
    rarity,
    id,
    owned: Number(cards[id]) > 0,
  }));
  const sealedPacks = ownedPacks.filter((pack) => !pack.opened);

  function renderCreatureCard({ rarity, id, owned }) {
    return (
      <div
        className={`nft-card ${rarity.className} ${
          owned ? "is-owned" : "not-owned"
        }`}
        key={rarity.name}
      >
        <div className="card-meta">
          <span>MC—0{id + 1}</span>
          <span>{owned ? "COLLECTED" : "UNDISCOVERED"}</span>
        </div>
        <div className="card-art">
          <img src={rarity.image} alt={owned ? rarity.creature : ""} />
          {owned && (
            <div className="owned-count-badge">
              <strong>×{cards[id]}</strong>
              <small>OWNED</small>
            </div>
          )}
          {!owned && (
            <div className="locked-art">
              <span>?</span>
              <small>OPEN A BOX TO MEET</small>
            </div>
          )}
          <span className="rarity-chip">{rarity.name}</span>
        </div>
        <div className="card-copy">
          <div>
            <small>CREATURE</small>
            <h3>{owned ? rarity.creature : "Unknown creature"}</h3>
          </div>
          <strong>
            +{rarity.reward}
            <small>MYST REWARD</small>
          </strong>
        </div>
      </div>
    );
  }

  return (
    <main>
      <SiteNav
        page={page}
        account={account}
        connectionMode={connectionMode}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onConnect={connect}
      />

      <MainExperience
        visible={isMainPage}
        account={account}
        busy={busy}
        balance={balance}
        amount={amount}
        setAmount={setAmount}
        mode={mode}
        setMode={setMode}
        connectionMode={connectionMode}
        liveQuote={liveQuote}
        previewQuote={previewQuote}
        trade={trade}
        boxQuantity={boxQuantity}
        setBoxQuantity={setBoxQuantity}
        mystBundleEthValue={mystBundleEthValue}
        ethBundleCost={ethBundleCost}
        mystDiscount={mystDiscount}
        buyBox={buyBox}
        connect={connect}
        ownedPacks={ownedPacks}
        sealedPacks={sealedPacks}
        revealBox={revealBox}
        collectionEntries={collectionEntries}
        renderCreatureCard={renderCreatureCard}
        cards={cards}
        rarities={rarities}
      />
      <MarketplacePage
        visible={page === "marketplace"}
        deployed={featuresDeployed || connectionMode === "preview"}
        listings={listings}
        account={account}
        cards={cards}
        busy={busy}
        tokenId={marketTokenId}
        setTokenId={setMarketTokenId}
        price={listingPrice}
        setPrice={setListingPrice}
        filter={marketFilter}
        setFilter={setMarketFilter}
        sort={marketSort}
        setSort={setMarketSort}
        onList={listCard}
        onBuy={buyListing}
        onCancel={cancelListing}
      />
      <StakingPage
        visible={page === "staking"}
        deployed={featuresDeployed || connectionMode === "preview"}
        cards={cards}
        stakedCards={stakedCards}
        pendingRewards={pendingRewards}
        busy={busy}
        onStake={stakeCard}
        onClaim={claimStake}
        onClaimAll={claimAllStakes}
        onUnstake={unstakeCard}
      />
      <AppOverlays
        celebration={celebration}
        closeCelebration={closeCelebration}
        hasSealedPacks={sealedPacks.length > 0}
        connectOpen={connectOpen}
        setConnectOpen={setConnectOpen}
        busy={busy}
        connectLive={connectLive}
        connectPreview={connectPreview}
        status={status}
        setStatus={setStatus}
      />
      <footer>
        <Brand />
        <p>
          Built one colorful brick at a time ·{" "}
          {connectionMode === "preview" ? "Preview mode" : "Live on Sepolia"}
        </p>
      </footer>
    </main>
  );
}
