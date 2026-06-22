"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, ArrowRight, UserCheck, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";

type SimUser = {
  name: string;
  balance: number;
  collateral: number;
  contributionPaid: boolean;
  payoutClaimed: boolean;
  isDefaulter: boolean;
  withheldAmount?: number;
};

const INITIAL_USERS: SimUser[] = [
  { name: "Alice (Beneficiary Round 1)", balance: 100, collateral: 0, contributionPaid: false, payoutClaimed: false, isDefaulter: false },
  { name: "Bob (Beneficiary Round 2)", balance: 100, collateral: 0, contributionPaid: false, payoutClaimed: false, isDefaulter: false },
  { name: "Carol (Beneficiary Round 3)", balance: 100, collateral: 0, contributionPaid: false, payoutClaimed: false, isDefaulter: false },
];

export function Simulator() {
  const [step, setStep] = useState(0);
  const [users, setUsers] = useState<SimUser[]>(JSON.parse(JSON.stringify(INITIAL_USERS)));
  const [pot, setPot] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [log, setLog] = useState<string[]>(["Simulator initialized. Click start to simulate a circle."]);

  function resetSim() {
    setStep(0);
    setUsers(JSON.parse(JSON.stringify(INITIAL_USERS)));
    setPot(0);
    setContractBalance(0);
    setCurrentRound(0);
    setLog(["Simulator reset. Click start to begin."]);
  }

  function addLog(msg: string) {
    setLog((prev) => [msg, ...prev]);
  }

  function nextStep() {
    const next = step + 1;
    setStep(next);

    if (next === 1) {
      // Step 1: Recruiting & Joining
      const updated = users.map((u) => ({
        ...u,
        balance: u.balance - 10, // locks 10 USDC collateral
        collateral: 10,
      }));
      setUsers(updated);
      setContractBalance(30);
      addLog("Alice, Bob, and Carol joined. Each locked 10 USDC collateral in the contract.");
    } else if (next === 2) {
      // Step 2: Round 1 (Alice is beneficiary)
      const updated = users.map((u) => ({
        ...u,
        balance: u.balance - 10, // contributes 10 USDC
        contributionPaid: true,
      }));
      setUsers(updated);
      setPot(30);
      setContractBalance(60); // 30 collateral + 30 contributions
      addLog("Round 1: Everyone contributes 10 USDC. Pot is now 30 USDC.");
    } else if (next === 3) {
      // Close Round 1 & Alice Payout (Dynamic Collateral Withholding)
      // Alice is beneficiary.
      // Alice's remaining liability: Round 2 (10) + Round 3 (10) = 20 USDC.
      // Alice's current collateral: 10 USDC.
      // Withhold: 20 - 10 = 10 USDC.
      // Alice gets: 30 - 10 = 20 USDC.
      // Alice's collateral becomes: 20 USDC.
      const updated = users.map((u, i) => {
        if (i === 0) {
          return {
            ...u,
            balance: u.balance + 20, // gets 20 USDC payout
            collateral: 20, // collateral refilled/increased to 20 USDC
            payoutClaimed: true,
            withheldAmount: 10,
          };
        }
        return { ...u, contributionPaid: false };
      });
      setUsers(updated);
      setPot(0);
      setContractBalance(40); // 60 - 20 payout = 40 USDC
      addLog("Alice claimed Round 1 Payout: 10 USDC was withheld as extra collateral to cover future default risks (Alice's liability was 20 USDC). Alice received 20 USDC.");
      setCurrentRound(1);
    } else if (next === 4) {
      // Step 4: Round 2 (Bob is beneficiary)
      // Bob defaults! Alice and Carol pay.
      const updated = users.map((u, i) => {
        if (i === 0 || i === 2) {
          return { ...u, balance: u.balance - 10, contributionPaid: true };
        }
        // Bob defaults
        return { ...u, isDefaulter: true };
      });
      setUsers(updated);
      setPot(20);
      setContractBalance(60); // 40 + 20 contributions = 60 USDC
      addLog("Round 2: Alice and Carol contribute 10 USDC. Bob defaults! Current pot contains 20 USDC.");
    } else if (next === 5) {
      // Close Round 2 (Bob's collateral is consumed) & Bob claims payout
      // Pot becomes 30 because Bob's 10 USDC collateral is taken.
      // Bob's remaining liability: Round 3 (10 USDC).
      // Bob's current collateral: 0 (consumed).
      // Withhold: 10 - 0 = 10 USDC.
      // Bob gets: 30 - 10 = 20 USDC.
      // Bob's collateral is refilled to 10 USDC.
      const updated = users.map((u, i) => {
        if (i === 1) {
          return {
            ...u,
            balance: u.balance + 20, // gets 20 USDC payout
            collateral: 10, // refilled to 10 USDC
            payoutClaimed: true,
            isDefaulter: false,
            withheldAmount: 10,
          };
        }
        if (i === 0) {
          return { ...u, contributionPaid: false }; // Reset Alice contribution status for next round
        }
        return { ...u, collateral: u.name.includes("Bob") ? 0 : u.collateral, contributionPaid: false };
      });
      // Deduct Bob's collateral
      updated[1].collateral = 10; // refilled
      setUsers(updated);
      setPot(0);
      setContractBalance(40); // 60 - 20 payout = 40 USDC
      addLog("Bob claimed Round 2 Payout. Since Bob defaulted, his collateral was consumed to fill the pot. But, because he has 1 round of liability left, 10 USDC was withheld from his payout to refill his collateral!");
      setCurrentRound(2);
    } else if (next === 6) {
      // Step 6: Round 3 (Carol is beneficiary)
      // Bob defaults again! Alice and Carol pay.
      const updated = users.map((u, i) => {
        if (i === 0 || i === 2) {
          return { ...u, balance: u.balance - 10, contributionPaid: true };
        }
        return { ...u, isDefaulter: true };
      });
      setUsers(updated);
      setPot(20);
      setContractBalance(60); // 40 + 20 = 60 USDC
      addLog("Round 3: Alice and Carol contribute 10 USDC. Bob defaults again! Pot contains 20 USDC.");
    } else if (next === 7) {
      // Close Round 3 & Carol claims payout
      // Carol's remaining liability: 0. No withholding.
      // Carol gets: 30 USDC (Bob's refilled collateral is consumed to make pot whole!).
      // Bob's collateral becomes 0.
      const updated = users.map((u, i) => {
        if (i === 1) {
          return { ...u, collateral: 0, isDefaulter: false }; // Bob's refilled collateral is consumed
        }
        if (i === 2) {
          return { ...u, balance: u.balance + 30, payoutClaimed: true, contributionPaid: false };
        }
        return { ...u, contributionPaid: false };
      });
      setUsers(updated);
      setPot(0);
      setContractBalance(30); // 30 USDC collateral remaining in contract (Alice 20, Carol 10)
      addLog("Round 3 Closed. Bob's refilled collateral was consumed to complete the pot. Carol claimed her full 30 USDC payout with 0 withholding.");
    } else if (next === 8) {
      // Step 8: Circle Completed & Collateral Reclaimed
      // Alice reclaims 20 USDC. Carol reclaims 10 USDC. Bob has 0.
      const updated = users.map((u, i) => {
        if (i === 0) {
          return { ...u, balance: u.balance + 20, collateral: 0 };
        }
        if (i === 2) {
          return { ...u, balance: u.balance + 10, collateral: 0 };
        }
        return u;
      });
      setUsers(updated);
      setContractBalance(0);
      addLog("Circle Completed! Alice reclaimed her 20 USDC collateral, Carol reclaimed her 10 USDC collateral. Bob had 0 collateral remaining. The dynamic model successfully protected all participants!");
    }
  }

  const stepDetails = [
    {
      title: "Recruiting Phase",
      desc: "Members join the circle and lock 10 USDC collateral as security deposit.",
      btnText: "Start Circle & Lock Collateral",
    },
    {
      title: "Round 1 (Alice's Turn)",
      desc: "All three members contribute 10 USDC. Alice is the beneficiary of Round 1.",
      btnText: "Contribute 10 USDC",
    },
    {
      title: "Alice Claims Payout (Withholding)",
      desc: "Alice claims the 30 USDC pot. Because she has 2 rounds of remaining liability, 10 USDC is withheld from her payout and added to her collateral (totaling 20 USDC collateral).",
      btnText: "Distribute Payout & Withhold",
    },
    {
      title: "Round 2 (Bob's Turn)",
      desc: "Alice and Carol pay 10 USDC. Bob defaults on his contribution. Bob is the beneficiary of Round 2.",
      btnText: "Simulate Bob Default",
    },
    {
      title: "Bob Claims Payout (Refilling)",
      desc: "Bob's collateral is consumed to make the Round 2 pot whole. Bob claims the pot. Since he has 1 round of liability left, 10 USDC is withheld from his payout to refill his collateral.",
      btnText: "Claim Payout & Refill Collateral",
    },
    {
      title: "Round 3 (Carol's Turn)",
      desc: "Alice and Carol pay 10 USDC. Bob defaults again. Carol is the beneficiary of Round 3.",
      btnText: "Simulate Bob 2nd Default",
    },
    {
      title: "Carol Claims Payout",
      desc: "Bob's refilled collateral is consumed to complete the Round 3 pot. Carol claims the full 30 USDC payout. Carol has 0 remaining liability, so no withholding is needed.",
      btnText: "Close Circle & Settle Payout",
    },
    {
      title: "Settle Remaining Collateral",
      desc: "The circle is complete. Alice reclaims her 20 USDC collateral. Carol reclaims her 10 USDC collateral. Bob has 0 collateral left. Nobody suffered any deficit!",
      btnText: "Reclaim Collaterals",
    },
    {
      title: "Simulation Complete",
      desc: "The interactive simulator successfully demonstrated that Roda's dynamic collateral withholding model completely mitigates serial defaults.",
      btnText: "Restart Simulator",
    },
  ];

  const currentStepInfo = stepDetails[Math.min(step, stepDetails.length - 1)];

  return (
    <div className="card" style={{ border: "1px solid var(--accent)", position: "relative" }}>
      <div style={badgeStyle}>Interactive Simulator</div>
      <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Play size={18} className="grad-text" />
        Dynamic Collateral Simulator
      </h3>
      <p className="card-desc">
        Click through this step-by-step interactive simulator to see how Roda's **Dynamic Collateral Withholding** model prevents deficits during serial defaults.
      </p>

      {/* Simulator Dashboard */}
      <div style={simGrid}>
        {/* Left Side: Users list */}
        <div style={usersCol}>
          <h4 style={sectionHeader}>Participants</h4>
          {users.map((u, i) => {
            const isBeneficiary = step >= 1 && (
              (step === 2 && i === 0) ||
              (step === 4 && i === 1) ||
              (step === 6 && i === 2)
            );
            return (
              <div key={u.name} style={{ ...userCard, border: isBeneficiary ? "1px solid var(--accent)" : "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{u.name.split(" ")[0]}</span>
                  {u.isDefaulter && <span style={defaultBadge}>Defaulter</span>}
                  {u.contributionPaid && <span style={paidBadge}>Paid 10</span>}
                </div>
                <div style={userStatRow}>
                  <span style={userStatLabel}>Balance</span>
                  <span className="mono" style={userStatVal}>{u.balance} USDC</span>
                </div>
                <div style={userStatRow}>
                  <span style={userStatLabel}>Collateral Lock</span>
                  <span className="mono" style={{ ...userStatVal, color: u.collateral > 10 ? "#10b981" : "inherit" }}>
                    {u.collateral} USDC
                  </span>
                </div>
                {u.withheldAmount && u.withheldAmount > 0 && (
                  <div style={withheldAlert}>
                    Withheld: {u.withheldAmount} USDC
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Contract & Actions */}
        <div style={contractCol}>
          <h4 style={sectionHeader}>Savings Contract State</h4>
          <div style={contractPanel}>
            <div style={cStatRow}>
              <span>Escrowed USDC</span>
              <span className="mono" style={cStatVal}>{contractBalance} USDC</span>
            </div>
            <div style={cStatRow}>
              <span>Current Round</span>
              <span className="mono" style={cStatVal}>{step >= 8 ? "Finished" : `Round ${currentRound + 1}`}</span>
            </div>
            <div style={cStatRow}>
              <span>Active Payout Pot</span>
              <span className="mono" style={{ ...cStatVal, color: pot > 0 ? "var(--accent)" : "inherit" }}>{pot} USDC</span>
            </div>
          </div>

          <div style={actionCard}>
            <h5 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700 }}>
              Step {step}: {currentStepInfo.title}
            </h5>
            <p style={{ margin: "0 0 16px", fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.4 }}>
              {currentStepInfo.desc}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn success sm"
                onClick={step === stepDetails.length - 1 ? resetSim : nextStep}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {step === stepDetails.length - 1 ? <RotateCcw size={15} /> : <ArrowRight size={15} />}
                {currentStepInfo.btnText}
              </button>
              {step > 0 && (
                <button className="btn ghost sm" onClick={resetSim}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulator logs */}
      <div style={logSection}>
        <h4 style={{ ...sectionHeader, margin: "0 0 8px" }}>Event Logs</h4>
        <div style={logBox}>
          {log.map((l, i) => (
            <div key={i} style={{ ...logItem, opacity: i === 0 ? 1 : 0.5 }}>
              <span style={{ color: "var(--accent)", marginRight: 6 }}>&gt;</span>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const badgeStyle: CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  fontSize: "11px",
  fontWeight: 700,
  backgroundColor: "rgba(100, 108, 255, 0.15)",
  color: "var(--accent)",
  padding: "4px 10px",
  borderRadius: "20px",
  border: "1px solid rgba(100, 108, 255, 0.3)",
};

const simGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginTop: "20px",
};

const usersCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const contractCol: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const sectionHeader: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  letterSpacing: "0.05em",
};

const userCard: CSSProperties = {
  backgroundColor: "var(--bg-card-hover)",
  borderRadius: "8px",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const userStatRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "13px",
};

const userStatLabel: CSSProperties = {
  color: "var(--text-muted)",
};

const userStatVal: CSSProperties = {
  fontWeight: 600,
};

const defaultBadge: CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 700,
  color: "#f43f5e",
  backgroundColor: "rgba(244, 63, 94, 0.15)",
  padding: "2px 6px",
  borderRadius: "4px",
};

const paidBadge: CSSProperties = {
  fontSize: "10.5px",
  fontWeight: 700,
  color: "#10b981",
  backgroundColor: "rgba(16, 185, 129, 0.15)",
  padding: "2px 6px",
  borderRadius: "4px",
};

const contractPanel: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.15)",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid var(--border-color)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const cStatRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "13.5px",
};

const cStatVal: CSSProperties = {
  fontWeight: 700,
};

const actionCard: CSSProperties = {
  backgroundColor: "var(--bg-card-hover)",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  padding: "16px",
  flex: 1,
  display: "flex",
  flexDirection: "column",
};

const withheldAlert: CSSProperties = {
  fontSize: "11px",
  color: "#3b82f6",
  backgroundColor: "rgba(59, 130, 246, 0.1)",
  padding: "3px 8px",
  borderRadius: "4px",
  marginTop: "4px",
  alignSelf: "flex-start",
  fontWeight: 600,
};

const logSection: CSSProperties = {
  marginTop: "20px",
  borderTop: "1px solid var(--border-color)",
  paddingTop: "16px",
};

const logBox: CSSProperties = {
  backgroundColor: "rgba(0,0,0,0.2)",
  borderRadius: "8px",
  padding: "12px",
  height: "100px",
  overflowY: "auto",
  fontFamily: "monospace",
  fontSize: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const logItem: CSSProperties = {
  lineHeight: 1.4,
};
