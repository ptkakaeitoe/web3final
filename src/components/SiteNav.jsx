import React from "react";
import Brand from "./Brand";

const links = [
  ["shop", "Build shop"], ["collection", "Bricklings"], ["marketplace", "Market"],
];

const mobileLinks = [
  ["shop", "Shop", "▦"], ["collection", "Bricklings", "◇"],
  ["marketplace", "Market", "↔"], ["staking", "Stake", "◆"],
];

export default function SiteNav({ page, account, connectionMode, soundOn, onToggleSound, onConnect }) {
  return <nav className="site-nav"><div className="nav-inner">
    <Brand linked />
    <div className="nav-menu">{links.map(([route, label]) => <a key={route} className={page === route ? "active" : ""} href={`#${route}`}>{label}</a>)}</div>
    <div className="nav-actions">
      <button className={`sound-toggle ${soundOn ? "is-on" : ""}`} onClick={onToggleSound} aria-label={`${soundOn ? "Mute" : "Enable"} interface sounds`} aria-pressed={soundOn}><span className="speaker-icon"><i /><i /><i /></span></button>
      <button className={`wallet ${account ? "connected" : ""}`} onClick={onConnect}>{account ? (connectionMode === "preview" ? "Preview mode" : `${account.slice(0, 6)}…${account.slice(-4)}`) : "Connect wallet"}</button>
    </div>
    <div className="mobile-nav" aria-label="Mobile navigation">{mobileLinks.map(([route, label, icon]) => <a key={route} className={page === route ? "active" : ""} href={`#${route}`}><span aria-hidden="true">{icon}</span>{label}</a>)}</div>
  </div></nav>;
}
