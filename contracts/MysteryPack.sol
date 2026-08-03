// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CardNFT} from "./CardNFT.sol";

/// @notice Sells delayed-reveal packs. Token payments fund card rewards.
contract MysteryPack is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant TOKEN_PRICE = 1_000 ether;
    uint256 public constant ETH_PRICE = 0.002 ether;
    IERC20 public immutable token;
    CardNFT public immutable cards;
    address public treasury;
    uint256 public nextPackId;

    struct Pack {
        address owner;
        uint64 purchaseBlock;
        bool opened;
    }

    mapping(uint256 => Pack) public packs;

    error IncorrectPayment();
    error NotPackOwner();
    error AlreadyOpened();
    error RevealNotReady();
    error RevealExpired();
    error InsufficientRewardPool();

    event PackPurchased(uint256 indexed packId, address indexed buyer, bool paidWithToken);
    event PackOpened(uint256 indexed packId, address indexed owner, uint256 rarity, uint256 reward);

    constructor(IERC20 token_, CardNFT cards_, address treasury_) Ownable(msg.sender) {
        token = token_;
        cards = cards_;
        treasury = treasury_;
    }

    function buyWithToken() external {
        token.safeTransferFrom(msg.sender, address(this), TOKEN_PRICE);
        _createPack(msg.sender, true);
    }

    function buyWithEth() external payable {
        if (msg.value != ETH_PRICE) revert IncorrectPayment();
        (bool ok,) = payable(treasury).call{value: msg.value}("");
        if (!ok) revert IncorrectPayment();
        _createPack(msg.sender, false);
    }

    function openPack(uint256 packId) external nonReentrant {
        Pack storage pack = packs[packId];
        if (pack.owner != msg.sender) revert NotPackOwner();
        if (pack.opened) revert AlreadyOpened();
        uint256 randomnessBlock = uint256(pack.purchaseBlock) + 1;
        if (block.number <= randomnessBlock) revert RevealNotReady();
        if (block.number >= randomnessBlock + 256) revert RevealExpired();

        pack.opened = true;
        uint256 roll = uint256(keccak256(abi.encodePacked(
            blockhash(randomnessBlock), packId, pack.owner, address(this)
        ))) % 10_000;
        uint256 rarity = roll < 100 ? 3 : roll < 1_000 ? 2 : roll < 3_000 ? 1 : 0;
        uint256 reward = cards.tokenReward(rarity);
        if (token.balanceOf(address(this)) < reward) revert InsufficientRewardPool();

        cards.mint(msg.sender, rarity);
        token.safeTransfer(msg.sender, reward);
        emit PackOpened(packId, msg.sender, rarity, reward);
    }

    function fundRewards(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function _createPack(address buyer, bool paidWithToken) private {
        uint256 packId = nextPackId++;
        packs[packId] = Pack(buyer, uint64(block.number), false);
        emit PackPurchased(packId, buyer, paidWithToken);
    }
}
