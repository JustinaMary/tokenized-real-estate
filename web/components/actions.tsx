"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { maxUint256 } from "viem";
import { mockUSDC, propertyShares, marketplace } from "@/lib/contracts";
import { useTx } from "@/lib/useTx";
import { useUsdcAllowance, useIsApprovedForAll } from "@/lib/useAllowance";
import { useCompliance } from "@/lib/useCompliance";
import { formatUSDC, parseUSDC } from "@/lib/format";
import { Button, Input, Field } from "./ui";
import type { OnchainProperty, Listing } from "@/lib/useChain";

/** Buy shares from the primary market. */
export function BuyPrimaryBox({
  id,
  property,
  onDone,
}: {
  id: number;
  property: OnchainProperty;
  onDone?: () => void;
}) {
  const { address } = useAccount();
  const { run, isBusy } = useTx();
  const { allowance, refetch } = useUsdcAllowance(address, propertyShares.address);
  const [amount, setAmount] = useState("10");

  const shares = BigInt(amount || "0");
  const cost = shares * property.pricePerShare;
  const remaining = property.supply - property.sharesSold;

  async function onBuy() {
    if (!address || shares <= 0n) return;
    if (allowance < cost) {
      const ok = await run(
        { ...mockUSDC, functionName: "approve", args: [propertyShares.address, maxUint256] },
        { pending: "Approve mUSDC…", success: "Approved" }
      );
      if (!ok) return;
      await refetch();
    }
    const ok = await run(
      { ...propertyShares, functionName: "buyPrimary", args: [BigInt(id), shares] },
      { pending: "Buying shares…", success: "Shares purchased" }
    );
    if (ok) {
      await refetch();
      onDone?.();
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Shares to buy" hint={`${remaining.toLocaleString()} shares remaining`}>
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <div className="flex items-center justify-between rounded-lg border border-border bg-bg-elev px-3 py-2.5 text-sm">
        <span className="text-fg-muted">Total cost</span>
        <span className="tabular font-semibold text-accent">{formatUSDC(cost)} mUSDC</span>
      </div>
      <VerifyGate>
        <Button className="w-full" onClick={onBuy} loading={isBusy} disabled={shares <= 0n || shares > remaining}>
          {allowance < cost ? "Approve & Buy" : "Buy shares"}
        </Button>
      </VerifyGate>
    </div>
  );
}

/** Claim accrued rent for a property. */
export function ClaimButton({
  id,
  claimable,
  onDone,
}: {
  id: number;
  claimable: bigint;
  onDone?: () => void;
}) {
  const { run, isBusy } = useTx();
  async function onClaim() {
    const ok = await run(
      { ...propertyShares, functionName: "claimRent", args: [BigInt(id)] },
      { pending: "Claiming rent…", success: "Rent claimed" }
    );
    if (ok) onDone?.();
  }
  return (
    <Button onClick={onClaim} loading={isBusy} disabled={claimable <= 0n}>
      Claim {formatUSDC(claimable)} mUSDC
    </Button>
  );
}

/** List shares for sale on the secondary market. */
export function ListSharesForm({
  id,
  balance,
  onDone,
}: {
  id: number;
  balance: bigint;
  onDone?: () => void;
}) {
  const { address } = useAccount();
  const { run, isBusy } = useTx();
  const { approved, refetch } = useIsApprovedForAll(
    propertyShares,
    address,
    marketplace.address
  );
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");

  async function onList() {
    const shares = BigInt(amount || "0");
    if (shares <= 0n || shares > balance) return;
    if (!approved) {
      const ok = await run(
        {
          ...propertyShares,
          functionName: "setApprovalForAll",
          args: [marketplace.address, true],
        },
        { pending: "Approve marketplace…", success: "Marketplace approved" }
      );
      if (!ok) return;
      await refetch();
    }
    const ok = await run(
      {
        ...marketplace,
        functionName: "list",
        args: [BigInt(id), shares, parseUSDC(price)],
      },
      { pending: "Creating listing…", success: "Listing created" }
    );
    if (ok) {
      setAmount("");
      setPrice("");
      onDone?.();
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Shares">
        <Input
          type="number"
          min={1}
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Price / share (mUSDC)">
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </Field>
      <Button onClick={onList} loading={isBusy} className="sm:mb-0">
        {approved ? "List" : "Approve & List"}
      </Button>
    </div>
  );
}

/** Buy from an existing listing (partial fill allowed). */
export function BuyListingButton({
  listing,
  onDone,
}: {
  listing: Listing;
  onDone?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { isVerified } = useCompliance(address);
  const { run, isBusy } = useTx();
  const { allowance, refetch } = useUsdcAllowance(address, marketplace.address);
  const [amount, setAmount] = useState("");

  async function onBuy() {
    const shares = BigInt(amount || "0");
    if (shares <= 0n || shares > listing.amountRemaining) return;
    const cost = shares * listing.pricePerShare;
    if (allowance < cost) {
      const ok = await run(
        { ...mockUSDC, functionName: "approve", args: [marketplace.address, maxUint256] },
        { pending: "Approve mUSDC…", success: "Approved" }
      );
      if (!ok) return;
      await refetch();
    }
    const ok = await run(
      { ...marketplace, functionName: "buy", args: [BigInt(listing.id), shares] },
      { pending: "Buying shares…", success: "Purchase complete" }
    );
    if (ok) {
      setAmount("");
      await refetch();
      onDone?.();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <Input
        type="number"
        min={1}
        placeholder={`max ${listing.amountRemaining}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-32"
      />
      {!isConnected ? (
        <span className="text-sm text-fg-faint">Connect wallet</span>
      ) : !isVerified ? (
        <Link href="/verify" className="text-sm text-gold hover:underline">
          Verify to buy
        </Link>
      ) : (
        <Button onClick={onBuy} loading={isBusy}>
          Buy
        </Button>
      )}
    </div>
  );
}

/** Cancel a listing (seller only). */
export function CancelListingButton({
  listingId,
  onDone,
}: {
  listingId: number;
  onDone?: () => void;
}) {
  const { run, isBusy } = useTx();
  async function onCancel() {
    const ok = await run(
      { ...marketplace, functionName: "cancel", args: [BigInt(listingId)] },
      { pending: "Cancelling…", success: "Listing cancelled" }
    );
    if (ok) onDone?.();
  }
  return (
    <Button variant="outline" onClick={onCancel} loading={isBusy}>
      Cancel
    </Button>
  );
}

/** Shows a connect prompt when the wallet is not connected. */
export function ConnectGate({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { isConnected } = useAccount();
  if (isConnected) return <>{children}</>;
  return (
    <div
      className={
        compact
          ? "text-sm text-fg-faint"
          : "rounded-lg border border-border bg-bg-elev px-4 py-3 text-center text-sm text-fg-muted"
      }
    >
      Connect your wallet to continue
    </div>
  );
}

/**
 * Gates an action behind wallet connection AND on-chain KYC/KYB verification.
 * Unverified users see a prompt linking to the verification flow.
 */
export function VerifyGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { isVerified } = useCompliance(address);

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-border bg-bg-elev px-4 py-3 text-center text-sm text-fg-muted">
        Connect your wallet to continue
      </div>
    );
  }
  if (!isVerified) {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-4 text-center">
        <p className="text-sm text-fg-muted">
          Identity verification is required to own property shares.
        </p>
        <Link href="/verify" className="mt-2 inline-block">
          <Button>Verify to invest</Button>
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
