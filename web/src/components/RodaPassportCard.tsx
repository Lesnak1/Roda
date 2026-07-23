"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ShieldCheck, Share2, Copy, Check, ExternalLink, Sparkles, X, Download, Image as ImageIcon } from "lucide-react";
import { shortAddr } from "@/lib/format";

export function RodaPassportCard({
  address,
  agentId = "849938",
  repaymentRate = 100,
  tierName = "Tier 1 Sovereign Saver",
  totalVolumeUsdc = 150,
}: {
  address?: `0x${string}`;
  agentId?: string;
  repaymentRate?: number;
  tierName?: string;
  totalVolumeUsdc?: number;
}) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const displayAddr = address ? shortAddr(address) : "0x5981...AFE6";
  const shareUrl = "https://roda-nine.vercel.app/";
  const shareText = `I'm building onchain credit reputation with @RodaProtocol on Arc L1! 🛡️\n\n• Member: ${displayAddr}\n• Repayment Rate: ${repaymentRate}%\n• Status: ${tierName}\n• ERC-8004 Agent: #${agentId}\n\n`;

  function copyShareText() {
    navigator.clipboard.writeText(`${shareText}${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareOnTwitter() {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  }

  function downloadCardImage() {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Dark metallic gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(0.5, "#1e1b4b");
      bgGrad.addColorStop(1, "#064e3b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // Glowing outer border
      ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 1160, 590);

      // Glow circle accent
      const glowGrad = ctx.createRadialGradient(900, 150, 0, 900, 150, 400);
      glowGrad.addColorStop(0, "rgba(139, 92, 246, 0.4)");
      glowGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.2)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // Roda Badge Icon
      ctx.fillStyle = "#8b5cf6";
      ctx.beginPath();
      ctx.arc(100, 100, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px Inter, sans-serif";
      ctx.fillText("R", 88, 112);

      // Card Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px Inter, sans-serif";
      ctx.fillText("RODA CREDIT PASSPORT", 160, 95);

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "22px Inter, sans-serif";
      ctx.fillText("Onchain Credit Identity & Reputation Badge · Arc L1", 160, 130);

      // Divider line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(70, 180);
      ctx.lineTo(1130, 180);
      ctx.stroke();

      // Stats Section
      // Member Address
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.fillText("MEMBER ADDRESS", 70, 230);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px monospace";
      ctx.fillText(displayAddr, 70, 280);

      // ERC-8004 Agent ID
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 20px Inter, sans-serif";
      ctx.fillText("ERC-8004 AGENT ID", 650, 230);
      ctx.fillStyle = "#c4b5fd";
      ctx.font = "bold 36px monospace";
      ctx.fillText(`#${agentId}`, 650, 280);

      // Status Box (Bottom Ribbon)
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.roundRect ? ctx.roundRect(70, 380, 1060, 170, 16) : ctx.fillRect(70, 380, 1060, 170);
      ctx.fill();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tier Name
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 36px Inter, sans-serif";
      ctx.fillText(`🏆 ${tierName}`, 110, 450);

      // Repayment Rate
      ctx.fillStyle = "#ffffff";
      ctx.font = "28px Inter, sans-serif";
      ctx.fillText(`Repayment Rate: ${repaymentRate}% Verified`, 110, 505);

      // Watermark
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "18px monospace";
      ctx.fillText("roda-nine.vercel.app · Arc Testnet Native", 780, 505);

      // Export PNG
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `roda-credit-passport-${agentId}.png`;
      a.click();
    } catch (e) {
      console.error("Failed to generate passport card image:", e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 3D Metallic Passport Card */}
      <motion.div
        whileHover={{ scale: 1.015, rotateX: 2, rotateY: 2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          borderRadius: 20,
          background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #064e3b 100%)",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          boxShadow: "0 20px 40px -15px rgba(139, 92, 246, 0.3)",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
        }}
      >
        {/* Holographic glowing rings background */}
        <div
          style={{
            position: "absolute",
            top: "-40%",
            right: "-20%",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 80%)",
            filter: "blur(30px)",
            pointerEvents: "none",
          }}
        />

        {/* Top Header Row */}
        <div className="row" style={{ marginBottom: 24, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, var(--accent), var(--green))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 18,
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)",
              }}
            >
              R
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: "#ffffff" }}>
                RODA PASSPORT
              </div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)" }}>
                Onchain Credit Reputation & Identity
              </div>
            </div>
          </div>
          <div className="spacer" />
          <button
            className="btn ghost sm"
            onClick={() => setShowShareModal(true)}
            style={{
              borderRadius: 20,
              padding: "6px 14px",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Share2 size={13} /> Share Card
          </button>
        </div>

        {/* Card Body Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Member Address
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: "#ffffff" }}>
              {displayAddr}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ERC-8004 Agent ID
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: "#c4b5fd", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={14} style={{ color: "#10b981" }} /> #{agentId}
            </div>
          </div>
        </div>

        {/* Bottom Status Ribbon */}
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={16} style={{ color: "#10b981" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
              {tierName}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.85)" }}>
              Repayment: <strong style={{ color: "#ffffff" }}>{repaymentRate}%</strong>
            </span>
            <span className="pill green" style={{ fontSize: 10, padding: "2px 8px" }}>
              Verified
            </span>
          </div>
        </div>
      </motion.div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
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
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card"
              style={{
                width: "100%",
                maxWidth: 480,
                background: "var(--bg-2)",
                border: "1px solid var(--border-strong)",
                padding: 24,
                boxShadow: "var(--shadow-glow)",
                color: "var(--text)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="row" style={{ marginBottom: 16 }}>
                <h3 className="card-title" style={{ fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                  <Sparkles size={18} style={{ color: "var(--accent)" }} /> Share Roda Passport
                </h3>
                <div className="spacer" />
                <button
                  className="btn ghost sm"
                  onClick={() => setShowShareModal(false)}
                  style={{ padding: 4, height: "auto" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Card Mini Preview Graphic */}
              <div
                style={{
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #064e3b 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                  padding: 16,
                  marginBottom: 16,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div className="row" style={{ marginBottom: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: "linear-gradient(135deg, var(--accent), var(--green))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      R
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#ffffff" }}>RODA PASSPORT</div>
                  </div>
                  <div className="spacer" />
                  <span className="pill green" style={{ fontSize: 9, padding: "1px 6px" }}>
                    Verified Badge
                  </span>
                </div>

                <div className="row" style={{ fontSize: 12, marginBottom: 6 }}>
                  <span className="mono" style={{ color: "#ffffff" }}>{displayAddr}</span>
                  <div className="spacer" />
                  <span className="mono" style={{ color: "#c4b5fd" }}>#{agentId}</span>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
                  🏆 {tierName} ({repaymentRate}%)
                </div>
              </div>

              {/* Text Preview Box */}
              <div
                style={{
                  background: "var(--panel-strong)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "var(--text)",
                  marginBottom: 16,
                  whiteSpace: "pre-wrap",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {shareText}
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>{shareUrl}</span>
              </div>

              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <ImageIcon size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span>X/Twitter will automatically attach the Roda Passport Card preview when you share the link, or download the PNG directly.</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn ghost sm"
                    onClick={copyShareText}
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    {copied ? <Check size={14} style={{ color: "var(--green)" }} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy Post Text"}
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={downloadCardImage}
                    disabled={downloading}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      borderColor: "rgba(99, 102, 241, 0.4)",
                      color: "var(--accent)",
                    }}
                  >
                    <Download size={14} /> {downloading ? "Generating..." : "Download PNG Card"}
                  </button>
                </div>

                <button
                  className="btn sm"
                  onClick={shareOnTwitter}
                  style={{
                    width: "100%",
                    background: "#1d9bf0",
                    borderColor: "#1d9bf0",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px",
                    fontWeight: 700,
                  }}
                >
                  <Share2 size={16} style={{ color: "#ffffff" }} /> Post on X (Twitter)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
