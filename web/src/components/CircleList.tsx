"use client";

import { useState, useEffect, useMemo } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { motion } from "framer-motion";
import { RefreshCw, Users, Clock, ArrowRight, Zap } from "lucide-react";
import { FACTORY_ADDRESS, factoryAbi, circleAbi, multicallSafe } from "@/lib/contracts";
import { formatUsdc, fmtDuration, shortAddr } from "@/lib/format";

type CircleInfo = {
  circle: `0x${string}`;
  creator: `0x${string}`;
  contributionAmount: bigint;
  memberCount: number;
  roundDuration: bigint;
  createdAt: bigint;
};

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.97 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 16,
    },
  },
} as const;

function StateBadge({ state }: { state: number | undefined }) {
  if (state === undefined) return null;
  if (state === 0)
    return <span className="badge blue">Recruiting</span>;
  if (state === 1)
    return (
      <span className="badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span className="live-dot" /> Active
      </span>
    );
  if (state === 2)
    return <span className="badge gray">Completed</span>;
  return <span className="badge red">Cancelled</span>;
}

export function CircleList({ onSelect }: { onSelect: (addr: `0x${string}`) => void }) {
  const client = usePublicClient();
  const [states, setStates] = useState<Record<string, number>>({});
  const [joinedCounts, setJoinedCounts] = useState<Record<string, number>>({});

  const { data, isLoading, refetch, isRefetching, error } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getCircles",
    args: [0n, 50n],
  });

  // Reverse list: newest circles first
  const circles = useMemo(
    () => [...((data as CircleInfo[] | undefined) ?? [])].reverse(),
    [data]
  );

  useEffect(() => {
    if (!client || circles.length === 0) return;

    async function fetchStates() {
      try {
        const stateContracts = circles.map((c) => ({
          address: c.circle,
          abi: circleAbi,
          functionName: "state",
        }));
        const joinedContracts = circles.map((c) => ({
          address: c.circle,
          abi: circleAbi,
          functionName: "membersJoined",
        }));

        const results = await multicallSafe(client, [...stateContracts, ...joinedContracts]);
        const newStates: Record<string, number> = {};
        const newJoined: Record<string, number> = {};
        circles.forEach((c, idx) => {
          const stateRes = results[idx];
          if (stateRes?.status === "success") {
            newStates[c.circle.toLowerCase()] = Number(stateRes.result);
          }
          const joinedRes = results[circles.length + idx];
          if (joinedRes?.status === "success") {
            newJoined[c.circle.toLowerCase()] = Number(joinedRes.result);
          }
        });
        setStates(newStates);
        setJoinedCounts(newJoined);
      } catch (err) {
        console.error("Failed to fetch circle states", err);
      }
    }

    fetchStates();
  }, [client, data]);

  return (
    <div className="card">
      <div className="section-head">
        <h2>Discover Circles</h2>
        <button
          className="btn ghost sm"
          disabled={isLoading || isRefetching}
          onClick={() => refetch()}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <motion.div
            animate={isRefetching ? { rotate: 360 } : { rotate: 0 }}
            transition={{ repeat: isRefetching ? Infinity : 0, duration: 1, ease: "linear" }}
            style={{ display: "flex" }}
          >
            <RefreshCw size={14} />
          </motion.div>
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="circle-card">
              <div className="circle-card-inner">
                <div className="skeleton" style={sk1} />
                <div className="skeleton" style={sk2} />
                <div className="skeleton" style={sk3} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="alert err" style={{ marginTop: 12 }}>
          <span className="ai">✕</span>
          <span>Failed to load circles: {error.message || "RPC connection error"}</span>
        </div>
      )}

      {!isLoading && !error && circles.length === 0 && (
        <div className="center-card">
          <div className="center-ico">🌱</div>
          <h3 className="card-title">No circles yet</h3>
          <p className="card-desc">Create the first circle and invite your friends.</p>
        </div>
      )}

      {!isLoading && circles.length > 0 && (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid"
        >
          {circles.map((c) => {
            const key = c.circle.toLowerCase();
            const circleState = states[key];
            const joined = joinedCounts[key] ?? 0;
            const pot = c.contributionAmount * BigInt(c.memberCount);
            const fillPercent = c.memberCount > 0 ? Math.round((joined / c.memberCount) * 100) : 0;

            return (
              <motion.div
                key={c.circle}
                variants={cardVariants}
                className="circle-card"
                onClick={() => onSelect(c.circle)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(c.circle);
                  }
                }}
              >
                <div className="circle-card-inner">
                  {/* Header: badges */}
                  <div className="circle-header">
                    <StateBadge state={circleState} />
                    <span className="badge">
                      <Clock size={11} /> {fmtDuration(Number(c.roundDuration))}/round
                    </span>
                  </div>

                  {/* Vault amount */}
                  <div className="circle-vault">
                    <span className="circle-amount">{formatUsdc(c.contributionAmount)}</span>
                    <span className="circle-amount-unit">USDC</span>
                  </div>

                  {/* Pot callout */}
                  <div className="circle-pot">
                    <Zap size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <span className="pot-label">POT / ROUND</span>
                    <span className="pot-value">{formatUsdc(pot)} USDC</span>
                  </div>

                  {/* Member progress */}
                  <div className="circle-progress-wrap">
                    <div className="circle-progress-info">
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={12} /> Members
                      </span>
                      <span className="count">{joined}/{c.memberCount}</span>
                    </div>
                    <div className="circle-progress-bar">
                      <div
                        className="circle-progress-fill"
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="circle-foot">
                    <span className="creator-addr">
                      <span className="creator-dot" />
                      <span className="mono">{shortAddr(c.creator)}</span>
                    </span>
                    <span className="go">
                      View Circle <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

const sk1 = { width: "50%" } as const;
const sk2 = { width: "75%", marginTop: 18, height: 24 } as const;
const sk3 = { width: "40%", marginTop: 16 } as const;

