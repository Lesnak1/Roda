// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {CircleFactory} from "../src/CircleFactory.sol";

/// @notice Deploys CircleFactory to Arc Testnet.
/// @dev    USDC address is read from the USDC_ADDRESS env var.
///         VERIFY against the official Contract Addresses page before deploying:
///         https://docs.arc.io/arc/references/contract-addresses
///         Arc Testnet USDC snapshot: 0x3600000000000000000000000000000000000000
contract Deploy is Script {
    function run() external returns (CircleFactory factory) {
        address usdc = vm.envOr(
            "USDC_ADDRESS",
            address(0x3600000000000000000000000000000000000000)
        );
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        factory = new CircleFactory(usdc);
        vm.stopBroadcast();

        console2.log("CircleFactory deployed at:", address(factory));
        console2.log("USDC used:", usdc);
        console2.log("Explorer: https://testnet.arcscan.app/address/", address(factory));
    }
}
