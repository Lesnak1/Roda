// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SavingsCircle} from "./SavingsCircle.sol";

/// @title CircleFactory
/// @notice Deploys and indexes SavingsCircle instances so the frontend can
///         discover open circles. Designed for Arc Testnet (USDC native gas).
contract CircleFactory {
    address public immutable usdc;

    struct CircleInfo {
        address circle;
        address creator;
        uint256 contributionAmount; // 6 decimals (ERC-20 USDC)
        uint8 memberCount;
        uint256 roundDuration;
        uint256 createdAt;
    }

    CircleInfo[] public circles;
    mapping(address => uint256[]) public circlesByCreator;

    event CircleCreated(
        address indexed circle,
        address indexed creator,
        uint256 contributionAmount,
        uint8 memberCount,
        uint256 roundDuration
    );

    constructor(address _usdc) {
        require(_usdc != address(0), "usdc=0");
        usdc = _usdc;
    }

    /// @notice Create a new savings circle.
    /// @param contributionAmount Per-round contribution in USDC (6 decimals).
    /// @param memberCount Number of seats (== number of rounds).
    /// @param roundDuration Seconds allowed per round before it can be force-closed.
    function createCircle(
        uint256 contributionAmount,
        uint8 memberCount,
        uint256 roundDuration
    ) external returns (address circleAddr) {
        SavingsCircle circle = new SavingsCircle(
            usdc,
            msg.sender,
            contributionAmount,
            memberCount,
            roundDuration
        );
        circleAddr = address(circle);

        circles.push(
            CircleInfo({
                circle: circleAddr,
                creator: msg.sender,
                contributionAmount: contributionAmount,
                memberCount: memberCount,
                roundDuration: roundDuration,
                createdAt: block.timestamp
            })
        );
        circlesByCreator[msg.sender].push(circles.length - 1);

        emit CircleCreated(circleAddr, msg.sender, contributionAmount, memberCount, roundDuration);
    }

    function circleCount() external view returns (uint256) {
        return circles.length;
    }

    /// @notice Paginated listing for the "discover circles" page.
    function getCircles(uint256 offset, uint256 limit)
        external
        view
        returns (CircleInfo[] memory page)
    {
        uint256 total = circles.length;
        if (offset >= total) return new CircleInfo[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        page = new CircleInfo[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = circles[i];
        }
    }
}
