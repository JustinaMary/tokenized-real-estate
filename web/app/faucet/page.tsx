"use client";

import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { mockUSDC } from "@/lib/contracts";
import { useTx } from "@/lib/useTx";
import { formatUSDC } from "@/lib/format";
import { Button, Card, Stat } from "@/components/ui";
import { ConnectGate } from "@/components/actions";
import { ConfigBanner } from "@/components/ConfigBanner";

export default function FaucetPage() {
  const { address } = useAccount();
  const { run, isBusy } = useTx();
  const { data: native } = useBalance({ address });
  const { data: usdcBal, refetch } = useReadContract({
    ...mockUSDC,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  async function onFaucet() {
    const ok = await run(
      { ...mockUSDC, functionName: "faucet", args: [] },
      { pending: "Minting mUSDC…", success: "Received 10,000 mUSDC" }
    );
    if (ok) refetch();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ConfigBanner />
      <h1 className="text-2xl font-semibold">Test funds</h1>
      <p className="text-fg-muted">
        Mint mock USDC to invest with. You&apos;ll also need testnet MON for gas —
        grab some from the official Monad faucet.
      </p>

      <Card className="mt-8 p-6">
        <div className="grid grid-cols-2 gap-6">
          <Stat
            label="MON balance"
            value={native ? Number(formatUnits(native.value, native.decimals)).toFixed(3) : "—"}
            sub="for gas"
          />
          <Stat
            label="mUSDC balance"
            value={usdcBal !== undefined ? formatUSDC(usdcBal as bigint) : "—"}
            sub="to invest"
          />
        </div>

        <div className="mt-6">
          <ConnectGate>
            <Button className="w-full" onClick={onFaucet} loading={isBusy}>
              Mint 10,000 mUSDC
            </Button>
          </ConnectGate>
        </div>

        <a
          href="https://faucet.monad.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block text-center text-sm text-fg-muted hover:text-accent"
        >
          Need MON for gas? Open the Monad testnet faucet →
        </a>
      </Card>
    </div>
  );
}
