"use client";

import type { CSSProperties } from "react";
import { Cpu, ExternalLink, ShieldCheck } from "lucide-react";
import { FACTORY_ADDRESS, USDC_ADDRESS, IDENTITY_REGISTRY, REPUTATION_REGISTRY } from "@/lib/contracts";
import { shortAddr } from "@/lib/format";
import { explorerAddress } from "@/lib/chains/arcTestnet";

export function IntegrationsPanel({
  circleAddress,
}: {
  circleAddress: `0x${string}`;
}) {
  return (
    <div className="card" style={containerStyle}>
      <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
        <Cpu size={18} className="grad-text" />
        Ecosystem Integrations & Smart Contracts
      </h3>
      <p className="card-desc" style={{ margin: "6px 0 16px 0" }}>
        Verified deployments on the Arc L1 testnet and integrated Circle Web3 protocols.
      </p>

      <div style={gridStyle}>
        <div style={itemStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>Circle Factory (Deployer)</span>
            <span style={badgeStyle}>LIVE</span>
          </div>
          <a href={explorerAddress(FACTORY_ADDRESS)} target="_blank" rel="noreferrer" style={linkStyle}>
            {shortAddr(FACTORY_ADDRESS)} <ExternalLink size={12} />
          </a>
        </div>

        <div style={itemStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>Savings Circle (Escrow)</span>
            <span style={badgeStyle}>LIVE</span>
          </div>
          <a href={explorerAddress(circleAddress)} target="_blank" rel="noreferrer" style={linkStyle}>
            {shortAddr(circleAddress)} <ExternalLink size={12} />
          </a>
        </div>

        <div style={itemStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>ERC-8004 Identity Registry</span>
            <span style={badgeStyle}>LIVE</span>
          </div>
          <a href={explorerAddress(IDENTITY_REGISTRY)} target="_blank" rel="noreferrer" style={linkStyle}>
            {shortAddr(IDENTITY_REGISTRY)} <ExternalLink size={12} />
          </a>
        </div>

        <div style={itemStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>ERC-8004 Reputation Registry</span>
            <span style={badgeStyle}>LIVE</span>
          </div>
          <a href={explorerAddress(REPUTATION_REGISTRY)} target="_blank" rel="noreferrer" style={linkStyle}>
            {shortAddr(REPUTATION_REGISTRY)} <ExternalLink size={12} />
          </a>
        </div>

        <div style={itemStyle}>
          <div style={labelRowStyle}>
            <span style={labelStyle}>USDC Gas & ERC-20 Asset</span>
            <span style={badgeStyle}>LIVE</span>
          </div>
          <a href={explorerAddress(USDC_ADDRESS)} target="_blank" rel="noreferrer" style={linkStyle}>
            {shortAddr(USDC_ADDRESS)} <ExternalLink size={12} />
          </a>
        </div>

        <div style={{ ...itemStyle, borderColor: "rgba(56,189,248,0.3)", background: "rgba(56,189,248,0.05)" }}>
          <div style={labelRowStyle}>
            <span style={{ ...labelStyle, color: "#38bdf8", fontWeight: 700 }}>x402 Nanopayment API ($0.001)</span>
            <span style={{ ...badgeStyle, background: "rgba(56,189,248,0.2)", color: "#38bdf8" }}>ACTIVE</span>
          </div>
          <a href={`/api/risk-report?circle=${circleAddress}&member=${circleAddress}`} target="_blank" rel="noreferrer" style={{ ...linkStyle, color: "#38bdf8" }}>
            /api/risk-report <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: "12px",
  padding: "20px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "14px",
};

const itemStyle: CSSProperties = {
  backgroundColor: "var(--bg-card-hover)",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const labelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-muted)",
};

const badgeStyle: CSSProperties = {
  fontSize: "9px",
  fontWeight: 800,
  color: "#10b981",
  backgroundColor: "rgba(16, 185, 129, 0.12)",
  padding: "2px 6px",
  borderRadius: "4px",
  letterSpacing: "0.05em",
};

const linkStyle: CSSProperties = {
  fontSize: "14px",
  fontFamily: "monospace",
  fontWeight: 600,
  color: "var(--text)",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
};
