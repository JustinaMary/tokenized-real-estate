"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/chain";
import { Button } from "./ui";

/**
 * Warns when the connected wallet is on the wrong network and offers a one-click
 * switch. The contracts live on Monad testnet; calling them from another chain
 * (e.g. Monad mainnet) reverts because there's no code at the address there.
 */
export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === monadTestnet.id) return null;

  return (
    <div className="border-b border-danger/30 bg-danger/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
        <span className="text-sm text-fg">
          Wrong network — Terra runs on <strong>Monad Testnet</strong>. Switch to
          buy, claim, or trade.
        </span>
        <Button
          onClick={() => switchChain({ chainId: monadTestnet.id })}
          loading={isPending}
        >
          Switch to Monad Testnet
        </Button>
      </div>
    </div>
  );
}
