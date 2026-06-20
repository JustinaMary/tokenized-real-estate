"use client";

import Link from "next/link";
import { useProperties } from "@/lib/useProperties";
import { usePropertyCount } from "@/lib/useChain";
import { PropertyCard } from "@/components/PropertyCard";
import { ConfigBanner } from "@/components/ConfigBanner";
import { Button, Card, Skeleton } from "@/components/ui";

export default function MarketplacePage() {
  const { data: properties, isLoading } = useProperties();
  const { count } = usePropertyCount();

  const totalValue =
    properties?.reduce((sum, p) => sum + p.valuationUSD, 0) ?? 0;

  return (
    <>
      <ConfigBanner />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="max-w-2xl rise">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Real-world assets, fractionalized on Monad
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Own a piece of real estate.
            <br />
            <span className="text-accent">Earn the rent.</span>
          </h1>
          <p className="mt-4 text-lg text-fg-muted">
            Properties are divided into thousands of shares. Buy as little or as
            much as you like, collect your share of rental income, and trade
            anytime — all settled on-chain.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#properties">
              <Button>Browse properties</Button>
            </Link>
            <Link href="/faucet">
              <Button variant="outline">Get test funds</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-fg-faint">
              Properties listed
            </div>
            <div className="mt-1 text-2xl font-semibold tabular">
              {count || properties?.length || 0}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-fg-faint">
              Total asset value
            </div>
            <div className="mt-1 text-2xl font-semibold tabular text-accent">
              ${(totalValue / 1_000_000).toFixed(1)}M
            </div>
          </Card>
          <Card className="col-span-2 p-5 sm:col-span-1">
            <div className="text-xs uppercase tracking-wide text-fg-faint">
              Settlement
            </div>
            <div className="mt-1 text-2xl font-semibold">Monad</div>
            <div className="text-xs text-fg-muted">~400ms blocks · low fees</div>
          </Card>
        </div>
      </section>

      {/* Properties grid */}
      <section id="properties" className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Available properties</h2>
          <span className="text-sm text-fg-faint">Primary market</span>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties?.map((p) => (
              <div key={p.id} className="rise">
                <PropertyCard meta={p} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
