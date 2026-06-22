// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CircleFactory} from "../src/CircleFactory.sol";
import {SavingsCircle} from "../src/SavingsCircle.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract SavingsCircleTest is Test {
    MockUSDC usdc;
    CircleFactory factory;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA401);

    uint256 constant CONTRIBUTION = 100e6; // 100 USDC (6 decimals)
    uint8 constant MEMBERS = 3;
    uint256 constant DURATION = 1 days;

    function setUp() public {
        usdc = new MockUSDC();
        factory = new CircleFactory(address(usdc));
        address[3] memory users = [alice, bob, carol];
        for (uint256 i = 0; i < users.length; i++) {
            usdc.mint(users[i], 1_000e6);
        }
    }

    function _newCircle() internal returns (SavingsCircle) {
        address addr = factory.createCircle(CONTRIBUTION, MEMBERS, DURATION);
        return SavingsCircle(addr);
    }

    function _join(SavingsCircle c, address who) internal {
        vm.startPrank(who);
        usdc.approve(address(c), type(uint256).max);
        c.join();
        vm.stopPrank();
    }

    function _contribute(SavingsCircle c, address who) internal {
        vm.startPrank(who);
        c.contribute();
        vm.stopPrank();
    }

    function testFactoryCreatesAndIndexes() public {
        SavingsCircle c = _newCircle();
        assertEq(factory.circleCount(), 1);
        assertEq(c.contributionAmount(), CONTRIBUTION);
        assertEq(c.memberCount(), MEMBERS);
        assertEq(uint8(c.state()), uint8(SavingsCircle.State.Recruiting));
    }

    function testJoinLocksCollateralAndStarts() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        assertEq(uint8(c.state()), uint8(SavingsCircle.State.Recruiting));
        _join(c, carol);
        // Full -> Active
        assertEq(uint8(c.state()), uint8(SavingsCircle.State.Active));
        assertEq(usdc.balanceOf(address(c)), CONTRIBUTION * MEMBERS); // 3 collaterals
        assertEq(c.collateral(alice), CONTRIBUTION);
    }

    function testFullHappyRound() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);

        // Round 0: everyone contributes, alice (index 0) is beneficiary.
        _contribute(c, alice);
        _contribute(c, bob);
        _contribute(c, carol);
        c.closeRound();
        assertTrue(c.roundClosed(0));

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        c.claimPayout(0);
        assertEq(usdc.balanceOf(alice) - before, CONTRIBUTION * MEMBERS);
    }

    function testCannotClaimIfNotBeneficiary() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);
        _contribute(c, alice);
        _contribute(c, bob);
        _contribute(c, carol);
        c.closeRound();
        vm.prank(bob);
        vm.expectRevert(SavingsCircle.NotBeneficiary.selector);
        c.claimPayout(0);
    }

    function testDoubleClaimReverts() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);
        _contribute(c, alice);
        _contribute(c, bob);
        _contribute(c, carol);
        c.closeRound();
        vm.startPrank(alice);
        c.claimPayout(0);
        vm.expectRevert(SavingsCircle.AlreadyClaimed.selector);
        c.claimPayout(0);
        vm.stopPrank();
    }

    function testDefaultCoveredByCollateral() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);

        // Round 0: carol does NOT contribute.
        _contribute(c, alice);
        _contribute(c, bob);

        // Cannot close before deadline (not everyone paid).
        vm.expectRevert(SavingsCircle.RoundNotOver.selector);
        c.closeRound();

        // After deadline, anyone can close; carol's collateral covers her share.
        vm.warp(block.timestamp + DURATION + 1);
        c.closeRound();

        assertEq(c.collateral(carol), 0); // collateral consumed
        // Pot still full thanks to collateral coverage.
        assertEq(c.roundPot(0), CONTRIBUTION * MEMBERS);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        c.claimPayout(0);
        assertEq(usdc.balanceOf(alice) - before, CONTRIBUTION * MEMBERS);
    }

    function testCompleteCircleAndWithdrawCollateral() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);

        address[3] memory order = [alice, bob, carol];
        for (uint256 r = 0; r < MEMBERS; r++) {
            _contribute(c, alice);
            _contribute(c, bob);
            _contribute(c, carol);
            c.closeRound();
            vm.prank(order[r]);
            c.claimPayout(r);
        }
        assertEq(uint8(c.state()), uint8(SavingsCircle.State.Completed));

        // Each member reclaims full collateral (no defaults).
        uint256 before = usdc.balanceOf(bob);
        vm.prank(bob);
        c.withdrawCollateral();
        assertEq(usdc.balanceOf(bob) - before, CONTRIBUTION);
    }

    function testCannotContributeTwiceSameRound() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);
        _contribute(c, alice);
        vm.startPrank(alice);
        vm.expectRevert(SavingsCircle.AlreadyContributed.selector);
        c.contribute();
        vm.stopPrank();
    }

    function testLeaveDuringRecruiting() public {
        SavingsCircle c = _newCircle();
        
        // Alice joins -> locked collateral
        _join(c, alice);
        assertEq(c.collateral(alice), CONTRIBUTION);
        assertEq(c.membersJoined(), 1);
        assertTrue(c.isMember(alice));
        
        // Alice leaves
        vm.prank(alice);
        c.leave();
        
        assertEq(c.collateral(alice), 0);
        assertEq(c.membersJoined(), 0);
        assertFalse(c.isMember(alice));
    }

    function testSerialDefaultDeficit() public {
        SavingsCircle c = _newCircle();
        _join(c, alice);
        _join(c, bob);
        _join(c, carol);

        // Round 0: Happy round
        _contribute(c, alice);
        _contribute(c, bob);
        _contribute(c, carol);
        c.closeRound();
        vm.prank(alice);
        c.claimPayout(0);

        // Round 1: Bob (beneficiary) defaults on Round 1 and Round 2
        _contribute(c, alice);
        // Bob defaults
        _contribute(c, carol);
        
        vm.warp(block.timestamp + DURATION + 1);
        c.closeRound(); // Bob's collateral is consumed to cover Round 1 pot.
        
        assertEq(c.collateral(bob), 0);
        vm.prank(bob);
        c.claimPayout(1); // Bob gets the full pot because his collateral covered his default.

        // Round 2: Bob defaults again. No collateral left!
        _contribute(c, alice);
        // Bob defaults again
        _contribute(c, carol);
        
        vm.warp(block.timestamp + DURATION * 2 + 1);
        c.closeRound(); // Bob defaults again, but collateral is 0.

        // The round pot is short! It has only alice + carol contributions.
        assertEq(c.roundPot(2), CONTRIBUTION * 2);
    }
}
