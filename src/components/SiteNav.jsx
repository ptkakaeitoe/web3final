import React, { useState } from "react";
import Brand from "./Brand";

const links = [
  ["shop", "Build shop"], ["collection", "Bricklings"],
  ["marketplace", "Market"], ["staking", "Stake"],
];

const mobileLinks = [
  ["shop", "Shop", "▦"], ["collection", "Bricklings", "◇"],
  ["marketplace", "Market", "↔"], ["staking", "Stake", "◆"],
];

export default function SiteNav({ page, account, connectionMode, soundOn, onToggleSound, onConnect }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return <nav className="site-nav">
    <div className="nav-inner">
      <Brand linked />
      <div className="nav-menu">{links.map(([route, label]) => <a key={route} className={page === route ? "active" : ""} href={`#${route}`}>{label}</a>)}</div>
      <div className="nav-actions">
        <button className={`sound-toggle ${soundOn ? "is-on" : ""}`} onClick={onToggleSound} aria-label={`${soundOn ? "Mute" : "Enable"} interface sounds`} aria-pressed={soundOn}><span className="speaker-icon"><i /><i /><i /></span></button>
        <button className={`wallet ${account ? "connected" : ""}`} onClick={onConnect}>{account ? (connectionMode === "preview" ? "Preview mode" : `${account.slice(0, 6)}…${account.slice(-4)}`) : "Connect wallet"}</button>
        <button className={`menu-toggle ${menuOpen ? "is-open" : ""}`} type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={`${menuOpen ? "Close" : "Open"} navigation menu`} aria-expanded={menuOpen} aria-controls="mobile-navigation"><span /><span /><span /></button>
      </div>
    </div>
    <div id="mobile-navigation" className={`mobile-nav ${menuOpen ? "is-open" : ""}`} aria-label="Mobile navigation">{mobileLinks.map(([route, label, icon]) => <a key={route} className={page === route ? "active" : ""} aria-current={page === route ? "page" : undefined} href={`#${route}`} onClick={() => setMenuOpen(false)}><span aria-hidden="true">{icon}</span>{label}</a>)}</div>
  </nav>;
}
