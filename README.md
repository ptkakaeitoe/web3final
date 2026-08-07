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
- Rarity odds: Common 50%, Rare 25%, Epic 20%, Legendary 5%
- Rewards: 25, 75, 200, or 500 MYST respectively

The bonding curve holds all ETH received from token purchases. Selling burns
tokens and returns the matching area under the curve, keeping the reserve
solvent. Pack payments never withdraw from that reserve.

Token-paid packs place their 1,000 MYST payment into the reward pool. ETH-paid
packs require the project owner to pre-fund that pool using `fundRewards`.
Consequently, card rewards redistribute already-backed tokens rather than mint
unbacked supply.

The pack contract reserves 500 MYST—the maximum Legendary payout—for every
unopened pack. It rejects ETH purchases that would be underfunded. The owner can
withdraw only MYST above this reserve to the configured treasury, so existing
packs remain fully backed even after surplus withdrawals.

## Contracts

- `ProjectToken.sol`: capped ERC-20, with the curve as its one-time minter
- `BondingCurve.sol`: whole-token buys and sells with slippage limits
- `CardNFT.sol`: ERC-1155 cards; token IDs 0–3 represent rarity
- `MysteryPack.sol`: dual-currency pack sales and delayed reveal
- `NFTMarketplace.sol`: non-custodial, fixed-price ERC-1155 sales in ETH
- `NFTStaking.sol`: custodial card staking with pre-funded MYST rewards

## Marketplace and staking

Sellers approve the marketplace once, then list one or more copies of a rarity at
a fixed ETH price. Listings are non-custodial, so purchases only succeed while
the seller still owns the cards and keeps the approval active.

Staking rewards are 1, 3, 8, and 20 MYST per card per day for Common through
Legendary cards. Fund the staking contract by approving MYST and calling
`fundRewards`; it cannot mint tokens. `emergencyUnstake` always lets a user
recover deposited cards if the reward pool cannot pay a normal unstake.

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

To add marketplace and staking to the existing Sepolia deployment without
replacing the token, cards, or pack contracts, run:

```bash
npm run deploy:features:sepolia
```

This appends the two addresses to `deployments/sepolia.json` and enables the new
frontend section.

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
purchased. If that hash is no longer available after 256 blocks, the contract
uses recent chain entropy as a recovery path so a purchased pack never becomes
permanently unusable. This is suitable for a testnet classroom demonstration,
but block producers and reveal timing can influence chain data. A production
version should replace this with verifiable randomness such as Chainlink VRF.
