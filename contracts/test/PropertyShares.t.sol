// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PropertyShares} from "../src/PropertyShares.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

contract PropertySharesTest is Test {
    MockUSDC usdc;
    PropertyShares shares;
    ComplianceRegistry registry;

    address issuer = makeAddr("issuer"); // contract owner / property issuer
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol"); // unverified

    uint256 constant SUPPLY = 10_000;
    uint256 constant PRICE = 100 * 1e6; // 100 mUSDC per share

    function setUp() public {
        usdc = new MockUSDC();
        registry = new ComplianceRegistry(); // this test contract is admin + verifier
        vm.prank(issuer);
        shares = new PropertyShares(address(usdc), address(registry));

        // verify participants (issuer must be verified to receive minted supply)
        registry.setKyc(issuer, true);
        registry.setKyc(alice, true);
        registry.setKyc(bob, true);

        // fund participants
        _fund(issuer);
        _fund(alice);
        _fund(bob);
    }

    function _fund(address who) internal {
        vm.startPrank(who);
        for (uint256 i = 0; i < 200; i++) {
            usdc.faucet(); // 200 * 10k = 2M mUSDC each, plenty
        }
        usdc.approve(address(shares), type(uint256).max);
        vm.stopPrank();
    }

    function _createProperty() internal returns (uint256 id) {
        vm.prank(issuer);
        id = shares.createProperty(SUPPLY, PRICE, "ipfs://prop1");
    }

    // --- createProperty ---

    function test_OwnerCanCreateProperty() public {
        uint256 id = _createProperty();
        (uint256 supply, uint256 price, address propIssuer,, uint256 sold) = shares.properties(id);
        assertEq(supply, SUPPLY);
        assertEq(price, PRICE);
        assertEq(propIssuer, issuer);
        assertEq(sold, 0);
        // full supply minted to issuer as inventory
        assertEq(shares.balanceOf(issuer, id), SUPPLY);
    }

    function test_NonOwnerCannotCreateProperty() public {
        vm.prank(alice);
        vm.expectRevert();
        shares.createProperty(SUPPLY, PRICE, "ipfs://prop1");
    }

    function test_UriReturnsMetadata() public {
        uint256 id = _createProperty();
        assertEq(shares.uri(id), "ipfs://prop1");
    }

    // --- buyPrimary ---

    function test_BuyPrimaryTransfersSharesAndPaysIssuer() public {
        uint256 id = _createProperty();
        uint256 issuerBalBefore = usdc.balanceOf(issuer);

        vm.prank(alice);
        shares.buyPrimary(id, 100);

        assertEq(shares.balanceOf(alice, id), 100);
        assertEq(shares.balanceOf(issuer, id), SUPPLY - 100);
        assertEq(usdc.balanceOf(issuer), issuerBalBefore + 100 * PRICE);
        (,,,, uint256 sold) = shares.properties(id);
        assertEq(sold, 100);
    }

    function test_BuyPrimaryRevertsWhenExceedingSupply() public {
        uint256 id = _createProperty();
        vm.prank(alice);
        vm.expectRevert();
        shares.buyPrimary(id, SUPPLY + 1);
    }

    // --- rent: claimable math ---

    function test_DepositRentSplitsProportionally() public {
        uint256 id = _createProperty();

        // alice buys 2000 (20%), bob buys 3000 (30%), issuer keeps 5000 (50%)
        vm.prank(alice);
        shares.buyPrimary(id, 2000);
        vm.prank(bob);
        shares.buyPrimary(id, 3000);

        // issuer deposits 1000 mUSDC of rent
        uint256 rent = 1000 * 1e6;
        vm.prank(issuer);
        shares.depositRent(id, rent);

        assertEq(shares.claimable(id, alice), rent * 2000 / SUPPLY); // 20%
        assertEq(shares.claimable(id, bob), rent * 3000 / SUPPLY); // 30%
        assertEq(shares.claimable(id, issuer), rent * 5000 / SUPPLY); // 50%
    }

    function test_ClaimRentPaysAndZeroesClaimable() public {
        uint256 id = _createProperty();
        vm.prank(alice);
        shares.buyPrimary(id, 2000);

        uint256 rent = 1000 * 1e6;
        vm.prank(issuer);
        shares.depositRent(id, rent);

        uint256 expected = rent * 2000 / SUPPLY;
        uint256 balBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        shares.claimRent(id);

        assertEq(usdc.balanceOf(alice), balBefore + expected);
        assertEq(shares.claimable(id, alice), 0);
    }

    function test_RentAccumulatesAcrossMultipleDeposits() public {
        uint256 id = _createProperty();
        vm.prank(alice);
        shares.buyPrimary(id, 1000); // 10%

        vm.startPrank(issuer);
        shares.depositRent(id, 500 * 1e6);
        shares.depositRent(id, 500 * 1e6);
        vm.stopPrank();

        assertEq(shares.claimable(id, alice), (1000 * 1e6) * 1000 / SUPPLY);
    }

    // --- the critical one: rent correctness across a transfer ---

    function test_RentBeforeTransferStaysWithSeller() public {
        uint256 id = _createProperty();
        vm.prank(alice);
        shares.buyPrimary(id, 1000); // alice 10%

        // rent #1 accrues entirely while alice holds
        uint256 rent1 = 1000 * 1e6;
        vm.prank(issuer);
        shares.depositRent(id, rent1);

        uint256 aliceShareOfRent1 = rent1 * 1000 / SUPPLY;

        // alice transfers all her shares to bob
        vm.prank(alice);
        shares.safeTransferFrom(alice, bob, id, 1000, "");

        // rent #2 accrues while bob holds
        uint256 rent2 = 1000 * 1e6;
        vm.prank(issuer);
        shares.depositRent(id, rent2);

        uint256 bobShareOfRent2 = rent2 * 1000 / SUPPLY;

        // alice keeps her pre-transfer rent; bob gets only post-transfer rent
        assertEq(shares.claimable(id, alice), aliceShareOfRent1);
        assertEq(shares.claimable(id, bob), bobShareOfRent2);
    }

    // --- compliance gating (transfers only) ---

    function test_BuyPrimaryRevertsForUnverifiedBuyer() public {
        uint256 id = _createProperty();
        _fund(carol); // has mUSDC + approval, but not KYC-verified
        vm.prank(carol);
        vm.expectRevert();
        shares.buyPrimary(id, 10);
    }

    function test_TransferToUnverifiedReverts() public {
        uint256 id = _createProperty();
        vm.prank(alice);
        shares.buyPrimary(id, 100);
        vm.prank(alice);
        vm.expectRevert();
        shares.safeTransferFrom(alice, carol, id, 10, "");
    }

    function test_BuyerCanReceiveOnceVerified() public {
        uint256 id = _createProperty();
        _fund(carol);
        vm.prank(carol);
        vm.expectRevert();
        shares.buyPrimary(id, 10);

        registry.setKyc(carol, true);
        vm.prank(carol);
        shares.buyPrimary(id, 10);
        assertEq(shares.balanceOf(carol, id), 10);
    }

    function test_UnverifiedHolderCanStillClaimRent() public {
        // alice (verified) buys, then accrues rent; even if later de-verified,
        // claiming rent (a mUSDC transfer, not a share transfer) still works.
        uint256 id = _createProperty();
        vm.prank(alice);
        shares.buyPrimary(id, 1000);
        vm.prank(issuer);
        shares.depositRent(id, 1000 * 1e6);

        registry.setKyc(alice, false); // de-verify

        uint256 balBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        shares.claimRent(id); // share balance unchanged -> not gated
        assertGt(usdc.balanceOf(alice), balBefore);
    }

    function test_TransferDoesNotStrandOrDoublePayRent() public {
        uint256 id = _createProperty();
        vm.prank(alice);
        shares.buyPrimary(id, 4000);

        vm.prank(issuer);
        shares.depositRent(id, 1000 * 1e6);

        // alice sells half to bob mid-stream
        vm.prank(alice);
        shares.safeTransferFrom(alice, bob, id, 2000, "");

        vm.prank(issuer);
        shares.depositRent(id, 1000 * 1e6);

        // total claimable across all holders must equal total rent deposited
        uint256 total = shares.claimable(id, alice) + shares.claimable(id, bob)
            + shares.claimable(id, issuer);
        assertEq(total, 2000 * 1e6);
    }
}
