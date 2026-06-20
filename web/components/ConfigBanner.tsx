import { isConfigured } from "@/lib/contracts";

/** Renders a setup notice until contract addresses are wired into env. */
export function ConfigBanner() {
  if (isConfigured) return null;
  return (
    <div className="mx-auto max-w-6xl px-6 pt-6">
      <div className="rounded-card border border-gold/30 bg-gold/5 px-5 py-4 text-sm">
        <div className="font-medium text-gold">Contracts not configured yet</div>
        <p className="mt-1 text-fg-muted">
          Deploy the contracts to Monad testnet and set{" "}
          <code className="tabular text-fg">NEXT_PUBLIC_MOCK_USDC_ADDRESS</code>,{" "}
          <code className="tabular text-fg">NEXT_PUBLIC_PROPERTY_SHARES_ADDRESS</code>, and{" "}
          <code className="tabular text-fg">NEXT_PUBLIC_MARKETPLACE_ADDRESS</code> in{" "}
          <code className="tabular text-fg">web/.env.local</code>. On-chain reads and
          actions activate once set. See <code className="tabular text-fg">README.md</code>.
        </p>
      </div>
    </div>
  );
}
