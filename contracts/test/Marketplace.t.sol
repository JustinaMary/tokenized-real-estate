// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PropertyShares} from "../src/PropertyShares.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

contract MarketplaceTest is Test {
    MockUSDC usdc;
    PropertyShares shares;
    Marketplace market;
    ComplianceRegistry registry;

    address issuer = makeAddr("issuer");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");

    uint256 id;
    uint256 constant LISTING_PRICE = 120 * 1e6; // 120 mUSDC per share

    function setUp() public {
        usdc = new MockUSDC();
        registry = new ComplianceRegistry();
        vm.prank(issuer);
        shares = new PropertyShares(address(usdc), address(registry));
        market = new Marketplace(address(usdc), address(shares));

        // verify all participants so they can hold/receive shares
        registry.setKyc(issuer, true);
        registry.setKyc(seller, true);
        registry.setKyc(buyer, true);

        _fund(issuer);
        _fund(seller);
        _fund(buyer);

        // issuer creates a property and the seller buys 1000 shares on primary
        vm.prank(issuer);
        id = shares.createProperty(10_000, 100 * 1e6, "ipfs://prop1");
        vm.prank(seller);
        shares.buyPrimary(id, 1000);

        // seller approves the marketplace to move their shares (escrow-less)
        vm.prank(seller);
        shares.setApprovalForAll(address(market), true);
        // buyer approves the marketplace to spend their mUSDC
        vm.prank(buyer);
        usdc.approve(address(market), type(uint256).max);
    }

    function _fund(address who) internal {
        vm.startPrank(who);
        for (uint256 i = 0; i < 200; i++) {
            usdc.faucet();
        }
        usdc.approve(address(shares), type(uint256).max);
        vm.stopPrank();
    }

    function _list(uint256 amount) internal returns (uint256 listingId) {
        vm.prank(seller);
        listingId = market.list(id, amount, LISTING_PRICE);
    }

    function test_ListCreatesActiveListing() public {
        uint256 listingId = _list(500);
        (address s, uint256 propertyId, uint256 remaining, uint256 price, bool active) =
            market.listings(listingId);
        assertEq(s, seller);
        assertEq(propertyId, id);
        assertEq(remaining, 500);
        assertEq(price, LISTING_PRICE);
        assertTrue(active);
    }

    function test_BuyFullFillTransfersSharesAndPaysSeller() public {
        uint256 listingId = _list(500);
        uint256 sellerUsdcBefore = usdc.balanceOf(seller);

        vm.prank(buyer);
        market.buy(listingId, 500);

        assertEq(shares.balanceOf(buyer, id), 500);
        assertEq(shares.balanceOf(seller, id), 500); // had 1000, sold 500
        assertEq(usdc.balanceOf(seller), sellerUsdcBefore + 500 * LISTING_PRICE);

        (,, uint256 remaining,, bool active) = market.listings(listingId);
        assertEq(remaining, 0);
        assertFalse(active);
    }

    function test_BuyPartialFillDecrementsRemaining() public {
        uint256 listingId = _list(500);

        vm.prank(buyer);
        market.buy(listingId, 200);

        assertEq(shares.balanceOf(buyer, id), 200);
        (,, uint256 remaining,, bool active) = market.listings(listingId);
        assertEq(remaining, 300);
        assertTrue(active);
    }

    function test_BuyMoreThanRemainingReverts() public {
        uint256 listingId = _list(500);
        vm.prank(buyer);
        vm.expectRevert();
        market.buy(listingId, 501);
    }

    function test_CancelBySellerDeactivates() public {
        uint256 listingId = _list(500);
        vm.prank(seller);
        market.cancel(listingId);

        (,,,, bool active) = market.listings(listingId);
        assertFalse(active);

        vm.prank(buyer);
        vm.expectRevert();
        market.buy(listingId, 1);
    }

    function test_CancelByNonSellerReverts() public {
        uint256 listingId = _list(500);
        vm.prank(buyer);
        vm.expectRevert();
        market.cancel(listingId);
    }

    function test_BuyFailsIfSellerRevokedApproval() public {
        uint256 listingId = _list(500);
        vm.prank(seller);
        shares.setApprovalForAll(address(market), false);

        vm.prank(buyer);
        vm.expectRevert();
        market.buy(listingId, 100);
    }

    function test_ListingCountTracksListings() public {
        assertEq(market.listingCount(), 0);
        _list(100);
        _list(100);
        assertEq(market.listingCount(), 2);
    }
}
