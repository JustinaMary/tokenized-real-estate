# QA Test Plan — Core Investing Flow

Manual, step-by-step test cases for Terra's core investing flow on **Monad
testnet**. Walk these in order for a demo run or a release check. Tick the
**Result** box and note anything off.

## Environment

| Item | Value |
|------|-------|
| App | `http://localhost:3000` (`cd web && npm run dev`) |
| Network | Monad Testnet — chain id **10143**, RPC `https://testnet-rpc.monad.xyz` |
| Explorer | `https://testnet.monadexplorer.com` |
| ComplianceRegistry | `0x61E3b60A0Ed2Ea3afA4170b9d54c52915f3AE06C` |
| MockUSDC (mUSDC) | `0x19DC796A7ecD01E798bd00920a5b96f872C82d57` |
| PropertyShares | `0x61d3eFc64FBC0070418A925d5cfFC318B3B8983a` |
| Marketplace | `0xacAC85fD3bCDa4b74CfFdB114701590A47D49705` |

**Seeded properties:** #0 Marina Sea-View Apartment (10,000 shares @ 100 mUSDC),
#1 Downtown Grade-A Office (10,000 @ 250 mUSDC), #2 Hillside Luxury Villa
(5,000 @ 500 mUSDC).

**Required env (`web/.env.local`):** all four `NEXT_PUBLIC_*` addresses,
`VERIFIER_PRIVATE_KEY` (funded with MON), and `NEXT_PUBLIC_PARA_API_KEY`. The
contract-config banner must be **absent** on load — if present, env isn't wired.

**Accounts for the trade tests:** you need two wallets — **Investor A** (primary
buyer + seller) and **Investor B** (secondary buyer). Two browser profiles, or
two Para email logins, or one Para + one MetaMask.

> Tip: confirm any on-chain effect independently by pasting the tx hash (from the
> toast / Dashboard → Recent activity) into the explorer.

---

## Setup / Preconditions

These gate every investing action; run them once per account before the flow.

### TC-00.1 — App loads, network correct
**Steps:** Open `http://localhost:3000`.
**Expected:** Marketplace renders 3 property cards with prices in mUSDC and a
"shares sold" progress bar. No "Contracts not configured" banner. Header shows
"MONAD TESTNET". **Result:** ☐ Pass ☐ Fail

### TC-00.2 — Connect / sign in
**Steps:** Click **Connect Wallet** (or **Sign in** if Para is on) → complete
email/passkey or wallet connect.
**Expected:** Header shows a shortened address with a green dot. No wrong-network
banner (if it appears, click **Switch to Monad Testnet**). **Result:** ☐ Pass ☐ Fail

### TC-00.3 — Gas auto-funded
**Steps:** Right after first connect, watch for a toast.
**Expected:** "Funded your wallet with test MON for gas" toast (new wallets). On
**Faucet** page, **MON balance** > 0. (If 0, the auto-drip faucet was rate-limited —
fund manually before continuing.) **Result:** ☐ Pass ☐ Fail

### TC-00.4 — Mint mUSDC
**Steps:** Go to **Faucet** → **Mint 10,000 mUSDC** → confirm/sign.
**Expected:** Tx confirms (toast); **mUSDC balance** increases by 10,000.
**Result:** ☐ Pass ☐ Fail

### TC-00.5 — Identity verification (KYC)
**Steps:** Go to **Verify** → **Individual (KYC)** tab → fill the fields →
**Submit KYC**.
**Expected:** "KYC verification approved" toast; status badge flips to **KYC
verified** within ~8s (on-chain read). A tx hash is produced (backend verifier
write). **Result:** ☐ Pass ☐ Fail

---

## Core Investing Flow

### TC-01 — Buy primary shares (happy path)
**Precondition:** Investor A connected, on testnet, has MON + ≥10,000 mUSDC, KYC verified.
**Steps:**
1. Open property **#0** (Marina Sea-View Apartment).
2. In **Invest**, enter **100** shares (cost shows **10,000 mUSDC**).
3. Click **Approve & Buy** → approve mUSDC, then confirm the buy.

**Expected:**
- Both txs confirm (toasts).
- "Your position" appears: **Your shares = 100**, **Ownership = 1.00%**.
- "Shares sold" progress and count increase by 100 (1%).
- mUSDC balance drops by 10,000.
- Dashboard → Recent activity shows a **Buy** entry with an explorer link.

**Result:** ☐ Pass ☐ Fail

### TC-02 — Buy is blocked above remaining supply
**Steps:** On property #2 (5,000 total), try to buy **5001** shares.
**Expected:** Button disabled, or the tx reverts with an error toast; no shares
received. **Result:** ☐ Pass ☐ Fail

### TC-03 — Issuer deposits rent
**Precondition:** You control the **issuer** (the contract deployer; its key is
`VERIFIER_PRIVATE_KEY`). Connect that wallet, or use the Issuer panel while
connected as the owner.
**Steps:**
1. Go to **Issuer** → **Deposit rent**.
2. Select property **#0**, enter **1000** mUSDC.
3. Click **Approve & Deposit** → approve, then deposit.

