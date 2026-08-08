// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReputationRegistry {
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata feedbackUri,
        bytes32 feedbackHash
    ) external;
}

/// @title ReputationManager
/// @notice Helper contract for ERC-8004 validator wallet feedback submission.
///         Enforces the dual-wallet rule: feedback must be submitted by the
///         validator wallet (AI_AGENT_VALIDATOR_WALLET_ID), not the agent owner.
contract ReputationManager {
    address public immutable validatorWallet;
    address public immutable reputationRegistry;

    event ReputationSubmitted(
        uint256 indexed agentId,
        address indexed client,
        int128 score,
        string tag
    );

    error OnlyValidatorAllowed();
    error ZeroAddress();

    modifier onlyValidator() {
        if (msg.sender != validatorWallet) revert OnlyValidatorAllowed();
        _;
    }

    constructor(address _validatorWallet, address _reputationRegistry) {
        if (_validatorWallet == address(0) || _reputationRegistry == address(0)) revert ZeroAddress();
        validatorWallet = _validatorWallet;
        reputationRegistry = _reputationRegistry;
    }

    /// @notice Submit feedback on behalf of the validator wallet to ReputationRegistry.
    function submitFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata feedbackUri,
        bytes32 feedbackHash
    ) external onlyValidator {
        IReputationRegistry(reputationRegistry).giveFeedback(
            agentId,
            value,
            valueDecimals,
            tag1,
            tag2,
            feedbackUri,
            feedbackHash
        );
        emit ReputationSubmitted(agentId, msg.sender, value, tag1);
    }
}
