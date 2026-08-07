import React from "react";

export default function AppOverlays({ celebration, closeCelebration, connectOpen, setConnectOpen, busy, connectLive, connectPreview, status, setStatus }) {
  return <>
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
  </>;
}
