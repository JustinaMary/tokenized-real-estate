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
}

export function getActivity(address?: string): Activity[] {
  if (typeof window === "undefined" || !address) return [];
  try {
    return JSON.parse(localStorage.getItem(key(address)) ?? "[]") as Activity[];
  } catch {
    return [];
  }
}
