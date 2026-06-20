"use client";

import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatUnits } from "viem";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui";
import { shortAddress } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: bal } = useBalance({ address });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!isConnected) {
    const injected = connectors[0];
    return (
      <Button onClick={() => injected && connect({ connector: injected })} loading={isPending}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border-strong bg-bg-elev px-3 py-2 text-sm hover:border-accent/40"
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="tabular">{shortAddress(address)}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-bg-card p-3 shadow-xl rise">
          <div className="text-xs text-fg-faint">Balance</div>
          <div className="tabular text-sm text-fg">
            {bal
              ? `${Number(formatUnits(bal.value, bal.decimals)).toFixed(3)} ${bal.symbol}`
              : "—"}
          </div>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}
