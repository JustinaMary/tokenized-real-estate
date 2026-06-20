"use client";

import Link from "next/link";
import Image from "next/image";
import { usePropertyOnchain } from "@/lib/useChain";
import { isConfigured } from "@/lib/contracts";
import { formatUSDC, formatShares, percent } from "@/lib/format";
import { Badge, Card, ProgressBar, Skeleton } from "./ui";
import type { PropertyMeta } from "@/lib/properties";

export function PropertyCard({ meta }: { meta: PropertyMeta }) {
  const { property, isLoading } = usePropertyOnchain(meta.id);

  const sold = property ? property.sharesSold : 0n;
  const supply = property ? property.supply : 0n;
  const pct = property ? Number(percent(sold, supply)) : 0;

  return (
    <Link href={`/property/${meta.id}`} className="group block">
      <Card className="overflow-hidden transition-all group-hover:border-border-strong group-hover:-translate-y-0.5">
        <div className="relative h-44 w-full overflow-hidden bg-bg-elev">
          <Image
            src={meta.image}
            alt={meta.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute left-3 top-3">
            <Badge tone="gold">{meta.propertyType}</Badge>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-fg">{meta.title}</h3>
          <p className="text-sm text-fg-muted">{meta.location}</p>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs text-fg-faint">Price / share</div>
              {isConfigured && isLoading ? (
                <Skeleton className="mt-1 h-6 w-20" />
              ) : (
                <div className="tabular text-lg font-semibold text-accent">
                  {property ? formatUSDC(property.pricePerShare) : "—"}{" "}
                  <span className="text-xs text-fg-muted">mUSDC</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-fg-faint">Valuation</div>
              <div className="tabular text-sm text-fg">
                ${meta.valuationUSD.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-fg-muted">
              <span>{property ? `${formatShares(sold)} sold` : "—"}</span>
              <span className="tabular">{pct.toFixed(0)}%</span>
            </div>
            <ProgressBar value={pct} />
            <div className="mt-1 text-xs text-fg-faint">
              {property ? `${formatShares(supply)} total shares` : "Awaiting on-chain data"}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
