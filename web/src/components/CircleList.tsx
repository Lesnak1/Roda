"use client";

import { useState, useEffect } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
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
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { y: 15, opacity: 0 },
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

export function CircleList({ onSelect }: { onSelect: (addr: `0x${string}`) => void }) {
  const client = usePublicClient();
  const [states, setStates] = useState<Record<string, number>>({});

  const { data, isLoading, refetch, isRefetching, error } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getCircles",
    args: [0n, 50n],
  });

  // Reverse list: newest circles first
  const circles = [...((data as CircleInfo[] | undefined) ?? [])].reverse();

  useEffect(() => {
    if (!client || circles.length === 0) return;

    async function fetchStates() {
      try {
        const contracts = circles.map((c) => ({
          address: c.circle,
          abi: circleAbi,
          functionName: "state",
        }));
        
        const results = await multicallSafe(client, contracts);
        const newStates: Record<string, number> = {};
        circles.forEach((c, idx) => {
          const res = results[idx];
          if (res?.status === "success") {
            newStates[c.circle.toLowerCase()] = Number(res.result);
          }
        });
        setStates(newStates);
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
              <div className="skeleton" style={sk1} />
              <div className="skeleton" style={sk2} />
              <div className="skeleton" style={sk3} />
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
          {circles.map((c) => (
            <motion.div
              key={c.circle}
              variants={cardVariants}
              whileHover={{ y: -4 }}
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
              <div className="row">
                <span className="badge blue">{c.memberCount} members</span>
                <span className="badge">{fmtDuration(Number(c.roundDuration))}/round</span>
                {states[c.circle.toLowerCase()] !== undefined && (
                  states[c.circle.toLowerCase()] === 0 ? (
                    <span className="badge blue">Recruiting</span>
                  ) : states[c.circle.toLowerCase()] === 1 ? (
                    <span className="badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span className="live-dot" /> Active</span>
                  ) : states[c.circle.toLowerCase()] === 2 ? (
                    <span className="badge gray">Completed</span>
                  ) : (
                    <span className="badge red">Cancelled</span>
                  )
                )}
              </div>
              <div className="circle-amount">
                {formatUsdc(c.contributionAmount)}<small>USDC</small>
              </div>
              <div className="circle-meta">
                contribution/round · pot {formatUsdc(c.contributionAmount * BigInt(c.memberCount))} USDC
              </div>
              <div className="circle-foot">
                <span className="mono">{shortAddr(c.creator)}</span>
                <span className="go">View Circle →</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

const sk1 = { width: "50%" } as const;
const sk2 = { width: "75%", marginTop: 18, height: 24 } as const;
const sk3 = { width: "40%", marginTop: 16 } as const;
