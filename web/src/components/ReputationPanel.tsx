"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { circleAbi } from "@/lib/contracts";
import { shortAddr } from "@/lib/format";

// Lightweight on-chain reputation derived purely from this circle's events.
// Contributions build trust; Defaulted events are public marks. Fully
// transparent and verifiable — no trusted indexer required.
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

  const maxScore = 100;

  return (
    <div className="card">
      <h3 className="card-title">Trust Score</h3>
      <p className="card-desc">
        Derived from chain events: on-time contribution = +trust, default = public mark. No trusted indexer.
      </p>
      {loading && <div className="skeleton" style={skFull} />}
      {err && (
        <div className="alert err">
          <span className="ai">✕</span>
          <span>Could not read events: {err}</span>
        </div>
      )}
      {!loading &&
        members.map((m) => {
          const r = rep[m.toLowerCase()] ?? { contributions: 0, defaults: 0 };
          const score = Math.max(0, r.contributions * 10 - r.defaults * 25);
          const pct = Math.min(100, (score / maxScore) * 100);
          const fillStyle: CSSProperties = { width: `${pct}%` };
          return (
            <div key={m} className="rep-item">
              <span className="mono" style={repAddr}>{shortAddr(m)}</span>
              <div className="rep-bar">
                <div className="rep-fill" style={fillStyle} />
              </div>
              {r.defaults > 0 && <span className="badge">{r.defaults} defaults</span>}
              <span className="badge blue">{score}</span>
            </div>
          );
        })}
    </div>
  );
}

const skFull: CSSProperties = { width: "100%", height: 18 };
const repAddr: CSSProperties = { minWidth: 84 };
