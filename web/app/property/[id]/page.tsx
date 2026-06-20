"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useProperties } from "@/lib/useProperties";
import {
  usePropertyOnchain,
  useShareBalance,
  useClaimable,
  useListings,
} from "@/lib/useChain";
import { formatUSDC, formatShares, percent } from "@/lib/format";
import { Badge, Card, ProgressBar, Stat, Skeleton } from "@/components/ui";
import {
  BuyPrimaryBox,
  ClaimButton,
  ListSharesForm,
  BuyListingButton,
  CancelListingButton,
} from "@/components/actions";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { address } = useAccount();

  const { data: properties } = useProperties();
  const meta = properties?.find((p) => p.id === id);

  const { property, refetch } = usePropertyOnchain(id);
  const { balance, refetch: refetchBal } = useShareBalance(id, address);
  const { claimable, refetch: refetchClaim } = useClaimable(id, address);
  const { listings, refetch: refetchListings } = useListings();

  const propertyListings = listings.filter(
    (l) => l.active && Number(l.propertyId) === id
  );

  const refreshAll = () => {
    refetch();
    refetchBal();
    refetchClaim();
    refetchListings();
  };

  if (!meta) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  const sold = property?.sharesSold ?? 0n;
  const supply = property?.supply ?? 0n;
  const pct = property ? Number(percent(sold, supply)) : 0;
  const ownership = property && supply > 0n ? percent(balance, supply) : "0";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/" className="text-sm text-fg-muted hover:text-fg">
        ← Back to marketplace
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: details */}
        <div>
          <div className="relative h-72 w-full overflow-hidden rounded-card border border-border bg-bg-elev">
            <Image
              src={meta.image}
              alt={meta.title}
              fill
              sizes="(max-width: 1024px) 100vw, 700px"
              className="object-cover"
              unoptimized
            />
            <div className="absolute left-4 top-4">
              <Badge tone="gold">{meta.propertyType}</Badge>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-2xl font-semibold">{meta.title}</h1>
            <p className="text-fg-muted">{meta.location}</p>
            <p className="mt-4 leading-relaxed text-fg-muted">{meta.description}</p>
          </div>

          <Card className="mt-6 grid grid-cols-2 gap-5 p-6 sm:grid-cols-4">
            <Stat label="Valuation" value={`$${(meta.valuationUSD / 1e6).toFixed(1)}M`} />
            <Stat
              label="Price / share"
              value={property ? formatUSDC(property.pricePerShare) : "—"}
              sub="mUSDC"
            />
            <Stat label="Total shares" value={property ? formatShares(supply) : "—"} />
            <Stat label="Shares sold" value={property ? `${pct.toFixed(0)}%` : "—"} />
          </Card>

          <div className="mt-4">
            <ProgressBar value={pct} />
          </div>

          {/* Secondary market listings */}
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Secondary market</h2>
            {propertyListings.length === 0 ? (
              <Card className="p-6 text-sm text-fg-muted">
                No active listings for this property yet. Holders can list shares
                from their dashboard.
              </Card>
            ) : (
              <div className="space-y-2">
                {propertyListings.map((l) => (
                  <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="text-sm">
                      <div className="tabular font-medium">
                        {formatShares(l.amountRemaining)} shares
                      </div>
                      <div className="text-fg-muted tabular">
                        {formatUSDC(l.pricePerShare)} mUSDC / share
                      </div>
                    </div>
                    {address && l.seller.toLowerCase() === address.toLowerCase() ? (
                      <CancelListingButton listingId={l.id} onDone={refreshAll} />
                    ) : (
                      <BuyListingButton listing={l} onDone={refreshAll} />
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Invest</h2>
            {property ? (
              <BuyPrimaryBox id={id} property={property} onDone={refreshAll} />
            ) : (
              <Skeleton className="h-40" />
            )}
          </Card>

          {address && balance > 0n && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Your position</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Stat label="Your shares" value={formatShares(balance)} />
                <Stat label="Ownership" value={`${ownership}%`} />
              </div>
              <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-bg-elev px-4 py-3">
                <div>
                  <div className="text-xs text-fg-faint">Claimable rent</div>
                  <div className="tabular font-semibold text-accent">
                    {formatUSDC(claimable)} mUSDC
                  </div>
                </div>
                <ClaimButton id={id} claimable={claimable} onDone={refreshAll} />
              </div>

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-fg-muted">Sell shares</h3>
                <ListSharesForm id={id} balance={balance} onDone={refreshAll} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
