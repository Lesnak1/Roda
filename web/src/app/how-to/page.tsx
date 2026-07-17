"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Coins, Layers, Play, ShieldAlert, Award, HelpCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
} as const;

export default function HowToPage() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span>Roda</span>
            </div>
          </Link>
          <div className="topbar-right">
            <Link href="/about" className="nav-link">
              About
            </Link>
            <Link href="/how-to" className="nav-link active">
              How to Use
            </Link>
            <Link href="/docs" className="nav-link">
              Docs
            </Link>
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="nav-link">
              Faucet
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="about-wrap"
          >
            <motion.div variants={itemVariants} className="back-btn">
              <Link href="/" className="btn ghost sm">
                <ArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Back to Dashboard
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="about-header">
              <h1>
                How to Use <span className="grad-text">Roda</span>
              </h1>
              <p className="about-intro">
                Learn how to set up your wallet on Arc Network, create or join savings circles,
                and interact with the AI Liquidity Guardian.
              </p>
            </motion.div>

            <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 24 }}>
              {/* Step 1 */}
              <motion.div variants={itemVariants} className="card" style={stepCardStyle}>
                <div style={stepHeaderStyle}>
                  <div style={stepBadgeStyle}>01</div>
                  <h3 style={stepTitleStyle}>
                    <Wallet size={20} className="grad-text" style={{ marginRight: 8 }} />
                    Wallet & Network Setup
                  </h3>
                </div>
                <div style={stepContentStyle}>
                  <p>
                    Roda is deployed on the <strong>Arc Testnet</strong>, Circle's stablecoin-native Layer 1 chain.
                  </p>
                  <ul>
                    <li>Install an EVM-compatible browser wallet (e.g., MetaMask, Rabby, or Phantom).</li>
                    <li>Switch your wallet to the Arc Testnet using the chain details:
                      <ul style={{ marginTop: 6, listStyleType: "circle", paddingLeft: 20 }}>
                        <li><strong>Network Name:</strong> Arc Testnet</li>
                        <li><strong>RPC URL:</strong> <code>https://rpc.testnet.arc.network</code></li>
                        <li><strong>Chain ID:</strong> <code>5042002</code></li>
                        <li><strong>Currency Symbol:</strong> <code>USDC</code></li>
                      </ul>
                    </li>
                    <li>Visit the official <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" style={{ textDecoration: "underline", color: "var(--accent)" }}>Circle Faucet</a>, select Arc Testnet, and enter your wallet address to request test USDC tokens for both gas and contract interactions.</li>
                  </ul>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={itemVariants} className="card" style={stepCardStyle}>
                <div style={stepHeaderStyle}>
                  <div style={stepBadgeStyle}>02</div>
                  <h3 style={stepTitleStyle}>
                    <Layers size={20} className="grad-text" style={{ marginRight: 8 }} />
                    Create or Discover a Circle
                  </h3>
                </div>
                <div style={stepContentStyle}>
                  <p>
                    You can either initiate a new savings circle or participate in an existing one.
                  </p>
                  <ul>
                    <li><strong>To Create:</strong> Go to the "Create Circle" tab on the dashboard. Define the contribution amount per round (e.g., 10 USDC), the number of seats (e.g., 3 members), and the round duration (e.g., 1 hour or 60 seconds for quick testing).</li>
                    <li><strong>To Join:</strong> Locate an active circle in the "Discover" tab, or paste the circle's contract address directly. Review the circle parameters, and click <strong>Approve & Join</strong> to escrow your security collateral.</li>
                  </ul>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={itemVariants} className="card" style={stepCardStyle}>
                <div style={stepHeaderStyle}>
                  <div style={stepBadgeStyle}>03</div>
                  <h3 style={stepTitleStyle}>
                    <Coins size={20} className="grad-text" style={{ marginRight: 8 }} />
                    Contribute and Rotate
                  </h3>
                </div>
                <div style={stepContentStyle}>
                  <p>
                    Once the circle is fully recruited, rounds start rotating sequentially:
                  </p>
                  <ul>
                    <li>Every round, navigate to the active circle details page and click <strong>Contribute</strong> to pay your round share.</li>
                    <li>Once all members pay (or if the round deadline expires), anyone can click <strong>Close Round</strong> to update the state machine.</li>
                    <li>The designated beneficiary of the current round can then click <strong>Claim Payout</strong> to receive the accumulated pot.</li>
                    <li>After the final round completes, click <strong>Withdraw Collateral</strong> to reclaim your locked security deposit.</li>
                  </ul>
                </div>
              </motion.div>

              {/* Step 4 */}
              <motion.div variants={itemVariants} className="card" style={stepCardStyle}>
                <div style={stepHeaderStyle}>
                  <div style={stepBadgeStyle}>04</div>
                  <h3 style={stepTitleStyle}>
                    <ShieldAlert size={20} className="grad-text" style={{ marginRight: 8 }} />
                    Test the AI Liquidity Guardian
                  </h3>
                </div>
                <div style={stepContentStyle}>
                  <p>
                    Roda features an on-chain automated risk engine that provides credit safety nets to prevent round defaults.
                  </p>
                  <ul>
                    <li>In the active circle view, scroll down to the **AI Liquidity Guardian** widget.</li>
                    <li>Observe the agent's **Onchain Identity Verified** card, which displays its ERC-8004 Token ID and live reputation index on Arc Testnet.</li>
                    <li>Select any circle member and click <strong>Analyze Risk</strong> to trigger a real-time risk profile evaluation using DeepSeek AI.</li>
                    <li>If the agent approves the member, click <strong>Execute Automated Injection</strong>. The Guardian's Developer-Controlled Wallet will autonomously approve and contribution-fund the round, preventing defaults and keeping the savings circle liquid.</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="footer">
        <div>Roda · Trustless rotating savings circles in USDC · Built on Arc · Testnet only</div>
        <div style={{ marginTop: 6, fontSize: "13.5px" }}>
          Built by <a href="https://github.com/Lesnak1" target="_blank" rel="noreferrer" className="leknax-link">Leknax</a>
        </div>
        <div className="footer-links">
          <Link href="/" className="footer-link">Dashboard</Link>
          <Link href="/about" className="footer-link">About</Link>
          <Link href="/how-to" className="footer-link">How to Use</Link>
          <Link href="/docs" className="footer-link">Docs</Link>
          <Link href="/terms" className="footer-link">Terms</Link>
          <Link href="/privacy" className="footer-link">Privacy</Link>
        </div>
        <div style={{ marginTop: 10, fontSize: "11px", opacity: 0.5 }}>Arc™ is a trademark of Circle Internet Group, Inc. and/or its affiliates.</div>
      </footer>
    </div>
  );
}

const stepCardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "24px",
} as const;

const stepHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "14px",
} as const;

const stepBadgeStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "var(--grad)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: "14px",
} as const;

const stepTitleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
} as const;

const stepContentStyle = {
  fontSize: "14.5px",
  lineHeight: "1.6",
  color: "var(--text)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
} as const;
