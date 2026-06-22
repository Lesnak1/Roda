import { defineChain } from "viem";

// Arc Testnet definition. Values verified against the ARC Builder AI Guide
// (2026-06-01 snapshot). Re-verify before mainnet use.
// IMPORTANT: native gas token is USDC with 18 decimals. ERC-20 USDC uses 6.
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
      ],
      webSocket: ["wss://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arcscan Testnet",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export const ARC_FAUCET_URL = "https://faucet.circle.com";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";

export function explorerTx(hash: string) {
  return `${ARC_EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddress(addr: string) {
  return `${ARC_EXPLORER_URL}/address/${addr}`;
}
