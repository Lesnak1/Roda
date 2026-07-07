"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Scale } from "lucide-react";
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

export default function TermsPage() {
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
                Terms of <span className="grad-text">Service</span>
              </h1>
              <p className="docs-intro">
                Last updated: July 7, 2026. Please read these terms carefully before using Roda.
              </p>
            </motion.div>

            <motion.section variants={itemVariants} className="docs-section">
              <h2>1. Agreement to Terms</h2>
              <p>
                By accessing or using Roda (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the Platform. Roda is currently deployed on the <strong>Arc Testnet</strong> for educational and demonstration purposes.
              </p>

              <h2>2. No Financial Advice</h2>
              <p>
                The Platform provides a rotating savings circle protocol powered by autonomous smart contracts and AI default risk agents. Nothing on this site constitutes financial, investment, or legal advice. All actions are simulated on a blockchain testnet using mock or testnet USDC tokens.
              </p>

              <h2>3. Smart Contract Execution</h2>
              <p>
                Roda runs on decentralized smart contracts deployed on the Arc L1 blockchain. You acknowledge that smart contract transactions are irreversible, and Roda has no control over transactions broadcast to the network. You use these contracts at your own risk.
              </p>

              <h2>4. AI Liquidity Guardian</h2>
              <p>
                The AI Liquidity Guardian is an autonomous agent that assists savings circles by executing automated liquidity injections based on risk criteria. You understand that the Guardian is an AI system and its risk evaluations do not guarantee solvency or cover all potential defaults.
              </p>

              <h2>5. Limitation of Liability</h2>
              <p>
                Under no circumstances shall Roda, its developers, or contributors be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the Platform or smart contracts.
              </p>
            </motion.section>
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
          <Link href="/how-to" className="footer-link">How to Use</Link>
          <Link href="/docs" className="footer-link">Docs</Link>
        </div>
      </footer>
    </div>
  );
}
