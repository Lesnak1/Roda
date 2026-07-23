"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import { arcTestnet } from "@/lib/chains/arcTestnet";
import { FACTORY_ADDRESS, REPUTATION_REGISTRY } from "@/lib/contracts";
import { Activity, ShieldCheck, Zap, Layers } from "lucide-react";
import { shortAddr } from "@/lib/format";

type TickerItem = {
  id: string;
  type: "circle" | "reputation";
  text: string;
  timestamp: string;
};

export function ActivityTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchOnChainEvents() {
      try {
        const client = createPublicClient({
          chain: arcTestnet,
          transport: http("https://rpc.testnet.arc.network"),
        });

        const latestBlock = await client.getBlockNumber();
        const startBlock = latestBlock - 9900n > 0n ? latestBlock - 9900n : 0n;

        // Fetch CircleCreated events
        const circleLogs = await client.getLogs({
          address: FACTORY_ADDRESS as `0x${string}`,
          event: parseAbiItem(
            "event CircleCreated(address indexed circle, address indexed creator, uint256 contributionAmount, uint8 memberCount, uint256 roundDuration, uint256 recruitingDuration)"
          ),
          fromBlock: startBlock,
          toBlock: latestBlock,
        });

        // Fetch Reputation Feedback events
        const repLogs = await client.getLogs({
          address: REPUTATION_REGISTRY as `0x${string}`,
          event: parseAbiItem(
            "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)"
          ),
          fromBlock: startBlock,
          toBlock: latestBlock,
        });

        const parsedItems: TickerItem[] = [];

        // Parse circle logs
        for (const l of circleLogs.reverse().slice(0, 5)) {
          const circleAddr = l.args.circle;
          if (circleAddr) {
            parsedItems.push({
              id: `circle-${l.transactionHash}`,
              type: "circle",
              text: `New Circle Deployed on Arc L1: ${shortAddr(circleAddr)}`,
              timestamp: "Live",
            });
          }
        }

        // Parse reputation logs
        for (const r of repLogs.reverse().slice(0, 5)) {
          const agentId = r.args.agentId;
          const score = r.args.value;
          if (agentId !== undefined) {
            parsedItems.push({
              id: `rep-${r.transactionHash}`,
              type: "reputation",
              text: `AI Guardian Attestation: Agent #${agentId} logged reputation score ${score}`,
              timestamp: "Onchain",
            });
          }
        }

        if (active && parsedItems.length > 0) {
          setItems(parsedItems);
        }
      } catch (err) {
        console.warn("Failed to fetch live ticker events from Arc Testnet:", err);
      }
    }

    fetchOnChainEvents();
    const interval = setInterval(fetchOnChainEvents, 30000); // refresh every 30s
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(10px)",
        padding: "8px 0",
        overflow: "hidden",
        position: "relative",
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          animation: "tickerScroll 35s linear infinite",
          whiteSpace: "nowrap",
          width: "max-content",
        }}
      >
        {items.concat(items).map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "2px 10px",
              borderRadius: 20,
              background: "var(--panel-strong)",
              border: "1px solid var(--border)",
            }}
          >
            {item.type === "circle" ? (
              <Layers size={13} style={{ color: "var(--accent)" }} />
            ) : (
              <ShieldCheck size={13} style={{ color: "var(--green)" }} />
            )}
            <span style={{ color: "var(--text-main)", fontWeight: 500 }}>
              {item.text}
            </span>
            <span className="pill blue" style={{ fontSize: 9, padding: "1px 6px" }}>
              {item.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
