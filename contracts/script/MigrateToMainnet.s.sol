// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CircleFactory} from "../src/CircleFactory.sol";

contract MigrateToMainnet is Script {
    // Arc Mainnet ERC-20 USDC Address (6 Decimals)
    address constant ARC_MAINNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Roda CircleFactory to Arc Mainnet...");
        console.log("Target ERC-20 USDC:", ARC_MAINNET_USDC);

        CircleFactory factory = new CircleFactory(ARC_MAINNET_USDC);

        console.log("CircleFactory Deployed at:", address(factory));
        console.log("Mainnet Migration Complete!");

        vm.stopBroadcast();
    }
}
