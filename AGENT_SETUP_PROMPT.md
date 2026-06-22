# Roda — AI Agent Setup Prompt

Use this to have your AI coding agent (Cursor, Claude Code, Windsurf, Copilot, etc.) set up and run **Roda** end-to-end from your IDE.

## How to use

1. Unzip `roda.zip` into a new folder and open it in your IDE.
2. Open your AI agent in that workspace.
3. Copy **everything inside the code block below** and paste it as your prompt.
4. Follow the agent as it installs, tests, deploys, and runs the app. Approve terminal commands when asked.

> Keep `BUILD_SPEC.md` in the workspace too — your agent can read it for full architecture context.

---

## The prompt (copy everything below)

```text
You are an expert blockchain engineer (Solidity + Foundry + Next.js + Wagmi/Viem).
The project "Roda" is already in this workspace (unzipped from roda.zip). Roda is a
trustless rotating savings circle (ROSCA) dApp for Arc — Circle's USDC-native EVM L1.

Your job: install dependencies, verify it builds and all tests pass, deploy the
contracts to Arc Testnet, and run the frontend locally. Do NOT redesign the
architecture or rename anything. Fix only real errors, and explain each fix.

READ FIRST
- Read README.md and BUILD_SPEC.md for full context before running anything.

PROJECT LAYOUT
- contracts/  Foundry project (Solidity 0.8.28): SavingsCircle.sol, CircleFactory.sol,
              test/ (full lifecycle + default-coverage), script/Deploy.s.sol, MockUSDC.
- web/        Next.js (App Router) + Wagmi v2 + Viem dApp. UI is in English.

STEP 1 — CONTRACTS
1. cd contracts
2. Ensure Foundry is installed (https://book.getfoundry.sh). If not, install it.
3. forge install foundry-rs/forge-std
4. forge install OpenZeppelin/openzeppelin-contracts
5. cp .env.example .env  then set PRIVATE_KEY to a TESTNET-ONLY key (never a real key).
6. forge build      -> must compile with no errors.
7. forge test -vvv  -> ALL tests must pass. If any fail, show the trace and fix the bug.
8. Deploy:
   forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.network --broadcast
9. Print the deployed CircleFactory address.

STEP 2 — FRONTEND
1. cd ../web
2. npm install
3. cp .env.example .env.local  then set NEXT_PUBLIC_FACTORY_ADDRESS to the deployed factory.
4. npm run build  -> must succeed with ZERO TypeScript/lint errors.
5. npm run dev    -> confirm http://localhost:3000 loads with no console errors.

ARC TESTNET (verify against https://docs.arc.io before sending real txs)
- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com
- ERC-20 USDC: 0x3600000000000000000000000000000000000000 (6 decimals)
- Native gas token is USDC with 18 decimals; ERC-20 USDC is 6 decimals. NEVER mix them.

NON-NEGOTIABLE CORRECTNESS RULES
- ERC-20 USDC uses 6 decimals (parseUnits(x, 6)); native/gas balance uses 18 decimals.
  Helpers formatUsdc/parseUsdc (6) and formatGasUsdc (18) already encode this — keep separate.
- All token transfers use SafeERC20; payouts use a pull pattern guarded by ReentrancyGuard.
- The website must stay fully in English.
- If any Arc network value has changed, update lib/chains/arcTestnet.ts and .env, do not hardcode.

DEFINITION OF DONE (report all of these back to me)
- forge test is green; deploy prints a CircleFactory address.
- npm run build passes with zero errors.
- End-to-end on Arc Testnet: connect wallet -> create circle -> join from 3 accounts ->
  contribute -> close round -> beneficiary claims pot -> after last round withdraw collateral.
- Give me: deployed addresses, the local URL, and anything you changed and why.
```

---

## Quick manual fallback (without an agent)

```bash
# Contracts
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
cp .env.example .env            # set PRIVATE_KEY (testnet only)
forge build && forge test -vvv
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.network --broadcast

# Frontend
cd ../web
npm install
cp .env.example .env.local      # set NEXT_PUBLIC_FACTORY_ADDRESS
npm run dev                     # http://localhost:3000
```
