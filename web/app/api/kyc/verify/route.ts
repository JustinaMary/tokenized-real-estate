import { NextResponse } from "next/server";
import { getKycProvider, type KycType } from "@/lib/kyc/provider";
import { writeVerification, isSignerConfigured } from "@/lib/kyc/signer";

export const dynamic = "force-dynamic";

type Body = {
  address?: string;
  type?: KycType;
  fields?: Record<string, unknown>;
};

/**
 * POST /api/kyc/verify
 * Runs the verification provider, then (on approval) writes the result on-chain
 * with the VERIFIER_ROLE signer. Frontend reads the resulting status on-chain.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const { address, type, fields } = body;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ ok: false, error: "Invalid address" }, { status: 400 });
  }
  if (type !== "kyc" && type !== "kyb") {
    return NextResponse.json({ ok: false, error: "type must be 'kyc' or 'kyb'" }, { status: 400 });
  }
  if (!isSignerConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Verifier not configured. Set VERIFIER_PRIVATE_KEY (funded with MON) and NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS.",
      },
      { status: 503 }
    );
  }

  const provider = getKycProvider();
  const result = await provider.verify({ address, type, fields: fields ?? {} });
  if (!result.approved) {
    return NextResponse.json(
      { ok: false, provider: provider.name, reason: result.reason ?? "Not approved" },
      { status: 200 }
    );
  }

  try {
    const txHash = await writeVerification(address, type);
    return NextResponse.json({ ok: true, provider: provider.name, txHash });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "On-chain write failed" },
      { status: 500 }
    );
  }
}
