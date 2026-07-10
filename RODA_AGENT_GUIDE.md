# Roda: AI-Guardian Collaborative Finance ROSCA (Para Günü)
### 🤖 AI Agent Handover & Technical Specification Guide

Welcome, Agent! This document provides a comprehensive, expert-level technical overview of **Roda**, a decentralized Rotating Savings and Credit Association (ROSCA / Turkish: "Para Günü") built on the **Arc Network (L1)** featuring **Circle Developer-Controlled Wallets** and **ERC-8004 Trustless Agent Identity & Reputation**.

Use this handbook to instantly understand Roda's codebase, architecture, on-chain mechanics, and testing workflows.

---

## 📋 1. Project Overview & Purpose
Roda solves default credit risks in collaborative informal finance networks. Traditional ROSCAs rely on trusted human organizers. Roda replaces them with:
1. **Trustless Smart Contracts:** Escrowing collaterals, enforcing round deadlines, and automatically slashing collateral or recording debts in case of defaults.
2. **AI Liquidity Guardian (Autonomous Risk Agent):** A real-time credit-risk engine that monitors member solvency and automatically injects default insurance (bailout credit) to protect honest members.

---

## 🛠️ 2. Technology Stack & Key Protocols
*   **Blockchain Infrastructure:** Deployed on **Arc Testnet** (Viem/Wagmi). Arc uses **USDC** as its native gas token with 6 decimal places.
*   **Agentic Custody (Circle Programmable Wallets):**
    *   **AI Agent Wallet (`AI_AGENT_WALLET_ID`):** Holds the default insurance USDC fund, executes bailout transfers, and owns the agent's on-chain identity.
    *   **AI Agent Validator Wallet (`AI_AGENT_VALIDATOR_WALLET_ID`):** Used to submit reputation attestations to the registry, satisfying the ERC-8004 specification (Agent owner cannot submit own feedback).
*   **AI Integration:** DeepSeek API (`deepseek-v4-flash`) analyzing raw on-chain data (debt ratios, history, collateral levels).
*   **ERC-8004 Agent Specification:** 
    *   `IdentityRegistry` at `0x8004A818BFB912233c491871b3d84c89A494BD9e` (Agent ID minting).
    *   `ReputationRegistry` at `0x8004B663056A597Dffe9eCcC1965A193B7388713` (Validator logs risk assessment feedback).

---

## 📐 3. Smart Contract Architecture

The contracts are written in Solidity (Foundry folder `contracts/`).

