import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import Brand from "./components/Brand";
import { cardsAbi, curveAbi, packAbi, tokenAbi } from "./abis";
import { rarities } from "./data/rarities";
import deployment from "../deployments/sepolia.json";
import "./styles.css";

const SEPOLIA_HEX_CHAIN_ID = "0xaa36a7";

function readableError(error) {
  return error?.reason || error?.shortMessage || error?.info?.error?.message || error?.message || "Transaction failed.";
}

export default function App() {
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
  const previewQuote = useMemo(() => {
    const tokenAmount = Number(amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return "Enter an amount";
    return `${(tokenAmount * 0.000001).toFixed(6)} ETH`;
  }, [amount]);
  const mystBundleEthValue = boxQuantity * 1000 * 0.000001;
  const ethBundleCost = boxQuantity * 0.002;
  const mystDiscount = Math.round((1 - mystBundleEthValue / ethBundleCost) * 100);

  function connect() {
    setConnectOpen(true);
  }

  function connectPreview() {
    setConnectionMode("preview");
    setAccount("preview");
    setBalance(2450);
    setOwnedPacks([]);
    setCards(["0", "0", "0", "0"]);
    setConnectOpen(false);
    setStatus("Preview mode enabled. Actions are simulated locally and do not use Sepolia.");
  }

  async function getLiveContracts(requestAccounts = false) {
    if (!window.ethereum) throw new Error("No EVM wallet detected. Install or enable a wallet extension, or use Preview mode.");
    const provider = new BrowserProvider(window.ethereum);
    if (requestAccounts) await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== deployment.chainId) {
      await provider.send("wallet_switchEthereumChain", [{ chainId: SEPOLIA_HEX_CHAIN_ID }]);
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
    };
  }

  async function refreshLiveState() {
    const { address, token, pack, cardsContract } = await getLiveContracts();
    const [tokenBalance, nextPackId, ...cardBalances] = await Promise.all([
      token.balanceOf(address),
      pack.nextPackId(),
      ...rarities.map((_, id) => cardsContract.balanceOf(address, id)),
    ]);
    const packRows = await Promise.all(Array.from({ length: Number(nextPackId) }, async (_, id) => {
      const row = await pack.packs(id);
      return row.owner.toLowerCase() === address.toLowerCase() ? { id: String(id), opened: row.opened } : null;
    }));
    setAccount(address);
    setBalance(Number(formatEther(tokenBalance)));
    setCards(cardBalances.map((value) => value.toString()));
    setOwnedPacks(packRows.filter(Boolean).reverse());
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
      setStatus(`You only have ${balance.toLocaleString()} MYST available to sell.`);
      return;
    }
    if (connectionMode === "preview") {
      const nextBalance = mode === "buy" ? balance + tokenAmount : balance - tokenAmount;
      setBalance(nextBalance);
      setCelebration({ type: "trade", mode, amount: tokenAmount, eth: previewQuote.replace(" ETH", ""), preview: true });
      playSound("success");
      return;
    }
    setBusy(true);
    try {
      const { curve } = await getLiveContracts();
      const value = parseEther(String(tokenAmount));
      const quoted = mode === "buy" ? await curve.quoteBuy(value) : await curve.quoteSell(value);
      const transaction = mode === "buy"
        ? await curve.buy(value, quoted, { value: quoted })
        : await curve.sell(value, quoted);
      setStatus("Transaction submitted. Waiting for Sepolia confirmation…");
      await transaction.wait();
      await refreshLiveState();
      setCelebration({ type: "trade", mode, amount: tokenAmount, eth: formatEther(quoted), preview: false });
      playSound("success");
    } catch (error) {
      setStatus(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  const playSound = useCallback((kind = "tap") => {
    if (!soundOn && kind !== "enable") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const notes = kind === "success" ? [523, 659] : kind === "enable" ? [440, 660] : [360];
    oscillator.type = kind === "tap" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(notes[0], context.currentTime);
    if (notes[1]) oscillator.frequency.exponentialRampToValueAtTime(notes[1], context.currentTime + 0.09);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.15);
    oscillator.onended = () => context.close();
  }, [soundOn]);

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
    build.frequency.exponentialRampToValueAtTime(280, context.currentTime + 0.85);
    buildGain.gain.setValueAtTime(0.0001, context.currentTime);
    buildGain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.12);
    buildGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.9);
    build.connect(buildGain); buildGain.connect(master);
    build.start(); build.stop(context.currentTime + 0.92);

    [523, 659, 784, 1046].forEach((frequency, index) => {
      const tone = context.createOscillator();
      const toneGain = context.createGain();
      const start = context.currentTime + 0.78 + index * 0.09;
      tone.type = index === 3 ? "sine" : "triangle";
      tone.frequency.setValueAtTime(frequency, start);
      toneGain.gain.setValueAtTime(0.0001, start);
      toneGain.gain.exponentialRampToValueAtTime(index === 3 ? 0.13 : 0.075, start + 0.025);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
      tone.connect(toneGain); toneGain.connect(master);
      tone.start(start); tone.stop(start + 0.5);
    });
    window.setTimeout(() => context.close(), 1600);
  }, [soundOn]);

  useEffect(() => {
    const items = document.querySelectorAll(".reveal-on-scroll");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
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
    if (connectionMode !== "live" || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0) {
      setLiveQuote("");
      return undefined;
    }
    let cancelled = false;
    const updateQuote = async () => {
      try {
        const { curve } = await getLiveContracts();
        const value = parseEther(amount);
        const result = mode === "buy" ? await curve.quoteBuy(value) : await curve.quoteSell(value);
        if (!cancelled) setLiveQuote(`${formatEther(result)} ETH`);
      } catch {
        if (!cancelled) setLiveQuote("Quote unavailable");
      }
    };
    updateQuote();
    return () => { cancelled = true; };
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
        for (let index = 0; index < boxQuantity; index += 1) {
          if (currency === "MYST") {
            const price = await pack.TOKEN_PRICE();
            const allowance = await token.allowance(account, deployment.mysteryPack);
            if (allowance < price) {
              setStatus("Approve MYST spending in your wallet, then confirm the box purchase.");
              await (await token.approve(deployment.mysteryPack, price)).wait();
            }
            await (await pack.buyWithToken()).wait();
          } else {
            const price = await pack.ETH_PRICE();
            await (await pack.buyWithEth({ value: price })).wait();
          }
        }
        await refreshLiveState();
        setCelebration({ type: "box", quantity: boxQuantity, currency, live: true });
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
      setStatus(`You need ${mystCost.toLocaleString()} MYST to buy ${boxQuantity} box${boxQuantity > 1 ? "es" : ""}. Buy more MYST first.`);
      return;
    }
    if (currency === "MYST") setBalance((current) => current - mystCost);
    const firstId = ownedPacks.reduce((highest, pack) => Math.max(highest, Number(pack.id)), 0) + 1;
    const newBoxes = Array.from({ length: boxQuantity }, (_, offset) => ({ id: String(firstId + offset), opened: false, paidWith: currency }));
    setOwnedPacks((current) => [...newBoxes.reverse(), ...current]);
    setStatus(`${boxQuantity} Mystery Box${boxQuantity > 1 ? "es" : ""} purchased with ${currency}. Your stack is ready on the build bench.`);
    setCelebration({ type: "box", id: firstId, quantity: boxQuantity, currency });
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
        const openedLog = receipt.logs.map((log) => {
          try { return pack.interface.parseLog(log); } catch { return null; }
        }).find((log) => log?.name === "PackOpened");
        const rarityId = Number(openedLog?.args.rarity ?? 0);
        const rarity = rarities[rarityId];
        await refreshLiveState();
        setCelebration({ type: "reveal", packId, rarityId, rarity, preview: false });
        playRevealSound();
      } catch (error) {
        setStatus(readableError(error));
      } finally {
        setBusy(false);
      }
      return;
    }
    const roll = Math.random() * 100;
    const rarityId = roll < 70 ? 0 : roll < 90 ? 1 : roll < 99 ? 2 : 3;
    const rarity = rarities[rarityId];
    setOwnedPacks((current) => current.map((pack) => pack.id === packId ? { ...pack, opened: true, rarityId } : pack));
    setCards((current) => current.map((count, id) => id === rarityId ? String(Number(count) + 1) : count));
    setBalance((current) => current + rarity.reward);
    setStatus(`Box #${packId} revealed ${rarity.creature} — ${rarity.name}! You received ${rarity.reward} MYST.`);
    setCelebration({ type: "reveal", packId, rarityId, rarity, preview: true });
    playRevealSound();
  }

  function closeCelebration(targetSection) {
    setCelebration(null);
    setStatus("");
    if (targetSection) window.setTimeout(() => document.querySelector(targetSection)?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const collectionEntries = rarities.map((rarity, id) => ({ rarity, id, owned: Number(cards[id]) > 0 }));
  const sealedPacks = ownedPacks.filter((pack) => !pack.opened);

  function renderCreatureCard({ rarity, id, owned }) {
    return (
      <div className={`nft-card ${rarity.className} ${owned ? "is-owned" : "not-owned"}`} key={rarity.name}>
        <div className="card-meta"><span>MC—0{id + 1}</span><span>{owned ? `${cards[id]} IN WALLET` : "UNDISCOVERED"}</span></div>
        <div className="card-art">
          <img src={rarity.image} alt={owned ? rarity.creature : ""} />
          {!owned && <div className="locked-art"><span>?</span><small>OPEN A BOX TO MEET</small></div>}
          <span className="rarity-chip">{rarity.name}</span>
        </div>
        <div className="card-copy">
          <div><small>CREATURE</small><h3>{owned ? rarity.creature : "Unknown creature"}</h3></div>
          <strong>+{rarity.reward}<small>MYST REWARD</small></strong>
        </div>
      </div>
    );
  }

  return (
    <main>
      <nav className="site-nav">
        <div className="nav-inner">
          <Brand linked />
          <div className="nav-menu">
            <a href="#shop">Build shop</a>
            <a href="#my-packs">My boxes</a>
            <a href="#collection">Bricklings</a>
          </div>
          <div className="nav-actions">
            <button className={`sound-toggle ${soundOn ? "is-on" : ""}`} onClick={toggleSound} aria-label={`${soundOn ? "Mute" : "Enable"} interface sounds`} aria-pressed={soundOn}>
              <span className="speaker-icon"><i /><i /><i /></span>
            </button>
            <button className={`wallet ${account ? "connected" : ""}`} onClick={connect}>
              {account ? (connectionMode === "preview" ? "Preview mode" : `${account.slice(0, 6)}…${account.slice(-4)}`) : "Connect wallet"}
            </button>
          </div>
        </div>
      </nav>

      <header className="hero">
        <img src="/assets/brick-creatures-hero.png" alt="Four colorful brick-built creatures gathered around a glowing mystery cube" />
        <div className="hero-copy">
          <span className="kicker">BUILD · REVEAL · COLLECT</span>
          <h1>Meet your next<br /><em>Brickling.</em></h1>
          <p>Crack open a mystery box, discover a buildable creature, and grow a colorful collection that is uniquely yours.</p>
          <div className="hero-actions"><a className="hero-button" href="#shop">Open the build shop <span>→</span></a><a className="text-button" href="#collection">Meet the crew ↓</a></div>
        </div>
        <div className="hero-stats"><span><strong>4</strong>CREATURES</span><span><strong>1</strong>MYSTERY BOX</span><span><strong>∞</strong>ADVENTURES</span></div>
      </header>

      <section className="shop-section reveal-on-scroll" id="shop">
          <div className="section-heading">
          <div><span>BUILD SHOP / 01</span><h2>Pick your mystery box</h2></div>
          <p>Grab some MYST bricks, then unlock one surprise creature.</p>
        </div>

        <div className="shop-grid">
          <article className="trade-card">
            <div className="card-heading">
              <div><span className="step">1</span><div><small>FIRST, GET SOME TOKENS</small><h3>Trade MYST</h3></div></div>
              <span className="curve-label">LIVE RATE</span>
            </div>
            <div className="trade-balance">
              <span>Wallet balance</span>
              <strong>{account ? `${balance.toLocaleString()} MYST` : "Not connected"}</strong>
            </div>
            <div className="toggle">
              <button className={mode === "buy" ? "active" : ""} onClick={() => setMode("buy")}>Buy</button>
              <button className={mode === "sell" ? "active" : ""} onClick={() => setMode("sell")}>Sell</button>
            </div>
            <label>How many tokens?</label>
            <div className="input"><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} /><span>MYST</span></div>
            <div className="quote"><span>You {mode === "buy" ? "pay" : "receive"}</span><strong>{connectionMode === "live" ? (liveQuote || "Loading quote…") : previewQuote}</strong></div>
            <button className="primary" disabled={!account || busy} onClick={trade}>
              {busy ? "Waiting for wallet…" : account ? `${mode === "buy" ? "Buy" : "Sell"} MYST` : "Connect wallet first"} <span>→</span>
            </button>
          </article>

          <article className="shop-pack-card">
            <div className="shop-pack-visual">
              <span className="available-pill">AVAILABLE TO BUY</span>
              <div className="foil-pack">
                <div className="foil-top"><span>MC</span><span>01</span></div>
                <div className="foil-creature">?</div>
                <div><strong>Mystery Box</strong><small>ONE BRICKLING INSIDE</small></div>
              </div>
            </div>
            <div className="shop-pack-info">
              <div className="product-step"><span className="step">2</span><small>THEN, CHOOSE YOUR PACK</small></div>
              <h3>What will you build?</h3>
              <p>Every colorful box holds one surprise Brickling and a bonus MYST reward. Some builds are much harder to find.</p>
              <div className="odds">
                <span><i className="common" />70% Common</span><span><i className="rare" />20% Rare</span>
                <span><i className="epic" />9% Epic</span><span><i className="legendary" />1% Legendary</span>
              </div>
              <div className="box-quantity">
                <div><small>HOW MANY BOXES?</small><strong>Choose a bundle</strong></div>
                <div className="quantity-options">{[1, 3, 5].map((quantity) => <button key={quantity} className={boxQuantity === quantity ? "active" : ""} onClick={() => setBoxQuantity(quantity)}>{quantity}<span>{quantity === 1 ? "BOX" : "BOXES"}</span></button>)}</div>
              </div>
              <div className="pay-options">
                <button disabled={!account || busy} onClick={() => buyBox("MYST")}>
                  <span><small>PAY WITH MYST · ≈ {mystBundleEthValue.toFixed(3)} ETH</small><strong>{(boxQuantity * 1000).toLocaleString()} MYST</strong><em>Save {(ethBundleCost - mystBundleEthValue).toFixed(3)} ETH</em></span><b>{mystDiscount}% CHEAPER</b>
                </button>
                <button disabled={!account || busy} onClick={() => buyBox("ETH")}>
                  <span><small>PAY WITH ETH</small><strong>{(boxQuantity * 0.002).toFixed(3)} ETH</strong></span><i>→</i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="inventory-section reveal-on-scroll" id="my-packs">
        <div className="section-heading">
          <div><span>BUILD BENCH / 02</span><h2>Your mystery boxes</h2></div>
          <p>Everything waiting to be opened lives on your workbench.</p>
        </div>
        {!account ? (
          <div className="inventory-empty"><div className="mini-pack">?</div><div><h3>Connect to see your boxes</h3><p>Your sealed and revealed mystery boxes will appear here.</p></div><button onClick={connect}>Connect wallet</button></div>
        ) : ownedPacks.length === 0 ? (
          <div className="inventory-empty"><div className="mini-pack">?</div><div><h3>No boxes yet</h3><p>Pick up your first Mystery Box from the shop above.</p></div><a href="#shop">Go to build shop</a></div>
        ) : sealedPacks.length === 0 ? (
          <div className="inventory-empty"><div className="mini-pack">✓</div><div><h3>Your build bench is clear</h3><p>Every purchased box has been revealed and added to your collection.</p></div><a href="#shop">Buy another box</a></div>
        ) : (
          <div className="inventory-grid">
            <article className="owned-pack box-stack-card">
              <div className="owned-pack-art box-stack-art"><i /><i /><span>?</span><b>×{sealedPacks.length}</b></div>
              <div className="owned-pack-copy">
                <small>SEALED MYSTERY BOXES</small>
                <h3>{sealedPacks.length} box{sealedPacks.length > 1 ? "es" : ""} ready to reveal</h3>
                <p>Open the next box in your stack to discover a Brickling and collect its MYST reward.</p>
              </div>
              <button disabled={busy} onClick={() => revealBox(sealedPacks[0].id)}>{busy ? "Waiting for wallet…" : "Reveal next box"} <span>→</span></button>
            </article>
          </div>
        )}
      </section>

      <section className="collection reveal-on-scroll" id="collection">
        <div className="section-heading">
          <div><span>BRICKLING CREW / 03</span><h2>Meet the whole crew</h2></div>
          <p>Four colorful builds. Can you discover every one?</p>
        </div>
        {collectionEntries.some((entry) => entry.owned) && (
          <div className="collection-group owned-group">
            <div className="collection-group-heading"><div><span>✓</span><strong>Your Bricklings</strong></div><small>{collectionEntries.filter((entry) => entry.owned).length} OF {rarities.length} DISCOVERED</small></div>
            <div className="card-row owned-row">{collectionEntries.filter((entry) => entry.owned).map(renderCreatureCard)}</div>
          </div>
        )}
        <div className="collection-group locked-group">
          <div className="collection-group-heading"><div><span>?</span><strong>Still to discover</strong></div><small>{collectionEntries.filter((entry) => !entry.owned).length} REMAINING</small></div>
          {collectionEntries.some((entry) => !entry.owned) ? (
            <div className="card-row locked-row">{collectionEntries.filter((entry) => !entry.owned).map(renderCreatureCard)}</div>
          ) : <div className="collection-complete">You found every Brickling. Collection complete!</div>}
        </div>
      </section>

      {celebration && (
        <div className="celebration-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCelebration()}>
          <div className={`celebration-modal celebration-type-${celebration.type}`} role="dialog" aria-modal="true" aria-labelledby="celebration-title">
            <div className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, id) => <i key={id} />)}</div>
            <button className="celebration-close" onClick={() => closeCelebration()} aria-label="Close celebration">×</button>
            {celebration.type === "trade" && <>
              <div className="success-build"><span>M</span><i /><i /><i /></div>
              <small>{celebration.preview ? "PREVIEW TRADE COMPLETE" : "SEPOLIA TRADE COMPLETE"}</small>
              <h2 id="celebration-title">MYST {celebration.mode === "buy" ? "added" : "sold"}!</h2>
              <p><strong>{celebration.amount.toLocaleString()} MYST</strong><span>{celebration.mode === "buy" ? "Cost" : "Received"} {celebration.eth} ETH</span></p>
              <button className="celebration-primary" onClick={() => closeCelebration()}>Back to the shop</button>
            </>}
            {celebration.type === "box" && <>
              <div className="celebration-box"><span>?</span>{celebration.quantity > 1 && <b>×{celebration.quantity}</b>}</div>
              <small>{celebration.quantity > 1 ? `${celebration.quantity} BOX BUNDLE` : celebration.live ? "ON-CHAIN MYSTERY BOX" : `MYSTERY BOX #${celebration.id}`}</small>
              <h2 id="celebration-title">{celebration.quantity > 1 ? "Boxes secured!" : "Box secured!"}</h2>
              <p>Purchased {celebration.quantity} box{celebration.quantity > 1 ? "es" : ""} with {celebration.currency}. Your surprise Brickling{celebration.quantity > 1 ? "s are" : " is"} waiting on the build bench.</p>
              <button className="celebration-primary" onClick={() => closeCelebration("#my-packs")}>Go reveal it <span>→</span></button>
            </>}
            {celebration.type === "reveal" && <>
              <div className={`reveal-stage reveal-${celebration.rarity.className}`}>
                <div className="reveal-rays" aria-hidden="true" />
                <div className="reveal-sparks" aria-hidden="true">{Array.from({ length: 10 }, (_, id) => <i key={id} />)}</div>
                <div className={`reveal-card reveal-${celebration.rarity.className}`}>
                  <img src={celebration.rarity.image} alt={celebration.rarity.creature} />
                  <b>{celebration.rarity.name}</b>
                </div>
              </div>
              <small>YOU FOUND A {celebration.rarity.name.toUpperCase()} BRICKLING</small>
              <h2 id="celebration-title">{celebration.rarity.creature}!</h2>
              <p><strong>+{celebration.rarity.reward} MYST</strong><span>Reward added to your {celebration.preview ? "preview balance" : "wallet"}</span></p>
              <button className="celebration-primary" onClick={() => closeCelebration("#collection")}>View collection <span>→</span></button>
            </>}
          </div>
        </div>
      )}
      {connectOpen && (
        <div className="connect-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConnectOpen(false)}>
          <div className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-title">
            <button className="connect-close" onClick={() => setConnectOpen(false)} aria-label="Close">×</button>
            <span className="connect-kicker">CHOOSE HOW TO PLAY</span>
            <h2 id="connect-title">Connect to Mystery Club</h2>
            <p>Use the deployed Sepolia contracts, or explore safely with simulated balances.</p>
            <button className="connect-choice live-choice" disabled={busy} onClick={connectLive}>
              <span><strong>Connect wallet</strong><small>Live · Sepolia testnet</small></span><b>→</b>
            </button>
            <button className="connect-choice preview-choice" disabled={busy} onClick={connectPreview}>
              <span><strong>Try preview mode</strong><small>Local simulation · no transactions</small></span><b>◇</b>
            </button>
          </div>
        </div>
      )}
      {status && !celebration && <div className="toast"><span>{status}</span><button onClick={() => setStatus("")} aria-label="Dismiss">×</button></div>}
      <footer><Brand /><p>Built one colorful brick at a time · {connectionMode === "preview" ? "Preview mode" : "Live on Sepolia"}</p></footer>
    </main>
  );
}
