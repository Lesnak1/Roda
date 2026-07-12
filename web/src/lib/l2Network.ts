// Roda Layer 2 Agent Network Data
// Models the off-chain high-frequency agent ROSCA channels for nanopayments.

import { shortAddr } from "./format";

export interface L2Agent {
  address: `0x${string}`;
  name: string;
  creditScore: number; // 300 to 850
  riskLevel: "Low" | "Medium" | "High";
  joinedCirclesCount: number;
  totalContributed: number; // USDC
}

export interface L2Circle {
  circle: `0x${string}`;
  creator: `0x${string}`;
  contributionAmount: bigint;
  memberCount: number;
  joinedCount: number;
  roundDuration: bigint;
  createdAt: bigint;
  state: number; // 0: Recruiting, 1: Active, 2: Completed, 3: Cancelled
}

// Seeded random generator for deterministic off-chain network data
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function getL2Agents(): L2Agent[] {
  const agents: L2Agent[] = [];
  const names = [
    "AlphaShield", "BraveOracle", "CyberSentry", "DeltaGuard", "EchoLink",
    "FalconLedger", "GigaValidator", "HelixVault", "InfinityPay", "JadeStaker",
    "KryptonRisk", "LunaGuardian", "MatrixBailout", "NovaValidator", "OmegaSettler",
    "PulseEscrow", "QuantumSec", "RuneKeeper", "SolarAudit", "TitanReserve"
  ];

  for (let i = 1; i <= 378; i++) {
    const hex = Math.floor(seededRandom(i) * 0xffffffffffffffff).toString(16).padStart(16, "0");
    const address = `0x${hex}00000000000000000000000000000000` as `0x${string}`;
    
    const nameIndex = Math.floor(seededRandom(i + 1) * names.length);
    const suffix = Math.floor(seededRandom(i + 2) * 900) + 100;
    const name = `${names[nameIndex]}-${suffix}`;
    
    const creditScore = Math.floor(seededRandom(i + 3) * 550) + 300;
    let riskLevel: "Low" | "Medium" | "High" = "Low";
    if (creditScore < 550) riskLevel = "High";
    else if (creditScore < 700) riskLevel = "Medium";

    const joinedCirclesCount = Math.floor(seededRandom(i + 4) * 6) + 1;
    const totalContributed = joinedCirclesCount * (Math.floor(seededRandom(i + 5) * 5) + 1) * 10;

    agents.push({
      address,
      name,
      creditScore,
      riskLevel,
      joinedCirclesCount,
      totalContributed
    });
  }
  return agents;
}

export function getL2Circles(): L2Circle[] {
  const agents = getL2Agents();
  const circles: L2Circle[] = [];
  
  const totalDays = 30;
  let seedIndex = 1000;

  for (let d = totalDays; d >= 0; d--) {
    const dailyCount = Math.floor(seededRandom(seedIndex++) * 5) + 10; // 10 to 14 circles per day
    const dayTimestamp = Date.now() - d * 24 * 60 * 60 * 1000;

    for (let c = 0; c < dailyCount; c++) {
      const creatorIdx = Math.floor(seededRandom(seedIndex++) * agents.length);
      const creator = agents[creatorIdx].address;
      
      const contributionAmount = BigInt([10, 25, 50, 100][Math.floor(seededRandom(seedIndex++) * 4)] * 1000000);
      const memberCount = [3, 4, 5, 6, 8][Math.floor(seededRandom(seedIndex++) * 5)];
      
      let state = 2; // Completed
      if (d === 0) {
        state = seededRandom(seedIndex++) > 0.4 ? 0 : 1;
      } else if (d === 1) {
        state = seededRandom(seedIndex++) > 0.3 ? 1 : 2;
      } else if (seededRandom(seedIndex++) > 0.95) {
        state = 3; // Cancelled
      }

      let joinedCount = memberCount;
      if (state === 0) {
        joinedCount = Math.floor(seededRandom(seedIndex++) * memberCount);
        if (joinedCount === 0) joinedCount = 1;
      }

      const roundDuration = BigInt([86400, 172800, 604800][Math.floor(seededRandom(seedIndex++) * 3)]);
      
      const circleHex = Math.floor(seededRandom(seedIndex++) * 0xffffffffffffffff).toString(16).padStart(16, "0");
      const circle = `0x513000000000000000000000${circleHex}` as `0x${string}`;

      circles.push({
        circle,
        creator,
        contributionAmount,
        memberCount,
        joinedCount,
        roundDuration,
        createdAt: BigInt(Math.floor(dayTimestamp / 1000)),
        state
      });
    }
  }

  return circles.reverse();
}

export function isL2Address(addr: string): boolean {
  return addr.toLowerCase().startsWith("0x513");
}

export function getL2CircleMembers(circleAddress: string, count: number, creator: `0x${string}`): `0x${string}`[] {
  const agents = getL2Agents();
  const list: `0x${string}`[] = [creator];
  
  let seed = 5000;
  for (let i = 0; i < circleAddress.length; i++) {
    seed += circleAddress.charCodeAt(i);
  }

  while (list.length < count) {
    const idx = Math.floor(seededRandom(seed++) * agents.length);
    const candidate = agents[idx].address;
    if (!list.includes(candidate)) {
      list.push(candidate);
    }
  }
  return list;
}
