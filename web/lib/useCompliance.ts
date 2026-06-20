"use client";

import { useReadContract } from "wagmi";
import { complianceRegistry } from "./contracts";

/** Reads an address's KYC/KYB status from the on-chain ComplianceRegistry. */
export function useCompliance(address?: string) {
  const addr = address ? (address as `0x${string}`) : undefined;
  const enabled = !!addr && complianceRegistry.address.length === 42;

  const { data: kyc, refetch: refetchKyc } = useReadContract({
    ...complianceRegistry,
    functionName: "kycVerified",
    args: addr ? [addr] : undefined,
    query: { enabled, refetchInterval: 8000 },
  });
  const { data: kyb, refetch: refetchKyb } = useReadContract({
    ...complianceRegistry,
    functionName: "kybVerified",
    args: addr ? [addr] : undefined,
    query: { enabled, refetchInterval: 8000 },
  });

  return {
    kyc: Boolean(kyc),
    kyb: Boolean(kyb),
    isVerified: Boolean(kyc) || Boolean(kyb),
    refetch: () => {
      refetchKyc();
      refetchKyb();
    },
  };
}
