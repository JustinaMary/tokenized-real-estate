# On-chain KYC/KYB Compliance — Design

**Date:** 2026-06-20
**Extends:** [2026-06-20-tokenized-real-estate-design.md](2026-06-20-tokenized-real-estate-design.md)

## Summary

Gate share ownership to identity-verified addresses. A `ComplianceRegistry`
(ERC-3643-style allowlist) tracks KYC (individuals) and KYB (businesses); a
`VERIFIER` role writes results after verification. `PropertyShares` enforces it
on every transfer, so primary buys and secondary trades are both gated at the
token level. A provider-agnostic backend runs a mock verification now and swaps
to Brale's real API later. Built before any deploy, so there's no migration cost.

## Decisions

| Decision | Choice |
|----------|--------|
| Enforcement | On-chain allowlist checked in `PropertyShares._update` |
| KYC vs KYB | Tracked separately in the registry |
| Verify flow | Mock provider + backend signer (`VERIFIER_ROLE`) writes on-chain |
| Provider | Brale primary (documented on Monad); provider-agnostic, mock now |
| Gating scope | Transfers/receipt only — claiming rent and exiting stay open |

## Contracts

### ComplianceRegistry.sol (new)
- OpenZeppelin `AccessControl`: `DEFAULT_ADMIN_ROLE` (deployer/owner), `VERIFIER_ROLE`.
- State: `mapping(address => bool) kycVerified`, `mapping(address => bool) kybVerified`.
- `setKyc(address,bool)`, `setKyb(address,bool)`, and batch `setKycBatch(address[],bool)` — `VERIFIER_ROLE` only.
- `isVerified(address) → bool` = `kycVerified[a] || kybVerified[a]` (allowed to hold shares).
- Events: `KycSet(addr,status)`, `KybSet(addr,status)`.

### PropertyShares.sol (modify)
- Constructor gains `address registry_` → immutable `IComplianceRegistry registry`.
- In `_update`: when crediting an address (`to != address(0)`), `require(registry.isVerified(to))` (custom error `NotVerified`). `from`/burns unaffected → exits and rent claims stay open.
- Consequence: `createProperty` mints to the issuer, so the issuer must be verified first. The deploy script verifies the deployer.

### Marketplace.sol
- No change. `buy()` moves shares via `PropertyShares`, so an unverified buyer reverts in `_update`.

## Backend (Next.js API routes + server signer)

- `lib/kyc/provider.ts` — `KycProvider` interface; `MockProvider` (auto-approves, no real PII); `BraleProvider` stub guarded by `BRALE_API_KEY`.
- `lib/kyc/signer.ts` — server-only viem wallet client from `VERIFIER_PRIVATE_KEY` on Monad testnet; helpers `verifyKyc(addr)`, `verifyKyb(addr)` calling the registry.
- `POST /api/kyc/verify` — body `{ address, type: 'kyc'|'kyb', fields }`. Runs the provider, then the signer writes `setKyc`/`setKyb`, waits for the receipt, returns `{ ok, txHash }`. Returns 503 if `VERIFIER_PRIVATE_KEY` is unset.
- Status is read **on-chain** by the frontend (no status route needed).

## Frontend

- `lib/contracts.ts` — add `complianceRegistry` (`NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS`).
- `lib/useCompliance.ts` — `useCompliance(address)` → `{ kyc, kyb, isVerified }` from the registry.
- `components/VerifyGate.tsx` — wraps gated actions; unverified → "Verify to invest" CTA → verification panel.
- `app/verify/page.tsx` — KYC (individual) and KYB (business) mock forms; submits to `/api/kyc/verify`; polls on-chain status to "Verified".
- Header/dashboard: verification badge.
- `BuyPrimaryBox` and `ListSharesForm` wrapped in `VerifyGate`.

## Config (env)

| Var | Scope | Purpose |
|-----|-------|---------|
| `NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS` | public | registry address |
| `VERIFIER_PRIVATE_KEY` | server-only | signer with `VERIFIER_ROLE`, funded with MON |
| `BRALE_API_KEY` | server-only | optional; switches MockProvider → Brale |

## Testing

Foundry: registry role gating (only verifier can set), `isVerified` logic;
PropertyShares reverts unverified `buyPrimary`/transfer, allows verified, allows
rent claim + exit while unverified-as-recipient is blocked; deploy verifies issuer.

## Build order

ComplianceRegistry (TDD) → PropertyShares gating (TDD) → deploy script + regen ABIs →
backend provider/signer/route → frontend hooks + verify flow + VerifyGate → build-verify.

## Out of scope

Real PII handling, sanctions/AML screening, document storage, on-chain identity
claims/attestations beyond a boolean, accredited-investor limits.
