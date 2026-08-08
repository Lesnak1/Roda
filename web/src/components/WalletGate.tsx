"use client";

import { useAccount, useBalance, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Wallet, Globe, Droplets, RefreshCw } from "lucide-react";
import { arcTestnet, ARC_FAUCET_URL } from "@/lib/chains/arcTestnet";
import { USDC_ADDRESS, erc20Abi } from "@/lib/contracts";
import { formatGasUsdc, formatUsdc, shortAddr } from "@/lib/format";
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Detect if we are inside a wallet's in-app dApp browser (MetaMask, Trust, Coinbase, etc.) */
function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as any).ethereum;
  if (!eth) return false;
  // MetaMask in-app browser sets isMetaMask; Trust sets isTrust; Coinbase sets isCoinbaseWallet
  return Boolean(eth.isMetaMask || eth.isTrust || eth.isCoinbaseWallet);
}

/** SSR-safe mobile detection — must only be called on client */
function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && (window.innerWidth <= 768 || "ontouchstart" in window));
}

/** SSR-safe injected provider detection */
function detectInjected(): boolean {
  return typeof window !== "undefined" && Boolean((window as any).ethereum);
}

// ─── Component ──────────────────────────────────────────────────────────────
export function WalletGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // Client-only values to prevent SSR hydration mismatch (Bug #4)
  const [isMobile, setIsMobile] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(detectMobile());
    setHasInjected(detectInjected());
    setIsWalletBrowser(isInAppBrowser());
  }, []);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const onArc = chainId === arcTestnet.id;

  // ─── Auto-connect guard (Bug #1 & #2) ─────────────────────────────────
  // Use a ref to ensure auto-connect fires at most once per mount.
  // `connect` is deliberately omitted from deps to prevent re-fire loops.
  const autoConnectAttempted = useRef(false);

  useEffect(() => {
    if (!mounted || isConnected || autoConnectAttempted.current) return;
    // Only auto-connect when inside a wallet in-app browser (MetaMask, Trust, etc.)
    if (!isInAppBrowser()) return;

    autoConnectAttempted.current = true;
    const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
    if (injected) {
      // Small delay to let the in-app browser provider stabilize
      const timer = setTimeout(() => {
        connect({ connector: injected });
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isConnected, connectors]);

  // ─── chainId timeout (Bug #5) ─────────────────────────────────────────
  const [chainIdTimedOut, setChainIdTimedOut] = useState(false);
  useEffect(() => {
    if (!isConnected || chainId !== undefined) {
      setChainIdTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setChainIdTimedOut(true), 6000);
    return () => clearTimeout(timer);
  }, [isConnected, chainId]);

  // ─── Network switch handler ───────────────────────────────────────────
  const handleSwitchNetwork = async () => {
    setSwitching(true);
    setSwitchError(null);
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: arcTestnet.id });
      }
    } catch (err: any) {
      console.warn("Wagmi switchChain failed, attempting direct window.ethereum fallback:", err);
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x4CEF52" }], // 5042002 in hex
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902 || switchErr?.message?.includes("Unrecognized chain")) {
            try {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x4CEF52",
                    chainName: "Arc Testnet",
                    nativeCurrency: {
                      name: "USDC",
                      symbol: "USDC",
                      decimals: 18,
                    },
                    rpcUrls: [
                      process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://arc-testnet.g.alchemy.com/v2/QNS2Qy6uBju_7o-Q1u2zsuXnrq3dmEt_",
                      "https://rpc.testnet.arc.network",
                    ],
                    blockExplorerUrls: ["https://testnet.arcscan.app"],
                  },
                ],
              });
            } catch (addErr: any) {
              console.error("Failed to add Arc Testnet to wallet:", addErr);
              setSwitchError("Failed to add Arc Testnet to wallet. Please add Chain ID 5042002 manually in MetaMask.");
            }
          } else {
            console.error("Failed to switch network:", switchErr);
            setSwitchError(switchErr?.message || "Network switch rejected by wallet.");
          }
        }
      } else {
        setSwitchError("No Web3 provider found in browser.");
      }
    } finally {
      setSwitching(false);
    }
  };

  // ─── Balance queries ──────────────────────────────────────────────────
  const { data: gasBal } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: { enabled: isConnected && onArc },
  });

  const { data: usdcBal } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address) && onArc },
  });

  const [copiedLink, setCopiedLink] = useState(false);

  // ─── Wallet connect handler (stable ref via useCallback) ──────────────
  const handleConnect = useCallback(async (walletType?: "metamask" | "trust" | "coinbase" | "injected") => {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    const injectedConnector = connectors.find((c) => c.type === "injected") ?? connectors[0];

    // If we're in an in-app browser or have injected provider, connect directly
    if (hasInjected || ethereum || walletType === "injected") {
      try {
        if (ethereum && ethereum.request) {
          await ethereum.request({ method: "eth_requestAccounts" });
        }
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      } catch (e: any) {
        console.warn("Direct eth_requestAccounts failed, fallback to wagmi connect:", e);
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }
    } else if (isMobile) {
      // No injected provider on mobile — use deep links to open wallet apps
      const cleanHost = typeof window !== "undefined"
        ? `${window.location.host}${window.location.pathname}`
        : "roda-nine.vercel.app";
      const fullUrl = `https://${cleanHost}`;

      if (walletType === "trust") {
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(fullUrl)}`;
      } else if (walletType === "coinbase") {
        window.location.href = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(fullUrl)}`;
      } else {
        // Default MetaMask deep link
        window.location.href = `https://metamask.app.link/dapp/${cleanHost}`;
      }
    } else {
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  }, [connectors, connect, hasInjected, isMobile]);

  // ─── RENDER: Not connected ────────────────────────────────────────────
  if (!mounted || !isConnected) {
    // Before hydration is complete, render a minimal skeleton to prevent mismatch
    if (!mounted) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card center-card"
          style={{ maxWidth: "420px", margin: "0 auto", padding: "28px 20px" }}
        >
          <div className="center-ico">
            <Wallet size={28} className="grad-text" />
          </div>
          <h3 className="card-title">Connect your wallet</h3>
          <p className="card-desc">Connect an EVM wallet (e.g. MetaMask) to use Roda.</p>
          <button className="btn" disabled style={{ width: "100%", opacity: 0.5 }}>
            Loading…
          </button>
        </motion.div>
      );
    }

    const copyCurrentUrl = () => {
      if (typeof window !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    };

    // Determine which UI to show:
    // - In wallet in-app browser (hasInjected on mobile) → single "Connect Wallet" button
    // - Mobile without injected → deep-link buttons
    // - Desktop → single "Connect Wallet" button
    const showDeepLinks = isMobile && !hasInjected && !isWalletBrowser;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card center-card"
        style={{ maxWidth: "420px", margin: "0 auto", padding: "28px 20px" }}
      >
        <div className="center-ico">
          <Wallet size={28} className="grad-text" />
        </div>
        <h3 className="card-title">Connect your wallet</h3>
        <p className="card-desc">
          {showDeepLinks
            ? "Tap a wallet below to open Roda directly inside your Mobile Wallet Browser, or copy the link."
            : "Connect an EVM wallet (e.g. MetaMask) to use Roda."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          {showDeepLinks ? (
            <>
              <button
                className="btn"
                disabled={isPending}
                onClick={() => handleConnect("metamask")}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
              >
                🦊 Open in MetaMask App
              </button>
              <button
                className="btn ghost"
                disabled={isPending}
                onClick={() => handleConnect("trust")}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
              >
                🛡️ Open in Trust Wallet
              </button>
              <button
                className="btn ghost"
                disabled={isPending}
                onClick={() => handleConnect("coinbase")}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
              >
                🔵 Open in Coinbase Wallet
              </button>
              <button
                className="btn ghost sm"
                onClick={copyCurrentUrl}
                style={{ width: "100%", fontSize: "12.5px", marginTop: "4px" }}
              >
                {copiedLink ? "✓ Link Copied! Paste in MetaMask Browser" : "📋 Copy Link for MetaMask Browser"}
              </button>
            </>
          ) : (
            <button
              className="btn"
              disabled={isPending}
              onClick={() => handleConnect("injected")}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
            >
              {isPending && <span className="btn-spin" />}
              {isPending ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ─── RENDER: Detecting network (with timeout + retry) ─────────────────
  if (chainId === undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card center-card"
      >
        <div className="center-ico">
          <Globe size={28} className="grad-text" />
        </div>
        <h3 className="card-title">
          {chainIdTimedOut ? "Network Detection Slow" : "Detecting Network..."}
        </h3>
        <p className="card-desc">
          {chainIdTimedOut
            ? "Your wallet is taking longer than usual. Try disconnecting and reconnecting."
            : "Verifying network connection to Arc Testnet."}
        </p>
        {chainIdTimedOut && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
            <button
              className="btn ghost sm"
              onClick={() => {
                disconnect();
                autoConnectAttempted.current = false;
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <LogOut size={14} /> Disconnect
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setChainIdTimedOut(false);
                window.location.reload();
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── RENDER: Wrong network ────────────────────────────────────────────
  if (!onArc) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card center-card"
      >
        <div className="center-ico">
          <Globe size={28} className="grad-text" />
        </div>
        <h3 className="card-title">Wrong Network</h3>
        <p className="card-desc">Roda runs only on Arc Testnet (Chain ID {arcTestnet.id}).</p>
        <button
          className="btn"
          disabled={switching}
          onClick={handleSwitchNetwork}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "0 auto" }}
        >
          {switching && <span className="btn-spin" />}
          {switching ? "Switching Network..." : "Switch to Arc Testnet"}
        </button>
        {switchError && (
          <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "12px" }}>
            {switchError}
          </p>
        )}
      </motion.div>
    );
  }

  // ─── RENDER: Connected & on Arc ───────────────────────────────────────
  const gasLow = gasBal ? gasBal.value === 0n : false;
  const usdcZero = usdcBal !== undefined ? (usdcBal as bigint) === 0n : false;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="row wallet-gate-row" style={{ gap: "16px" }}>
          <div className="stack">
            <span className="label">Account</span>
            <span className="mono" style={{ fontSize: "14.5px", fontWeight: 700 }}>
              {shortAddr(address)}
            </span>
          </div>
          <div className="spacer" />
          <div className="stat">
            <div className="k">Gas USDC · native (18d)</div>
            <motion.div
              key={`gas-${gasBal?.value}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="v mono"
            >
              {gasBal ? formatGasUsdc(gasBal.value) : "…"}
            </motion.div>
          </div>
          <div className="stat">
            <div className="k">Token USDC · ERC-20 (6d)</div>
            <motion.div
              key={`usdc-${usdcBal?.toString()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="v mono"
            >
              {usdcBal !== undefined ? formatUsdc(usdcBal as bigint) : "…"}
            </motion.div>
          </div>
          <button
            className="btn ghost sm"
            onClick={() => disconnect()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
        <AnimatePresence>
          {(gasLow || usdcZero) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="alert warn"
              style={{ marginTop: 16 }}
            >
              <Droplets size={16} className="ai" style={{ alignSelf: "center" }} />
              <span>
                {gasLow && <strong>You have no native USDC for gas. </strong>}
                {usdcZero && <strong>You have no ERC-20 USDC to contribute. </strong>}
                <a href={ARC_FAUCET_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                  Get USDC from the Circle Faucet
                </a>.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {children}
    </>
  );
}
