import React, { useMemo, useState } from "react";
import { formatEther } from "ethers";
import { rarities } from "../data/rarities";

export default function MarketplacePage({ visible, deployed, listings, account, cards, busy, tokenId, setTokenId, price, setPrice, filter, setFilter, sort, setSort, onList, onBuy, onCancel }) {
  const [listingOpen, setListingOpen] = useState(false);
  const visibleListings = useMemo(() => listings
    .filter((listing) => filter === "all" || Number(listing.tokenId) === Number(filter))
    .sort((a, b) => sort === "low" ? Number(a.price - b.price) : Number(b.price - a.price)), [listings, filter, sort]);
  const floor = listings.length ? formatEther(listings.reduce((value, item) => item.price < value ? item.price : value, listings[0].price)) : "—";

  return <section className={`features-section app-page ${visible ? "page-active" : ""}`} id="marketplace">
    <div className="market-collection-hero">
      <div className="market-hero-art"><img src="/assets/brick-creatures-hero.png" alt="Brickling collection" /></div>
      <div className="market-avatar"><img src="/assets/mystery-club-logo.svg" alt="" /></div>
      <div className="market-collection-copy"><span>BRICKLING MARKET / SERIES 01</span><h2>Mystery Club Bricklings <i title="Verified collection">✓</i></h2><p>Four buildable creatures discovered through Mystery Boxes. Collect, trade, and complete the crew.</p></div>
      <div className="market-stats"><div><strong>{floor}</strong><span>FLOOR PRICE</span></div><div><strong>{listings.length}</strong><span>LISTED</span></div><div><strong>4</strong><span>ITEM TYPES</span></div><div><strong>0%</strong><span>MARKET FEE</span></div></div>
    </div>
    {!deployed && <div className="feature-notice">The contracts are implemented locally. Run the updated deployment before using these features on Sepolia.</div>}
    <div className="market-toolbar"><div className="market-tabs"><button className="active">Items</button><a href="#collection">My collection</a><a href="#staking">Staking</a></div><div className="market-result-count"><strong>{visibleListings.length}</strong> items available</div><button className="open-listing-button" onClick={() => setListingOpen(true)}>＋ List an item</button></div>
    <div className="market-layout">
      <aside className="market-sidebar">
        <div className="market-filter-block"><strong>Rarity</strong><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><span>All Bricklings</span><b>{listings.length}</b></button>{rarities.map((rarity, id) => <button key={rarity.name} className={`${rarity.className} ${Number(filter) === id ? "active" : ""}`} onClick={() => setFilter(id)}><span><i />{rarity.name}</span><b>{listings.filter((item) => Number(item.tokenId) === id).length}</b></button>)}</div>
      </aside>
      <div className="market-gallery"><div className="market-gallery-head"><div><small>MARKET RESULTS</small><strong>{visibleListings.length} Brickling{visibleListings.length === 1 ? "" : "s"}</strong></div><div className="market-sort" aria-label="Sort marketplace"><small>SORT BY PRICE</small><button className={sort === "low" ? "active" : ""} onClick={() => setSort("low")}><span>↑</span> Lowest first</button><button className={sort === "high" ? "active" : ""} onClick={() => setSort("high")}><span>↓</span> Highest first</button></div></div>{visibleListings.length === 0 ? <div className="market-empty"><span>◇</span><h4>No items found</h4><p>Try another rarity or list the first Brickling.</p></div> : visibleListings.map((listing) => {
        const id = Number(listing.tokenId); const mine = listing.seller.toLowerCase() === account.toLowerCase();
        return <article className={`market-item-card ${rarities[id].className}`} key={listing.id}><div className="market-item-art"><img src={rarities[id].image} alt={rarities[id].creature} /><span>{rarities[id].name}</span><button aria-label="Favorite">♡</button></div><div className="market-item-copy"><small>MYSTERY CLUB · MC—0{id + 1}</small><h3>{rarities[id].creature}</h3><div><span><small>PRICE</small><strong>Ξ {formatEther(listing.price)}</strong></span><span><small>OWNER</small><b>{mine ? "You" : `${listing.seller.slice(0, 5)}…${listing.seller.slice(-3)}`}</b></span></div></div><button className="market-buy-button" disabled={busy} onClick={() => mine ? onCancel(listing.id) : onBuy(listing)}>{mine ? "Cancel listing" : "Buy now"}<span>{mine ? "×" : "→"}</span></button></article>;
      })}</div>
    </div>
    {listingOpen && <div className="listing-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setListingOpen(false)}><div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-title"><button className="listing-modal-close" onClick={() => setListingOpen(false)}>×</button><small>SELL FROM YOUR WALLET</small><h2 id="listing-title">List a Brickling</h2><p>Choose one collectible and set a fixed ETH price.</p><label>Choose from your collection</label><div className="creature-picker modal-creature-picker">{rarities.map((rarity, id) => <button type="button" key={rarity.name} className={`${tokenId === id ? "active" : ""} ${rarity.className}`} onClick={() => setTokenId(id)}><span className={`creature-thumb ${rarity.className}`}><img src={rarity.image} alt="" /></span><span><small>{rarity.name} · MC—0{id + 1}</small><strong>{rarity.creature}</strong><em>{cards[id]} in wallet · +{rarity.reward} MYST</em></span><i>{tokenId === id ? "✓" : ""}</i></button>)}</div><div className="price-field"><label htmlFor="listing-price">Set your price</label><div><input id="listing-price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" /><span>ETH</span></div></div><div className="market-summary"><span>You are listing</span><strong>1× {rarities[tokenId].creature}</strong></div><button className="primary feature-primary" disabled={busy || !account || Number(cards[tokenId]) < 1 || !Number.isFinite(Number(price)) || Number(price) <= 0} onClick={() => { onList(); setListingOpen(false); }}>Publish listing <span>→</span></button></div></div>}
  </section>;
}
