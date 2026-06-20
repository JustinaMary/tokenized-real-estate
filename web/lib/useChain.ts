"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { propertyShares, marketplace } from "./contracts";

const asAddr = (a?: string) => (a ? (a as `0x${string}`) : undefined);

export type OnchainProperty = {
  supply: bigint;
  pricePerShare: bigint;
  issuer: `0x${string}`;
  metadataURI: string;
  sharesSold: bigint;
};

export type Listing = {
  id: number;
  seller: `0x${string}`;
  propertyId: bigint;
  amountRemaining: bigint;
  pricePerShare: bigint;
  active: boolean;
};

/** Number of properties created (next token id). */
export function usePropertyCount() {
  const { data, refetch } = useReadContract({
    ...propertyShares,
    functionName: "nextId",
  });
  return { count: data ? Number(data) : 0, refetch };
}

/** On-chain record for a single property. */
export function usePropertyOnchain(id: number) {
  const { data, refetch, isLoading } = useReadContract({
    ...propertyShares,
    functionName: "properties",
    args: [BigInt(id)],
  });
  let property: OnchainProperty | undefined;
  if (data) {
    const [supply, pricePerShare, issuer, metadataURI, sharesSold] = data as [
      bigint,
      bigint,
      `0x${string}`,
      string,
      bigint,
    ];
    property = { supply, pricePerShare, issuer, metadataURI, sharesSold };
  }
  return { property, refetch, isLoading };
}

/** A user's share balance for a property. */
export function useShareBalance(id: number, address?: string) {
  const addr = asAddr(address);
  const { data, refetch } = useReadContract({
    ...propertyShares,
    functionName: "balanceOf",
    args: addr ? [addr, BigInt(id)] : undefined,
    query: { enabled: !!addr },
  });
  return { balance: (data as bigint | undefined) ?? 0n, refetch };
}

/** Rent a user can currently claim for a property. */
export function useClaimable(id: number, address?: string) {
  const addr = asAddr(address);
  const { data, refetch } = useReadContract({
    ...propertyShares,
    functionName: "claimable",
    args: addr ? [BigInt(id), addr] : undefined,
    query: { enabled: !!addr, refetchInterval: 10_000 },
  });
  return { claimable: (data as bigint | undefined) ?? 0n, refetch };
}

export type Holding = {
  id: number;
  balance: bigint;
  claimable: bigint;
  pricePerShare: bigint;
};

/** Batched balance + claimable + price across all properties for one address. */
export function usePortfolio(address: string | undefined, count: number) {
  const addr = asAddr(address);
  const { data, refetch } = useReadContracts({
    contracts: Array.from({ length: count }).flatMap((_, i) => [
      { ...propertyShares, functionName: "balanceOf" as const, args: [addr!, BigInt(i)] as const },
      { ...propertyShares, functionName: "claimable" as const, args: [BigInt(i), addr!] as const },
      { ...propertyShares, functionName: "properties" as const, args: [BigInt(i)] as const },
    ]),
    query: { enabled: !!addr && count > 0, refetchInterval: 12_000 },
  });

  const holdings: Holding[] = [];
  if (data) {
    for (let i = 0; i < count; i++) {
      const bal = data[i * 3];
      const claim = data[i * 3 + 1];
      const prop = data[i * 3 + 2];
      const balance = bal?.status === "success" ? (bal.result as bigint) : 0n;
      const claimable = claim?.status === "success" ? (claim.result as bigint) : 0n;
      const pricePerShare =
        prop?.status === "success"
          ? ((prop.result as [bigint, bigint, string, string, bigint])[1] as bigint)
          : 0n;
      if (balance > 0n || claimable > 0n) {
        holdings.push({ id: i, balance, claimable, pricePerShare });
      }
    }
  }
  return { holdings, refetch };
}

/** All marketplace listings (active and filled). */
export function useListings() {
  const { data: countData, refetch: refetchCount } = useReadContract({
    ...marketplace,
    functionName: "listingCount",
  });
  const n = countData ? Number(countData) : 0;

  const { data, refetch: refetchListings } = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      ...marketplace,
      functionName: "listings" as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: n > 0 },
  });

  const listings: Listing[] = (data ?? [])
    .map((res, i) => {
      if (res.status !== "success" || !res.result) return null;
      const [seller, propertyId, amountRemaining, pricePerShare, active] =
        res.result as [`0x${string}`, bigint, bigint, bigint, boolean];
      return { id: i, seller, propertyId, amountRemaining, pricePerShare, active };
    })
    .filter((l): l is Listing => l !== null);

  const refetch = () => {
    refetchCount();
    refetchListings();
  };

  return { listings, refetch };
}
