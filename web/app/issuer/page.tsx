"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { maxUint256 } from "viem";
import { mockUSDC, propertyShares } from "@/lib/contracts";
import { usePropertyCount } from "@/lib/useChain";
import { useProperties } from "@/lib/useProperties";
import { useUsdcAllowance } from "@/lib/useAllowance";
import { useTx } from "@/lib/useTx";
import { parseUSDC } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Button, Card, Field, Input } from "@/components/ui";
import { ConnectGate } from "@/components/actions";
import { ConfigBanner } from "@/components/ConfigBanner";

export default function IssuerPage() {
  const { address } = useAccount();
  const { count, refetch: refetchCount } = usePropertyCount();
  const { data: properties, refetch: refetchMeta } = useProperties();
  const { run, isBusy } = useTx();

  // Create property form
  const [form, setForm] = useState({
    title: "",
    location: "",
    description: "",
    image: "",
    valuationUSD: "",
    propertyType: "Residential",
    supply: "10000",
    price: "100",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onCreate() {
    const newId = count;
    const uri =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/properties/${newId}`
        : `property/${newId}`;
    const ok = await run(
      {
        ...propertyShares,
        functionName: "createProperty",
        args: [BigInt(form.supply || "0"), parseUSDC(form.price), uri],
      },
      { pending: "Creating property…", success: `Property #${newId} created` }
    );
    if (!ok) return;
    // Persist off-chain metadata (best-effort; needs DATABASE_URL).
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId,
          title: form.title,
          location: form.location,
          description: form.description,
          image: form.image || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=70",
          valuationUSD: Number(form.valuationUSD || 0),
          propertyType: form.propertyType,
        }),
      });
      if (!res.ok) toast("Property created on-chain; metadata not saved (no DB).", "info");
    } catch {
      /* ignore */
    }
    refetchCount();
    refetchMeta();
  }

  // Deposit rent form
  const { allowance, refetch: refetchAllowance } = useUsdcAllowance(
    address,
    propertyShares.address
  );
  const [rentId, setRentId] = useState("0");
  const [rentAmount, setRentAmount] = useState("");

  async function onDeposit() {
    const amount = parseUSDC(rentAmount);
    if (amount <= 0n) return;
    if (allowance < amount) {
      const ok = await run(
        { ...mockUSDC, functionName: "approve", args: [propertyShares.address, maxUint256] },
        { pending: "Approve mUSDC…", success: "Approved" }
      );
      if (!ok) return;
      await refetchAllowance();
    }
    const ok = await run(
      { ...propertyShares, functionName: "depositRent", args: [BigInt(rentId), amount] },
      { pending: "Depositing rent…", success: "Rent distributed to holders" }
    );
    if (ok) setRentAmount("");
  }

  const propertyOptions = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <ConfigBanner />
      <h1 className="text-2xl font-semibold">Issuer panel</h1>
      <p className="text-fg-muted">
        List new properties and distribute rental income. These actions are
        restricted to the contract owner on-chain.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Create property */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Create property</h2>
          <div className="space-y-3">
            <Field label="Title">
              <Input value={form.title} onChange={set("title")} placeholder="Sea-View Apartment" />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={set("location")} placeholder="Bandra West, Mumbai" />
            </Field>
            <Field label="Image URL">
              <Input value={form.image} onChange={set("image")} placeholder="https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total shares">
                <Input type="number" value={form.supply} onChange={set("supply")} />
              </Field>
              <Field label="Price / share (mUSDC)">
                <Input type="number" value={form.price} onChange={set("price")} />
              </Field>
            </div>
            <Field label="Valuation (USD)">
              <Input type="number" value={form.valuationUSD} onChange={set("valuationUSD")} placeholder="1000000" />
            </Field>
            <ConnectGate>
              <Button className="w-full" onClick={onCreate} loading={isBusy} disabled={!form.title}>
                Create property #{count}
              </Button>
            </ConnectGate>
          </div>
        </Card>

        {/* Deposit rent */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Deposit rent</h2>
          <div className="space-y-3">
            <Field label="Property" hint="Rent is split pro-rata across all shareholders.">
              <select
                value={rentId}
                onChange={(e) => setRentId(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-elev px-3 py-2.5 text-sm text-fg"
              >
                {propertyOptions.length === 0 && <option>No properties yet</option>}
                {propertyOptions.map((i) => {
                  const meta = properties?.find((p) => p.id === i);
                  return (
                    <option key={i} value={i}>
                      #{i} — {meta?.title ?? "Property"}
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="Rent amount (mUSDC)">
              <Input
                type="number"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <ConnectGate>
              <Button
                className="w-full"
                onClick={onDeposit}
                loading={isBusy}
                disabled={propertyOptions.length === 0 || !rentAmount}
              >
                {allowance < parseUSDC(rentAmount || "0") ? "Approve & Deposit" : "Deposit rent"}
              </Button>
            </ConnectGate>
          </div>
        </Card>
      </div>
    </div>
  );
}
