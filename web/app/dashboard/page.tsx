"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useProperties } from "@/lib/useProperties";
import { usePropertyCount, usePortfolio, useListings } from "@/lib/useChain";
import { formatUSDC, formatShares } from "@/lib/format";
import { Card, Stat, Button } from "@/components/ui";
import { ClaimButton, CancelListingButton } from "@/components/actions";
import { ConfigBanner } from "@/components/ConfigBanner";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: properties } = useProperties();
  const { count } = usePropertyCount();
  const { holdings, refetch } = usePortfolio(address, count);
  const { listings, refetch: refetchListings } = useListings();

  const myListings = address
    ? listings.filter((l) => l.active && l.seller.toLowerCase() === address.toLowerCase())
    : [];

  const metaFor = (id: number) => properties?.find((p) => p.id === id);

  const totalValue = holdings.reduce((s, h) => s + h.balance * h.pricePerShare, 0n);
  const totalClaimable = holdings.reduce((s, h) => s + h.claimable, 0n);

  const refreshAll = () => {
    refetch();
    refetchListings();
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ConfigBanner />
      <h1 className="text-2xl font-semibold">Investor dashboard</h1>
      <p className="text-fg-muted">Your holdings, rental income, and listings.</p>

      {!isConnected ? (
        <Card className="mt-8 p-10 text-center text-fg-muted">
          Connect your wallet to view your portfolio.
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-6">
              <Stat label="Portfolio value" value={`${formatUSDC(totalValue)} mUSDC`} />
            </Card>
            <Card className="p-6">
              <Stat
                label="Total claimable rent"
                value={<span className="text-accent">{formatUSDC(totalClaimable)} mUSDC</span>}
              />
            </Card>
            <Card className="p-6">
              <Stat label="Properties held" value={holdings.length} />
            </Card>
          </div>

          {/* Holdings */}
          <h2 className="mt-10 mb-3 text-lg font-semibold">Your holdings</h2>
          {holdings.length === 0 ? (
            <Card className="p-10 text-center text-fg-muted">
              You don&apos;t own any shares yet.{" "}
              <Link href="/" className="text-accent hover:underline">
                Browse properties →
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {holdings.map((h) => {
                const meta = metaFor(h.id);
                return (
                  <Card key={h.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="min-w-40">
                      <Link href={`/property/${h.id}`} className="font-medium hover:text-accent">
                        {meta?.title ?? `Property #${h.id}`}
                      </Link>
                      <div className="text-sm text-fg-muted">{meta?.location}</div>
                    </div>
                    <Stat label="Shares" value={formatShares(h.balance)} />
                    <Stat label="Value" value={`${formatUSDC(h.balance * h.pricePerShare)}`} sub="mUSDC" />
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-fg-faint">Claimable</div>
                        <div className="tabular text-accent">{formatUSDC(h.claimable)}</div>
                      </div>
                      <ClaimButton id={h.id} claimable={h.claimable} onDone={refreshAll} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* My listings */}
          <h2 className="mt-10 mb-3 text-lg font-semibold">Your active listings</h2>
          {myListings.length === 0 ? (
            <Card className="p-8 text-center text-sm text-fg-muted">
              No active listings. Open a property and use “Sell shares” to list.
            </Card>
          ) : (
            <div className="space-y-2">
              {myListings.map((l) => {
                const meta = metaFor(Number(l.propertyId));
                return (
                  <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="text-sm">
                      <div className="font-medium">{meta?.title ?? `Property #${l.propertyId}`}</div>
                      <div className="tabular text-fg-muted">
                        {formatShares(l.amountRemaining)} shares · {formatUSDC(l.pricePerShare)} mUSDC/share
                      </div>
                    </div>
                    <CancelListingButton listingId={l.id} onDone={refreshAll} />
                  </Card>
                );
              })}
            </div>
          )}

          {/* Activity */}
          <h2 className="mt-10 mb-3 text-lg font-semibold">Recent activity</h2>
          <ActivityFeed />
        </>
      )}
    </div>
  );
}
