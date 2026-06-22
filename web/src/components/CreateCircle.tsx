"use client";

import { useState } from "react";
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

export function CreateCircle({ onCreated }: { onCreated: () => void }) {
  const [amount, setAmount] = useState("10");
  const [members, setMembers] = useState(3);
  const [duration, setDuration] = useState(86400);
  const [recruiting, setRecruiting] = useState(604800);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const amt = Number(amount) || 0;
  const pot = amt * members;
  const durLabel = DURATIONS.find((d) => d.value === duration)?.label ?? "";

  function submit() {
    reset();
    writeContract(
      {
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createCircle",
        args: [parseUsdc(amount), members, BigInt(duration), BigInt(recruiting)],
      },
      { onSuccess: () => setTimeout(onCreated, 2500) }
    );
  }

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

      <TxStatus
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={error}
      />
    </div>
  );
}
