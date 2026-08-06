# MysteryCurve

A class-project dApp for Ethereum Sepolia combining a reserve-backed bonding
curve, an ERC-20 token, mystery packs, and ERC-1155 collectible cards.

## Economics

- Maximum token supply: **1,000,000 MYST**
- Initial curve price: **0.000001 ETH per MYST** (1 ETH buys approximately 1,000,000
  tokens at launch)
- Linear slope: **0.000000000001 ETH** per token already minted
- Token pack price: **1,000 MYST**
- ETH pack price: **0.002 ETH**, making the 1,000 MYST option discounted at launch
- Rarity odds: Common 70%, Rare 20%, Epic 9%, Legendary 1%
- Rewards: 25, 75, 200, or 500 MYST respectively

The bonding curve holds all ETH received from token purchases. Selling burns
tokens and returns the matching area under the curve, keeping the reserve
solvent. Pack payments never withdraw from that reserve.

Token-paid packs place their 1,000 MYST payment into the reward pool. ETH-paid
packs require the project owner to pre-fund that pool using `fundRewards`.
Consequently, card rewards redistribute already-backed tokens rather than mint
unbacked supply.

## Contracts

- `ProjectToken.sol`: capped ERC-20, with the curve as its one-time minter
- `BondingCurve.sol`: whole-token buys and sells with slippage limits
- `CardNFT.sol`: ERC-1155 cards; token IDs 0–3 represent rarity
- `MysteryPack.sol`: dual-currency pack sales and delayed reveal

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run deploy:local
npm run dev
```

## Deploy to Sepolia

Copy `.env.example` to `.env` and add a Sepolia RPC URL plus a private key from a
dedicated test wallet. Never use a wallet containing real funds.

```bash
npm run deploy:sepolia
```

The script writes deployment details to `deployments/sepolia.json`. The frontend
uses those addresses for live wallet transactions on Sepolia (chain ID `11155111`).
The wallet connection dialog also offers a local Preview mode for exploring the
interface without submitting transactions.

## Demo sequence

1. Buy at least 2,000 MYST using `BondingCurve.buy`.
2. Approve the pack contract to spend 1,000 MYST.
3. Call `MysteryPack.buyWithToken`.
4. Wait two blocks and call `openPack(0)`.
5. Show the ERC-1155 card balance and rewarded MYST.
6. Sell some MYST back through `BondingCurve.sell`.

Call `quoteBuy` or `quoteSell` immediately before a trade and pass the returned
value as `maxCost` or `minReturn`.

## Randomness limitation

The MVP uses a future block hash so the result is unknown when a pack is
purchased. This is suitable for a testnet classroom demonstration, but block
producers can influence block data and reveals expire after 256 blocks. A
production version should replace this with verifiable randomness such as
Chainlink VRF.
