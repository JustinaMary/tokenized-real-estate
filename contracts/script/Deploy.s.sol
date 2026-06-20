// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PropertyShares} from "../src/PropertyShares.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {ComplianceRegistry} from "../src/ComplianceRegistry.sol";

/// @notice Deploys the full platform to Monad testnet and seeds demo properties.
/// Run:
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        ComplianceRegistry registry = new ComplianceRegistry();
        MockUSDC usdc = new MockUSDC();
        PropertyShares shares = new PropertyShares(address(usdc), address(registry));
        Marketplace market = new Marketplace(address(usdc), address(shares));

        // Verify the deployer (issuer) so it can hold the freshly-minted supply.
        // In production the backend VERIFIER_ROLE signer verifies real users.
        registry.setKyc(msg.sender, true);

        // Seed a few demo properties (metadata pinned to IPFS separately).
        shares.createProperty(10_000, 100 * 1e6, "ipfs://REPLACE_WITH_CID/sea-view-apartment.json");
        shares.createProperty(10_000, 250 * 1e6, "ipfs://REPLACE_WITH_CID/downtown-office.json");
        shares.createProperty(5_000, 500 * 1e6, "ipfs://REPLACE_WITH_CID/luxury-villa.json");

        vm.stopBroadcast();

        console.log("ComplianceRegistry:", address(registry));
        console.log("MockUSDC:          ", address(usdc));
        console.log("PropertyShares:    ", address(shares));
        console.log("Marketplace:       ", address(market));
    }
}
