"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Landmark, RefreshCw, ShieldAlert, Award } from "lucide-react";
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

export default function AboutPage() {
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
            <Link href="/about" className="nav-link active">
              About
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
                About <span className="grad-text">Roda</span>
              </h1>
              <p className="about-intro">
                A trustless, decentralized Rotating Savings and Credit Association (ROSCA)
                native to Arc L1, powered entirely by USDC.
              </p>
            </motion.div>

            <div className="about-grid">
              <motion.div variants={itemVariants} className="about-card">
                <h3>
                  <Landmark className="grad-text" size={24} />
                  What is a ROSCA?
                </h3>
                <p>
                  A Rotating Savings and Credit Association (ROSCA) is one of the oldest and most widespread
                  informal financial systems in the world (known as *tanda*, *susu*, *hui*, *stokvel*, *gün*,
                  or *para günü*). A group of individuals contributes a fixed amount every round, and each
                  member takes a turn receiving the entire collected pot.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="about-card">
                <h3>
                  <RefreshCw className="grad-text" size={24} />
                  Why "Roda"?
                </h3>
                <p>
                  In Afro-Brazilian culture (specifically Capoeira and Samba), the *roda* is the human circle
                  in which participants gather and take turns entering the center. This is a perfect metaphor
                  for our rotating savings circle, where every member takes their scheduled turn in the center
                  to receive the round pot.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="about-card">
                <h3>
                  <ShieldAlert className="grad-text" size={24} />
                  Solving the Trust Problem
                </h3>
                <p>
                  Traditional real-world ROSCAs rely heavily on social trust. Organizers might run away with the funds,
                  or early beneficiaries might stop paying their contributions. Roda removes this trust bottleneck by
                  replacing the organizer with a smart contract escrow and requiring each member to lock one round of
                  contribution as collateral upon joining. If a member defaults, the contract automatically covers it
                  using their locked collateral.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="about-card">
                <h3>
                  <Award className="grad-text" size={24} />
                  Onchain Reputation
                </h3>
                <p>
                  By deploying circles on Arc (Circle's L1), transactions are sub-second and native to USDC. Every
                  contribution and default generates public smart contract events. From these events, Roda calculates
                  on-chain reputation scores, allowing members to build provable creditworthiness and trust scores
                  historically across different savings circles.
                </p>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="card">
              <h3 className="card-title">Roda's Lifecycle</h3>
              <p className="card-desc">
                Roda is designed as a trustless state machine executing three sequential phases:
              </p>
              <div className="timeline" style={{ padding: "0 10px" }}>
                <div className="tl-item">
                  <div className="tl-node">
                    <span className="dot active" />
                    <span className="tl-round">Phase 1</span>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>Recruiting</h4>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
                      Creator defines contribution, size, and round duration. Members join by approving and locking one round of USDC contribution as collateral. Once all seats are filled, the circle automatically starts and enters the active phase.
                    </p>
                  </div>
                </div>

                <div className="tl-item">
                  <div className="tl-node">
                    <span className="dot" />
                    <span className="tl-round">Phase 2</span>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>Active Rotating Rounds</h4>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
                      Every round, members pay their contribution amount. Anyone can call closeRound() once everyone has contributed or the round deadline is reached. If anyone defaulted, their collateral is deducted to cover the deficit. The round beneficiary then claims the full pot.
                    </p>
                  </div>
                </div>

                <div className="tl-item">
                  <div className="tl-node">
                    <span className="dot" />
                    <span className="tl-round">Phase 3</span>
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>Completed</h4>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
                      After the final round is completed, the circle is marked completed. All members who did not default can withdraw their locked security collateral in full.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
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
