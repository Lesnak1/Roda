import { formatUnits, parseUnits } from "viem";
import { USDC_DECIMALS } from "./contracts";

// ERC-20 USDC helpers (6 decimals). Never use parseEther/formatEther for token USDC.
export function formatUsdc(raw: bigint): string {
  return formatUnits(raw, USDC_DECIMALS);
}

export function parseUsdc(value: string): bigint {
  return parseUnits(value || "0", USDC_DECIMALS);
}

// Native gas USDC uses 18 decimals.
export function formatGasUsdc(raw: bigint): string {
  return formatUnits(raw, 18);
}

export function shortAddr(addr?: string): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function fmtDuration(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${Math.round(seconds / 60)}m`;
}

export function fmtCountdown(deadline: number): string {
  const now = Math.floor(Date.now() / 1000);
  let s = deadline - now;
  if (s <= 0) return "Ended";
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
