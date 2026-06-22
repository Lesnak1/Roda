// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SavingsCircle
/// @notice Trustless rotating savings & credit association (ROSCA / "para günü") for Arc.
///         Built for Arc Testnet where USDC is the native gas token. All circle
///         contributions use ERC-20 USDC (6 decimals). No off-chain organizer is
///         trusted: contributions are escrowed by the contract, the payout order is
///         fixed at start, and defaults are covered by each member's collateral.
/// @dev    Decimals: ERC-20 USDC = 6. Never assume 18 decimals here.
contract SavingsCircle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Types ---
    enum State {
        Recruiting, // collecting members
        Active, // rounds in progress
        Completed // every member has received the pot once
    }

    // --- Immutable config ---
    IERC20 public immutable usdc; // ERC-20 USDC (6 decimals)
    address public immutable creator;
    uint256 public immutable contributionAmount; // per-round contribution, 6 decimals
    uint256 public immutable collateralAmount; // security deposit (== contributionAmount)
    uint8 public immutable memberCount; // total seats in the circle
    uint256 public immutable roundDuration; // seconds per round

    // --- Mutable state ---
    State public state;
    address[] public members; // payout order == join order
    mapping(address => bool) public isMember;
    mapping(address => uint256) public collateral; // remaining collateral per member
    mapping(address => bool) public collateralWithdrawn;

    uint256 public currentRound; // 0-indexed; total rounds == memberCount
    uint256 public roundDeadline; // timestamp the current round must be settled by

    mapping(uint256 => mapping(address => bool)) public hasContributed; // round => member => paid
    mapping(uint256 => uint256) public roundPot; // round => collected pot
    mapping(uint256 => bool) public roundClosed; // round => settled
    mapping(uint256 => bool) public payoutClaimed; // round => beneficiary withdrew

    // --- Events (used for off-chain reputation & schedule indexing) ---
    event MemberJoined(address indexed member, uint256 index, uint256 collateral);
    event CircleStarted(uint256 startTime, uint256 firstDeadline);
    event Contributed(uint256 indexed round, address indexed member, uint256 amount);
    event Defaulted(uint256 indexed round, address indexed member, uint256 coveredFromCollateral);
    event RoundClosed(uint256 indexed round, address indexed beneficiary, uint256 pot);
    event PayoutClaimed(uint256 indexed round, address indexed beneficiary, uint256 amount);
    event CircleCompleted(uint256 endTime);
    event CollateralWithdrawn(address indexed member, uint256 amount);

    // --- Errors ---
    error NotRecruiting();
    error NotActive();
    error AlreadyMember();
    error CircleFull();
    error NotMember();
    error AlreadyContributed();
    error RoundNotOver();
    error RoundAlreadyClosed();
    error RoundNotClosed();
    error NotBeneficiary();
    error AlreadyClaimed();
    error NotCompleted();
    error NothingToWithdraw();

    constructor(
        address _usdc,
        address _creator,
        uint256 _contributionAmount,
        uint8 _memberCount,
        uint256 _roundDuration
    ) {
        require(_usdc != address(0), "usdc=0");
        require(_memberCount >= 2, "memberCount<2");
        require(_contributionAmount > 0, "contribution=0");
        require(_roundDuration > 0, "duration=0");

        usdc = IERC20(_usdc);
        creator = _creator;
        contributionAmount = _contributionAmount;
        collateralAmount = _contributionAmount; // 1 round worth of collateral
        memberCount = _memberCount;
        roundDuration = _roundDuration;
        state = State.Recruiting;
    }

    // --- Views ---
    function totalRounds() external view returns (uint256) {
        return memberCount;
    }

    function memberList() external view returns (address[] memory) {
        return members;
    }

    function membersJoined() external view returns (uint256) {
        return members.length;
    }

    /// @notice The member scheduled to receive the pot in a given round.
    function beneficiaryOf(uint256 round) public view returns (address) {
        if (round >= members.length) return address(0);
        return members[round];
    }

    // --- Step: join (Recruiting) ---
    /// @notice Join the circle by locking a security deposit (collateral).
    ///         Requires prior USDC approve() for collateralAmount.
    function join() external nonReentrant {
        if (state != State.Recruiting) revert NotRecruiting();
        if (isMember[msg.sender]) revert AlreadyMember();
        if (members.length >= memberCount) revert CircleFull();

        usdc.safeTransferFrom(msg.sender, address(this), collateralAmount);
        isMember[msg.sender] = true;
        collateral[msg.sender] = collateralAmount;
        members.push(msg.sender);
        emit MemberJoined(msg.sender, members.length - 1, collateralAmount);

        if (members.length == memberCount) {
            state = State.Active;
            currentRound = 0;
            roundDeadline = block.timestamp + roundDuration;
            emit CircleStarted(block.timestamp, roundDeadline);
        }
    }

    // --- Step: contribute (Active) ---
    /// @notice Pay this round's contribution. Requires prior approve() for contributionAmount.
    function contribute() external nonReentrant {
        if (state != State.Active) revert NotActive();
        if (!isMember[msg.sender]) revert NotMember();
        uint256 round = currentRound;
        if (hasContributed[round][msg.sender]) revert AlreadyContributed();

        usdc.safeTransferFrom(msg.sender, address(this), contributionAmount);
        hasContributed[round][msg.sender] = true;
        roundPot[round] += contributionAmount;
        emit Contributed(round, msg.sender, contributionAmount);
    }

    // --- Step: close round (Active) ---
    /// @notice Settle the current round. Callable by anyone once everyone has paid
    ///         OR the round deadline has passed. Missing contributions are covered
    ///         from the defaulter's collateral. Advances to the next round.
    function closeRound() external nonReentrant {
        if (state != State.Active) revert NotActive();
        uint256 round = currentRound;
        if (roundClosed[round]) revert RoundAlreadyClosed();

        bool everyonePaid = roundPot[round] == contributionAmount * memberCount;
        if (!everyonePaid && block.timestamp < roundDeadline) revert RoundNotOver();

        // Cover defaults from collateral.
        if (!everyonePaid) {
            uint256 n = members.length;
            for (uint256 i = 0; i < n; i++) {
                address m = members[i];
                if (!hasContributed[round][m]) {
                    uint256 covered = collateral[m] >= contributionAmount
                        ? contributionAmount
                        : collateral[m];
                    if (covered > 0) {
                        collateral[m] -= covered;
                        roundPot[round] += covered;
                    }
                    emit Defaulted(round, m, covered);
                }
            }
        }

        roundClosed[round] = true;
        emit RoundClosed(round, members[round], roundPot[round]);

        // Advance.
        if (round + 1 == memberCount) {
            state = State.Completed;
            emit CircleCompleted(block.timestamp);
        } else {
            currentRound = round + 1;
            roundDeadline = block.timestamp + roundDuration;
        }
    }

    // --- Step: claim payout (pull pattern) ---
    /// @notice The round beneficiary withdraws the settled pot.
    function claimPayout(uint256 round) external nonReentrant {
        if (!roundClosed[round]) revert RoundNotClosed();
        if (msg.sender != members[round]) revert NotBeneficiary();
        if (payoutClaimed[round]) revert AlreadyClaimed();

        payoutClaimed[round] = true;
        uint256 amount = roundPot[round];
        usdc.safeTransfer(msg.sender, amount);
        emit PayoutClaimed(round, msg.sender, amount);
    }

    // --- Step: withdraw collateral (Completed) ---
    /// @notice After the circle completes, members reclaim any remaining collateral.
    function withdrawCollateral() external nonReentrant {
        if (state != State.Completed) revert NotCompleted();
        if (!isMember[msg.sender]) revert NotMember();
        if (collateralWithdrawn[msg.sender]) revert NothingToWithdraw();

        uint256 amount = collateral[msg.sender];
        collateralWithdrawn[msg.sender] = true;
        collateral[msg.sender] = 0;
        if (amount > 0) {
            usdc.safeTransfer(msg.sender, amount);
        }
        emit CollateralWithdrawn(msg.sender, amount);
    }
}
