import { NextResponse } from "next/server";
import { createPublicClient, http, formatEther } from "viem";
import { monadTestnet } from "@/lib/chain";

export const dynamic = "force-dynamic";

/** Minimum gas a wallet should hold before we top it up (0.05 MON). */
const MIN_GAS = 50_000_000_000_000_000n;
/** Per-address cooldown to avoid double-dripping during the faucet's lag. */
const COOLDOWN_MS = 60_000;
const recent = new Map<string, number>();

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

/**
 * POST /api/gas/drip — top up a newly-registered wallet with testnet MON so the
 * user can transact without first acquiring gas. Balance-gated (skips wallets
 * that already have enough) and cooldown-guarded.
 *
 * Demo: funds via the monskills testnet faucet. In production this would be a
 * gas sponsor / paymaster (e.g. Para gas sponsorship) or a funded relayer.
 */
export async function POST(request: Request) {
  let address: string;
  try {
    ({ address } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ ok: false, error: "Invalid address" }, { status: 400 });
  }

  const key = address.toLowerCase();
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < COOLDOWN_MS) {
    return NextResponse.json({ ok: true, skipped: "cooldown" });
  }

  try {
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    if (balance >= MIN_GAS) {
      return NextResponse.json({ ok: true, skipped: "funded", balance: formatEther(balance) });
    }

    recent.set(key, now);
    const res = await fetch("https://agents.devnads.com/v1/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId: 10143, address }),
    });
    const data = (await res.json()) as { txHash?: string; error?: string };
    if (!res.ok || !data.txHash) {
      recent.delete(key); // allow retry on failure
      return NextResponse.json({ ok: false, error: data.error ?? "Faucet failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, txHash: data.txHash });
  } catch (e) {
    recent.delete(key);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Drip failed" },
      { status: 500 }
    );
  }
}
