"use client";

import { useAccount, useBalance, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Wallet, Globe, AlertCircle, Droplets } from "lucide-react";
import { arcTestnet, ARC_FAUCET_URL } from "@/lib/chains/arcTestnet";
import { USDC_ADDRESS, erc20Abi } from "@/lib/contracts";
import { formatGasUsdc, formatUsdc, shortAddr } from "@/lib/format";
import type { ReactNode } from "react";

export function WalletGate({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const onArc = chainId === arcTestnet.id;

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

  if (!isConnected) {
    const injectedConnector = connectors.find((c) => c.type === "injected") ?? connectors[0];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card center-card"
      >
        <div className="center-ico">
          <Wallet size={28} className="grad-text" />
        </div>
        <h3 className="card-title">Connect your wallet</h3>
        <p className="card-desc">Connect an EVM wallet (e.g. MetaMask) to use Roda.</p>
        <button
          className="btn"
          disabled={isPending}
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, margin: "0 auto" }}
        >
          {isPending && <span className="btn-spin" />}
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>
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
        <button className="btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>
          Switch to Arc Testnet
        </button>
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
        <div className="row" style={{ gap: "16px" }}>
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
