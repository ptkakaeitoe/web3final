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
    uint256 public constant MAX_REWARD = 500 ether;
    uint256 public constant MAX_BATCH_SIZE = 20;
    IERC20 public immutable token;
    CardNFT public immutable cards;
    address public treasury;
    uint256 public nextPackId;
    uint256 public unopenedPackCount;

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
    error InsufficientRewardPool();
    error InvalidRoll();
    error InvalidTreasury();
    error InvalidQuantity();

    event PackPurchased(uint256 indexed packId, address indexed buyer, bool paidWithToken);
    event PackOpened(uint256 indexed packId, address indexed owner, uint256 rarity, uint256 reward);
    event SurplusWithdrawn(address indexed treasury, uint256 amount);

    constructor(IERC20 token_, CardNFT cards_, address treasury_) Ownable(msg.sender) {
        if (treasury_ == address(0)) revert InvalidTreasury();
        token = token_;
        cards = cards_;
        treasury = treasury_;
    }

    function buyWithToken() external {
        _buyWithToken(1);
    }

    function buyWithTokenBatch(uint256 quantity) external {
        _buyWithToken(quantity);
    }

    function buyWithEth() external payable nonReentrant {
        _buyWithEth(1);
    }

    function buyWithEthBatch(uint256 quantity) external payable nonReentrant {
        _buyWithEth(quantity);
    }

    function _buyWithToken(uint256 quantity) private {
        _validateQuantity(quantity);
        token.safeTransferFrom(msg.sender, address(this), TOKEN_PRICE * quantity);
        for (uint256 index; index < quantity; ++index) {
            _createPack(msg.sender, true);
        }
    }

    function _buyWithEth(uint256 quantity) private {
        _validateQuantity(quantity);
        if (msg.value != ETH_PRICE * quantity) revert IncorrectPayment();
        if (token.balanceOf(address(this)) < rewardReserve() + MAX_REWARD * quantity) {
            revert InsufficientRewardPool();
        }
        (bool ok,) = payable(treasury).call{value: msg.value}("");
        if (!ok) revert IncorrectPayment();
        for (uint256 index; index < quantity; ++index) {
            _createPack(msg.sender, false);
        }
    }

    function openPack(uint256 packId) external nonReentrant {
        Pack storage pack = packs[packId];
        if (pack.owner != msg.sender) revert NotPackOwner();
        if (pack.opened) revert AlreadyOpened();
        uint256 randomnessBlock = uint256(pack.purchaseBlock) + 1;
        if (block.number <= randomnessBlock) revert RevealNotReady();

        bytes32 entropy = blockhash(randomnessBlock);
        // Old block hashes become unavailable after 256 blocks. Use recent
        // chain entropy as a recovery path so a paid pack can never get stuck.
        if (entropy == bytes32(0)) {
            entropy = keccak256(abi.encodePacked(
                block.prevrandao,
                blockhash(block.number - 1),
                pack.purchaseBlock
            ));
        }

        pack.opened = true;
        uint256 roll = uint256(keccak256(abi.encodePacked(
            entropy, packId, pack.owner, address(this)
        ))) % 10_000;
        uint256 rarity = rarityForRoll(roll);
        uint256 reward = cards.tokenReward(rarity);
        if (token.balanceOf(address(this)) < reward) revert InsufficientRewardPool();

        unopenedPackCount -= 1;
        cards.mint(msg.sender, rarity);
        token.safeTransfer(msg.sender, reward);
        emit PackOpened(packId, msg.sender, rarity, reward);
    }

    function fundRewards(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function rewardReserve() public view returns (uint256) {
        return unopenedPackCount * MAX_REWARD;
    }

    function withdrawableSurplus() public view returns (uint256) {
        uint256 balance = token.balanceOf(address(this));
        uint256 reserve = rewardReserve();
        return balance > reserve ? balance - reserve : 0;
    }

    function withdrawSurplus(uint256 amount) external onlyOwner {
        if (amount == 0 || amount > withdrawableSurplus()) {
            revert InsufficientRewardPool();
        }
        token.safeTransfer(treasury, amount);
        emit SurplusWithdrawn(treasury, amount);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidTreasury();
        treasury = newTreasury;
    }

    /// @notice Maps a 0–9,999 roll to 5% legendary, 20% epic, 25% rare, 50% common.
    function rarityForRoll(uint256 roll) public pure returns (uint256) {
        if (roll >= 10_000) revert InvalidRoll();
        return roll < 500 ? 3 : roll < 2_500 ? 2 : roll < 5_000 ? 1 : 0;
    }

    function _createPack(address buyer, bool paidWithToken) private {
        uint256 packId = nextPackId++;
        unopenedPackCount += 1;
        packs[packId] = Pack(buyer, uint64(block.number), false);
        emit PackPurchased(packId, buyer, paidWithToken);
    }

    function _validateQuantity(uint256 quantity) private pure {
        if (quantity == 0 || quantity > MAX_BATCH_SIZE) revert InvalidQuantity();
    }
}
