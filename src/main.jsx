import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const rarities = [
  { name: "Common", creature: "Mosskin", reward: 25, className: "common", image: "/assets/card-common.jpg" },
  { name: "Rare", creature: "Ripplefin", reward: 75, className: "rare", image: "/assets/card-rare.jpg" },
  { name: "Epic", creature: "Cloudling", reward: 200, className: "epic", image: "/assets/card-epic.jpg" },
  { name: "Legendary", creature: "Solmane", reward: 500, className: "legendary", image: "/assets/card-legendary.jpg" },
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
        <a className="brand" href="#"><span>M</span><strong>Mystery Club</strong></a>
        <div className="nav-menu">
          <a href="#shop">Pack shop</a>
          <a href="#my-packs">My packs</a>
          <a href="#collection">Collection</a>
        </div>
        <div className="nav-actions">
          <button className={`wallet ${account ? "connected" : ""}`} onClick={connect}>
            {account ? "Preview connected" : "Connect wallet"}
          </button>
        </div>
      </nav>

      <header className="hero">
        <img src="/assets/mystery-creatures-hero.png" alt="" />
        <div className="hero-copy">
          <span className="kicker">A tiny world of on-chain creatures</span>
          <h1>Collect something<br />wonderfully <em>weird.</em></h1>
          <p>Pick up a mystery pack, reveal a creature card, and keep every collectible in your wallet.</p>
          <a className="hero-button" href="#shop">Explore the pack shop <span>↓</span></a>
        </div>
      </header>

      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div><span>PACK SHOP</span><h2>Ready for a surprise?</h2></div>
          <p>Get MYST, then choose how you want to open a pack.</p>
        </div>

        <div className="shop-grid">
          <article className="trade-card">
            <div className="card-heading">
              <div><span className="step">1</span><div><small>FIRST, GET SOME TOKENS</small><h3>Trade MYST</h3></div></div>
              <span className="curve-label">Bonding curve</span>
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
                <div><strong>Wonder Pack</strong><small>ONE CREATURE CARD</small></div>
              </div>
            </div>
            <div className="shop-pack-info">
              <div className="product-step"><span className="step">2</span><small>THEN, CHOOSE YOUR PACK</small></div>
              <h3>A new creature is waiting.</h3>
              <p>Each sealed pack reveals one collectible card and a MYST reward. Rarity is decided on Sepolia after purchase.</p>
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
          <div><span>MY PACKS</span><h2>Your sealed packs</h2></div>
          <p>Purchased packs live here until you reveal them.</p>
        </div>
        {!account ? (
          <div className="inventory-empty"><div className="mini-pack">?</div><div><h3>Connect to see your packs</h3><p>Your unopened and revealed packs will appear here.</p></div><button onClick={connect}>Connect wallet</button></div>
        ) : ownedPacks.length === 0 ? (
          <div className="inventory-empty"><div className="mini-pack">?</div><div><h3>No packs yet</h3><p>Buy your first Wonder Pack from the shop above.</p></div><a href="#shop">Go to pack shop</a></div>
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
          <div><span>MY COLLECTION</span><h2>Creatures you’ve met</h2></div>
          <p>Four rarities, each with its own MYST reward.</p>
        </div>
        <div className="card-row">
          {rarities.map((rarity, id) => {
            const owned = Number(cards[id]) > 0;
            return (
              <div className={`nft-card ${rarity.className} ${owned ? "is-owned" : "not-owned"}`} key={rarity.name}>
                <div className="card-meta"><span>MC—0{id + 1}</span><span>{owned ? `${cards[id]} IN WALLET` : "UNDISCOVERED"}</span></div>
                <div className="card-art">
                  <img src={rarity.image} alt={owned ? rarity.creature : ""} />
                  {!owned && <div className="locked-art"><span>?</span><small>OPEN A PACK TO MEET</small></div>}
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
      <footer><div className="brand"><span>M</span><strong>Mystery Club</strong></div><p>A class project on Ethereum Sepolia · Test assets have no monetary value</p></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
