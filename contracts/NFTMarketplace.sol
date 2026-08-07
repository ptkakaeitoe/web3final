// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Non-custodial, fixed-price ETH listings for the Brickling ERC-1155 collection.
contract NFTMarketplace is ReentrancyGuard {
    IERC1155 public immutable cards;
    uint256 public nextListingId;

    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 amount;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;

    error InvalidListing();
    error NotSeller();
    error IncorrectPayment();

    event Listed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 price);
    event Purchased(uint256 indexed listingId, address indexed buyer);
    event Cancelled(uint256 indexed listingId);

    constructor(IERC1155 cards_) {
        cards = cards_;
    }

    function list(uint256 tokenId, uint256 amount, uint256 price) external returns (uint256 listingId) {
        if (tokenId > 3 || amount == 0 || price == 0 || cards.balanceOf(msg.sender, tokenId) < amount ||
            !cards.isApprovedForAll(msg.sender, address(this))) revert InvalidListing();
        listingId = nextListingId++;
        listings[listingId] = Listing(msg.sender, tokenId, amount, price, true);
        emit Listed(listingId, msg.sender, tokenId, amount, price);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        if (!listing.active || listing.seller == msg.sender) revert InvalidListing();
        if (msg.value != listing.price) revert IncorrectPayment();
        listing.active = false;
        cards.safeTransferFrom(listing.seller, msg.sender, listing.tokenId, listing.amount, "");
        (bool ok,) = payable(listing.seller).call{value: msg.value}("");
        if (!ok) revert IncorrectPayment();
        emit Purchased(listingId, msg.sender);
    }

    function cancel(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        if (!listing.active) revert InvalidListing();
        if (listing.seller != msg.sender) revert NotSeller();
        listing.active = false;
        emit Cancelled(listingId);
    }
}
