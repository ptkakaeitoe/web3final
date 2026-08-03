// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ProjectToken} from "./ProjectToken.sol";

/// @notice Reserve-backed linear curve using whole-token trades.
/// Initial price is 0.000001 ETH/token and rises by 0.001 gwei per token minted.
contract BondingCurve is ReentrancyGuard {
    uint256 public constant INITIAL_PRICE = 0.000001 ether;
    uint256 public constant SLOPE = 1_000_000 wei;
    ProjectToken public immutable token;

    error WholeTokensOnly();
    error InvalidAmount();
    error MaxCostExceeded();
    error MinReturnNotMet();
    error TransferFailed();

    event TokensBought(address indexed buyer, uint256 amount, uint256 cost);
    event TokensSold(address indexed seller, uint256 amount, uint256 returnAmount);

    constructor(ProjectToken token_) {
        token = token_;
    }

    function quoteBuy(uint256 amount) public view returns (uint256) {
        _validate(amount);
        uint256 supply = token.totalSupply() / 1 ether;
        uint256 count = amount / 1 ether;
        return _curveArea(supply, count);
    }

    function quoteSell(uint256 amount) public view returns (uint256) {
        _validate(amount);
        uint256 supply = token.totalSupply() / 1 ether;
        uint256 count = amount / 1 ether;
        if (count > supply) revert InvalidAmount();
        return _curveArea(supply - count, count);
    }

    function buy(uint256 amount, uint256 maxCost) external payable nonReentrant {
        uint256 cost = quoteBuy(amount);
        if (cost > maxCost || msg.value < cost) revert MaxCostExceeded();
        token.mint(msg.sender, amount);
        if (msg.value > cost) _send(msg.sender, msg.value - cost);
        emit TokensBought(msg.sender, amount, cost);
    }

    function sell(uint256 amount, uint256 minReturn) external nonReentrant {
        uint256 returnAmount = quoteSell(amount);
        if (returnAmount < minReturn) revert MinReturnNotMet();
        token.burnFrom(msg.sender, amount);
        _send(msg.sender, returnAmount);
        emit TokensSold(msg.sender, amount, returnAmount);
    }

    function currentPrice() external view returns (uint256) {
        return INITIAL_PRICE + SLOPE * (token.totalSupply() / 1 ether);
    }

    function _curveArea(uint256 start, uint256 count) private pure returns (uint256) {
        return count * INITIAL_PRICE + SLOPE * count * (2 * start + count - 1) / 2;
    }

    function _validate(uint256 amount) private pure {
        if (amount == 0) revert InvalidAmount();
        if (amount % 1 ether != 0) revert WholeTokensOnly();
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
