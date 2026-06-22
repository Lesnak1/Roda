"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Code, Layers, ShieldAlert, Cpu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 15,
    },
  },
} as const;

type Section = "quickstart" | "architecture" | "decimals" | "contracts";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>("quickstart");

  const scrollTo = (id: Section) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

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
            <Link href="/docs" className="nav-link active">
              Docs
            </Link>
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
            className="docs-wrap"
          >
            <motion.div variants={itemVariants} className="back-btn">
              <Link href="/" className="btn ghost sm">
                <ArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Back to Dashboard
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="docs-header">
              <h1>
                Technical <span className="grad-text">Documentation</span>
              </h1>
              <p className="docs-intro">
                Understand the smart contract state machine, decentralized consensus rules,
                and execution flow of Roda on Arc L1.
              </p>
            </motion.div>

            <div className="docs-grid">
              {/* Sidebar Nav */}
              <motion.aside variants={itemVariants} className="docs-sidebar">
                <div className="docs-nav">
                  <button
                    onClick={() => scrollTo("quickstart")}
                    className={`docs-nav-link ${activeSection === "quickstart" ? "active" : ""}`}
                  >
                    <BookOpen size={16} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                    Quick Start
                  </button>
                  <button
                    onClick={() => scrollTo("architecture")}
                    className={`docs-nav-link ${activeSection === "architecture" ? "active" : ""}`}
                  >
                    <Layers size={16} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                    Architecture
                  </button>
                  <button
                    onClick={() => scrollTo("decimals")}
                    className={`docs-nav-link ${activeSection === "decimals" ? "active" : ""}`}
                  >
                    <Cpu size={16} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                    Decimals & Gas
                  </button>
                  <button
                    onClick={() => scrollTo("contracts")}
                    className={`docs-nav-link ${activeSection === "contracts" ? "active" : ""}`}
                  >
                    <Code size={16} style={{ marginRight: 8, verticalAlign: "-2px" }} />
                    Smart Contracts
                  </button>
                </div>
              </motion.aside>

              {/* Main Docs Content */}
              <div className="docs-content">
                {/* Quick Start Section */}
                <motion.section
                  id="quickstart"
                  variants={itemVariants}
                  className="docs-section"
                >
                  <h2>Quick Start Guide</h2>
                  <p>
                    Follow this flow to test a complete savings circle end-to-end:
                  </p>
                  <ol>
                    <li>
                      <strong>Connect Wallet:</strong> Click "Connect Wallet" on the home page and switch your network to <strong>Arc Testnet</strong> (Chain ID: 5042002).
                    </li>
                    <li>
                      <strong>Faucet:</strong> Fund your connected wallet with native USDC (for gas) and ERC-20 USDC (for contributions) via <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">faucet.circle.com</a>.
                    </li>
                    <li>
                      <strong>Create:</strong> Click the "Create Circle" tab, specify a contribution amount (e.g. 10 USDC), the number of members (e.g. 3), and round duration (e.g. 60 seconds for a quick test).
                    </li>
                    <li>
                      <strong>Join:</strong> Distribute the circle address to 2 other wallets (or test using separate browser profiles). Each wallet must click <strong>Approve & Join</strong> to lock their collateral.
                    </li>
                    <li>
                      <strong>Rotate:</strong> In each round:
                      <ul>
                        <li>All members call <code>contribute()</code> to pay their share.</li>
                        <li>Once paid, or if the deadline passes, anyone can call <code>closeRound()</code> to advance.</li>
                        <li>The designated round beneficiary claims the collected pot using <code>claimPayout()</code>.</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Settle:</strong> Once the last round closes, all members call <code>withdrawCollateral()</code> to reclaim their security deposits.
                    </li>
                  </ol>
                </motion.section>

                {/* Architecture Section */}
                <motion.section
                  id="architecture"
                  variants={itemVariants}
                  className="docs-section"
                >
                  <h2>State Machine & Lifecycle</h2>
                  <p>
                    Each <code>SavingsCircle</code> operates as a rigid, trustless state machine to protect funds from defaults:
                  </p>
                  <div className="docs-code-block">
                    {`Recruiting --[memberCount joins, locks collateral]--> Active\n`}
                    {`Active: per round --[contribute -> closeRound -> claim]--> Completed\n`}
                    {`Completed --[everyone withdraws collateral]--> Terminated`}
                  </div>
                  <p>
                    <strong>Collateral Protection:</strong> When joining a circle, members must escrow an amount exactly equal to one round's contribution. If a member fails to contribute by the round's deadline, <code>closeRound()</code> automatically recovers their missing payment by burning a portion of their locked collateral. This guarantees the beneficiary always receives the full payout.
                  </p>
                </motion.section>

                {/* Decimals Section */}
                <motion.section
                  id="decimals"
                  variants={itemVariants}
                  className="docs-section"
                >
                  <h2>Arc Decimal Contexts</h2>
                  <p>
                    Arc features a stablecoin-first native architecture. However, this introduces two decimal contexts that must never be mixed:
                  </p>
                  <ul>
                    <li>
                      <strong>Native Gas USDC:</strong> 18 decimals. Used for gas fees and checked using standard wallet balances (e.g. <code>useBalance</code>).
                    </li>
                    <li>
                      <strong>ERC-20 USDC:</strong> 6 decimals. Used for all contract token transfers, deposits, pots, and payouts (contract address: <code>0x3600000000000000000000000000000000000000</code>).
                    </li>
                  </ul>
                  <div className="alert warn">
                    <ShieldAlert size={18} style={{ marginRight: 8, flexShrink: 0 }} />
                    <span>
                      <strong>Warning:</strong> Sending 18-decimal values to the ERC-20 contract will revert or cause massive overflow issues. Always use the built-in parsing helpers: <code>parseUsdc(x)</code> targets 6 decimals; <code>parseGas(x)</code> targets 18.
                    </span>
                  </div>
                </motion.section>

                {/* Smart Contracts Section */}
                <motion.section
                  id="contracts"
                  variants={itemVariants}
                  className="docs-section"
                >
                  <h2>Smart Contracts Reference</h2>
                  <p>
                    The contract codebase consists of two core smart contracts compiled with Solidity 0.8.28:
                  </p>

                  <h3 style={{ fontSize: "17px", fontWeight: "700" }}>1. CircleFactory.sol</h3>
                  <p>
                    Deploys and indexes individual savings circles for public discovery.
                  </p>
                  <div className="docs-code-block">
                    {`function createCircle(uint256 contributionAmount, uint8 memberCount, uint256 roundDuration) external returns (address);\n`}
                    {`function getCircles(uint256 offset, uint256 limit) external view returns (CircleInfo[] memory);`}
                  </div>

                  <h3 style={{ fontSize: "17px", fontWeight: "700" }}>2. SavingsCircle.sol</h3>
                  <p>
                    Manages individual circles, escrow deposits, round tracking, and default claims.
                  </p>
                  <div className="docs-code-block">
                    {`function join() external;\n`}
                    {`function contribute() external;\n`}
                    {`function closeRound() external;\n`}
                    {`function claimPayout(uint256 round) external;\n`}
                    {`function withdrawCollateral() external;`}
                  </div>
                </motion.section>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="footer">
        <div>Roda · Trustless rotating savings circles in USDC · Testnet only</div>
        <div style={{ marginTop: 6, fontSize: "13.5px" }}>
          Built by <a href="https://github.com/Lesnak1" target="_blank" rel="noreferrer" className="leknax-link">Leknax</a>
        </div>
        <div className="footer-links">
          <Link href="/" className="footer-link">Dashboard</Link>
          <Link href="/about" className="footer-link">About</Link>
          <Link href="/docs" className="footer-link">Docs</Link>
        </div>
      </footer>
    </div>
  );
}
