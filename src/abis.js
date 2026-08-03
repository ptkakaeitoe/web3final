export const tokenAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

export const curveAbi = [
  "function quoteBuy(uint256) view returns (uint256)",
  "function quoteSell(uint256) view returns (uint256)",
  "function buy(uint256,uint256) payable",
  "function sell(uint256,uint256)",
  "function currentPrice() view returns (uint256)",
  "function token() view returns (address)",
];

export const packAbi = [
  "event PackPurchased(uint256 indexed packId,address indexed buyer,bool paidWithToken)",
  "event PackOpened(uint256 indexed packId,address indexed owner,uint256 rarity,uint256 reward)",
  "function TOKEN_PRICE() view returns (uint256)",
  "function ETH_PRICE() view returns (uint256)",
  "function nextPackId() view returns (uint256)",
  "function packs(uint256) view returns (address owner,uint64 purchaseBlock,bool opened)",
  "function buyWithToken()",
  "function buyWithEth() payable",
  "function openPack(uint256)",
];

export const cardsAbi = [
  "function balanceOf(address,uint256) view returns (uint256)",
];
