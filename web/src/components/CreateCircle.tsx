"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Coins, Users, Calendar, Plus } from "lucide-react";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { parseUsdc } from "@/lib/format";
import { TxStatus } from "./TxStatus";

const DURATIONS = [
  { label: "1 minute (demo)", value: 60 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "1 week", value: 604800 },
];

const RECRUITING_DURATIONS = [
  { label: "5 minutes (demo)", value: 300 },
  { label: "1 hour", value: 3600 },
  { label: "1 day", value: 86400 },
  { label: "7 days", value: 604800 },
];

const GRACE_PERIODS = [
  { label: "1 hour (demo)", value: 3600 },
  { label: "24 hours (default)", value: 86400 },
  { label: "3 days", value: 259200 },
  { label: "7 days (max)", value: 604800 },
];

export function CreateCircle({ onCreated }: { onCreated: (circleAddress?: `0x${string}`) => void }) {
  const [amount, setAmount] = useState("10");
  const [members, setMembers] = useState(3);
  const [duration, setDuration] = useState(86400);
  const [recruiting, setRecruiting] = useState(604800);
  const [gracePeriod, setGracePeriod] = useState(86400);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
  const isReverted = isConfirmed && receipt?.status === "reverted";
  const [formError, setFormError] = useState<string | null>(null);

  const amt = Number(amount) || 0;
  const pot = amt * members;
  const durLabel = DURATIONS.find((d) => d.value === duration)?.label ?? "";

  function submit() {
    setFormError(null);
    if (amt <= 0 || isNaN(amt)) {
      setFormError("Contribution amount must be greater than 0.");
      return;
    }
    if (members < 2 || members > 20) {
      setFormError("Members must be between 2 and 20.");
      return;
    }
    // Check for excessive decimals (USDC has 6 decimals)
    const parts = amount.split(".");
    if (parts.length > 1 && parts[1].length > 6) {
      setFormError("USDC supports max 6 decimal places.");
      return;
    }
    writeContract(
      {
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createCircleWithGrace",
        args: [parseUsdc(amount), members, BigInt(duration), BigInt(recruiting), BigInt(gracePeriod)],
      }
    );
  }

  useEffect(() => {
    if (isConfirmed && !isReverted) {
      let newCircleAddr: `0x${string}` | undefined = undefined;
      try {
        const factoryLog = receipt?.logs?.find(
          (l) => l.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()
        );
        if (factoryLog && factoryLog.topics && factoryLog.topics[1]) {
          const topic1 = factoryLog.topics[1];
          if (topic1) {
            newCircleAddr = `0x${topic1.slice(26)}` as `0x${string}`;
          }
        }
      } catch (err) {
        console.error("Failed to parse circleAddress from logs:", err);
      }

      const timer = setTimeout(() => {
        onCreated(newCircleAddr);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, isReverted, receipt, onCreated]);

  const busy = isPending || isConfirming;

  return (
    <div className="card">
      <h3 className="card-title">Create a Circle</h3>
      <p className="card-desc">
        Set the contribution amount and member count. The pot each round equals <b>contribution × members</b>.
        Everyone who joins locks one round of contribution as a security deposit.
      </p>

      <div className="row" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="field">
          <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Coins size={14} className="muted" />
            Contribution per round (USDC)
          </label>
          <input
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="field">
          <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} className="muted" />
            Members
          </label>
          <input
            className="input"
            type="number"
            min={2}
            max={20}
            value={members}
            onChange={(e) => setMembers(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} className="muted" />
            Round duration
          </label>
          <select
            className="select"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} className="muted" />
            Recruiting duration
          </label>
          <select
            className="select"
            value={recruiting}
            onChange={(e) => setRecruiting(Number(e.target.value))}
          >
            {RECRUITING_DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} className="muted" />
            Default grace period
          </label>
          <select
            className="select"
            value={gracePeriod}
            onChange={(e) => setGracePeriod(Number(e.target.value))}
          >
            {GRACE_PERIODS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="preview">
        <div className="preview-row">
          <span className="pk">Pot collected each round</span>
          <motion.span
            key={`pot-${pot}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pv"
          >
            {pot.toLocaleString("en-US")} USDC
          </motion.span>
        </div>
        <div className="preview-row">
          <span className="pk">Collateral locked on join</span>
          <motion.span
            key={`collateral-${amt}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pv"
          >
            {amt.toLocaleString("en-US")} USDC
          </motion.span>
        </div>
        <div className="preview-row">
          <span className="pk">Total rounds</span>
          <span className="pv">
            {members} rounds · {durLabel}
          </span>
        </div>
        <div className="preview-row">
          <span className="pk">Each member total contribution</span>
          <motion.span
            key={`total-${amt * members}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pv"
          >
            {(amt * members).toLocaleString("en-US")} USDC
          </motion.span>
        </div>
      </div>

      <div className="row" style={{ marginTop: 24 }}>
        <button
          className="btn"
          onClick={submit}
          disabled={busy}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          {busy ? <span className="btn-spin" /> : <Plus size={18} />}
          Create Circle
        </button>
      </div>

      {formError && (
        <div className="alert err" style={{ marginTop: 12 }}>
          <span className="ai">✕</span>
          <span>{formError}</span>
        </div>
      )}

      <TxStatus
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed && !isReverted}
        isReverted={isReverted}
        error={error}
      />
    </div>
  );
}
