import React from "react";

export default function MainExperience({
  visible,
  account,
  busy,
  balance,
  amount,
  setAmount,
  mode,
  setMode,
  connectionMode,
  liveQuote,
  previewQuote,
  trade,
  boxQuantity,
  setBoxQuantity,
  mystBundleEthValue,
  ethBundleCost,
  mystDiscount,
  buyBox,
  connect,
  ownedPacks,
  sealedPacks,
  revealBox,
  collectionEntries,
  renderCreatureCard,
  cards,
  rarities,
}) {
  const isMainPage = visible;
  return (
    <>
      <header className={`hero app-page ${isMainPage ? "page-active" : ""}`}>
        <img
          src="/assets/brick-creatures-hero.png"
          alt="Four colorful brick-built creatures gathered around a glowing mystery cube"
        />
        <div className="hero-copy">
          <span className="kicker">BUILD · REVEAL · COLLECT</span>
          <h1>
            Meet your next
            <br />
            <em>Brickling.</em>
          </h1>
          <p>
            Crack open a mystery box, discover a buildable creature, and grow a
            colorful collection that is uniquely yours.
          </p>
          <div className="hero-actions">
            <a className="hero-button" href="#shop">
              Open the build shop <span>→</span>
            </a>
            <a className="text-button" href="#collection">
              Meet the crew ↓
            </a>
          </div>
        </div>
        <div className="hero-stats">
          <span>
            <strong>4</strong>CREATURES
          </span>
          <span>
            <strong>1</strong>MYSTERY BOX
          </span>
          <span>
            <strong>∞</strong>ADVENTURES
          </span>
        </div>
      </header>

      <section
        className={`shop-section app-page ${isMainPage ? "page-active" : ""}`}
        id="shop"
      >
        <div className="section-heading">
          <div>
            <span>BUILD SHOP / 01</span>
            <h2>Pick your mystery box</h2>
          </div>
          <p>Grab some MYST bricks, then unlock one surprise creature.</p>
        </div>

        <div className="shop-grid">
          <article className="trade-card">
            <div className="card-heading">
              <div>
                <span className="step">1</span>
                <div>
                  <small>FIRST, GET SOME TOKENS</small>
                  <h3>Trade MYST</h3>
                </div>
              </div>
              <span className="curve-label">LIVE RATE</span>
            </div>
            <div className="trade-balance">
              <span>Wallet balance</span>
              <strong>
                {account ? `${balance.toLocaleString()} MYST` : "Not connected"}
              </strong>
            </div>
            <div className="toggle">
              <button
                className={mode === "buy" ? "active" : ""}
                onClick={() => setMode("buy")}
              >
                Buy
              </button>
              <button
                className={mode === "sell" ? "active" : ""}
                onClick={() => setMode("sell")}
              >
                Sell
              </button>
            </div>
            <label>How many tokens?</label>
            <div className="input">
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span>MYST</span>
            </div>
            <div className="quote">
              <span>You {mode === "buy" ? "pay" : "receive"}</span>
              <strong>
                {connectionMode === "live"
                  ? liveQuote || "Loading quote…"
                  : previewQuote}
              </strong>
            </div>
            <button
              className="primary"
              disabled={!account || busy}
              onClick={trade}
            >
              {busy
                ? "Waiting for wallet…"
                : account
                ? `${mode === "buy" ? "Buy" : "Sell"} MYST`
                : "Connect wallet first"}{" "}
              <span>→</span>
            </button>
          </article>

          <article className="shop-pack-card">
            <div className="shop-pack-visual">
              <span className="available-pill">AVAILABLE TO BUY</span>
              <div className="foil-pack">
                <div className="foil-top">
                  <span>MC</span>
                  <span>01</span>
                </div>
                <div className="foil-creature">?</div>
                <div>
                  <strong>Mystery Box</strong>
                  <small>ONE BRICKLING INSIDE</small>
                </div>
              </div>
            </div>
            <div className="shop-pack-info">
              <div className="product-step">
                <span className="step">2</span>
                <small>THEN, CHOOSE YOUR PACK</small>
              </div>
              <h3>What will you build?</h3>
              <p>
                Every colorful box holds one surprise Brickling and a bonus MYST
                reward. Some builds are much harder to find.
              </p>
              <div className="odds">
                {rarities.map((rarity) => (
                  <span key={rarity.name}>
                    <i className={rarity.className} />
                    {rarity.chance}% {rarity.name}
                  </span>
                ))}
              </div>
              <div className="box-quantity">
                <div>
                  <small>HOW MANY BOXES?</small>
                  <strong>Choose a bundle</strong>
                </div>
                <div className="quantity-options">
                  {[1, 3, 5].map((quantity) => (
                    <button
                      key={quantity}
                      className={boxQuantity === quantity ? "active" : ""}
                      onClick={() => setBoxQuantity(quantity)}
                    >
                      {quantity}
                      <span>{quantity === 1 ? "BOX" : "BOXES"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pay-options">
                <button
                  disabled={!account || busy}
                  onClick={() => buyBox("MYST")}
                >
                  <span>
                    <small>
                      PAY WITH MYST · ≈ {mystBundleEthValue.toFixed(3)} ETH
                    </small>
                    <strong>
                      {(boxQuantity * 1000).toLocaleString()} MYST
                    </strong>
                    <em>
                      Save {(ethBundleCost - mystBundleEthValue).toFixed(3)} ETH
                    </em>
                  </span>
                  <b>{mystDiscount}% CHEAPER</b>
                </button>
                <button
                  disabled={!account || busy}
                  onClick={() => buyBox("ETH")}
                >
                  <span>
                    <small>PAY WITH ETH</small>
                    <strong>{(boxQuantity * 0.002).toFixed(3)} ETH</strong>
                  </span>
                  <i>→</i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        className={`inventory-section app-page ${
          isMainPage ? "page-active" : ""
        }`}
        id="my-packs"
      >
        <div className="section-heading">
          <div>
            <span>BUILD BENCH / 02</span>
            <h2>Your mystery boxes</h2>
          </div>
          <p>Everything waiting to be opened lives on your workbench.</p>
        </div>
        {!account ? (
          <div className="inventory-empty">
            <div className="mini-pack">?</div>
            <div>
              <h3>Connect to see your boxes</h3>
              <p>Your sealed and revealed mystery boxes will appear here.</p>
            </div>
            <button onClick={connect}>Connect wallet</button>
          </div>
        ) : ownedPacks.length === 0 ? (
          <div className="inventory-empty">
            <div className="mini-pack">?</div>
            <div>
              <h3>No boxes yet</h3>
              <p>Pick up your first Mystery Box from the shop above.</p>
            </div>
            <a href="#shop">Go to build shop</a>
          </div>
        ) : sealedPacks.length === 0 ? (
          <div className="inventory-empty">
            <div className="mini-pack">✓</div>
            <div>
              <h3>Your build bench is clear</h3>
              <p>
                Every purchased box has been revealed and added to your
                collection.
              </p>
            </div>
            <a href="#shop">Buy another box</a>
          </div>
        ) : (
          <div className="inventory-grid">
            <article className="owned-pack box-stack-card">
              <div className="owned-pack-art box-stack-art">
                <i />
                <i />
                <span>?</span>
                <b>×{sealedPacks.length}</b>
              </div>
              <div className="owned-pack-copy">
                <small>SEALED MYSTERY BOXES</small>
                <h3>
                  {sealedPacks.length} box{sealedPacks.length > 1 ? "es" : ""}{" "}
                  ready to reveal
                </h3>
                <p>
                  Open the next box in your stack to discover a Brickling and
                  collect its MYST reward.
                </p>
              </div>
              <button
                disabled={busy}
                onClick={() => revealBox(sealedPacks[0].id)}
              >
                {busy ? "Waiting for wallet…" : "Reveal next box"}{" "}
                <span>→</span>
              </button>
            </article>
          </div>
        )}
      </section>

      <section
        className={`collection app-page ${isMainPage ? "page-active" : ""}`}
        id="collection"
      >
        <div className="section-heading">
          <div>
            <span>BRICKLING CREW / 03</span>
            <h2>Meet the whole crew</h2>
          </div>
          <p>Four colorful builds. Can you discover every one?</p>
        </div>
        {collectionEntries.some((entry) => entry.owned) && (
          <div className="collection-group owned-group">
            <div className="collection-group-heading">
              <div>
                <span>✓</span>
                <strong>Your Bricklings</strong>
              </div>
              <div className="collection-totals">
                <b>
                  {cards.reduce((total, count) => total + Number(count), 0)}{" "}
                  TOTAL OWNED
                </b>
                <small>
                  {collectionEntries.filter((entry) => entry.owned).length} OF{" "}
                  {rarities.length} TYPES DISCOVERED
                </small>
              </div>
            </div>
            <div className="card-row owned-row">
              {collectionEntries
                .filter((entry) => entry.owned)
                .map(renderCreatureCard)}
            </div>
          </div>
        )}
        <div className="collection-group locked-group">
          <div className="collection-group-heading">
            <div>
              <span>?</span>
              <strong>Still to discover</strong>
            </div>
            <small>
              {collectionEntries.filter((entry) => !entry.owned).length}{" "}
              REMAINING
            </small>
          </div>
          {collectionEntries.some((entry) => !entry.owned) ? (
            <div className="card-row locked-row">
              {collectionEntries
                .filter((entry) => !entry.owned)
                .map(renderCreatureCard)}
            </div>
          ) : (
            <div className="collection-complete">
              <span>★</span>
              <div>
                <small>CREW STATUS · 100%</small>
                <h3>Collection complete!</h3>
                <p>You found every Brickling in Series 01.</p>
              </div>
              <b>4 / 4</b>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
