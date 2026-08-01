"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
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

export default function PrivacyPage() {
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
            <Link href="/how-to" className="nav-link">
              How to Use
            </Link>
            <Link href="/docs" className="nav-link">
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
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            <motion.div variants={itemVariants} className="back-btn">
              <Link href="/" className="btn ghost sm">
                <ArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Back to Dashboard
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="docs-header">
              <h1>
                Privacy <span className="grad-text">Policy</span>
              </h1>
              <p className="docs-intro">
                Last updated: July 7, 2026. Learn how we handle address data and smart contract histories.
              </p>
            </motion.div>

            <motion.section variants={itemVariants} className="docs-section">
              <h2>1. Non-Custodial & Decentralized</h2>
              <p>
                Roda is a non-custodial Web3 application. We do not store or collect personal data, names, emails, or IP addresses. Your interaction with Roda occurs directly via your connected Web3 browser wallet and the Arc Network blockchain.
              </p>

              <h2>2. Blockchain Data Transparency</h2>
              <p>
                All saving circle events (deposits, payouts, debt, defaults) are written publicly to the Arc blockchain. This ledger data is immutable, permanent, and can be read by anyone via blockchain scanners. We use this public data to calculate the AI Guardian risk assessments and on-chain trust scores.
              </p>

              <h2>3. Third-Party Integrations</h2>
              <p>
                Our AI Guardian utilizes an autonomous AI risk engine to perform default risk calculations and the Circle Programmable Wallets SDK to broadcast default insurance bailouts. These integrations do not transmit or process personal identifying information (PII).
              </p>

              <h2>4. Cookie Policy</h2>
              <p>
                Roda does not use tracking cookies or analytics tools to profile users. Theme settings (dark/light) are stored locally in your browser's local storage.
              </p>

              <h2>5. Updates to Policy</h2>
              <p>
                We may update this Privacy Policy as Roda expands to mainnet. Any changes will be published directly on this page.
              </p>
            </motion.section>
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
        </div>
        <div style={{ marginTop: 10, fontSize: "11px", opacity: 0.5 }}>Arc™ is a trademark of Circle Internet Group, Inc. and/or its affiliates.</div>
      </footer>
    </div>
  );
}
