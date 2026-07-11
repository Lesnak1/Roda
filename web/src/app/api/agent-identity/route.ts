import { NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, http, parseAbiItem, getContract } from "viem";
import { arcTestnet } from "viem/chains";
import { IDENTITY_REGISTRY, REPUTATION_REGISTRY, identityRegistryAbi } from "@/lib/contracts";

const METADATA_URI = "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei";

export async function GET() {
  try {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    const ownerWalletId = process.env.AI_AGENT_WALLET_ID;
    const validatorWalletId = process.env.AI_AGENT_VALIDATOR_WALLET_ID;

    if (!apiKey || !entitySecret || !ownerWalletId || !validatorWalletId) {
      return NextResponse.json({ error: "Circle credentials not fully configured in env" }, { status: 500 });
    }

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    // 1. Get wallet addresses
    const ownerResponse = await circleClient.getWallet({ id: ownerWalletId });
    const validatorResponse = await circleClient.getWallet({ id: validatorWalletId });
    const ownerAddress = ownerResponse.data?.wallet?.address;
    const validatorAddress = validatorResponse.data?.wallet?.address;

    if (!ownerAddress) {
      return NextResponse.json({ error: "Owner wallet not found in Circle account" }, { status: 404 });
    }

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    const latestBlock = await publicClient.getBlockNumber();
    const chunkSize = 9500n;
    let agentId: string | null = null;
    let fromBlock = latestBlock;

    // Scan up to 5 chunks backwards (approx. 47,500 blocks) to find the registration
    for (let i = 0; i < 5; i++) {
      const toBlock = latestBlock - (BigInt(i) * chunkSize);
      let chunkFromBlock = toBlock - chunkSize;
      if (chunkFromBlock < 0n) chunkFromBlock = 0n;

      const logs = await publicClient.getLogs({
        address: IDENTITY_REGISTRY,
        event: parseAbiItem(
          "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
        ),
        args: { to: ownerAddress as `0x${string}` },
        fromBlock: chunkFromBlock,
        toBlock,
      });

      if (logs.length > 0) {
        agentId = logs[logs.length - 1].args.tokenId!.toString();
        fromBlock = chunkFromBlock; // Save the starting block of the search range for reputation logs
        break;
      }

      if (chunkFromBlock === 0n) break;
    }

    if (!agentId) {
      return NextResponse.json({
        registered: false,
        ownerAddress,
        validatorAddress,
      });
    }

    // 3. Read metadata URI
    const identityContract = getContract({
      address: IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      client: publicClient,
    });
    const tokenURI = await identityContract.read.tokenURI([BigInt(agentId)]);

    // 4. Query reputation logs
    const reputationLogs = await publicClient.getLogs({
      address: REPUTATION_REGISTRY,
      event: parseAbiItem(
        "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)"
      ),
      args: { agentId: BigInt(agentId) },
      fromBlock,
      toBlock: "latest",
    });

    let totalScore = 0;
    const feedbacks = reputationLogs.map((log, index) => {
      const score = Number(log.args.value);
      totalScore += score;
      return {
        id: index.toString(),
        score,
        tag: log.args.tag1 || "risk_assessment",
        comment: log.args.feedbackURI || "Assessment recorded",
      };
    });

    const avgScore = feedbacks.length > 0 ? Math.round(totalScore / feedbacks.length) : 0;

    return NextResponse.json({
      registered: true,
      agentId,
      ownerAddress,
      validatorAddress,
      tokenURI,
      stats: {
        totalCount: feedbacks.length,
        avgScore,
        feedbacks: feedbacks.reverse()
      }
    });

  } catch (error: any) {
    console.error("GET agent-identity error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch identity" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    const ownerWalletId = process.env.AI_AGENT_WALLET_ID;

    if (!apiKey || !entitySecret || !ownerWalletId) {
      return NextResponse.json({ error: "Circle credentials not fully configured in env" }, { status: 500 });
    }

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    // 1. Get wallet address
    const ownerResponse = await circleClient.getWallet({ id: ownerWalletId });
    const ownerAddress = ownerResponse.data?.wallet?.address;

    if (!ownerAddress) {
      return NextResponse.json({ error: "Owner wallet not found" }, { status: 404 });
    }

    // 2. Call register(metadataURI)
    const registerTx = await circleClient.createContractExecutionTransaction({
      walletAddress: ownerAddress,
      blockchain: "ARC-TESTNET",
      contractAddress: IDENTITY_REGISTRY,
      abiFunctionSignature: "register(string)",
      abiParameters: [METADATA_URI],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    const txId = registerTx.data?.id;
    if (!txId) {
      throw new Error("Failed to create registration transaction");
    }

    // Poll status until confirmed
    let txHash: string | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await circleClient.getTransaction({ id: txId });
      if (data?.transaction?.state === "COMPLETE") {
        txHash = data?.transaction?.txHash;
        break;
      }
      if (data?.transaction?.state === "FAILED") {
        throw new Error("Registration contract transaction failed onchain");
      }
    }

    return NextResponse.json({
      success: true,
      txHash: txHash || "0x",
    });

  } catch (error: any) {
    console.error("POST agent-identity error:", error);
    return NextResponse.json({ error: error.message || "Failed to register identity" }, { status: 500 });
  }
}
