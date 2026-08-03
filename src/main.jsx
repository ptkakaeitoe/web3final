import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const rarities = [
  { name: "Common", creature: "Mosskin", reward: 25, className: "common", image: "/assets/brick-creatures-sheet.png" },
  { name: "Rare", creature: "Ripplefin", reward: 75, className: "rare", image: "/assets/brick-creatures-sheet.png" },
  { name: "Epic", creature: "Cloudling", reward: 200, className: "epic", image: "/assets/brick-creatures-sheet.png" },
  { name: "Legendary", creature: "Solmane", reward: 500, className: "legendary", image: "/assets/brick-creatures-sheet.png" },
];

function App() {
  const [account, setAccount] = useState(false);
  const [balance, setBalance] = useState(2450);
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState("buy");
  const [cards, setCards] = useState(["0", "0", "0", "0"]);
  const [ownedPacks, setOwnedPacks] = useState([]);
  const [status, setStatus] = useState("");
  const [celebration, setCelebration] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const quote = useMemo(() => {
    const tokenAmount = Number(amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return "Enter an amount";
    return `${(tokenAmount * 0.000001).toFixed(6)} ETH`;
  }, [amount]);

  function connect() {
    setAccount(true);
    setStatus("Preview wallet connected. On-chain actions are paused during the UI redesign.");
  }

  function previewTrade() {
    const tokenAmount = Number(amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
      setStatus("Enter a valid MYST amount greater than zero.");
      return;
    }
    if (mode === "sell" && tokenAmount > balance) {
      setStatus(`You only have ${balance.toLocaleString()} MYST available to sell.`);
      return;
    }
    const nextBalance = mode === "buy" ? balance + tokenAmount : balance - tokenAmount;
    setBalance(nextBalance);
    setStatus(`${mode === "buy" ? "Bought" : "Sold"} ${tokenAmount.toLocaleString()} MYST for ${(tokenAmount * 0.000001).toFixed(6)} ETH. Preview balance updated.`);
    setCelebration({ type: "trade", mode, amount: tokenAmount, eth: (tokenAmount * 0.000001).toFixed(6) });
    playSound("success");
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

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) playSound("enable");
  }

  function buyPreviewBox(currency) {
    if (currency === "MYST" && balance < 1000) {
      setStatus("You need 1,000 MYST to buy this box. Buy more MYST first.");
      return;
    }
    if (currency === "MYST") setBalance((current) => current - 1000);
    const nextId = ownedPacks.reduce((highest, pack) => Math.max(highest, Number(pack.id)), 0) + 1;
    setOwnedPacks((current) => [{ id: String(nextId), opened: false, paidWith: currency }, ...current]);
    setStatus(`Mystery Box #${nextId} purchased with ${currency}. It is ready on your build bench.`);
    setCelebration({ type: "box", id: nextId, currency });
    playSound("success");
  }

  function revealPreviewBox(packId) {
    const roll = Math.random() * 100;
    const rarityId = roll < 70 ? 0 : roll < 90 ? 1 : roll < 99 ? 2 : 3;
    const rarity = rarities[rarityId];
    setOwnedPacks((current) => current.map((pack) => pack.id === packId ? { ...pack, opened: true, rarityId } : pack));
    setCards((current) => current.map((count, id) => id === rarityId ? String(Number(count) + 1) : count));
    setBalance((current) => current + rarity.reward);
    setStatus(`Box #${packId} revealed ${rarity.creature} — ${rarity.name}! You received ${rarity.reward} MYST.`);
    setCelebration({ type: "reveal", packId, rarityId, rarity });
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
          <a className="brand" href="#"><img className="brand-logo" src="/assets/mystery-club-logo.svg" alt="" /><strong>Mystery Club</strong></a>
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
              {account ? "Preview connected" : "Connect wallet"}
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
            <div className="quote"><span>You {mode === "buy" ? "pay" : "receive"}</span><strong>{quote || "—"}</strong></div>
            <button className="primary" disabled={!account} onClick={previewTrade}>
              {account ? `${mode === "buy" ? "Buy" : "Sell"} MYST` : "Connect wallet first"} <span>→</span>
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
              <div className="pay-options">
                <button disabled={!account} onClick={() => buyPreviewBox("MYST")}>
                  <span><small>PAY WITH MYST</small><strong>1,000 MYST</strong></span><b>BEST VALUE</b>
                </button>
                <button disabled={!account} onClick={() => buyPreviewBox("ETH")}>
                  <span><small>PAY WITH ETH</small><strong>0.002 ETH</strong></span><i>→</i>
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
              <button onClick={() => revealPreviewBox(sealedPacks[0].id)}>Reveal next box <span>→</span></button>
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
              <small>PREVIEW TRADE COMPLETE</small>
              <h2 id="celebration-title">MYST {celebration.mode === "buy" ? "added" : "sold"}!</h2>
              <p><strong>{celebration.amount.toLocaleString()} MYST</strong><span>{celebration.mode === "buy" ? "Cost" : "Received"} {celebration.eth} ETH</span></p>
              <button className="celebration-primary" onClick={() => closeCelebration()}>Back to the shop</button>
            </>}
            {celebration.type === "box" && <>
              <div className="celebration-box"><span>?</span></div>
              <small>MYSTERY BOX #{celebration.id}</small>
              <h2 id="celebration-title">Box secured!</h2>
              <p>Purchased with {celebration.currency}. Your surprise Brickling is waiting on the build bench.</p>
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
              <p><strong>+{celebration.rarity.reward} MYST</strong><span>Reward added to your preview balance</span></p>
              <button className="celebration-primary" onClick={() => closeCelebration("#collection")}>View collection <span>→</span></button>
            </>}
          </div>
        </div>
      )}
      {status && !celebration && <div className="toast"><span>{status}</span><button onClick={() => setStatus("")} aria-label="Dismiss">×</button></div>}
      <footer><div className="brand"><img className="brand-logo" src="/assets/mystery-club-logo.svg" alt="" /><strong>Mystery Club</strong></div><p>Built one colorful brick at a time · Preview mode</p></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
