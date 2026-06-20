import "server-only";
import { createPublicClient, http, formatUnits } from "viem";
import { monadTestnet } from "@/lib/chain";
import { propertyShares } from "@/lib/contracts";
import { STATIC_PROPERTIES } from "@/lib/properties";
import { USDC_DECIMALS } from "@/lib/contracts";

const client = createPublicClient({ chain: monadTestnet, transport: http() });

type PropertyCtx = {
  id: number;
  title: string;
  location: string;
  type: string;
  valuationUSD: number;
  pricePerShareUSDC: number;
  totalShares: number;
  sharesSold: number;
};

type HoldingCtx = { id: number; title: string; shares: number; claimableUSDC: number };

const usdc = (v: bigint) => Number(formatUnits(v, USDC_DECIMALS));

/**
 * Gathers on-chain property + portfolio data for the connected user so the
 * agent can answer questions and propose actions grounded in real state.
 */
export async function buildAgentContext(address?: string) {
  let count = 0;
  try {
    count = Number(
      await client.readContract({ ...propertyShares, functionName: "nextId" })
    );
  } catch {
    count = STATIC_PROPERTIES.length;
  }

  const properties: PropertyCtx[] = [];
  const holdings: HoldingCtx[] = [];

  for (let id = 0; id < count; id++) {
    const meta = STATIC_PROPERTIES.find((p) => p.id === id);
    try {
      const p = (await client.readContract({
        ...propertyShares,
        functionName: "properties",
        args: [BigInt(id)],
      })) as [bigint, bigint, string, string, bigint];
      const [supply, price, , , sold] = p;
      properties.push({
        id,
        title: meta?.title ?? `Property #${id}`,
        location: meta?.location ?? "",
        type: meta?.propertyType ?? "",
        valuationUSD: meta?.valuationUSD ?? 0,
        pricePerShareUSDC: usdc(price),
        totalShares: Number(supply),
        sharesSold: Number(sold),
      });

      if (address) {
        const [bal, claim] = await Promise.all([
          client.readContract({
            ...propertyShares,
            functionName: "balanceOf",
            args: [address as `0x${string}`, BigInt(id)],
          }) as Promise<bigint>,
          client.readContract({
            ...propertyShares,
            functionName: "claimable",
            args: [BigInt(id), address as `0x${string}`],
          }) as Promise<bigint>,
        ]);
        if (bal > 0n || claim > 0n) {
          holdings.push({
            id,
            title: meta?.title ?? `Property #${id}`,
            shares: Number(bal),
            claimableUSDC: usdc(claim),
          });
        }
      }
    } catch {
      // skip property on read failure
    }
  }

  return { properties, holdings, connected: !!address, address: address ?? null };
}
