import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/chains/arcTestnet";
import { isL2Address } from "@/lib/l2Network";

export async function POST(req: Request) {
  try {
    const { circleAddress, targetMember } = await req.json();
    if (!circleAddress || !targetMember) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (isL2Address(circleAddress)) {
      return NextResponse.json({
        agent: "Risk-Agent-v1",
        riskScore: 8,
        tier: "LOW_RISK",
        solvencyProbability: 0.992,
        maxSafeCreditLimit: "500 USDC",
        timestamp: new Date().toISOString(),
      });
    }

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    const isMember = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: [
        { type: "function", name: "isMember", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" }
      ],
      functionName: "isMember",
      args: [targetMember as `0x${string}`],
    }).catch(() => false);

    const collateral = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: [
        { type: "function", name: "collateral", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }
      ],
      functionName: "collateral",
      args: [targetMember as `0x${string}`],
    }).catch(() => 0n);

    const riskScore = collateral > 0n ? 12 : 65;

    return NextResponse.json({
      agent: "Risk-Agent-v1",
      circleAddress,
      targetMember,
      isMember,
      collateralUsdc: (Number(collateral) / 1e6).toFixed(2),
      riskScore,
      tier: riskScore < 25 ? "LOW_RISK" : riskScore < 60 ? "MODERATE_RISK" : "HIGH_RISK",
      solvencyProbability: riskScore < 25 ? 0.995 : 0.82,
      recommendation: riskScore < 25 ? "PERMIT_FULL_PAYOUT" : "REQUIRE_COLLATERAL_TOPUP",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Risk Agent execution failed" }, { status: 500 });
  }
}
