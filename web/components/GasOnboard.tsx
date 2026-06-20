"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { toast } from "@/lib/toast";

/**
 * On first connect of any wallet (email/passkey embedded OR external), tops up
 * the address with testnet MON for gas via /api/gas/drip. Balance-gated server
 * side, so it's a no-op for wallets that already have gas. Renders nothing.
 */
export function GasOnboard() {
  const { address, isConnected } = useAccount();
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isConnected || !address) return;
    if (attempted.current.has(address)) return;
    attempted.current.add(address);

    (async () => {
      try {
        const res = await fetch("/api/gas/drip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (data.ok && data.txHash) {
          toast("Funded your wallet with test MON for gas", "success");
        }
      } catch {
        // best-effort; the faucet page is the manual fallback
      }
    })();
  }, [address, isConnected]);

  return null;
}
