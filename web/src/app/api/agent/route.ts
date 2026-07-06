import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { members, currentRound, collateral, debts, history, targetMember } = body;

    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      // Fallback: If no API key is provided, generate a deterministic mock response based on the member's history.
      // This ensures the dApp remains fully functional for hackathon reviewers without credentials.
      const hasDefaults = history[targetMember]?.includes("defaulted") || debts[targetMember] > 0;
      const riskScore = hasDefaults ? 85 : 15;
      const status = hasDefaults ? "REJECTED" : "APPROVED";
      const bailoutAmount = status === "APPROVED" ? 100 : 0;
      const rationale = hasDefaults
        ? `Member has a record of defaults (${debts[targetMember]} USDC outstanding debt) and zero collateral. Liquidity injection rejected to mitigate credit risk.`
        : `Member has a flawless payment history and maintains sufficient collateral. Approved for an automated 100 USDC liquidity guarantee to prevent temporary round friction.`;

      return NextResponse.json({
        status,
        riskScore,
        bailoutAmount,
        rationale: `[SIMULATED DECISION - Add AI_API_KEY in .env.local to use Live AI agent] ${rationale}`,
      });
    }

    const prompt = `You are Roda's AI Liquidity Guardian Agent. Your role is to assess credit and default risks for members of onchain savings circles on the Arc Network.
You must analyze the historical payment behavior, collateral balances, and outstanding debts of the target member to determine if they qualify for an automated liquidity bailout/injection in the current round.

Circle Configuration:
- Current Round: ${currentRound}
- Member List: ${JSON.stringify(members)}

Target Member to Assess: ${targetMember}
Target Member Current State:
- Remaining Collateral: ${collateral[targetMember] ?? 0} USDC
- Unpaid Debt: ${debts[targetMember] ?? 0} USDC
- Historical payment records: ${JSON.stringify(history[targetMember] ?? [])}

Return a JSON response in the following format:
{
  "status": "APPROVED" | "REJECTED",
  "riskScore": <integer between 0 and 100>,
  "bailoutAmount": <integer in USDC, 0 if rejected>,
  "rationale": "<A professional, expert-level 2-3 sentence analysis of their risk profile, citing their payment history and why they were approved or rejected for the liquidity injection. Do not sound like AI, write like an expert onchain risk manager.>"
}`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional onchain risk manager for collaborative finance. You output strictly structured JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `AI API returned error: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    
    let result: any = {};
    try {
      result = JSON.parse(resultText);
    } catch (parseErr) {
      console.error("Failed to parse AI response as JSON:", resultText);
      throw new Error("AI returned invalid JSON structure.");
    }

    // Normalize keys (handle camelCase vs snake_case, ensure types)
    const status = result.status ?? (Number(result.riskScore ?? result.risk_score ?? 50) > 50 ? "REJECTED" : "APPROVED");
    const riskScore = Number(result.riskScore ?? result.risk_score ?? 50);
    const bailoutAmount = Number(result.bailoutAmount ?? result.bailout_amount ?? 0);
    const rationale = result.rationale ?? "No rationale provided by agent.";

    // ERC-8004 Reputation Registry Integration
    try {
      const circleApiKey = process.env.CIRCLE_API_KEY;
      const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
      const ownerWalletId = process.env.AI_AGENT_WALLET_ID;
      const validatorWalletId = process.env.AI_AGENT_VALIDATOR_WALLET_ID;

      if (circleApiKey && entitySecret && ownerWalletId && validatorWalletId) {
        const { initiateDeveloperControlledWalletsClient } = await import("@circle-fin/developer-controlled-wallets");
        const { createPublicClient, http, parseAbiItem, keccak256, toHex } = await import("viem");
        const { arcTestnet } = await import("viem/chains");
        const { IDENTITY_REGISTRY, REPUTATION_REGISTRY } = await import("@/lib/contracts");

        const circleClient = initiateDeveloperControlledWalletsClient({
          apiKey: circleApiKey,
          entitySecret,
        });

        // 1. Get addresses
        const ownerResponse = await circleClient.getWallet({ id: ownerWalletId });
        const validatorResponse = await circleClient.getWallet({ id: validatorWalletId });
        const ownerAddress = ownerResponse.data?.wallet?.address;
        const validatorAddress = validatorResponse.data?.wallet?.address;

        if (ownerAddress && validatorAddress) {
          const publicClient = createPublicClient({
            chain: arcTestnet,
            transport: http(),
          });

          // 2. Query Transfer events to find Agent ID
          const transferLogs = await publicClient.getLogs({
            address: IDENTITY_REGISTRY,
            event: parseAbiItem(
              "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
            ),
            args: { to: ownerAddress as `0x${string}` },
            fromBlock: 0n,
            toBlock: "latest",
          });

          if (transferLogs.length > 0) {
            const agentId = transferLogs[transferLogs.length - 1].args.tokenId!.toString();
            const tag = "risk_assessment";
            const feedbackHash = keccak256(toHex(tag));
            const score = status.toUpperCase() === "APPROVED" ? 95 : 90;

            // 3. validator submits giveFeedback for agent
            await circleClient.createContractExecutionTransaction({
              walletAddress: validatorAddress,
              blockchain: "ARC-TESTNET",
              contractAddress: REPUTATION_REGISTRY,
              abiFunctionSignature: "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)",
              abiParameters: [
                agentId,
                score.toString(),
                "0",
                tag,
                "", // metadataURI
                "", // evidenceURI
                rationale.slice(0, 100), // comment (keep it under 100 chars for transaction payload efficiency)
                feedbackHash
              ],
              fee: { type: "level", config: { feeLevel: "MEDIUM" } }
            });
            console.log(`Successfully submitted ERC-8004 reputation feedback for agent ${agentId} on-chain.`);
          }
        }
      } else {
        console.log("Simulating reputation logging (Circle credentials not fully configured in env).");
      }
    } catch (repErr) {
      console.error("Failed to log ERC-8004 reputation feedback on-chain:", repErr);
    }

    return NextResponse.json({
      status: status.toUpperCase() === "APPROVED" ? "APPROVED" : "REJECTED",
      riskScore,
      bailoutAmount,
      rationale,
    });
  } catch (error: any) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
