// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Marketplace
/// @notice Fixed-price secondary market for property shares with partial fills.
///         Escrow-less: shares stay in the seller's wallet (approved via
///         setApprovalForAll) and move directly seller -> buyer on fill.
contract Marketplace is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        uint256 propertyId;
        uint256 amountRemaining;
        uint256 pricePerShare; // in mUSDC
        bool active;
    }

    IERC20 public immutable usdc;
    IERC1155 public immutable shares;

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 indexed propertyId, uint256 amount, uint256 pricePerShare);
    event Bought(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 cost);
    event Cancelled(uint256 indexed listingId);

    error InvalidAmount();
    error NotSeller();
    error ListingInactive();
    error InsufficientRemaining();

    constructor(address usdc_, address shares_) {
        usdc = IERC20(usdc_);
        shares = IERC1155(shares_);
    }

    /// @notice List `amount` shares of a property at a fixed price per share.
    /// @dev Seller must setApprovalForAll(marketplace, true) on PropertyShares.
    function list(uint256 propertyId, uint256 amount, uint256 pricePerShare)
        external
        returns (uint256 listingId)
    {
        if (amount == 0) revert InvalidAmount();
        listingId = listingCount++;
        listings[listingId] = Listing({
            seller: msg.sender,
            propertyId: propertyId,
            amountRemaining: amount,
            pricePerShare: pricePerShare,
            active: true
        });
        emit Listed(listingId, msg.sender, propertyId, amount, pricePerShare);
    }

    /// @notice Cancel a listing. Seller only.
    function cancel(uint256 listingId) external {
        Listing storage l = listings[listingId];
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert ListingInactive();
        l.active = false;
        emit Cancelled(listingId);
    }

    /// @notice Buy up to `amount` shares from a listing (partial fills allowed).
    function buy(uint256 listingId, uint256 amount) external nonReentrant {
        Listing storage l = listings[listingId];
        if (!l.active) revert ListingInactive();
        if (amount == 0) revert InvalidAmount();
        if (amount > l.amountRemaining) revert InsufficientRemaining();

        l.amountRemaining -= amount;
        if (l.amountRemaining == 0) l.active = false;

        uint256 cost = amount * l.pricePerShare;
        usdc.safeTransferFrom(msg.sender, l.seller, cost);
        shares.safeTransferFrom(l.seller, msg.sender, l.propertyId, amount, "");
        emit Bought(listingId, msg.sender, amount, cost);
    }
}
