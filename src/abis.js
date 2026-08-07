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
  "function isApprovedForAll(address,address) view returns (bool)",
  "function setApprovalForAll(address,bool)",
];

export const marketplaceAbi = [
  "function nextListingId() view returns (uint256)",
  "function listings(uint256) view returns (address seller,uint256 tokenId,uint256 amount,uint256 price,bool active)",
  "function list(uint256,uint256,uint256) returns (uint256)",
  "function buy(uint256) payable",
  "function cancel(uint256)",
];

export const stakingAbi = [
  "function stakes(address,uint256) view returns (uint256 amount,uint64 updatedAt)",
  "function pendingReward(address,uint256) view returns (uint256)",
  "function stake(uint256,uint256)",
  "function claim(uint256)",
  "function claimAll()",
  "function unstake(uint256,uint256)",
];
