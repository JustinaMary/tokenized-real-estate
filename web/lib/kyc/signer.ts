import "server-only";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "@/lib/chain";
import { complianceRegistry } from "@/lib/contracts";
import type { KycType } from "./provider";

/**
 * Server-side signer holding VERIFIER_ROLE on the ComplianceRegistry. Funded
 * with MON for gas. Never exposed to the client (VERIFIER_PRIVATE_KEY has no
 * NEXT_PUBLIC_ prefix).
 */
function getVerifierClient() {
  const pk = process.env.VERIFIER_PRIVATE_KEY;
  if (!pk) return null;
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
  );
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  }).extend(publicActions);
}

export function isSignerConfigured(): boolean {
  return !!process.env.VERIFIER_PRIVATE_KEY && complianceRegistry.address.length === 42;
}

/** Write a verification result on-chain and wait for the receipt. */
export async function writeVerification(
  address: string,
  type: KycType
): Promise<`0x${string}`> {
  const client = getVerifierClient();
  if (!client) throw new Error("VERIFIER_PRIVATE_KEY not configured");

  const hash = await client.writeContract({
    address: complianceRegistry.address,
    abi: complianceRegistry.abi,
    functionName: type === "kyb" ? "setKyb" : "setKyc",
    args: [address as `0x${string}`, true],
  });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}
