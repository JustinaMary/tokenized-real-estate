import "server-only";

export type KycType = "kyc" | "kyb";

export type VerificationInput = {
  address: string;
  type: KycType;
  fields: Record<string, unknown>;
};

export type VerificationResult = { approved: boolean; reason?: string };

export interface KycProvider {
  readonly name: string;
  verify(input: VerificationInput): Promise<VerificationResult>;
}

/**
 * Demo provider: auto-approves without collecting real PII. Stands in for a
 * regulated provider's sandbox so the full on-chain flow is demoable.
 */
class MockProvider implements KycProvider {
  readonly name = "mock";
  async verify(input: VerificationInput): Promise<VerificationResult> {
    // Minimal sanity checks so the form isn't entirely free-form.
    if (!input.fields || Object.keys(input.fields).length === 0) {
      return { approved: false, reason: "Missing verification details" };
    }
    return { approved: true };
  }
}

/**
 * Brale provider stub. Brale is a regulated stablecoin issuer with KYC/KYB APIs
 * documented on Monad (docs.brale.xyz). Wire the real sandbox calls here when
 * BRALE_API_KEY is present; until then we never reach this path.
 */
class BraleProvider implements KycProvider {
  readonly name = "brale";
  constructor(private readonly apiKey: string) {}
  async verify(): Promise<VerificationResult> {
    // TODO: POST to Brale's KYC/KYB endpoint, then map the result. Real Brale is
    // async (webhook-driven); for now treat presence of a key as "pending → not
    // yet approved" so we don't fake a regulated decision.
    void this.apiKey;
    return { approved: false, reason: "Brale verification pending (async)" };
  }
}

/** Selects Brale when configured, otherwise the mock provider. */
export function getKycProvider(): KycProvider {
  const key = process.env.BRALE_API_KEY;
  if (key) return new BraleProvider(key);
  return new MockProvider();
}
