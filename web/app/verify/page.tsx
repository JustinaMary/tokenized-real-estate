"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useCompliance } from "@/lib/useCompliance";
import { toast } from "@/lib/toast";
import { recordActivity } from "@/lib/activity";
import { Button, Card, Field, Input, Badge, Spinner } from "@/components/ui";
import { ConfigBanner } from "@/components/ConfigBanner";

type Tab = "kyc" | "kyb";

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { kyc, kyb, isVerified, refetch } = useCompliance(address);
  const [tab, setTab] = useState<Tab>("kyc");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!address) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, type: tab, fields: form }),
      });
      const data = await res.json();
      if (data.ok) {
        toast(`${tab.toUpperCase()} verification approved`, "success");
        if (data.txHash && address) {
          recordActivity(address, {
            type: "kyc",
            title: `${tab.toUpperCase()} verification approved`,
            txHash: data.txHash,
          });
        }
        refetch();
      } else {
        toast(data.reason ?? data.error ?? "Verification failed", "error");
      }
    } catch {
      toast("Verification request failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <ConfigBanner />
      <h1 className="text-2xl font-semibold">Identity verification</h1>
      <p className="text-fg-muted">
        Property shares are restricted to verified participants. Complete KYC (as
        an individual) or KYB (as a business) to invest.
      </p>

      {/* Status */}
      <Card className="mt-6 flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-fg-faint">Your status</div>
          <div className="mt-1 flex gap-2">
            {isVerified ? (
              <>
                {kyc && <Badge tone="accent">KYC verified</Badge>}
                {kyb && <Badge tone="accent">KYB verified</Badge>}
              </>
            ) : (
              <Badge>Not verified</Badge>
            )}
          </div>
        </div>
        {isVerified && (
          <Link href="/">
            <Button variant="outline">Start investing →</Button>
          </Link>
        )}
      </Card>

      {!isConnected ? (
        <Card className="mt-6 p-10 text-center text-fg-muted">
          Connect your wallet to begin verification.
        </Card>
      ) : (
        <Card className="mt-6 p-6">
          {/* Tabs */}
          <div className="mb-5 inline-flex rounded-lg border border-border p-1">
            {(["kyc", "kyb"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
                  tab === t ? "bg-bg-elev text-fg" : "text-fg-muted"
                }`}
              >
                {t === "kyc" ? "Individual (KYC)" : "Business (KYB)"}
              </button>
            ))}
          </div>

          {tab === "kyc" ? (
            <div className="space-y-3">
              <Field label="Full legal name">
                <Input value={form.fullName ?? ""} onChange={set("fullName")} placeholder="Jane Doe" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <Input value={form.country ?? ""} onChange={set("country")} placeholder="India" />
                </Field>
                <Field label="Date of birth">
                  <Input value={form.dob ?? ""} onChange={set("dob")} placeholder="1990-01-01" />
                </Field>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Legal business name">
                <Input value={form.businessName ?? ""} onChange={set("businessName")} placeholder="Acme Holdings Pvt Ltd" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Registration number">
                  <Input value={form.regNumber ?? ""} onChange={set("regNumber")} placeholder="U12345MH2020PTC000000" />
                </Field>
                <Field label="Country of incorporation">
                  <Input value={form.country ?? ""} onChange={set("country")} placeholder="India" />
                </Field>
              </div>
            </div>
          )}

          <Button className="mt-5 w-full" onClick={submit} loading={submitting} disabled={submitting}>
            {submitting ? "Verifying…" : `Submit ${tab.toUpperCase()}`}
          </Button>

          <p className="mt-3 flex items-center gap-2 text-xs text-fg-faint">
            {submitting && <Spinner className="h-3 w-3" />}
            Demo verification — no real documents are collected. A regulated
            provider (e.g. Brale) plugs in here for production.
          </p>
        </Card>
      )}
    </div>
  );
}