### A. [SavingsCircle.sol](file:///c:/Users/philo/Downloads/roda/contracts/src/SavingsCircle.sol)
*   **`join()`**: Members lock a security deposit (`collateralAmount` == 1 round's worth of USDC) to join during the `Recruiting` phase.
*   **`contribute()`**: Active members submit their round contribution (`contributionAmount` USDC).
*   **`closeRound()`**: Can be called by anyone once the round deadline passes. Slashes default member collateral to cover the deficit. Remaining deficit becomes `memberDebt`.
*   **`claimPayout(uint256 round)`**: Beneficiary withdraws the collected round pot (net of any unpaid debts from previous rounds).
*   **`withdrawCollateral()`**: Reclaims locked collateral once the circle completes.

### B. [CircleFactory.sol](file:///c:/Users/philo/Downloads/roda/contracts/src/CircleFactory.sol)
*   Spawns individual `SavingsCircle` instances and indexes them for frontend paginated discovery via `getCircles(offset, limit)`.

---

## ⚡ 4. Agentic API Routes (Serverless Next.js Backend)

All simulated/mock fallbacks have been completely removed. The APIs communicate strictly with Arc L1:

### 1. `/api/agent-identity` (GET/POST)
*   **POST:** Mints a new ERC-8004 NFT on Arc via Circle DCW.
*   **GET:** Resolves the `agentId` and queries `reputationLogs`.
    *   *Gotcha Resolved:* Arc RPC limits `eth_getLogs` block query ranges to **10,000 blocks**. To avoid `500 Server Error` on-chain, the route queries backward paginated ranges of **9,500 blocks** up to 5 times (max 47.5k blocks).

### 2. `/api/agent` (POST)
*   Receives members' live on-chain status, formats a prompt, and queries DeepSeek.
*   If approved, the Validator wallet broadcasts a `giveFeedback` attestation on-chain to the `ReputationRegistry` for the resolved `agentId`.

### 3. `/api/bailout` (POST)
*   Transfers the bailout USDC amount from the Agent's Circle wallet to the target member's Metamask address.
*   *Gotcha Resolved:* Polling interval for on-chain state checking is capped at **6 iterations (12 seconds)** to prevent Vercel Hobby serverless execution timeout limits (15 seconds).

---

## 🖥️ 5. Frontend & Metamask Execution Flow
The bailout execution is designed as a **Hybrid Autonomous-Manual Approval Flow**:
1. When a bailout is approved, the user clicks **"Execute Automated Injection"** in the [AIGuardianPanel](file:///c:/Users/philo/Downloads/roda/web/src/components/AIGuardianPanel.tsx).
2. The Agent funds the user's Metamask wallet in the background via `/api/bailout` API.
3. The frontend public client dynamically checks the user's USDC spend allowance for the circle. If insufficient, it **automatically prompts MetaMask** to approve the contract spend.
4. The frontend immediately **prompts MetaMask to sign and execute `contribute()`** on-chain, pulling the funded USDC into the contract.
5. The frontend awaits transaction block consensus via `waitForTransactionReceipt` to guarantee that success is only displayed if the transaction successfully confirms on-chain without reverting.
6. A safety warning alert dynamically displays beneath the button if the connected wallet address is not a member of the circle, preventing bad actors from spamming/abusing the bailout API.

---

## 🧪 6. Step-by-Step Developer Verification Walkthrough
To test the entire on-chain lifecycle:
1. Start the local server:
   ```bash
   cd web
   npm run dev
   ```
2. Navigate to `http://localhost:3000` and connect MetaMask to Arc Testnet.
3. Click **"Register Agent"** inside the AI Guardian panel to verify on-chain ERC-8004 identity registration.
4. Go to **"Create Circle"**, configure a small contribution (e.g. 5 USDC), and a short round duration (e.g. 15 seconds) with 2 members.
5. Join the circle using Account 1. Switch MetaMask to Account 2 and click **"Join"** to fill the circle and trigger transition to `Active` state on-chain.
6. Let the 15-second round duration expire without contributing. Click **"Close Round"** to register a real default on-chain.
7. Switch back to the defaulted account, go to the AI Guardian panel, select the defaulted address, and click **"Analyze Risk"**.
8. Click **"Execute Automated Injection"** to initiate the bailout. Approve the Metamask spend limit and sign the contribution transaction. Verify that the round has been successfully settled on-chain!

---

## 🔗 7. References & Official Documentation Links
*   **Arc Agentic Economy:** [docs.arc.io/build/agentic-economy](https://docs.arc.io/build/agentic-economy)
*   **Arc Escrow Smart Contracts:** [github.com/circlefin/arc-escrow](https://github.com/circlefin/arc-escrow)
*   **Register First AI Agent Tutorial:** [docs.arc.io/arc/tutorials/register-your-first-ai-agent](https://docs.arc.io/arc/tutorials/register-your-first-ai-agent)
*   **Circle Blog (Agentic Systems):** [circle.com/blog/build-agentic-systems](https://www.circle.com/blog/build-agentic-systems-for-high-frequency-sub-cent-transactions)
*   **Arc Blueprints for Agentic Economy:** [arc.io/blog/arc-blueprints](https://www.arc.io/blog/how-arc-supports-the-agentic-economy-arc-blueprints)
*   **Canteen X Agora Hackathon Spotlight:** [canteen.xyz/blog](https://canteen.xyz/blog)
