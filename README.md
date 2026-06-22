# Roda — Trustless Rotating Savings Circles on Arc

> **Onchain Rotating Savings and Credit Association (ROSCA) powered by USDC on Arc L1.**

Built with passion and expertise by **[Leknax](https://github.com/Lesnak1)**.

---

## Naming & Philosophy

In Afro-Brazilian capoeira and samba culture, the **roda** is the human circle where participants gather and take turns entering the center. This is a perfect metaphor for a Rotating Savings and Credit Association (ROSCA): a group of individuals who each contribute a fixed amount every round, and take turns receiving the entire collected pot.

Traditional real-world ROSCAs (known as *tanda*, *susu*, *stokvel*, *gün*, or *para günü*) are highly vulnerable to trust failures: organizers can abscond with the funds, or early beneficiaries can default on subsequent rounds. **Roda removes the organizer and social trust requirements entirely through smart contract execution.**

---

## Key Features & Utility

1. **Trustless Escrow:** Katkılar (contributions) are held securely by the `SavingsCircle` smart contract, not in any personal bank account or multisig wallet.
2. **Default Protection via Collateral:** Every participant locks one round of contribution as a security deposit upon joining. If a member defaults, the contract automatically tops up the pot using their locked collateral, ensuring the designated beneficiary is paid in full.
3. **Onchain Reputation Indexing:** Contributions and defaults generate immutable blockchain events. Roda uses these events to construct trust and reputation scores directly from contract activity.
4. **Arc Native Optimization:** Roda is built for Arc, Circle's EVM L1 where USDC is the native gas token, delivering sub-second finality and stablecoin-denominated transactions.

---

## Repository Structure

```text
roda/
├─ contracts/                      Foundry project (Solidity 0.8.28)
│  ├─ src/SavingsCircle.sol        Core circle: join → contribute → closeRound → claimPayout → withdrawCollateral
│  ├─ src/CircleFactory.sol        Deploys and indexes circles for public discovery
│  ├─ test/SavingsCircle.t.sol     Comprehensive 8-test unit suite (100% pass)
│  ├─ script/Deploy.s.sol          Deploys CircleFactory to Arc Testnet
│  └─ foundry.toml & remappings.txt
├─ web/                            Next.js (App Router) + Wagmi v2 + Viem dApp
│  ├─ src/app/                     Pages (Home, About, Docs) and global styles
│  ├─ src/components/              UI widgets (ThemeToggle, WalletGate, list/detail panels)
│  ├─ src/lib/                     Chains configuration, ABI, formatting utilities
│  └─ package.json & next.config.mjs
└─ README.md
```

---

## Arc Decimal Contexts (Crucial)

Arc features a stablecoin-first native architecture. However, this introduces two decimal contexts that must never be mixed:
* **Native Gas USDC:** 18 decimals. Checked using standard wallet balances (e.g. `useBalance`).
* **ERC-20 USDC:** 6 decimals. Used for all contract token transfers, deposits, pots, and payouts (Testnet address: `0x3600000000000000000000000000000000000000`).

---

## Smart Contracts Setup (Foundry)

### 1. Install dependencies
Ensure Foundry is installed, then run:
```bash
cd contracts
forge install --no-git foundry-rs/forge-std
forge install --no-git OpenZeppelin/openzeppelin-contracts
```

### 2. Configure Environment
Copy the example file and update with a testnet private key (include `0x` prefix):
```bash
cp .env.example .env
```

### 3. Build & Test
```bash
forge build
forge test -vvv
```

### 4. Deploy to Arc Testnet
```bash
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.network --broadcast
```
Copy the printed `CircleFactory` address.

---

## Web Frontend Setup (Next.js)

### 1. Install packages
```bash
cd web
npm install
```

### 2. Configure Environment
Copy the environment template and set the factory address to your deployed contract:
```bash
cp .env.example .env.local
```

### 3. Production Build Validation
```bash
npm run build
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to interact with the dApp.

---

## Deploying to Vercel

To deploy Roda to Vercel:
1. **Import Repository:** Import the repository into your Vercel dashboard.
2. **Root Directory:** Set the Root Directory configuration to `web` under your Project Settings.
3. **Environment Variables:** Define the following variables in the Vercel dashboard:
   - `NEXT_PUBLIC_FACTORY_ADDRESS` (deployed `CircleFactory` address)
   - `NEXT_PUBLIC_USDC_ADDRESS` (`0x3600000000000000000000000000000000000000`)
   - `NEXT_PUBLIC_ARC_RPC_URL` (`https://rpc.testnet.arc.network`)
4. **Deploy:** Hit deploy. Vercel will automatically compile, optimize, and launch your dApp!

---

## Security Model & Collateral Boundaries

Roda is designed as a trustless, self-contained escrow system. However, the current economic security model has defined boundaries that are important to note for production usage:

### Collateral Safety & Deficit Risk
* **The MVP Rule:** Every member locks **1 round** of contribution as collateral. This covers exactly **one default** per member.
* **The Deficit Boundary:** If a member receives the round pot early (e.g., Round 1) and subsequently defaults on *multiple* later rounds, their single locked collateral only covers their first default. Subsequent defaults by that member will result in a deficit in the pot for later beneficiaries.
* **Test Coverage:** This economic boundary condition is formally verified and documented in the Foundry test suite under `testSerialDefaultDeficit()`.

### Production Mitigations (Roadmap v2)
To achieve complete economic safety for larger, long-term circles, we plan to implement:
* **Collateral Withholding:** Retaining a portion of the payout pot for early beneficiaries inside the contract as additional collateral until the circle terminates.
* **Discount Bidding ROSCA Model:** Switching to a bidding model where members bid discounts to receive the pot early, inherently reducing the economic incentive to default.
