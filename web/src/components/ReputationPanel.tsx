"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { circleAbi } from "@/lib/contracts";
import { shortAddr } from "@/lib/format";
import { Award, ShieldCheck, TrendingUp, Sparkles, AlertCircle } from "lucide-react";

// On-chain reputation derived from circle's contribution history.
// Serves as a decentralized financial passport for the user.
type Rep = { contributions: number; defaults: number };

export function ReputationPanel({
  address,
  members,
}: {
  address: `0x${string}`;
  members: `0x${string}`[];
}) {
  const client = usePublicClient();
  const [rep, setRep] = useState<Record<string, Rep>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!client) return;
      setLoading(true);
      setErr(null);
      try {
        const acc: Record<string, Rep> = {};
        const bump = (a: string, k: keyof Rep) => {
          const key = a.toLowerCase();
          acc[key] = acc[key] ?? { contributions: 0, defaults: 0 };
          acc[key][k] += 1;
        };
        const contributed = await client.getContractEvents({
          address,
          abi: circleAbi,
          eventName: "Contributed",
          fromBlock: 0n,
          toBlock: "latest",
        });
        const defaulted = await client.getContractEvents({
          address,
          abi: circleAbi,
          eventName: "Defaulted",
          fromBlock: 0n,
          toBlock: "latest",
        });
        for (const e of contributed) {
          const m = (e.args as { member?: string }).member;
          if (m) bump(m, "contributions");
        }
        for (const e of defaulted) {
          const m = (e.args as { member?: string }).member;
          if (m) bump(m, "defaults");
        }
        if (!cancelled) setRep(acc);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client, address]);

  return (
    <div className="card">
      <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Award size={18} className="grad-text" />
        Roda Passport & Repayment Reputation
      </h3>
      <p className="card-desc">
        A decentralized credit identity built on-chain. Each timely contribution builds your portable reputational credit, lowering future collateral requirements.
      </p>

      {loading && <div className="skeleton" style={skFull} />}
      {err && (
        <div className="alert err">
          <span className="ai">✕</span>
          <span>Could not read reputation events: {err}</span>
        </div>
      )}

      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          {members.map((m) => {
            const r = rep[m.toLowerCase()] ?? { contributions: 0, defaults: 0 };
            const totalActions = r.contributions + r.defaults;
            const repaymentRate = totalActions > 0 ? Math.round((r.contributions / totalActions) * 100) : 100;
            
            // Calculate score (out of 100)
            const baseScore = totalActions === 0 ? 100 : Math.max(0, 100 - r.defaults * 35 + r.contributions * 2);
            const score = Math.min(100, baseScore);
            
            // Determine tier
            let tier = "Unrated";
            let tierColor = "var(--text-muted)";
            let tierBg = "rgba(255,255,255,0.04)";
            if (totalActions > 0) {
              if (score >= 95) {
                tier = "Excellent (Tier 1)";
                tierColor = "#10b981";
                tierBg = "rgba(16, 185, 129, 0.08)";
              } else if (score >= 80) {
                tier = "Good (Tier 2)";
                tierColor = "#3b82f6";
                tierBg = "rgba(59, 130, 246, 0.08)";
              } else {
                tier = "Needs Improvement";
                tierColor = "#f43f5e";
                tierBg = "rgba(244, 63, 94, 0.08)";
              }
            }

            return (
              <div key={m} style={passportContainer}>
                <div style={passportHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: "14.5px" }}>
                      {shortAddr(m)}
                    </span>
                    {totalActions > 0 && score >= 90 && (
                      <ShieldCheck size={15} style={{ color: "#10b981" }} />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: tierColor,
                      backgroundColor: tierBg,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: `1px solid ${tierBg}`,
                    }}
                  >
                    {tier}
                  </span>
                </div>

                <div className="rep-row" style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                  <div className="rep-bar" style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "var(--bg-card)", overflow: "hidden" }}>
                    <div
                      className="rep-fill"
                      style={{
                        width: `${score}%`,
                        height: "100%",
                        background: score >= 80 ? "linear-gradient(90deg, #3b82f6, #10b981)" : "#f43f5e",
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: "13px", fontWeight: 700, minWidth: 28, textAlign: "right" }}>
                    {score}
                  </span>
                </div>

                <div style={passportStats}>
                  <div style={pStat}>
                    <span style={pStatLabel}>Repayment Rate</span>
                    <span style={pStatVal} className="mono">
                      {repaymentRate}%
                    </span>
                  </div>
                  <div style={pStat}>
                    <span style={pStatLabel}>Paid Rounds</span>
                    <span style={{ ...pStatVal, color: "#10b981" }} className="mono">
                      {r.contributions}
                    </span>
                  </div>
                  <div style={pStat}>
                    <span style={pStatLabel}>Defaults</span>
                    <span style={{ ...pStatVal, color: r.defaults > 0 ? "#f43f5e" : "var(--text-muted)" }} className="mono">
                      {r.defaults}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const skFull: CSSProperties = { width: "100%", height: 18 };

const passportContainer: CSSProperties = {
  backgroundColor: "var(--bg-card-hover)",
  borderRadius: "12px",
  padding: "16px",
  border: "1px solid var(--border-color)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const passportHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const passportStats: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "8px",
  marginTop: "8px",
  borderTop: "1px solid rgba(255,255,255,0.04)",
  paddingTop: "10px",
};

const pStat: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const pStatLabel: CSSProperties = {
  fontSize: "11px",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

const pStatVal: CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
};
