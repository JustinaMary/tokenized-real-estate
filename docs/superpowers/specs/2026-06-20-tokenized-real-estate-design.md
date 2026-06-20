# Tokenized Real Estate Platform (RWA Marketplace) — Design

**Date:** 2026-06-20
**Event:** Monad Blitz Mumbai hackathon
**Network:** Monad testnet (chainId `10143`)
**Skill basis:** `monskill` scaffold (Foundry + OpenZeppelin, Next.js + shadcn + Wagmi v3, Para auth, Neon Postgres + IPFS)

## 1. Summary

Fractional ownership of real estate. A property is divided into a fixed supply of
shares (e.g. 10,000). Investors buy shares with a mock USDC stablecoin, receive a
proportional cut of rental income, and trade shares with one another on a
fixed-price marketplace — all on Monad.

Each property is an **ERC-1155 token ID** with a fixed share supply. Rental income is
distributed via a **pull-based dividend** accumulator. A **fixed-price listing
marketplace** handles secondary trading. Rich metadata and user data live
**off-chain** (Postgres + IPFS); the chain holds only ownership, rent accounting,
and listings.

## 2. Core decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Token model | ERC-1155 multi-property (one contract, one token ID per property, fixed supply) | Single deploy, clean rent + marketplace logic, best hackathon demo |
| Rent distribution | Pull-based claims (`accRentPerShare` accumulator) | Gas-safe at any holder count; standard dividend pattern |
| Marketplace | Fixed-price listings with partial fills | Fully on-chain, simple, easy to demo |
| Payment currency | Mock USDC (ERC-20, 6 decimals, faucet) | Prices read like real money; one currency across primary sale + rent + marketplace |
| Off-chain storage | Neon Postgres + IPFS | Postgres for records/profiles/watchlists; IPFS for metadata JSON + images |
| Auth / registration | Para embedded wallet (email / social / passkey) | Sign-up + login with no seed phrase |
| Cross-chain bridges | Out of scope | Faucet funds everything; testnet bridge support is unreliable |
| Issuer / admin | Contract owner (deployer) | Cleanest demo control; opening to anyone is a one-line change |
| Indexer (Envio) | Stretch goal | MVP reads on-chain directly via Wagmi multicall |

## 3. Architecture

```
tokenized-real-estate/
├── contracts/        Foundry project (Solidity, OpenZeppelin)
│   └── src/
│       ├── MockUSDC.sol
│       ├── PropertyShares.sol
│       └── Marketplace.sol
├── web/              Next.js (App Router) + shadcn + Wagmi v3 + Para
│   ├── app/          Pages + API routes (Postgres access)
│   └── lib/          ABIs, addresses, contract hooks, db client
└── docs/             This spec + ADRs
```

What is on-chain vs off-chain:

- **On-chain (trust + value):** share ownership (ERC-1155 balances), rent accounting
  and claims, marketplace listings and settlement, mUSDC balances.
- **Off-chain (convenience):** property descriptions/valuation/location, images,
  user profiles, watchlists, search/filter/sort. Metadata JSON + images on IPFS,
  referenced by URI on-chain; relational/queryable data in Postgres.

## 4. Smart contracts

### 4.1 MockUSDC (ERC-20)

- OpenZeppelin `ERC20`; `decimals() = 6`.
- `faucet()` — mints a fixed test amount (e.g. 10,000 mUSDC) to the caller so demo
  users can fund themselves. (Optionally rate-limited per address; not required for MVP.)

### 4.2 PropertyShares (ERC-1155 + rent accounting)

State per property (token ID):
- `supply` (fixed total shares), `pricePerShare` (primary sale price in mUSDC),
  `issuer`, `metadataURI`, `sharesSold`.
- Rent dividend accounting: `accRentPerShare[id]` (scaled by 1e18),
  `rewardDebt[id][user]`, `pendingRent[id][user]`.

Functions:
- `createProperty(supply, pricePerShare, metadataURI)` — owner only (issuer). Returns new `id`.
- `buyPrimary(id, amount)` — pulls `amount * pricePerShare` mUSDC from buyer to issuer,
  mints `amount` shares to buyer. Reverts if `sharesSold + amount > supply`.
- `depositRent(id, amount)` — pulls `amount` mUSDC from caller; increases
  `accRentPerShare[id]` by `amount * 1e18 / supply`.
- `claimRent(id)` — settles caller's pending rent and transfers mUSDC.
- `claimable(id, user)` view — pending + newly-accrued rent, for the dashboard.
- **`_update` override** — before any balance change (mint/transfer/burn), settle
  accrued rent into `pendingRent` for every affected address and reset `rewardDebt`.
  This keeps rent correct across marketplace trades (no stranded or double-paid rent).

