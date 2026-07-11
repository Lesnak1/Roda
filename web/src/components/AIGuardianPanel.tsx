"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { usePublicClient, useAccount, useWriteContract } from "wagmi";
import { circleAbi, multicallSafe, erc20Abi, USDC_ADDRESS } from "@/lib/contracts";
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

  const isCurrentUserMember = account
    ? members.map((m) => m.toLowerCase()).includes(account.toLowerCase())
    : false;

  const { writeContractAsync } = useWriteContract();

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
  const [dataError, setDataError] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // ERC-8004 Identity states
  const [identityData, setIdentityData] = useState<any>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regHash, setRegHash] = useState<string | null>(null);

  // Real-time console & finality states
  const [logs, setLogs] = useState<string[]>([]);
  const [finalityTime, setFinalityTime] = useState<string | null>(null);
  const [finalityTimerRunning, setFinalityTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  function addLog(text: string) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${text}`]);
  }

  useEffect(() => {
    let interval: any;
    if (finalityTimerRunning) {
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTime((Date.now() - start) / 1000);
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [finalityTimerRunning]);

  async function fetchIdentity() {
    setLoadingIdentity(true);
    setIdentityError(null);
    try {
      const res = await fetch("/api/agent-identity");
      const data = await res.json();
      if (res.ok && !data.error) {
        setIdentityData(data);
      } else if (!res.ok) {
        setIdentityError(data.error || `API returned ${res.status}`);
      }
    } catch (e: any) {
      console.error("Failed to load agent identity:", e);
      setIdentityError(e.message || "Network error loading identity");
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

      // Verify no critical reads failed (collateral is critical, memberDebt is not since older contracts don't have it)
      const criticalFailures = results.slice(0, members.length * 2).reduce((acc: any[], r: any, idx: number) => {
        const isCollateral = idx % 2 === 0;
        if (isCollateral && r.status === "failure") {
          acc.push({ index: idx, contract: contracts[idx], error: r.error });
        }
        return acc;
      }, []);

      if (criticalFailures.length > 0) {
        console.error("AIGuardianPanel critical failures:", criticalFailures);
        setDataError("Some on-chain reads failed. Data may be incomplete.");
      } else {
        setDataError(null);
      }

      // Parse collaterals and debts
      const tempCollaterals: Record<string, number> = {};
      const tempDebts: Record<string, number> = {};
      let ptr = 0;
      for (const m of members) {
        const colRes = results[ptr];
        ptr++;
        const debtRes = results[ptr];
        ptr++;
        
        const colVal = colRes?.status === "success" ? (colRes.result as bigint) : 0n;
        const debtVal = debtRes?.status === "success" ? (debtRes.result as bigint) : 0n;
        tempCollaterals[m.toLowerCase()] = Number(colVal) / 1000000; // 6 decimals
        tempDebts[m.toLowerCase()] = Number(debtVal) / 1000000;
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
    setLogs([]);
    setFinalityTime(null);
    setElapsedTime(0);

    addLog(`[INFO] Initializing credit risk assessment for member: ${selectedMember}`);
    addLog(`[RPC] Fetching member collateral, debt and payment logs from SavingsCircle contract on Arc L1...`);

    try {
      addLog(`[AI] Dispatching risk parameters to DeepSeek credit analysis core...`);
      addLog(`[RPC] Server reading on-chain data for ${selectedMember.substring(0, 10)}...`);
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleAddress: address,
          targetMember: selectedMember,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setRiskError(data.error || "Failed to analyze risk");
        addLog(`[ERROR] AI analysis failed: ${data.error || "Unknown error"}`);
      } else {
        setRiskData(data);
        addLog(`[AI] Analysis completed. Risk Score: ${data.riskScore}/100. Recommendation: ${data.status}`);
        if (data.attestationSuccess) {
          addLog(`[ERC-8004] Validator wallet generated giveFeedback attestation.`);
          addLog(`[ERC-8004] Submitted onchain feedback for Agent #${identityData?.agentId || "?"}`);
        } else {
          addLog(`[ERC-8004] Attestation skipped or failed (non-blocking).`);
        }
        // Refresh identity to show the new reputation record on chain
        setTimeout(() => fetchIdentity(), 3000);
      }
    } catch (e: any) {
      console.error(e);
      setRiskError(e.message || "Failed to analyze risk");
      addLog(`[ERROR] Connection failed: ${e.message}`);
    } finally {
      setLoadingRisk(false);
    }
  }

  async function triggerBailout() {
    if (!riskData || riskData.status !== "APPROVED") return;
    setExecutingBailout(true);
    setBailoutHash(null);
    setFinalityTime(null);
    setElapsedTime(0);
    setFinalityTimerRunning(true);
    const startTime = Date.now();

    addLog(`[INFO] Requesting server-validated bailout from Agent...`);
    addLog(`[CIRCLE] Server verifying circle state, membership, and contribution amount...`);

    try {
      const response = await fetch("/api/bailout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleAddress: address,
          memberAddress: selectedMember,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Bailout funding failed");
      }
      
      addLog(`[CIRCLE] Bailout funded! USDC transferred to your wallet.`);

      // 2. Read allowance and contributionAmount dynamically
      if (client) {
        addLog(`[RPC] Checking USDC spend allowance for your wallet...`);
        const allowance = (await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "allowance",
          args: [account as `0x${string}`, address],
        })) as bigint;

        const contributionAmount = (await client.readContract({
          address,
          abi: circleAbi,
          functionName: "contributionAmount",
        })) as bigint;

        if (allowance < contributionAmount) {
          addLog(`[METAMASK] Insufficient allowance. Opening MetaMask to approve USDC spend...`);
          await writeContractAsync({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: "approve",
            args: [address, contributionAmount],
          });
          addLog(`[RPC] Spend approval broadcast. Waiting for block confirmation...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      addLog(`[METAMASK] Opening MetaMask to sign and execute contribution...`);

      // 3. Trigger MetaMask transaction to call contribute() on-chain
      const txHash = await writeContractAsync({
        address,
        abi: circleAbi,
        functionName: "contribute",
      });

      addLog(`[RPC] Transaction broadcast: ${txHash.substring(0, 16)}...`);
      addLog(`[RPC] Waiting for block consensus and confirmation...`);

      if (client) {
        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "reverted") {
          throw new Error("MetaMask transaction reverted on-chain. The circle might not be Active yet.");
        }
      }

      setFinalityTimerRunning(false);
      setBailoutHash(txHash);
      
      const apiTime = ((Date.now() - startTime) / 1000).toFixed(2);
      setFinalityTime(apiTime);

      addLog(`[ARC L1] Block consensus achieved. Transaction confirmed!`);
      addLog(`[ARC L1] Total process time: ${apiTime}s`);
      addLog(`[INFO] Solvency restored. Your contribution has been verified on-chain.`);

      // Refetch real on-chain data instead of mutating local state
      fetchContractData();
    } catch (e: any) {
      setFinalityTimerRunning(false);
      console.error(e);
      addLog(`[ERROR] Bailout failed: ${e.message}`);
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
        {identityError ? (
          <div className="alert err" style={{ margin: 0, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} />
            <span>Failed to query Agent identity: {identityError}</span>
          </div>
        ) : loadingIdentity ? (
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

      {dataError && (
        <div className="alert err" style={{ marginTop: 14 }}>
          <AlertCircle size={16} />
          <span>{dataError}</span>
        </div>
      )}

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
                  backgroundColor:
                    riskData.status === "APPROVED"
                      ? riskData.bailoutAmount > 0
                        ? "rgba(16, 185, 129, 0.12)"
                        : "rgba(99, 102, 241, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                  color:
                    riskData.status === "APPROVED"
                      ? riskData.bailoutAmount > 0
                        ? "#10b981"
                        : "#6366f1"
                      : "#ef4444",
                }}
              >
                {riskData.status === "APPROVED"
                  ? riskData.bailoutAmount > 0
                    ? "APPROVED FOR BAILOUT"
                    : "SOLVENCY HEALTHY"
                  : "REJECTED (HIGH RISK)"}
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
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text)" }}>{riskData.rationale}</p>
              </div>

              {riskData.status === "APPROVED" && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {riskData.bailoutAmount > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button
                        className="btn success"
                        onClick={triggerBailout}
                        disabled={executingBailout || !!bailoutHash || !isCurrentUserMember}
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
                            <Zap size={16} /> Execute {riskData.bailoutAmount} USDC Automated Injection
                          </>
                        )}
                      </button>

                      {!isCurrentUserMember && (
                        <div style={warningStyle}>
                          <AlertCircle size={14} />
                          <span>You must be a member of this circle to execute and claim bailout contributions.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontSize: 13, fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> Solvency is healthy. No default detected.
                    </div>
                  )}

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

            {/* Live Terminal Console (Option 3) */}
            <div style={terminalContainerStyle}>
              <div style={terminalHeaderStyle}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={terminalDotStyle("#ef4444")} />
                  <span style={terminalDotStyle("#f59e0b")} />
                  <span style={terminalDotStyle("#10b981")} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: "var(--muted)" }}>GUARDIAN_LOGS.sh</span>
              </div>
              <div style={terminalBodyStyle}>
                {logs.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontStyle: "italic" }}>Awaiting risk assessment and execution triggers...</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: 4, wordBreak: "break-all" }}>
                      <span style={{ color: "var(--accent)", marginRight: 6 }}>&gt;</span>
                      {log}
                    </div>
                  ))
                )}
                {finalityTimerRunning && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, color: "var(--accent)" }}>
                    <span className="btn-spin" />
                    <span>Measuring Arc L1 transaction finality: {elapsedTime.toFixed(2)}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* Arc Sub-Second Finality Indicator (Option 4) */}
            {finalityTime && (
              <div style={speedPulseStyle}>
                <div className="pulse-dot" style={pulseCircleStyle} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>Arc L1 Deterministic Finality Verified</span>
                  <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: "var(--text)" }}>
                    Total process time: {finalityTime}s
                  </span>
                </div>
              </div>
            )}
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

const terminalContainerStyle: CSSProperties = {
  backgroundColor: "#0d0e12",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontFamily: "monospace",
  fontSize: "11.5px",
  color: "#38bdf8",
  marginTop: "14px",
  overflow: "hidden",
};

const terminalHeaderStyle: CSSProperties = {
  backgroundColor: "#161b22",
  padding: "8px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid var(--border)",
};

const terminalDotStyle = (color: string): CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: color,
  display: "inline-block",
});

const terminalBodyStyle: CSSProperties = {
  padding: "12px",
  maxHeight: "180px",
  overflowY: "auto",
  lineHeight: "1.5",
};

const speedPulseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  backgroundColor: "rgba(16, 185, 129, 0.08)",
  border: "1px solid rgba(16, 185, 129, 0.2)",
  borderRadius: "8px",
  padding: "12px 14px",
  marginTop: "12px",
};

const pulseCircleStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: "#10b981",
};

const warningStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  backgroundColor: "rgba(239, 68, 68, 0.08)",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  borderRadius: "6px",
  padding: "8px 12px",
  color: "#ef4444",
  fontSize: "12px",
  marginTop: "6px",
  alignSelf: "flex-start",
};


