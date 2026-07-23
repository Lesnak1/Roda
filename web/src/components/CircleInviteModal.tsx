"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Check, Share2, X, QrCode, Sparkles } from "lucide-react";
import { shortAddr } from "@/lib/format";

export function CircleInviteModal({
  address,
  contribution,
  memberCount,
  onClose,
}: {
  address: `0x${string}`;
  contribution?: string;
  memberCount?: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?circle=${address}`
    : `https://roda-nine.vercel.app/?circle=${address}`;

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareNative() {
    if (navigator.share) {
      navigator.share({
        title: "Join my Roda Savings Circle",
        text: `Join our decentralized savings circle on Arc Testnet! Circle: ${shortAddr(address)}`,
        url: inviteUrl,
      }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="card"
          style={{
            width: "100%",
            maxWidth: 460,
            background: "var(--bg-2)",
            border: "1px solid var(--border-strong)",
            padding: 24,
            boxShadow: "var(--shadow-glow)",
            color: "var(--text)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="row" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <h3 className="card-title" style={{ fontSize: 18, margin: 0, color: "var(--text)" }}>
                  Invite Members to Circle
                </h3>
                <p className="card-desc" style={{ fontSize: 12, margin: 0, color: "var(--muted)" }}>
                  Share this invitation link or QR code with your group.
                </p>
              </div>
            </div>
            <div className="spacer" />
            <button className="btn ghost sm" onClick={onClose} style={{ padding: 4, height: "auto" }}>
              <X size={18} />
            </button>
          </div>

          {/* Circle Details Badge */}
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Circle Address</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                {shortAddr(address)}
              </div>
            </div>
            {contribution && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Contribution</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
                  {contribution} USDC
                </div>
              </div>
            )}
          </div>

          {/* QR Code Placeholder Graphic */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              background: "#fff",
              borderRadius: 12,
              marginBottom: 20,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                background: "radial-gradient(circle, #000 30%, transparent 31%), repeating-linear-gradient(45deg, #000 0, #000 10px, #fff 10px, #fff 20px)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  boxShadow: "0 0 12px rgba(139, 92, 246, 0.8)",
                }}
              >
                R
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#334155", fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
              <QrCode size={12} /> Scan with Mobile Wallet
            </div>
          </div>

          {/* Link Box */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <input
              type="text"
              readOnly
              value={inviteUrl}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                fontSize: 12,
                width: "100%",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              className="btn ghost sm"
              onClick={copyLink}
              style={{ flexShrink: 0, padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              {copied ? <Check size={13} style={{ color: "var(--green)" }} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Share Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn ghost sm" onClick={onClose} style={{ flex: 1 }}>
              Close
            </button>
            <button
              className="btn sm"
              onClick={shareNative}
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Share2 size={14} /> Invite Peers
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
