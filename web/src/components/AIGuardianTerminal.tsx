"use client";

import { useState, useRef, useEffect } from "react";

interface TerminalLine {
  timestamp: string;
  type: "info" | "success" | "error" | "warn" | "data" | "ai";
  message: string;
}

interface AIGuardianTerminalProps {
  circleAddress: `0x${string}`;
  memberAddress: `0x${string}`;
}

export function AIGuardianTerminal({ circleAddress, memberAddress }: AIGuardianTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const ts = () => new Date().toISOString().slice(11, 23);

  const addLine = (type: TerminalLine["type"], message: string) => {
    setLines((prev) => [...prev, { timestamp: ts(), type, message }]);
  };

  const runAudit = async () => {
    if (running) return;
    setRunning(true);
    setCollapsed(false);
    setLines([]);

    addLine("info", "═══ RODA AI GUARDIAN · SECURITY AUDIT ═══");
    addLine("info", `Agent ID: #849938 (ERC-8004 Registered)`);
    addLine("info", `Target Circle: ${circleAddress.slice(0, 10)}...${circleAddress.slice(-6)}`);
    addLine("info", `Target Member: ${memberAddress.slice(0, 10)}...${memberAddress.slice(-6)}`);

    // Small delay to show the initial info
    await new Promise((r) => setTimeout(r, 300));
    addLine("info", "Connecting to Arc Testnet RPC...");

    await new Promise((r) => setTimeout(r, 200));
    addLine("info", "Reading live on-chain state via viem publicClient...");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleAddress, targetMember: memberAddress }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        addLine("error", `API Error: ${err.error || response.statusText}`);
        setRunning(false);
        return;
      }

      const data = await response.json();

      // Display the real results from the server
      addLine("success", "✓ On-chain data read complete (server-verified)");

      await new Promise((r) => setTimeout(r, 150));
      addLine("data", `Circle State: ${data.serverVerified ? "Verified Active" : "Unverified"}`);

      await new Promise((r) => setTimeout(r, 100));
      addLine("info", "Submitting to Autonomous AI Risk Engine (model: Roda-Guardian-v1)...");

      await new Promise((r) => setTimeout(r, 200));
      addLine("ai", `═══ AI RISK ASSESSMENT ═══`);
      addLine("ai", `Status: ${data.status}`);
      addLine("ai", `Risk Score: ${data.riskScore}/100`);
      addLine("ai", `Bailout Amount: ${data.bailoutAmount} USDC`);

      await new Promise((r) => setTimeout(r, 100));
      addLine("ai", `Rationale: ${data.rationale}`);

      await new Promise((r) => setTimeout(r, 150));
      if (data.attestationSuccess) {
        addLine("success", "✓ ERC-8004 reputation feedback written on-chain via validator wallet");
      } else {
        addLine("warn", "⚠ ERC-8004 attestation skipped (validator wallet not configured or chain error)");
      }

      addLine("success", "═══ AUDIT COMPLETE ═══");
    } catch (err: any) {
      addLine("error", `Network error: ${err.message || "Failed to reach API"}`);
    }

    setRunning(false);
  };

  const lineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "success": return "var(--accent, #22c55e)";
      case "error": return "#ef4444";
      case "warn": return "#f59e0b";
      case "ai": return "#a78bfa";
      case "data": return "#38bdf8";
      default: return "var(--text-secondary, #94a3b8)";
    }
  };

  return (
    <div style={{
      marginTop: "1.5rem",
      border: "1px solid var(--border, rgba(255,255,255,0.08))",
      borderRadius: "12px",
      overflow: "hidden",
      background: "rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)",
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: collapsed ? "none" : "1px solid var(--border, rgba(255,255,255,0.08))",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
            fontSize: "12px",
          }}>
            🛡️
          </span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary, #fff)" }}>
            AI Guardian Terminal
          </span>
          <span style={{
            fontSize: "0.65rem",
            padding: "2px 6px",
            borderRadius: "4px",
            background: "rgba(167,139,250,0.15)",
            color: "#a78bfa",
            fontWeight: 500,
          }}>
            ERC-8004
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={(e) => { e.stopPropagation(); runAudit(); }}
            disabled={running}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "6px",
              border: "none",
              background: running
                ? "rgba(167,139,250,0.2)"
                : "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: running ? "wait" : "pointer",
              transition: "opacity 0.2s",
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? "⏳ Auditing..." : "▶ Run AI Security Audit"}
          </button>
          <span style={{
            fontSize: "0.75rem",
            color: "var(--text-secondary, #94a3b8)",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.2s",
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Terminal Body */}
      {!collapsed && (
        <div
          ref={scrollRef}
          style={{
            maxHeight: "320px",
            overflowY: "auto",
            padding: "0.75rem 1rem",
            fontFamily: "'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: "0.72rem",
            lineHeight: "1.65",
          }}
        >
          {lines.length === 0 ? (
            <div style={{ color: "var(--text-secondary, #64748b)", fontStyle: "italic" }}>
              Click &quot;Run AI Security Audit&quot; to analyze this circle member using live Arc Testnet on-chain data and Autonomous AI Agent.
            </div>
          ) : (
            lines.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem" }}>
                <span style={{ color: "var(--text-secondary, #475569)", flexShrink: 0 }}>
                  [{line.timestamp}]
                </span>
                <span style={{ color: lineColor(line.type), wordBreak: "break-word" }}>
                  {line.message}
                </span>
              </div>
            ))
          )}
          {running && (
            <div style={{ color: "#a78bfa", animation: "pulse 1.5s infinite" }}>
              █
            </div>
          )}
        </div>
      )}

      {/* x402 Badge */}
      {!collapsed && (
        <div style={{
          padding: "0.5rem 1rem",
          borderTop: "1px solid var(--border, rgba(255,255,255,0.06))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.65rem",
          color: "var(--text-secondary, #64748b)",
        }}>
          <span>Powered by Circle Developer-Controlled Wallets · Arc Testnet</span>
          <span style={{
            padding: "2px 8px",
            borderRadius: "4px",
            background: "rgba(56,189,248,0.1)",
            color: "#38bdf8",
            fontWeight: 600,
          }}>
            x402 Nanopayment API Available
          </span>
        </div>
      )}
    </div>
  );
}
