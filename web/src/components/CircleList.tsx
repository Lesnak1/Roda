"use client";

import { useReadContract } from "wagmi";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
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
  const { data, isLoading, refetch, isRefetching } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "getCircles",
    args: [0n, 50n],
  });

  const circles = (data as CircleInfo[] | undefined) ?? [];

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

      {!isLoading && circles.length === 0 && (
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
            >
              <div className="row">
                <span className="badge blue">{c.memberCount} members</span>
                <span className="badge">{fmtDuration(Number(c.roundDuration))}/round</span>
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