**Expected:** Both txs confirm. Rent is distributed pro-rata across all 10,000
shares (0.1 mUSDC/share). **Result:** ☐ Pass ☐ Fail

### TC-04 — Claimable rent is correct
**Precondition:** TC-01 (A holds 100 shares of #0) and TC-03 (1,000 mUSDC rent
deposited) done.
**Steps:** As Investor A, open the **Dashboard** (or property #0 → Your position).
**Expected:** **Claimable rent** for #0 ≈ **10 mUSDC** (100 / 10,000 × 1,000).
**Result:** ☐ Pass ☐ Fail

### TC-05 — Claim rent
**Steps:** Click **Claim … mUSDC** (Dashboard holding row or property page).
**Expected:** Tx confirms; mUSDC balance increases by ~10; **Claimable** resets
to **0**; Recent activity shows a **Claim** entry. **Result:** ☐ Pass ☐ Fail

### TC-06 — List shares for sale (secondary market)
**Precondition:** Investor A holds shares of #0.
**Steps:**
1. Property #0 → **Sell shares**: amount **50**, price **120** mUSDC/share.
2. Click **Approve & List** → approve marketplace (setApprovalForAll), then list.

**Expected:** Both txs confirm. The listing appears under **Secondary market**
on the property page and under **Dashboard → Your active listings** (50 shares @
120 mUSDC). **Result:** ☐ Pass ☐ Fail

### TC-07 — Buy from a listing (partial fill)
**Precondition:** Investor B connected, on testnet, KYC verified, has MON + mUSDC
(run TC-00.2–00.5 for B). The listing from TC-06 is active.
**Steps:**
1. As Investor B, open property #0 → **Secondary market** → the listing.
2. Enter **20** in the buy field → **Buy** → approve mUSDC if prompted, confirm.

**Expected:**
- Tx confirms.
- Investor B now holds **20** shares of #0 (Dashboard).
- The listing's remaining drops to **30** (still active).
- Investor A's mUSDC increases by **20 × 120 = 2,400**; A's #0 shares drop by 20.

**Result:** ☐ Pass ☐ Fail

### TC-08 — Cancel a listing
**Precondition:** Investor A has an active listing (the remaining 30 from TC-07).
**Steps:** Dashboard → Your active listings → **Cancel** on that listing.
**Expected:** Tx confirms; listing disappears from active listings and from the
property's Secondary market. A subsequent buy attempt on it would fail.
**Result:** ☐ Pass ☐ Fail

### TC-09 — Dashboard portfolio totals
**Steps:** As Investor A, review the **Dashboard** summary cards.
**Expected:** **Portfolio value** = shares held × price; **Properties held**
count is correct; **Total claimable rent** matches the sum across holdings;
Recent activity lists Buy / Claim / List / Cancel entries with working explorer
links. **Result:** ☐ Pass ☐ Fail

### TC-10 — Marketplace reflects state
**Steps:** Return to **Marketplace** (home).
**Expected:** Property #0 card shows the updated **shares sold** count/percentage
and price; data matches the property detail page. **Result:** ☐ Pass ☐ Fail

---

## Negative / edge checks (quick)

| ID | Check | Expected |
|----|-------|----------|
| N-1 | Action while disconnected | Buy/list/claim show "Connect your wallet" gate |
| N-2 | Buy while **unverified** | "Verify to invest" prompt instead of the buy button; direct call would revert (`NotVerified`) |
| N-3 | Wrong network | Red banner + "Switch to Monad Testnet" button; actions blocked until switched |
| N-4 | Insufficient mUSDC | Buy tx reverts; clear error toast; no shares received |
| N-5 | Buy own listing | (Edge) handled or simply not surfaced — note behavior |

---

## Results summary

| Test | Result | Tx hash / notes |
|------|--------|-----------------|
| TC-00.1 App loads | ☐ | |
| TC-00.2 Connect | ☐ | |
| TC-00.3 Auto gas | ☐ | |
| TC-00.4 Mint mUSDC | ☐ | |
| TC-00.5 KYC verify | ☐ | |
| TC-01 Buy primary | ☐ | |
| TC-02 Supply cap | ☐ | |
| TC-03 Deposit rent | ☐ | |
| TC-04 Claimable math | ☐ | |
| TC-05 Claim rent | ☐ | |
| TC-06 List shares | ☐ | |
| TC-07 Buy listing | ☐ | |
| TC-08 Cancel listing | ☐ | |
| TC-09 Dashboard totals | ☐ | |
| TC-10 Marketplace state | ☐ | |

> The same invariants are covered automatically by the Foundry suite
> (`cd contracts && forge test`, 33 tests) — this manual plan verifies the
> wiring end-to-end through the live UI and deployed contracts.
