"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getActivity, syncActivity, txUrl, type Activity, type ActivityType } from "@/lib/activity";
import { Card, Badge } from "./ui";

const LABEL: Record<ActivityType, { text: string; tone: "default" | "accent" | "gold" }> = {
  faucet: { text: "Faucet", tone: "default" },
  buy: { text: "Buy", tone: "accent" },
  list: { text: "List", tone: "gold" },
  trade: { text: "Trade", tone: "accent" },
  cancel: { text: "Cancel", tone: "default" },
  claim: { text: "Claim", tone: "accent" },
  rent: { text: "Rent", tone: "gold" },
  kyc: { text: "Verify", tone: "gold" },
  create: { text: "Create", tone: "default" },
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Renders the connected user's on-chain activity, recorded at action time. */
export function ActivityFeed() {
  const { address } = useAccount();
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    if (!address) return;
    const load = () => setItems(getActivity(address)); // instant local
    load();
    // durable: merge the server copy (survives logout/login + devices)
    syncActivity(address).then(setItems);
    window.addEventListener("terra:activity", load);
    return () => window.removeEventListener("terra:activity", load);
  }, [address]);

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-fg-muted">
        No transactions yet. Mint mUSDC, verify, or buy shares to get started.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((a) => {
        const meta = LABEL[a.type];
        return (
          <Card key={a.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <Badge tone={meta.tone}>{meta.text}</Badge>
              <span className="text-sm text-fg">{a.title}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-fg-faint">{timeAgo(a.timestamp)}</span>
              <a
                href={txUrl(a.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="tabular text-accent hover:underline"
              >
                {a.txHash.slice(0, 8)}↗
              </a>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
