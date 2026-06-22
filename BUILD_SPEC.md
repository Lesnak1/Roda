# Roda — Build Spec & Architecture Blueprint

A complete technical reference for **Roda**, a trustless rotating savings circle (ROSCA) dApp on **Arc** (Circle's USDC-native EVM Layer 1). This document gives an AI agent or developer everything needed to build, verify, deploy, and extend the project.

---

## 1. Concept

A ROSCA (a.k.a. *tanda*, *susu*, *hui*, *chit fund*, *stokvel*, *gün*) is the most widespread informal savings tool in the world: a group each contributes a fixed amount every round, and members take turns receiving the whole pot. The real-life weak point is **trust** — someone holds the money, and members can stop paying after their turn.

Roda removes the trusted organizer:

- **The smart contract is the escrow** — contributions are locked on-chain.
- **The payout order is fixed and public** at start.
- **Defaults are covered by collateral** — each member locks one round of USDC on join; a missed payment is topped up from their deposit.
- **Reputation is derived from chain events** — no trusted indexer.

**Why the name?** In Afro-Brazilian culture the *roda* is the circle in which everyone takes a turn in the center — a precise metaphor for a rotating savings circle.

---

## 2. Why Arc

| Arc capability | How Roda uses it |
| --- | --- |
| USDC is native gas + unit of account | One asset for both fees and savings |
| Sub-second deterministic finality | "Pay round" / "claim pot" feels instant |
| Stablecoin-first L1 | A fully USDC-denominated savings product is first-class |

### Arc Testnet config (verify at https://docs.arc.io before real txs)

| Key | Value |
| --- | --- |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| WSS | `wss://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| ERC-20 USDC | `0x3600000000000000000000000000000000000000` (6 decimals) |
| Native gas USDC | 18 decimals |

> **Decimals are the #1 correctness risk.** ERC-20 USDC = 6 decimals; native/gas USDC = 18 decimals. Keep them strictly separate.

---

## 3. Repository layout

```
roda/
├─ contracts/                      Foundry project (Solidity 0.8.28)
│  ├─ src/SavingsCircle.sol        One circle: join → contribute → closeRound → claimPayout → withdrawCollateral
│  ├─ src/CircleFactory.sol        Deploys & indexes circles for discovery
│  ├─ test/SavingsCircle.t.sol     Full lifecycle + default-coverage tests
│  ├─ test/mocks/MockUSDC.sol      6-decimal USDC for tests
│  ├─ script/Deploy.s.sol          Deploys CircleFactory to Arc Testnet
│  ├─ foundry.toml · remappings.txt · .env.example
├─ web/                            Next.js (App Router) dApp
│  ├─ src/lib/chains/arcTestnet.ts Arc Testnet chain definition (viem defineChain)
│  ├─ src/lib/{wagmi,contracts,format}.ts · src/lib/abi/*
│  ├─ src/app/{layout,page,providers}.tsx · globals.css
│  ├─ src/components/{WalletGate,CreateCircle,CircleList,CircleDetail,ReputationPanel,TxStatus}.tsx
│  └─ package.json · tsconfig.json · .env.example
├─ README.md
├─ AGENT_SETUP_PROMPT.md
└─ BUILD_SPEC.md
```

---

## 4. Contract design

### State machine

```
Recruiting --(memberCount joins, each locks collateral)--> Active
Active: each round -> members contribute() -> anyone closeRound() -> beneficiary claimPayout()
Active --(last round closed)--> Completed -> members withdrawCollateral()
```

### SavingsCircle.sol

- **Immutables:** `usdc`, `creator`, `contributionAmount`, `collateralAmount` (== contribution), `memberCount`, `roundDuration`.
- **`join()`** — pulls `collateralAmount` via SafeERC20; auto-starts the circle when full.
- **`contribute()`** — pays the current round's contribution into `roundPot[round]`.
- **`closeRound()`** — callable by anyone once all paid OR the deadline passed; covers each defaulter with `min(remainingCollateral, share)` and emits `Defaulted`; advances the round (or completes the circle).
- **`claimPayout(round)`** — beneficiary = `members[round]`; pull pattern, ReentrancyGuard.
- **`withdrawCollateral()`** — only when `Completed`; returns remaining collateral.
- **Safety:** OpenZeppelin `SafeERC20` + `ReentrancyGuard`, checks-effects-interactions, custom errors.
- **Views for the UI:** `state`, `contributionAmount`, `collateralAmount`, `memberCount`, `membersJoined`, `currentRound`, `roundDeadline`, `memberList`, `hasContributed(round,addr)`, `roundClosed(round)`, `beneficiaryOf(round)`, `payoutClaimed(round)`.
- **Events:** `MemberJoined`, `CircleStarted`, `Contributed`, `Defaulted`, `RoundClosed`, `PayoutClaimed`, `CircleCompleted`, `CollateralWithdrawn`.

### CircleFactory.sol

- `createCircle(contributionAmount, memberCount, roundDuration)` deploys a `SavingsCircle` and indexes it.
- `getCircles(offset, limit)` returns an array of `{ circle, creator, contributionAmount, memberCount, roundDuration, createdAt }` for discovery.
- Emits `CircleCreated`.

### MockUSDC.sol

- 6-decimal ERC-20 with a `mint` for tests only.

---

## 5. Frontend design

- **Stack:** Next.js App Router, Wagmi v2, Viem, @tanstack/react-query, injected connector.
- **Chain:** `arcTestnet` via `defineChain` (native USDC 18d).
- **Env:** `NEXT_PUBLIC_FACTORY_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_ARC_RPC_URL`.
- **Decimals helpers:** `formatUsdc`/`parseUsdc` (6) for the token; `formatGasUsdc` (18) for gas balance.
- **Components:**
  - `WalletGate` — connect / wrong-network / faucet states; shows native + ERC-20 balances.
  - `CreateCircle` — form + live preview (pot, collateral, rounds, total).
  - `CircleList` — discovery grid with skeletons + empty state.
  - `CircleDetail` — stats, stage actions (approve/join/contribute/close/claim/withdraw), `SchedulePanel` timeline, `ReputationPanel`.
  - `ReputationPanel` — trust scores from `Contributed`/`Defaulted` events via `getContractEvents`.
  - `TxStatus` — pending → confirming → confirmed/failed with explorer links.
- **Design system (globals.css):** dark "ink" background, animated aurora glows, glass cards, gradient brand (blue→violet→cyan), Inter + JetBrains Mono via `next/font`, micro-interactions, reduced-motion support, responsive grid. **UI copy is fully in English.**

---

## 6. Build, test, deploy, run

```bash
# Contracts
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
cp .env.example .env            # PRIVATE_KEY (TESTNET only)
forge build
forge test -vvv
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.network --broadcast

# Frontend
cd ../web
npm install
cp .env.example .env.local      # NEXT_PUBLIC_FACTORY_ADDRESS = deployed factory
npm run build                   # zero errors expected
npm run dev                     # http://localhost:3000
```

Deploy the frontend to Vercel by importing `web/` and setting the same `NEXT_PUBLIC_*` env vars.

### End-to-end test flow

1. Connect wallet → switch to Arc Testnet → get USDC from the faucet.
2. Create a circle (e.g. 10 USDC × 3 members, 1-minute rounds for a fast demo).
3. From two more accounts: Discover → open circle → approve + Join (auto-starts when full).
4. Each round: approve + contribute → Close round → beneficiary Claims pot.
5. After the last round: everyone Withdraws collateral; trust scores update from events.

---

## 7. Common pitfalls

- **Decimal mismatch** — using 18-decimal math on the 6-decimal token (or vice versa). Always use the provided helpers.
- **Approvals** — `join` needs allowance ≥ collateral; `contribute` needs allowance ≥ contribution. The UI gates the button accordingly.
- **Round closing** — anyone can close after the deadline; do not assume only members close.
- **Arc params drift** — Arc Testnet is early; re-verify chain ID, RPC, and USDC address before deploying.

---

## 8. Roadmap (utility beyond MVP)

- **Permit2 / EIP-2612** — contribute in a single signature.
- **Cross-chain join via CCTP** — contribute USDC from another chain into an Arc circle.
- **Opt-in privacy** for contribution amounts using Arc privacy features.
- **Randomized payout order** (commit-reveal) for fairness.
- **Multi-round collateral** and credit-line variants.

---

## 9. Disclaimer

Testnet only. Unaudited. Not financial advice. Re-verify all Arc addresses and network parameters against official Circle/Arc documentation before any real use.
