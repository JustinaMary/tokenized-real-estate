"use client";

import { monadTestnet } from "./chain";

export type ActivityType =
  | "faucet"
  | "buy"
  | "list"
  | "trade"
  | "cancel"
  | "claim"
  | "rent"
  | "kyc"
  | "create";

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  txHash: `0x${string}`;
  timestamp: number;
};

const key = (address: string) => `terra:activity:${address.toLowerCase()}`;

/** Block-explorer URL for a transaction. */
export function txUrl(hash: string): string {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}

/**
 * Local, per-address record of on-chain actions taken in the app. Each entry
 * points at a real tx on the explorer. (Production: replace with an Envio
 * indexer or explorer API for full cross-device / historical coverage.)
 */
export function recordActivity(
  address: string,
  entry: { type: ActivityType; title: string; txHash: `0x${string}` }
) {
  if (typeof window === "undefined" || !address) return;
  const list = getActivity(address);
  const item: Activity = {
    id: `${entry.txHash}-${entry.type}`,
    type: entry.type,
    title: entry.title,
    txHash: entry.txHash,
    timestamp: Date.now(),
  };
  const next = [item, ...list.filter((a) => a.id !== item.id)].slice(0, 100);
  localStorage.setItem(key(address), JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("terra:activity"));

  // Durable copy (best-effort) — persists across logout/login + devices when a
  // database is configured. No-op (503) without one; localStorage still works.
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, ...item }),
  }).catch(() => {});
}

export function getActivity(address?: string): Activity[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    return JSON.parse(localStorage.getItem(key(address)) ?? "[]") as Activity[];
  } catch {
    return [];
  }
}

function merge(a: Activity[], b: Activity[]): Activity[] {
  const byId = new Map<string, Activity>();
  for (const x of [...a, ...b]) byId.set(x.id, x);
  return [...byId.values()].sort((x, y) => y.timestamp - x.timestamp).slice(0, 100);
}

/**
 * Returns the durable activity for an address: merges the server copy (if a DB
 * is configured) with the local cache, writes the merge back to localStorage,
 * and returns it. Falls back to local-only when there's no DB.
 */
export async function syncActivity(address?: string): Promise<Activity[]> {
  const local = getActivity(address);
  if (typeof window === "undefined" || !address) return local;
  try {
    const res = await fetch(`/api/activity?address=${address}`);
    if (!res.ok) return local;
    const remote = (await res.json()) as Activity[];
    if (!Array.isArray(remote) || remote.length === 0) return local;
    const merged = merge(local, remote);
    localStorage.setItem(key(address), JSON.stringify(merged));
    return merged;
  } catch {
    return local;
  }
}