Built on: `ERC1155`, `Ownable`, `ReentrancyGuard`, `SafeERC20`.

### 4.3 Marketplace (fixed-price listings)

State: `listings[listingId] = { seller, propertyId, amountRemaining, pricePerShare, active }`.

Functions:
- `list(propertyId, amount, pricePerShare)` — records a listing. Requires seller has
  `setApprovalForAll(marketplace, true)` on PropertyShares.
- `cancel(listingId)` — seller only; marks inactive.
- `buy(listingId, amount)` — **partial fill**: pulls `amount * pricePerShare` mUSDC
  from buyer to seller, transfers `amount` shares seller→buyer, decrements
  `amountRemaining`; deactivates when it hits zero.
- View helpers to enumerate active listings (e.g. `listingCount` + per-id getter)
  so the UI can read them without an indexer.

Escrow-less: shares stay in the seller's wallet (held via `setApprovalForAll`) and
move directly seller→buyer on fill — no marketplace custody. `cancel` just flips
`active`. Built on: `ReentrancyGuard`, `SafeERC20`.

## 5. Off-chain data

**Postgres (Neon, via `DATABASE_URL`)**
- `properties` — mirror of on-chain `id`, plus title, location, description,
  valuation, image CID/URL, created_at. Source of truth for browse/search/filter.
- `users` — wallet address, display name, email (from Para), created_at.
- `watchlist` — (user, propertyId) pairs.

Accessed via Next.js API routes (parameterized queries). The chain remains the
source of truth for ownership/rent/listings; Postgres is a convenience/index layer.

**IPFS**
- ERC-1155 metadata JSON per property (`name`, `description`, `image`, attributes).
- Property images. URI stored on-chain as `metadataURI`.

## 6. Frontend (Next.js + shadcn + Wagmi v3)

- **Marketplace** — grid of properties + open listings; buy primary shares or fill a listing.
- **Property detail** — valuation, location, image, share price, rent history; buy shares.
- **Investor dashboard** — my holdings + current value, **claimable rent + Claim button**,
  my active listings, create-listing form.
- **Issuer panel** — create property, deposit rent.
- **Faucet** — mint mUSDC.
- Header: **Para** connect (email/social/passkey).

Patterns:
- Wagmi v3 for contract reads/writes; **multicall** for portfolio/listing reads.
- Use `useSendTransactionSync` (Monad `eth_sendRawTransactionSync`) where applicable for snappy UX.
- Monad-specific Para wagmi wiring (`monad` / `monadTestnet` chains) per `wallet-integration`.

## 7. Error handling

- Contracts: custom errors / `require` on supply caps, allowance/balance, listing
  ownership and active state; `ReentrancyGuard` on all value-moving functions; `SafeERC20`.
- Frontend: surface revert reasons; guard on missing allowance (prompt `approve` /
  `setApprovalForAll` first); disable actions while tx pending; toast on success/failure.
- API routes: validate inputs, parameterized SQL, return clear error codes.

## 8. Testing

- **Foundry tests** (`forge test`): createProperty caps, buyPrimary payment + supply,
  rent deposit → claimable math, **rent correctness across transfers** (the `_update`
  checkpoint), marketplace list/partial-fill/cancel, reentrancy and approval failures.
- Manual end-to-end on testnet: faucet → create property → buy shares → deposit rent →
  claim → list → buy listing.

## 9. Build order (from scaffold checklist)

1. Scaffold monorepo (`contracts/` Foundry, `web/` Next.js); bump `tsconfig` target to ES2020.
2. Install OpenZeppelin (`forge install --no-git OpenZeppelin/openzeppelin-contracts`).
3. Write + test contracts (MockUSDC, PropertyShares, Marketplace).
4. Deploy to testnet via agent wallet / Safe (`wallet/` skill) — **before** frontend.
5. Verify all contracts via the monskill verification API.
6. Wire up Postgres (Neon) + seed properties; pin metadata/images to IPFS.
7. Build frontend against deployed addresses; integrate Para (`wallet-integration`).
8. Apply provenance markers; commit.

## 10. Out of scope (YAGNI for hackathon)

KYC / legal compliance, real fiat on-ramp, on-chain order book, snapshot-based rent
epochs, governance, cross-chain bridges.

## 11. Stretch goals

- Envio HyperIndex for a global activity feed / transaction history.
- Per-address faucet rate limiting.
- Open property creation beyond the owner (permissioned issuer role).
- Cross-chain USDC funding via a bridge widget.
