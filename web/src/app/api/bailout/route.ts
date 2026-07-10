import { NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, http, parseAbiItem } from "viem";
import { arcTestnet } from "viem/chains";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000";
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000";

// Minimal ABI for server-side on-chain reads
const circleReadAbi = [
  { type: "function", name: "state", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "contributionAmount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "currentRound", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isMember", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "hasContributed", stateMutability: "view", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "bool" }] },
] as const;

const factoryReadAbi = [
  { type: "function", name: "circleCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "circles", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ name: "circle", type: "address" }, { name: "creator", type: "address" }, { name: "contributionAmount", type: "uint256" }, { name: "memberCount", type: "uint8" }, { name: "roundDuration", type: "uint256" }, { name: "recruitingDuration", type: "uint256" }, { name: "createdAt", type: "uint256" }] },
] as const;

// Track processed bailouts to prevent double-spend: (circleAddress-round-member) → timestamp
const processedBailouts = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const { circleAddress, memberAddress } = await req.json();

    // --- Input validation ---
    if (!circleAddress || !memberAddress) {
      return NextResponse.json({ error: "Missing circleAddress or memberAddress" }, { status: 400 });
    }

    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    const walletId = process.env.AI_AGENT_WALLET_ID;

    if (!apiKey || !entitySecret || !walletId) {
      return NextResponse.json({ error: "Circle credentials not configured" }, { status: 500 });
    }

    // --- Server-side on-chain validation ---
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    // 1. Verify circle exists in factory
    const circleCount = await publicClient.readContract({
      address: FACTORY_ADDRESS as `0x${string}`,
      abi: factoryReadAbi,
      functionName: "circleCount",
    });

    let isFactoryCircle = false;
    const countToCheck = Number(circleCount) > 100 ? 100 : Number(circleCount);
    for (let i = 0; i < countToCheck; i++) {
      const info = await publicClient.readContract({
        address: FACTORY_ADDRESS as `0x${string}`,
        abi: factoryReadAbi,
        functionName: "circles",
        args: [BigInt(i)],
      });
      if ((info as any)[0]?.toLowerCase() === circleAddress.toLowerCase()) {
        isFactoryCircle = true;
        break;
      }
    }

    if (!isFactoryCircle) {
      return NextResponse.json({ error: "Circle address not found in factory" }, { status: 400 });
    }

    // 2. Verify circle is Active (state == 1)
    const state = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: circleReadAbi,
      functionName: "state",
    });

    if (Number(state) !== 1) {
      return NextResponse.json({ error: "Circle is not in Active state" }, { status: 400 });
    }

    // 3. Verify member is actually a member
    const isMember = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: circleReadAbi,
      functionName: "isMember",
      args: [memberAddress as `0x${string}`],
    });

    if (!isMember) {
      return NextResponse.json({ error: "Address is not a member of this circle" }, { status: 400 });
    }

    // 4. Get current round and check if member has already contributed
    const currentRound = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: circleReadAbi,
      functionName: "currentRound",
    });

    const hasContributed = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: circleReadAbi,
      functionName: "hasContributed",
      args: [currentRound, memberAddress as `0x${string}`],
    });

    if (hasContributed) {
      return NextResponse.json({ error: "Member has already contributed this round" }, { status: 400 });
    }

    // 5. Read the canonical contributionAmount from the contract (never trust client)
    const contributionAmount = await publicClient.readContract({
      address: circleAddress as `0x${string}`,
      abi: circleReadAbi,
      functionName: "contributionAmount",
    });

    // 6. Idempotency check: prevent duplicate bailouts for the same (circle, round, member)
    const idempotencyKey = `${circleAddress.toLowerCase()}-${currentRound}-${memberAddress.toLowerCase()}`;
    if (processedBailouts.has(idempotencyKey)) {
      return NextResponse.json({ error: "Bailout already processed for this member in this round" }, { status: 409 });
    }

    // --- Execute transfer ---
    const client = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    const balancesResponse = await client.getWalletTokenBalance({ id: walletId });
    const tokenBalances = balancesResponse.data?.tokenBalances || [];
    const usdcToken = tokenBalances.find(
      (tb: any) =>
        tb.token?.tokenAddress?.toLowerCase() === USDC_ADDRESS.toLowerCase() ||
        (tb.token?.isNative && tb.token?.symbol === "USDC")
    );

    if (!usdcToken) {
      throw new Error("USDC token balance not found in Agent wallet");
    }

    const tokenId = usdcToken.token.id;
    const decimalAmount = (Number(contributionAmount) / 1000000).toFixed(6);

    const transferTx = await client.createTransaction({
      walletId,
      destinationAddress: memberAddress,
      blockchain: "ARC-TESTNET" as any,
      tokenId,
      amount: [decimalAmount],
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
    });

    const txId = transferTx.data?.id;
    if (!txId) {
      throw new Error("Failed to create transfer transaction");
    }

    // Poll status until confirmed (max 6 iterations = 12s for Vercel limit)
    let txHash: string | undefined;
    let txState: string = "PENDING";
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await client.getTransaction({ id: txId });
      txState = data?.transaction?.state || "PENDING";
      if (txState === "COMPLETE") {
        txHash = data?.transaction?.txHash;
        break;
      }
      if (txState === "FAILED") {
        throw new Error("USDC transfer transaction failed on Arc Testnet");
      }
    }

    if (txState !== "COMPLETE") {
      return NextResponse.json({
        success: false,
        status: "pending",
        txId,
        error: "Transfer still pending after timeout. Check status manually.",
      }, { status: 202 });
    }

    // Record idempotency (auto-expire after 1 hour)
    processedBailouts.set(idempotencyKey, Date.now());
    setTimeout(() => processedBailouts.delete(idempotencyKey), 3600_000);

    return NextResponse.json({
      success: true,
      txHash: txHash!,
      contributionAmount: contributionAmount.toString(),
    });
  } catch (error: any) {
    console.error("Bailout Error:", error);
    return NextResponse.json({ error: error.message || "Bailout execution failed" }, { status: 500 });
  }
}
