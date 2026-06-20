# Terra — Tokenized Real Estate on Monad

Fractional ownership of real estate, settled on **Monad testnet**. A property is
divided into thousands of shares; investors buy shares with a mock USDC
stablecoin, earn a proportional cut of rental income, and trade shares on a
fixed-price marketplace.

> Monad Blitz Mumbai submission. Built with the `monskill` stack.

## What it does

- **Tokenize** a property as an ERC-1155 token with a fixed share supply.
- **Invest** — buy shares from the primary market with mUSDC.
- **Earn rent** — the issuer deposits rental income; holders claim their
  pro-rata share (gas-safe pull-based dividends).
- **Trade** — list and buy shares on an escrow-less fixed-price marketplace
  (partial fills supported).
- **Dashboard** — portfolio value, claimable rent, and active listings.

## Architecture

| Layer | Tech |
|-------|------|
| Contracts | Solidity + Foundry + OpenZeppelin → Monad testnet (10143) |
| Off-chain backend | Next.js API routes → Neon Postgres (static seed fallback) |
| Frontend | Next.js 16 (App Router) + Wagmi v3 + viem + Tailwind v4 |
| Hosting | Vercel (web) · Neon (DB) · Monad testnet (contracts) |

```
contracts/   Foundry project — MockUSDC, PropertyShares, Marketplace (+ tests)
web/         Next.js app — UI + API routes
docs/        Design spec
```

### Contracts

- **MockUSDC** — ERC-20 (6 decimals) test stablecoin with a public `faucet()`.
- **PropertyShares** — ERC-1155; one token id per property. Pull-based rent
  dividends via an `accRentPerShare` accumulator, with `_update` overridden to
  checkpoint rent on every transfer so trading and rent accrual stay correct.
- **Marketplace** — escrow-less fixed-price listings with partial fills; shares
  stay in the seller's wallet (approved via `setApprovalForAll`) and move
  directly seller → buyer on fill.

22 Foundry tests cover supply caps, rent math, rent conservation across
transfers, and marketplace fills/cancels.

## Quick start

### 1. Contracts — test

```bash
cd contracts
forge test
```

### 2. Contracts — deploy to Monad testnet

You need a testnet private key funded with MON (from https://faucet.monad.xyz).

```bash
cd contracts
export MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz
forge script script/Deploy.s.sol \
  --rpc-url $MONAD_TESTNET_RPC_URL \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The script prints the three deployed addresses. (For multisig/agent-wallet
deployment, see the `monskill` `wallet/` skill.)

### 3. Verify (all explorers, one call)

```bash
forge verify-contract <ADDR> src/PropertyShares.sol:PropertyShares \
  --chain 10143 --show-standard-json-input > /tmp/standard-input.json
# then POST to https://agents.devnads.com/v1/verify (see monskill scaffold skill)
```

### 4. Frontend

```bash
cd web
cp .env.example .env.local   # paste the deployed addresses
npm install
npm run dev
```

Open http://localhost:3000, connect a wallet (MetaMask/Rabby on Monad testnet),
mint mUSDC from the **Faucet**, then invest.

## Configuration

`web/.env.local`:

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | deployed MockUSDC |
| `NEXT_PUBLIC_PROPERTY_SHARES_ADDRESS` | deployed PropertyShares |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | deployed Marketplace |
| `NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS` | deployed ComplianceRegistry |
| `NEXT_PUBLIC_MONAD_TESTNET_RPC_URL` | RPC (optional) |
| `DATABASE_URL` | Neon Postgres (optional — falls back to a static seed) |
| `VERIFIER_PRIVATE_KEY` | server-only; signer with `VERIFIER_ROLE`, funded with MON |
| `BRALE_API_KEY` | server-only; optional, swaps mock KYC → Brale |

The app runs fully without a database: property metadata falls back to a static
seed keyed by token id. Connect Neon to persist issuer-created properties.

## Deploy to Vercel

Import `web/` as a Vercel project. Set the env vars above (and add a Neon
integration for `DATABASE_URL`). The Next.js API routes deploy as serverless
functions — no separate backend.

## Auth: email / social / passkey (Para)

Para is **already wired in** ([app/providers-para.tsx](web/app/providers-para.tsx),
[components/ParaConnectButton.tsx](web/components/ParaConnectButton.tsx)) with
Monad testnet on `externalWalletConfig`. It activates automatically once a Para
API key is present; without one the app falls back to injected-wallet connect, so
it always runs.

To switch on email/social/passkey sign-in:

```bash
npm install -g @getpara/cli
para login                 # browser OAuth — only you can complete this
cd web && para init --no-input
para keys create -n terra-dev --display-name "Terra (dev)"
# put the PUBLIC key in web/.env.local:
#   NEXT_PUBLIC_PARA_API_KEY=<public-key>
para doctor                # verify the integration
npm run dev
```

The header button becomes **Sign in** and opens the Para modal (Google, Apple,
Discord, X, Facebook, Farcaster, email, passkey, or external wallet).

## Compliance: KYC / KYB

Share ownership is gated on-chain. `ComplianceRegistry` is an identity allowlist
(ERC-3643-style) tracking KYC (individuals) and KYB (businesses); `PropertyShares`
checks it in `_update`, so **both primary buys and secondary trades require a
verified recipient** — enforced at the token level, not just in the UI. Claiming
rent and selling/exiting stay open.

Flow: a user submits the `/verify` form → `POST /api/kyc/verify` runs a provider
→ on approval, a backend signer (`VERIFIER_ROLE`) writes the result on-chain →
the frontend reads status from the registry and unlocks investing.

- **Provider:** mock by default (no real PII); set `BRALE_API_KEY` to switch to
  Brale (regulated KYC/KYB + stablecoins, documented on Monad). The
  `lib/kyc/provider.ts` interface lets any provider (TransFi, Banxa, zerohash…)
  slot in.
- **Setup:** set `VERIFIER_PRIVATE_KEY` (use the deployer key for the demo; it
  already holds `VERIFIER_ROLE` and is verified by the deploy script) and
  `NEXT_PUBLIC_COMPLIANCE_REGISTRY_ADDRESS`. Keep the verifier key funded with MON.

## AI copilot

A floating **Claude-powered copilot** ([components/AgentWidget.tsx](web/components/AgentWidget.tsx),
[app/api/agent/chat](web/app/api/agent/chat/route.ts)) reads the connected
user's on-chain portfolio + property data and answers questions, recommends
properties, and **proposes actions** (buy, claim rent, list) that the user
confirms and signs in their own wallet — the agent never holds keys.

- Model: `claude-opus-4-8` via the Anthropic SDK, with tool-use for structured
  action proposals executed through the existing wagmi flows.
- Set `ANTHROPIC_API_KEY` (server-only) to enable it; without it the widget
  shows a "not configured" message and the rest of the app is unaffected.

## Roadmap

- Envio HyperIndex activity feed, IPFS metadata pinning, permissioned
  multi-issuer support.

_Demo only — not investment advice._
