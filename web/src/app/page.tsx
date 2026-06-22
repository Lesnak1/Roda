"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { WalletGate } from "@/components/WalletGate";
import { CreateCircle } from "@/components/CreateCircle";
import { CircleList } from "@/components/CircleList";
import { CircleDetail } from "@/components/CircleDetail";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FACTORY_ADDRESS } from "@/lib/contracts";
import { Simulator } from "@/components/Simulator";

const pageVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 15,
      staggerChildren: 0.1,
    },
  },
} as const;

const childVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const [tab, setTab] = useState<"discover" | "create" | "simulator">("discover");
  const [selected, setSelected] = useState<`0x${string}` | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const factoryUnset = FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000";

  return (
    <div className="page">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link href="/">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span>Roda</span>
              <span className="brand-sub">onchain savings circles</span>
            </div>
          </Link>
          <div className="topbar-right">
            <Link href="/about" className="nav-link">
              About
            </Link>
            <Link href="/docs" className="nav-link">
              Docs
            </Link>
            <span className="pill">
              <span className="live-dot" />
              Arc Testnet
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                style={detailWrap}
              >
                <CircleDetail address={selected} onBack={() => setSelected(null)} />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                variants={pageVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.section variants={childVariants} className="hero">
                  <span className="hero-eyebrow">⚡ USDC-native · sub-second finality</span>
                  <h1>
                    Save together, <span className="grad-text">onchain</span>. Trust lives in code, not an organizer.
                  </h1>
                  <p>
                    Roda brings one of the oldest savings traditions in the world — the rotating savings circle
                    (ROSCA) — onchain and makes it trustless on Arc. No organizer to trust: contributions are
                    locked in an escrow contract, the payout order is transparent on-chain, and missed payments
                    are covered from each security deposit.
                  </p>
                  <div className="hero-feats">
                    <span className="feat"><span className="ico">🔒</span> Escrow contract = trust</span>
                    <span className="feat"><span className="ico">📅</span> Transparent payout order</span>
                    <span className="feat"><span className="ico">🛡️</span> Default protection via collateral</span>
                    <span className="feat"><span className="ico">⭐</span> On-chain trust score</span>
                  </div>
                </motion.section>

                {factoryUnset && (
                  <motion.div variants={childVariants} className="alert warn">
                    <span className="ai">⚠️</span>
                    <span>
                      <b>NEXT_PUBLIC_FACTORY_ADDRESS</b> is not set. Deploy the contract and add the factory
                      address to <code> .env.local</code>.
                    </span>
                  </motion.div>
                )}

                <motion.div variants={childVariants}>
                  <WalletGate>
                    <div className="segmented">
                      <button
                        className={tab === "discover" ? "seg active" : "seg"}
                        onClick={() => setTab("discover")}
                      >
                        Discover
                      </button>
                      <button
                        className={tab === "create" ? "seg active" : "seg"}
                        onClick={() => setTab("create")}
                      >
                        Create Circle
                      </button>
                      <button
                        className={tab === "simulator" ? "seg active" : "seg"}
                        onClick={() => setTab("simulator")}
                      >
                        Interactive Simulator
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {tab === "create" && (
                        <motion.div
                          key="createCircle"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CreateCircle
                            onCreated={() => {
                              setTab("discover");
                              setReloadKey((k) => k + 1);
                            }}
                          />
                        </motion.div>
                      )}
                      {tab === "discover" && (
                        <motion.div
                          key="circleList"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CircleList key={reloadKey} onSelect={(a) => setSelected(a)} />
                        </motion.div>
                      )}
                      {tab === "simulator" && (
                        <motion.div
                          key="simulatorTab"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Simulator />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </WalletGate>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="footer">
        <div>Roda · Trustless rotating savings circles in USDC · Testnet only · Not financial advice</div>
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

const detailWrap = { paddingTop: 28 } as const;
