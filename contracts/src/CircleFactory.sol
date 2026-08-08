// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
        uint256 recruitingDuration;
        uint256 createdAt;
    }

    CircleInfo[] public circles;
    mapping(address => uint256[]) public circlesByCreator;

    event CircleCreated(
        address indexed circle,
        address indexed creator,
        uint256 contributionAmount,
        uint8 memberCount,
        uint256 roundDuration,
        uint256 recruitingDuration
    );

    constructor(address _usdc) {
        require(_usdc != address(0), "usdc=0");
        usdc = _usdc;
    }

    /// @notice Create a new savings circle with default 24h grace period.
    function createCircle(
        uint256 contributionAmount,
        uint8 memberCount,
        uint256 roundDuration,
        uint256 recruitingDuration
    ) external returns (address circleAddr) {
        return createCircleWithGrace(contributionAmount, memberCount, roundDuration, recruitingDuration, 86400);
    }

    /// @notice Create a new savings circle with explicit grace period duration (min 1h, max 7d).
    function createCircleWithGrace(
        uint256 contributionAmount,
        uint8 memberCount,
        uint256 roundDuration,
        uint256 recruitingDuration,
        uint256 gracePeriod
    ) public returns (address circleAddr) {
        SavingsCircle circle = new SavingsCircle(
            usdc,
            msg.sender,
            contributionAmount,
            memberCount,
            roundDuration,
            recruitingDuration,
            gracePeriod
        );
        circleAddr = address(circle);

        circles.push(
            CircleInfo({
                circle: circleAddr,
                creator: msg.sender,
                contributionAmount: contributionAmount,
                memberCount: memberCount,
                roundDuration: roundDuration,
                recruitingDuration: recruitingDuration,
                createdAt: block.timestamp
            })
        );
        circlesByCreator[msg.sender].push(circles.length - 1);

        emit CircleCreated(circleAddr, msg.sender, contributionAmount, memberCount, roundDuration, recruitingDuration);
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
