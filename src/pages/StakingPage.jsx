import React from "react";
import { rarities } from "../data/rarities";

const rates = [1, 3, 8, 20];

export default function StakingPage({
  visible,
  deployed,
  cards,
  stakedCards,
  pendingRewards,
  busy,
  onStake,
  onClaim,
  onClaimAll,
  onUnstake,
}) {
  const totalPending = pendingRewards.reduce(
    (sum, value) => sum + Number(value),
    0
  );

  return (
    <section
      className={`features-section staking-section app-page ${
        visible ? "page-active" : ""
      }`}
      id="staking"
    >
      <div className="section-heading">
        <div>
          <span>REWARD WORKSHOP / 05</span>
          <h2>Staking</h2>
        </div>
        <p>Lock Bricklings to earn rewards from the pre-funded MYST pool.</p>
      </div>
      {!deployed && (
        <div className="feature-notice">
          The staking contract must be deployed and funded before Sepolia
          rewards are available.
        </div>
      )}
      <div className="staking-stats">
        <div>
          <small>YOUR STAKED CREW</small>
          <strong>
            {stakedCards.reduce((sum, value) => sum + Number(value), 0)}
          </strong>
          <span>Bricklings earning</span>
        </div>
        <div>
          <small>CLAIMABLE NOW · LIVE</small>
          <strong>{totalPending.toFixed(6)}</strong>
          <span>MYST rewards</span>
          <button
            className="claim-all-action"
            disabled={busy || totalPending <= 0}
            onClick={onClaimAll}
          >
            Claim all
          </button>
        </div>
      </div>
      <section className="reward-rate-panel">
        <div>
          <small>REWARD SCHEDULE</small>
          <h3>Daily reward rates</h3>
          <p>Earn more MYST by staking rarer Bricklings.</p>
        </div>
        <div className="reward-rate-grid">
          {rarities.map((rarity, id) => (
            <article className={rarity.className} key={rarity.name}>
              <span className={`creature-thumb ${rarity.className}`}>
                <img src={rarity.image} alt="" />
              </span>
              <div>
                <small>{rarity.name}</small>
                <strong>{rates[id]}</strong>
                <span>MYST per day</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="staking-grid">
        <article className="feature-card staking-card">
          <div className="feature-card-head">
            <div>
              <small>YOUR REWARD POSITIONS</small>
              <h3>Staking workshop</h3>
            </div>
            <span className="live-pulse">
              <i /> UPDATES EVERY SECOND
            </span>
          </div>
          <div className="stake-list">
            {rarities.map((rarity, id) => (
              <div
                className={`stake-row ${rarity.className}`}
                key={rarity.name}
              >
                <span
                  className={`creature-thumb stake-art ${rarity.className}`}
                >
                  <img src={rarity.image} alt={rarity.creature} />
                </span>
                <div className="stake-identity">
                  <small>
                    {rarity.name} · {rates[id]} MYST / DAY
                  </small>
                  <strong>{rarity.creature}</strong>
                  <span>{cards[id]} in wallet</span>
                </div>
                <div className="stake-metric">
                  <small>STAKED</small>
                  <strong>{stakedCards[id]}</strong>
                </div>
                <div className="stake-metric reward">
                  <small>PENDING</small>
                  <strong>{Number(pendingRewards[id]).toFixed(6)}</strong>
                  <span>MYST</span>
                </div>
                <div className="stake-actions">
                  <button
                    className="stake-action"
                    disabled={busy || Number(cards[id]) < 1}
                    onClick={() => onStake(id)}
                  >
                    + Stake one
                  </button>
                  <button
                    className="claim-action"
                    disabled={busy || Number(stakedCards[id]) < 1}
                    onClick={() => onClaim(id)}
                  >
                    Claim
                  </button>
                  <button
                    className="unstake-action"
                    disabled={busy || Number(stakedCards[id]) < 1}
                    onClick={() => onUnstake(id)}
                  >
                    Unstake
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
