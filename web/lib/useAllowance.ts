"use client";

import { useReadContract } from "wagmi";
import { mockUSDC } from "./contracts";

const asAddr = (a?: string) => (a ? (a as `0x${string}`) : undefined);

/** Read a user's mUSDC allowance for a spender (e.g. PropertyShares, Marketplace). */
export function useUsdcAllowance(owner?: string, spender?: string) {
  const o = asAddr(owner);
  const s = asAddr(spender);
  const { data, refetch } = useReadContract({
    ...mockUSDC,
    functionName: "allowance",
    args: o && s ? [o, s] : undefined,
    query: { enabled: !!o && !!s },
  });
  return { allowance: (data as bigint | undefined) ?? 0n, refetch };
}

/** Read whether `owner` approved `operator` to move their ERC-1155 shares. */
export function useIsApprovedForAll(
  contract: { address: `0x${string}`; abi: readonly unknown[] },
  owner?: string,
  operator?: string
) {
  const o = asAddr(owner);
  const op = asAddr(operator);
  const { data, refetch } = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "isApprovedForAll",
    args: o && op ? [o, op] : undefined,
    query: { enabled: !!o && !!op },
  });
  return { approved: Boolean(data), refetch };
}
