"use client";

import { useAccount, useBalance, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Wallet, Globe, AlertCircle, Droplets } from "lucide-react";
import { arcTestnet, ARC_FAUCET_URL } from "@/lib/chains/arcTestnet";
import { USDC_ADDRESS, erc20Abi } from "@/lib/contracts";
import { formatGasUsdc, formatUsdc, shortAddr } from "@/lib/format";
import { useState, useEffect, type ReactNode } from "react";

export function WalletGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const onArc = chainId === arcTestnet.id;

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

  // Auto-connect on mount if inside a Web3 in-app browser (MetaMask, Coinbase Wallet, Trust, etc.)

  useEffect(() => {
    if (mounted && !isConnected) {
      const hasInjected = typeof window !== "undefined" && Boolean((window as any).ethereum);
      if (hasInjected) {
        const injectedConnector = connectors.find((c) => c.type === "injected") ?? connectors[0];
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }
    }
  }, [mounted, isConnected, connectors, connect]);

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

  if (!mounted || !isConnected) {
    const injectedConnector = connectors.find((c) => c.type === "injected") ?? connectors[0];
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasInjected = typeof window !== "undefined" && Boolean((window as any).ethereum);

    const copyCurrentUrl = () => {
      if (typeof window !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    };

    const handleConnect = async (walletType?: "metamask" | "trust" | "coinbase" | "injected") => {
      if (hasInjected || walletType === "injected") {
        try {
          if (typeof window !== "undefined" && (window as any).ethereum) {
            await (window as any).ethereum.request({ method: "eth_requestAccounts" });
          }
          if (injectedConnector) {
            connect({ connector: injectedConnector });
          }
        } catch (e: any) {
          console.warn("Direct eth_requestAccounts failed, using wagmi connect fallback:", e);
          if (injectedConnector) {
            connect({ connector: injectedConnector });
          }
        }
      } else if (isMobile) {
        const cleanHost = typeof window !== "undefined"
          ? `${window.location.host}${window.location.pathname}`
          : "roda-showcase.vercel.app";
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
    };

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
          {isMobile && !hasInjected
            ? "Tap a wallet below to open Roda directly inside your Mobile Wallet Browser, or copy the link."
            : "Connect an EVM wallet (e.g. MetaMask) to use Roda."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          {isMobile && !hasInjected ? (
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
              disabled={!mounted || isPending}
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




  // If connected but chainId hasn't resolved yet
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
        <h3 className="card-title">Detecting Network...</h3>
        <p className="card-desc">Verifying network connection to Arc Testnet.</p>
      </motion.div>
    );
  }

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
