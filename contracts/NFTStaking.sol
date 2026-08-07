// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Custodial Brickling staking paid from a pre-funded MYST reward pool.
contract NFTStaking is ERC1155Holder, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IERC1155 public immutable cards;
    uint256[4] public dailyReward = [uint256(1 ether), 3 ether, 8 ether, 20 ether];

    struct Stake {
        uint256 amount;
        uint64 updatedAt;
    }

    mapping(address => mapping(uint256 => Stake)) public stakes;

    error InvalidStake();
    error NothingToClaim();
    error InsufficientRewardPool();

    event Staked(address indexed account, uint256 indexed tokenId, uint256 amount);
    event Claimed(address indexed account, uint256 indexed tokenId, uint256 reward);
    event Unstaked(address indexed account, uint256 indexed tokenId, uint256 amount);

    constructor(IERC20 token_, IERC1155 cards_) {
        token = token_;
        cards = cards_;
    }

    function stake(uint256 tokenId, uint256 amount) external nonReentrant {
        if (tokenId > 3 || amount == 0) revert InvalidStake();
        Stake storage position = stakes[msg.sender][tokenId];
        _pay(msg.sender, tokenId, position);
        cards.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        position.amount += amount;
        position.updatedAt = uint64(block.timestamp);
        emit Staked(msg.sender, tokenId, amount);
    }

    function claim(uint256 tokenId) external nonReentrant {
        Stake storage position = stakes[msg.sender][tokenId];
        uint256 reward = _pay(msg.sender, tokenId, position);
        if (reward == 0) revert NothingToClaim();
    }

    /// @notice Claims rewards from every active rarity position in one transaction.
    function claimAll() external nonReentrant {
        uint256 totalReward;
        for (uint256 tokenId; tokenId < 4; ++tokenId) {
            Stake storage position = stakes[msg.sender][tokenId];
            if (position.amount > 0) {
                totalReward += _pay(msg.sender, tokenId, position);
            }
        }
        if (totalReward == 0) revert NothingToClaim();
    }

    function unstake(uint256 tokenId, uint256 amount) external nonReentrant {
        Stake storage position = stakes[msg.sender][tokenId];
        if (amount == 0 || position.amount < amount) revert InvalidStake();
        _pay(msg.sender, tokenId, position);
        position.amount -= amount;
        position.updatedAt = uint64(block.timestamp);
        cards.safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
        emit Unstaked(msg.sender, tokenId, amount);
    }

    /// @notice Returns cards even if the reward pool is empty; pending rewards are forfeited.
    function emergencyUnstake(uint256 tokenId, uint256 amount) external nonReentrant {
        Stake storage position = stakes[msg.sender][tokenId];
        if (amount == 0 || position.amount < amount) revert InvalidStake();
        position.amount -= amount;
        position.updatedAt = uint64(block.timestamp);
        cards.safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
        emit Unstaked(msg.sender, tokenId, amount);
    }

    function pendingReward(address account, uint256 tokenId) public view returns (uint256) {
        Stake memory position = stakes[account][tokenId];
        if (position.amount == 0 || position.updatedAt == 0) return 0;
        return position.amount * dailyReward[tokenId] * (block.timestamp - position.updatedAt) / 1 days;
    }

    function fundRewards(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function _pay(address account, uint256 tokenId, Stake storage position) private returns (uint256 reward) {
        reward = pendingReward(account, tokenId);
        if (reward > token.balanceOf(address(this))) revert InsufficientRewardPool();
        position.updatedAt = uint64(block.timestamp);
        if (reward > 0) {
            token.safeTransfer(account, reward);
            emit Claimed(account, tokenId, reward);
        }
    }
}
