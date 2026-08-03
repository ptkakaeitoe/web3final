import React, { useMemo, useState } from "react";
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
  const [amount, setAmount] = useState("1000");
  const [mode, setMode] = useState("buy");
  const [cards] = useState(["0", "0", "0", "0"]);
  const [ownedPacks] = useState([]);
  const [status, setStatus] = useState("");
  const quote = useMemo(() => {
    const tokenAmount = Number(amount);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return "Enter an amount";
    return `${(tokenAmount * 0.000001).toFixed(6)} ETH`;
  }, [amount]);

  function connect() {
    setAccount(true);
    setStatus("Preview wallet connected. On-chain actions are paused during the UI redesign.");
  }

  function previewAction(label) {
    setStatus(`${label} is ready for UI review. Contract integration will be added later.`);
  }

  return (
    <main>
      <nav className="site-nav">
        <div className="nav-inner">
          <a className="brand" href="#"><span><i /><i /><i /><i /></span><strong>Mystery Club</strong></a>
          <div className="nav-menu">
            <a href="#shop">Build shop</a>
            <a href="#my-packs">My boxes</a>
            <a href="#collection">Bricklings</a>
          </div>
          <div className="nav-actions">
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

      <section className="shop-section" id="shop">
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
              <strong>{account ? "2,450 MYST" : "Not connected"}</strong>
            </div>
            <div className="toggle">
              <button className={mode === "buy" ? "active" : ""} onClick={() => setMode("buy")}>Buy</button>
              <button className={mode === "sell" ? "active" : ""} onClick={() => setMode("sell")}>Sell</button>
            </div>
            <label>How many tokens?</label>
            <div className="input"><input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} /><span>MYST</span></div>
            <div className="quote"><span>You {mode === "buy" ? "pay" : "receive"}</span><strong>{quote || "—"}</strong></div>
            <button className="primary" disabled={!account} onClick={() => previewAction(`${mode === "buy" ? "Buy" : "Sell"} MYST`)}>
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
                <button disabled={!account} onClick={() => previewAction("Buy with MYST")}>
                  <span><small>PAY WITH MYST</small><strong>1,000 MYST</strong></span><b>BEST VALUE</b>
                </button>
                <button disabled={!account} onClick={() => previewAction("Buy with ETH")}>
                  <span><small>PAY WITH ETH</small><strong>0.002 ETH</strong></span><i>→</i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="inventory-section" id="my-packs">
        <div className="section-heading">
          <div><span>BUILD BENCH / 02</span><h2>Your mystery boxes</h2></div>
          <p>Everything waiting to be opened lives on your workbench.</p>
        </div>
        {!account ? (
          <div className="inventory-empty"><div className="mini-pack">?</div><div><h3>Connect to see your boxes</h3><p>Your sealed and revealed mystery boxes will appear here.</p></div><button onClick={connect}>Connect wallet</button></div>
        ) : ownedPacks.length === 0 ? (
          <div className="inventory-empty"><div className="mini-pack">?</div><div><h3>No boxes yet</h3><p>Pick up your first Mystery Box from the shop above.</p></div><a href="#shop">Go to build shop</a></div>
        ) : (
          <div className="inventory-grid">
            {ownedPacks.map((pack) => {
              const remaining = 0;
              return (
                <article className={`owned-pack ${pack.opened ? "opened" : ""}`} key={pack.id}>
                  <div className="owned-pack-art"><span>{pack.opened ? "✓" : "?"}</span></div>
                  <div className="owned-pack-copy">
                    <small>WONDER PACK #{pack.id}</small>
                    <h3>{pack.opened ? "Pack revealed" : remaining ? "Getting ready…" : "Ready to reveal"}</h3>
                    <p>{pack.opened ? "This pack has already joined your collection." : remaining ? `${remaining} Sepolia block${remaining > 1 ? "s" : ""} remaining.` : "Your creature card is ready inside."}</p>
                  </div>
                  {!pack.opened && (
                    <button disabled={remaining > 0} onClick={() => previewAction("Reveal pack")}>{remaining ? "Waiting" : "Reveal pack"} <span>→</span></button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="collection" id="collection">
        <div className="section-heading">
          <div><span>BRICKLING CREW / 03</span><h2>Meet the whole crew</h2></div>
          <p>Four colorful builds. Can you discover every one?</p>
        </div>
        <div className="card-row">
          {rarities.map((rarity, id) => {
            const owned = Number(cards[id]) > 0;
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
          })}
        </div>
      </section>

      {status && <div className="toast"><span>{status}</span><button onClick={() => setStatus("")} aria-label="Dismiss">×</button></div>}
      <footer><div className="brand"><span><i /><i /><i /><i /></span><strong>Mystery Club</strong></div><p>Built one colorful brick at a time · Preview mode</p></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
