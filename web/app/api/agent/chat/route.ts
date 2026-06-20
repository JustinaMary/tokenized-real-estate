import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildAgentContext } from "@/lib/agent/context";

export const dynamic = "force-dynamic";

type ChatMsg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are Terra's AI investing copilot. Terra is a tokenized real estate platform on Monad testnet where each property is divided into shares (ERC-1155). Users buy shares with mock USDC (mUSDC), earn a proportional cut of rental income, and trade shares on a marketplace. Ownership is gated by on-chain KYC.

Your job:
- Answer questions about the user's portfolio, the available properties, rental income, and how the platform works.
- Recommend properties when asked, using the on-chain data provided (price per share, % sold, valuation, type).
- When the user clearly wants to act, propose ONE action via a tool. Never invent properties, prices, or balances — use only the CONTEXT data. Amounts are in shares (integers) or mUSDC.

Style: concise, friendly, concrete. Use real numbers from CONTEXT. If the user isn't connected, tell them to connect their wallet. Do not claim to have executed anything — actions are proposals the user confirms and signs in their wallet.`;

const tools: Anthropic.Tool[] = [
  {
    name: "propose_buy",
    description:
      "Propose buying shares of a property from the primary market. Use when the user wants to invest in a specific property.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "integer", description: "On-chain property id" },
        amount: { type: "integer", description: "Number of shares to buy" },
      },
      required: ["propertyId", "amount"],
    },
  },
  {
    name: "propose_claim",
    description:
      "Propose claiming accrued rental income for a property the user holds.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "integer", description: "On-chain property id" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "propose_list",
    description:
      "Propose listing shares for sale on the marketplace at a price per share in mUSDC.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "integer", description: "On-chain property id" },
        amount: { type: "integer", description: "Number of shares to list" },
        pricePerShare: { type: "number", description: "Price per share in mUSDC" },
      },
      required: ["propertyId", "amount", "pricePerShare"],
    },
  },
];

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        reply:
          "The AI copilot isn't configured yet. Add ANTHROPIC_API_KEY to the server environment to enable it.",
      },
      { status: 200 }
    );
  }

  const { messages, address } = (await request.json()) as {
    messages: ChatMsg[];
    address?: string;
  };

  const ctx = await buildAgentContext(address);
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1200,
      output_config: { effort: "low" },
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: `CONTEXT (live on-chain data):\n${JSON.stringify(ctx)}` },
      ],
      tools,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    let reply = "";
    let action: { name: string; input: Record<string, unknown> } | null = null;
    for (const block of response.content) {
      if (block.type === "text") reply += block.text;
      else if (block.type === "tool_use") {
        action = { name: block.name, input: block.input as Record<string, unknown> };
      }
    }
    if (!reply && action) reply = "Here's what I'd suggest — confirm to proceed:";

    return NextResponse.json({ reply, action });
  } catch (e) {
    return NextResponse.json(
      { reply: e instanceof Error ? `Copilot error: ${e.message}` : "Copilot error" },
      { status: 200 }
    );
  }
}
