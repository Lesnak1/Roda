"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { circleAbi, multicallSafe } from "@/lib/contracts";
import { formatUsdc, shortAddr } from "@/lib/format";
import { Brain, Cpu, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, XCircle, Zap, Award, Activity, Fingerprint } from "lucide-react";

export function AIGuardianPanel({
  address,
  members,
  currentRound,
}: {
  address: `0x${string}`;
  members: `0x${string}`[];
  currentRound: number;
}) {
  const client = usePublicClient();
  const { address: account } = useAccount();

  const [selectedMember, setSelectedMember] = useState<string>("");
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskData, setRiskData] = useState<any>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [executingBailout, setExecutingBailout] = useState(false);
  const [bailoutHash, setBailoutHash] = useState<string | null>(null);

  // Contract states
  const [collaterals, setCollaterals] = useState<Record<string, number>>({});
  const [debts, setDebts] = useState<Record<string, number>>({});
  const [histories, setHistories] = useState<Record<string, string[]>>({});
  const [loadingData, setLoadingData] = useState(false);

  // ERC-8004 Identity states
  const [identityData, setIdentityData] = useState<any>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regHash, setRegHash] = useState<string | null>(null);

  async function fetchIdentity() {
    setLoadingIdentity(true);
    try {
      const res = await fetch("/api/agent-identity");
      const data = await res.json();
      if (res.ok && !data.error) {
        setIdentityData(data);
      }
    } catch (e) {
      console.error("Failed to load agent identity:", e);
    } finally {
      setLoadingIdentity(false);
    }
  }

  async function registerAgent() {
    setRegistering(true);
    setRegHash(null);
    try {
      const res = await fetch("/api/agent-identity", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to register agent identity");
      } else {
        setRegHash(data.txHash);
        await fetchIdentity(); // Reload status
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to register agent identity");
    } finally {
      setRegistering(false);
    }
  }

  useEffect(() => {
    fetchIdentity();
  }, []);

  async function fetchContractData() {
    if (!client || !members || members.length === 0) return;
    setLoadingData(true);
    try {
      const contracts: any[] = [];
      
      // 1. Fetch collaterals and debts for all members
      for (const m of members) {
        contracts.push({ address, abi: circleAbi, functionName: "collateral", args: [m] });
        contracts.push({ address, abi: circleAbi, functionName: "memberDebt", args: [m] });
      }

      // 2. Fetch history (roundClosed + hasContributed)
      for (let r = 0; r < members.length; r++) {
        contracts.push({ address, abi: circleAbi, functionName: "roundClosed", args: [BigInt(r)] });
        for (const m of members) {
          contracts.push({ address, abi: circleAbi, functionName: "hasContributed", args: [BigInt(r), m] });
        }
      }

      const results = await multicallSafe(client, contracts);

      // Parse collaterals and debts
      const tempCollaterals: Record<string, number> = {};
      const tempDebts: Record<string, number> = {};
      let ptr = 0;
      for (const m of members) {
        const colVal = results[ptr]?.result as bigint;
        ptr++;
        const debtVal = results[ptr]?.result as bigint;
        ptr++;
        
        tempCollaterals[m.toLowerCase()] = Number(colVal ?? 0n) / 1000000; // 6 decimals
        tempDebts[m.toLowerCase()] = Number(debtVal ?? 0n) / 1000000;
      }

      // Parse round history
      const tempHistories: Record<string, string[]> = {};
      for (const m of members) {
        tempHistories[m.toLowerCase()] = [];
      }

      for (let r = 0; r < members.length; r++) {
        const closed = Boolean(results[ptr]?.result);
        ptr++;

        for (const m of members) {
          const hasPaid = Boolean(results[ptr]?.result);
          ptr++;

          if (closed) {
            tempHistories[m.toLowerCase()].push(hasPaid ? "paid" : "defaulted");
          }
        }
      }

      setCollaterals(tempCollaterals);
      setDebts(tempDebts);
      setHistories(tempHistories);
      
      if (!selectedMember && members.length > 0) {
        setSelectedMember(members[0].toLowerCase());
      }
    } catch (error) {
      console.error("Error fetching data for AI Guardian:", error);
    } finally {
      setLoadingData(false);
    }
  }

  // Auto-initialize selectedMember when members list is loaded
  useEffect(() => {
    if (members && members.length > 0 && !selectedMember) {
      setSelectedMember(members[0].toLowerCase());
    }
  }, [members, selectedMember]);

  useEffect(() => {
    fetchContractData();
  }, [client, address, members]);

  async function evaluateRisk() {
    if (!selectedMember) return;
    setLoadingRisk(true);
    setRiskData(null);
    setBailoutHash(null);
    setRiskError(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members,
          currentRound,
          collateral: collaterals,
          debts,
          history: histories,
          targetMember: selectedMember,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setRiskError(data.error || "Failed to analyze risk");
      } else {
        setRiskData(data);
        // Refresh identity to show the new reputation record on chain
        setTimeout(() => fetchIdentity(), 3000);
      }
    } catch (e: any) {
      console.error(e);
      setRiskError(e.message || "Failed to analyze risk");
    } finally {
      setLoadingRisk(false);
    }
  }

  async function triggerBailout() {
    if (!riskData || riskData.status !== "APPROVED") return;
    setExecutingBailout(true);
    setBailoutHash(null);
    try {
      const response = await fetch("/api/bailout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleAddress: address,
          amount: BigInt(Math.round((riskData.bailoutAmount || 100) * 1000000)).toString(),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Bailout execution failed");
      }
      
      setBailoutHash(data.txHash);
      
      // Update local state to simulate resolved debt
      const key = selectedMember.toLowerCase();
      setDebts((prev) => ({ ...prev, [key]: 0 }));
      setHistories((prev) => ({
        ...prev,
        [key]: prev[key] ? [...prev[key].slice(0, -1), "paid"] : ["paid"],
      }));
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to execute bailout");
    } finally {
      setExecutingBailout(false);
    }
  }

  return (
    <div className="card">
      <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Brain size={18} className="grad-text" />
        🤖 AI Liquidity Guardian
      </h3>
      <p className="card-desc">
        A real-time on-chain risk engine that analyzes credit profiles and autonomously decides whether to inject default insurance.
      </p>

      {/* Onchain ERC-8004 Agent Identity Section */}
      <div style={identityContainer}>
        {loadingIdentity ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <span className="btn-spin" /> Fetching Agent identity registry on Arc...
          </div>
        ) : identityData?.registered ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Fingerprint size={16} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Onchain Identity Verified</span>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "12px", backgroundColor: "rgba(99, 102, 241, 0.15)", color: "var(--accent)", fontWeight: 600 }}>
                ERC-8004 Agent #{identityData.agentId}
              </span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>REPUTATION SCORE</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Award size={16} /> {identityData.stats?.avgScore || 0}%
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>ASSESSMENTS</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Activity size={16} /> {identityData.stats?.totalCount || 0} Total
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>OWNER ADDRESS</span>
                <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                  {shortAddr(identityData.ownerAddress)}
                </span>
              </div>
            </div>

            {/* List of recent assessments logs */}
            {identityData.stats?.feedbacks?.length > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>Recent Evaluations Logging:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "120px", overflowY: "auto", paddingRight: 4 }}>
                  {identityData.stats.feedbacks.map((f: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", borderRadius: "4px", padding: "6px 8px", fontSize: 11 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "70%" }}>
                        <span style={{ color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.comment}
                        </span>
                        <span style={{ color: "var(--muted)", fontSize: 9 }}>Tag: {f.tag}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: f.score >= 90 ? "var(--success)" : "var(--warn)" }}>
                        {f.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text)" }}>Agent onchain identity is not registered.</span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>Mint an ERC-8004 NFT on Arc to begin tracking default risk evaluation scores.</span>
            </div>
            <button className="btn sm" onClick={registerAgent} disabled={registering}>
              {registering && <span className="btn-spin" />}
              Register Agent
            </button>
          </div>
        )}
        
        {regHash && (
          <div className="alert ok" style={{ marginTop: 10, fontSize: 11 }}>
            <CheckCircle2 size={14} />
            <div>
              Agent minted successfully! Transaction: <a href={`https://testnet.arcscan.app/tx/${regHash}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{regHash.substring(0, 16)}...</a>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Select Member:</label>
          <select
            value={selectedMember}
            onChange={(e) => {
              setSelectedMember(e.target.value);
              setRiskData(null);
              setRiskError(null);
              setBailoutHash(null);
            }}
            style={selectStyle}
          >
            {members.map((m) => (
              <option key={m} value={m.toLowerCase()}>
                {shortAddr(m)} {m.toLowerCase() === account?.toLowerCase() ? "(You)" : ""}
              </option>
            ))}
          </select>
          <button className="btn success sm" onClick={evaluateRisk} disabled={loadingRisk || loadingData}>
            {loadingRisk && <span className="btn-spin" />}
            Analyze Risk
          </button>
          <button className="btn ghost sm" onClick={fetchContractData} disabled={loadingData}>
            <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
          </button>
        </div>

        {riskError && (
          <div className="alert err" style={{ marginTop: 10 }}>
            <AlertCircle size={16} />
            <div>
              <b>Error analyzing risk:</b> {riskError}
            </div>
          </div>
        )}

        {riskData && (
          <div style={reportContainer}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Cpu size={16} style={{ color: "var(--accent)" }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>Guardian Decision</span>
              </div>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: riskData.status === "APPROVED" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  color: riskData.status === "APPROVED" ? "#10b981" : "#ef4444",
                }}
              >
                {riskData.status === "APPROVED" ? "APPROVED FOR BAILOUT" : "REJECTED (HIGH RISK)"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Risk Score:</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: riskData.riskScore > 50 ? "#ef4444" : "#10b981" }}>
                  {riskData.riskScore} / 100
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${riskData.riskScore}%`,
                    height: "100%",
                    backgroundColor: riskData.riskScore > 50 ? "#ef4444" : "#10b981",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>AI Rationale:</span>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "#e2e8f0" }}>{riskData.rationale}</p>
              </div>

              {riskData.status === "APPROVED" && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    className="btn success"
                    onClick={triggerBailout}
                    disabled={executingBailout || !!bailoutHash}
                    style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {executingBailout ? (
                      <>
                        <span className="btn-spin" /> Executing AI Bailout Transaction...
                      </>
                    ) : bailoutHash ? (
                      <>
                        <CheckCircle2 size={16} /> Bailout Executed Successfully
                      </>
                    ) : (
                      <>
                        <Zap size={16} /> Execute {riskData.bailoutAmount ?? 100} USDC Automated Injection
                      </>
                    )}
                  </button>

                  {bailoutHash && (
                    <div className="alert ok" style={{ width: "100%" }}>
                      <ShieldCheck size={16} className="ai" />
                      <div>
                        <b>Agent Execution Success:</b> Reputed member covered. Transaction:{" "}
                        <code style={{ fontSize: 11, color: "var(--accent)" }}>{bailoutHash.substring(0, 18)}...</code>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const identityContainer: CSSProperties = {
  backgroundColor: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  padding: "16px",
  marginTop: "14px",
};

const selectStyle: CSSProperties = {
  backgroundColor: "var(--panel-strong)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--text)",
  padding: "5px 10px",
  fontSize: "12px",
  outline: "none",
  cursor: "pointer",
};

const reportContainer: CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.02)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "16px",
  marginTop: "10px",
};
