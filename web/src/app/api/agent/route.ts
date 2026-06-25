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
    const result = JSON.parse(resultText);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
