// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title SavingsCircle
/// @notice Trustless rotating savings & credit association (ROSCA / "para günü") for Arc.
///         Built for Arc Testnet where USDC is the native gas token. All circle
///         contributions use ERC-20 USDC (6 decimals). Access control & circuit breaker
///         managed via PAUSER_ROLE and GUARDIAN_ROLE.
/// @dev    Decimals: ERC-20 USDC = 6.
contract SavingsCircle is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // --- Roles ---
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // --- Types ---
    enum State {
        Recruiting, // collecting members
        Active, // rounds in progress
        Completed, // every member has received the pot once
        Cancelled // cancelled before starting
    }

    // --- Immutable config ---
    IERC20 public immutable usdc; // ERC-20 USDC (6 decimals)
    address public immutable creator;
    uint256 public immutable contributionAmount; // per-round contribution, 6 decimals
    uint256 public immutable collateralAmount; // security deposit (== contributionAmount)
    uint8 public immutable memberCount; // total seats in the circle
    uint256 public immutable roundDuration; // seconds per round
    uint256 public immutable joinDeadline; // timestamp when circle recruiting ends
    uint256 public immutable gracePeriodDuration; // configurable grace period (default 86400s / 24h, min 1h, max 7d)

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
    mapping(uint256 => bool) public payoutClaimed; // round => beneficiary withdrew full payout
    mapping(uint256 => uint256) public payoutClaimedAmount; // round => amount already claimed
    mapping(uint256 => uint256) public claimablePayout; // round => net payout
    mapping(uint256 => uint256) public withheldFromPayout; // round => withheld collateral

    mapping(address => uint256) public memberDebt; // member => unpaid contribution debt (6 decimals)
    mapping(address => mapping(uint256 => uint256)) public debtByMemberAndRound; // member => round => unpaid amount

    // --- Events ---
    event MemberJoined(address indexed member, uint256 index, uint256 collateral);
    event CircleStarted(uint256 startTime, uint256 firstDeadline);
    event Contributed(uint256 indexed round, address indexed member, uint256 amount);
    event Defaulted(uint256 indexed round, address indexed member, uint256 coveredFromCollateral);
    event RoundClosed(uint256 indexed round, address indexed beneficiary, uint256 pot);
    event PayoutClaimed(uint256 indexed round, address indexed beneficiary, uint256 amount);
    event CircleCompleted(uint256 endTime);
    event CircleCancelled(uint256 timestamp);
    event CollateralWithheld(uint256 indexed round, address indexed member, uint256 amount);
    event CollateralWithdrawn(address indexed member, uint256 amount);
    event DebtRecorded(address indexed member, uint256 indexed round, uint256 amount);
    event DebtRecovered(address indexed member, uint256 indexed round, uint256 amount, uint256 refundedToRound);
    event CleanContributionRecorded(address indexed member, uint256 indexed round, uint256 timestamp);
    event EmergencyTokensWithdrawn(address indexed token, address indexed to, uint256 amount);

    // --- Errors ---
    error NotRecruiting();
    error NotActive();
    error AlreadyMember();
    error CircleFull();
    error NotMember();
    error AlreadyContributed();
    error RoundNotOver();
    error GracePeriodActive();
    error RoundAlreadyClosed();
    error RoundNotClosed();
    error NotBeneficiary();
    error AlreadyClaimed();
    error NotCompleted();
    error NothingToWithdraw();
    error JoinDeadlinePassed();
    error NotCreator();
    error InvalidGracePeriod();

    constructor(
        address _usdc,
        address _creator,
        uint256 _contributionAmount,
        uint8 _memberCount,
        uint256 _roundDuration,
        uint256 _recruitingDuration,
        uint256 _gracePeriod
    ) {
        require(_usdc != address(0), "usdc=0");
        require(_memberCount >= 2, "memberCount<2");
        require(_contributionAmount > 0, "contribution=0");
        require(_roundDuration > 0, "duration=0");
        require(_recruitingDuration > 0, "recruiting=0");

        if (_gracePeriod == 0) {
            gracePeriodDuration = 86400; // Default 24 hours
        } else {
            if (_gracePeriod < 3600 || _gracePeriod > 604800) revert InvalidGracePeriod();
            gracePeriodDuration = _gracePeriod;
        }

        usdc = IERC20(_usdc);
        creator = _creator;
        contributionAmount = _contributionAmount;
        collateralAmount = _contributionAmount; // 1 round worth of collateral
        memberCount = _memberCount;
        roundDuration = _roundDuration;
        state = State.Recruiting;
        joinDeadline = block.timestamp + _recruitingDuration;

        // Role assignments
        _grantRole(DEFAULT_ADMIN_ROLE, _creator);
        _grantRole(PAUSER_ROLE, _creator);
        _grantRole(GUARDIAN_ROLE, _creator);
    }

    // --- Decimal Conversion Utilities ---
    function to6Decimals(uint256 amount18) public pure returns (uint256) {
        return amount18 / 1e12;
    }

    function to18Decimals(uint256 amount6) public pure returns (uint256) {
        return amount6 * 1e12;
    }

    // --- Emergency Controls ---
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function emergencyWithdraw(address token, address to, uint256 amount) external onlyRole(PAUSER_ROLE) whenPaused {
        require(to != address(0), "to=0");
        IERC20(token).safeTransfer(to, amount);
        emit EmergencyTokensWithdrawn(token, to, amount);
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

    function beneficiaryOf(uint256 round) public view returns (address) {
        if (round >= members.length) return address(0);
        return members[round];
    }

    function isGracePeriodActive(uint256 round) public view returns (bool) {
        if (state != State.Active || roundClosed[round]) return false;
        return block.timestamp > roundDeadline && block.timestamp <= roundDeadline + gracePeriodDuration;
    }

    // --- Step: join (Recruiting) ---
    function join() external nonReentrant whenNotPaused {
        if (state != State.Recruiting) revert NotRecruiting();
        if (block.timestamp >= joinDeadline) revert JoinDeadlinePassed();
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

    // --- Step: leave (Recruiting) ---
    function leave() external nonReentrant whenNotPaused {
        if (state != State.Recruiting) revert NotRecruiting();
        if (!isMember[msg.sender]) revert NotMember();

        uint256 amount = collateral[msg.sender];
        collateral[msg.sender] = 0;
        isMember[msg.sender] = false;

        uint256 len = members.length;
        uint256 index = type(uint256).max;
        for (uint256 i = 0; i < len; i++) {
            if (members[i] == msg.sender) {
                index = i;
                break;
            }
        }

        if (index != type(uint256).max) {
            for (uint256 i = index; i < len - 1; i++) {
                members[i] = members[i + 1];
            }
            members.pop();
        }

        if (amount > 0) {
            usdc.safeTransfer(msg.sender, amount);
        }
        emit CollateralWithdrawn(msg.sender, amount);
    }

    // --- Step: cancelCircle (Recruiting) ---
    function cancelCircle() external nonReentrant whenNotPaused {
        if (state != State.Recruiting) revert NotRecruiting();
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && msg.sender != creator) revert NotCreator();

        state = State.Cancelled;
        emit CircleCancelled(block.timestamp);
    }

    // --- Step: contribute (Active) ---
    function contribute() external nonReentrant whenNotPaused {
        if (state != State.Active) revert NotActive();
        if (!isMember[msg.sender]) revert NotMember();
        uint256 round = currentRound;
        if (hasContributed[round][msg.sender]) revert AlreadyContributed();

        usdc.safeTransferFrom(msg.sender, address(this), contributionAmount);
        hasContributed[round][msg.sender] = true;
        roundPot[round] += contributionAmount;
        emit Contributed(round, msg.sender, contributionAmount);
        emit CleanContributionRecorded(msg.sender, round, block.timestamp);
    }

    // --- Step: close round (Active) ---
    function closeRound() external nonReentrant whenNotPaused {
        if (state != State.Active) revert NotActive();
        uint256 round = currentRound;
        if (roundClosed[round]) revert RoundAlreadyClosed();

        bool everyonePaid = roundPot[round] == contributionAmount * memberCount;
        
        if (!everyonePaid) {
            if (block.timestamp < roundDeadline + gracePeriodDuration) {
                if (block.timestamp < roundDeadline) {
                    revert RoundNotOver();
                } else {
                    revert GracePeriodActive();
                }
            }
        }

        address beneficiary = members[round];

        if (!everyonePaid) {
            uint256 n = members.length;
            for (uint256 i = 0; i < n; i++) {
                address m = members[i];
                if (m == beneficiary) continue;
                if (!hasContributed[round][m]) {
                    uint256 covered = collateral[m] >= contributionAmount
                        ? contributionAmount
                        : collateral[m];
                    if (covered > 0) {
                        collateral[m] -= covered;
                        roundPot[round] += covered;
                    }
                    
                    uint256 unpaid = contributionAmount - covered;
                    if (unpaid > 0) {
                        debtByMemberAndRound[m][round] = unpaid;
                        memberDebt[m] += unpaid;
                        emit DebtRecorded(m, round, unpaid);
                    }
                    
                    emit Defaulted(round, m, covered);
                }
            }
        }

        roundClosed[round] = true;
        
        uint256 gross = roundPot[round];
        uint256 debtToPay = memberDebt[beneficiary] > gross ? gross : memberDebt[beneficiary];

        if (debtToPay > 0) {
            memberDebt[beneficiary] -= debtToPay;
            uint256 remainingDebtToPay = debtToPay;
            for (uint256 r = 0; r < round; r++) {
                uint256 owed = debtByMemberAndRound[beneficiary][r];
                if (owed > 0) {
                    uint256 pay = owed > remainingDebtToPay ? remainingDebtToPay : owed;
                    debtByMemberAndRound[beneficiary][r] -= pay;
                    claimablePayout[r] += pay;
                    remainingDebtToPay -= pay;
                    emit DebtRecovered(beneficiary, r, pay, r);
                    if (remainingDebtToPay == 0) break;
                }
            }
            gross -= debtToPay;
        }

        uint256 remRounds = memberCount - 1 - round;
        uint256 liability = contributionAmount * remRounds;
        uint256 currCollateral = collateral[beneficiary];
        uint256 withholdAmount = 0;

        if (liability > currCollateral) {
            withholdAmount = liability - currCollateral;
            if (withholdAmount > gross) {
                withholdAmount = gross;
            }
            collateral[beneficiary] = currCollateral + withholdAmount;
            emit CollateralWithheld(round, beneficiary, withholdAmount);
        }

        withheldFromPayout[round] = withholdAmount;
        claimablePayout[round] += gross - withholdAmount;

        emit RoundClosed(round, beneficiary, roundPot[round]);

        if (round + 1 == memberCount) {
            state = State.Completed;
            emit CircleCompleted(block.timestamp);
        } else {
            currentRound = round + 1;
            roundDeadline = block.timestamp + roundDuration;
        }
    }

    // --- Step: claim payout ---
    function claimPayout(uint256 round) external nonReentrant whenNotPaused {
        if (!roundClosed[round]) revert RoundNotClosed();
        if (msg.sender != members[round]) revert NotBeneficiary();

        uint256 totalClaimable = claimablePayout[round];
        uint256 alreadyClaimed = payoutClaimedAmount[round];
        if (alreadyClaimed >= totalClaimable) revert AlreadyClaimed();

        uint256 amount = totalClaimable - alreadyClaimed;
        payoutClaimedAmount[round] = totalClaimable;
        payoutClaimed[round] = true;

        if (amount > 0) {
            usdc.safeTransfer(msg.sender, amount);
        }
        emit PayoutClaimed(round, msg.sender, amount);
    }

    // --- Step: withdraw collateral ---
    function withdrawCollateral() external nonReentrant whenNotPaused {
        if (state != State.Completed && state != State.Cancelled) revert NotCompleted();
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
