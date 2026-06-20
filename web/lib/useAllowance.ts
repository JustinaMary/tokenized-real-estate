"use client";

import { useReadContract } from "wagmi";
import { mockUSDC } from "./contracts";

/** Read a user's mUSDC allowance for a spender (e.g. PropertyShares, Marketplace). */
export function useUsdcAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const { data, refetch } = useReadContract({
    ...mockUSDC,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!owner && !!spender },
  });
  return { allowance: (data as bigint | undefined) ?? 0n, refetch };
}

/** Read whether `owner` approved `operator` to move their ERC-1155 shares. */
export function useIsApprovedForAll(
  contract: { address: `0x${string}`; abi: readonly unknown[] },
  owner?: `0x${string}`,
  operator?: `0x${string}`
) {
  const { data, refetch } = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "isApprovedForAll",
    args: owner && operator ? [owner, operator] : undefined,
    query: { enabled: !!owner && !!operator },
  });
  return { approved: Boolean(data), refetch };
}
