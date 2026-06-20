import { formatUnits, parseUnits } from "viem";
import { USDC_DECIMALS } from "./contracts";

/** Format a mUSDC bigint (6 decimals) as a human string, e.g. "1,250.00". */
export function formatUSDC(value: bigint, maxFractionDigits = 2): string {
  const n = Number(formatUnits(value, USDC_DECIMALS));
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

/** Parse a human mUSDC string into a 6-decimal bigint. */
export function parseUSDC(value: string): bigint {
  return parseUnits(value || "0", USDC_DECIMALS);
}

/** "0x1234…abcd" */
export function shortAddress(addr?: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatShares(value: bigint): string {
  return Number(value).toLocaleString("en-US");
}

/** Percentage of a whole, to 2 decimals. */
export function percent(part: bigint, whole: bigint): string {
  if (whole === 0n) return "0";
  return ((Number(part) / Number(whole)) * 100).toFixed(2);
}
