// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC usdc;
    address alice = makeAddr("alice");

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_HasSixDecimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_NameAndSymbol() public view {
        assertEq(usdc.symbol(), "mUSDC");
    }

    function test_FaucetMintsFixedAmount() public {
        vm.prank(alice);
        usdc.faucet();
        assertEq(usdc.balanceOf(alice), 10_000 * 1e6);
    }

    function test_FaucetIsRepeatable() public {
        vm.startPrank(alice);
        usdc.faucet();
        usdc.faucet();
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), 20_000 * 1e6);
    }
}
