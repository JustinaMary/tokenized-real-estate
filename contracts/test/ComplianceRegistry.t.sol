// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

contract ComplianceRegistryTest is Test {
    ComplianceRegistry registry;
    address admin = address(this);
    address verifier = makeAddr("verifier");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        registry = new ComplianceRegistry();
    }

    function test_DeployerHasAdminAndVerifierRoles() public view {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.VERIFIER_ROLE(), admin));
    }

    function test_VerifierCanSetKyc() public {
        registry.setKyc(alice, true);
        assertTrue(registry.kycVerified(alice));
        assertTrue(registry.isVerified(alice));
    }

    function test_VerifierCanSetKyb() public {
        registry.setKyb(bob, true);
        assertTrue(registry.kybVerified(bob));
        assertTrue(registry.isVerified(bob));
    }

    function test_IsVerifiedIsKycOrKyb() public {
        assertFalse(registry.isVerified(alice));
        registry.setKyc(alice, true);
        assertTrue(registry.isVerified(alice));
        registry.setKyc(alice, false);
        assertFalse(registry.isVerified(alice));
    }

    function test_NonVerifierCannotSetKyc() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.setKyc(bob, true);
    }

    function test_AdminCanGrantVerifierRole() public {
        registry.grantRole(registry.VERIFIER_ROLE(), verifier);
        vm.prank(verifier);
        registry.setKyc(alice, true);
        assertTrue(registry.isVerified(alice));
    }

    function test_BatchSetKyc() public {
        address[] memory addrs = new address[](2);
        addrs[0] = alice;
        addrs[1] = bob;
        registry.setKycBatch(addrs, true);
        assertTrue(registry.isVerified(alice));
        assertTrue(registry.isVerified(bob));
    }
}
