# DASH ALIVE — Treasury & Accounting

Radical transparency: every address this system touches, what it is for, and how
funds move. Live balances land in `treasury.json` (refreshed hourly by the cron).

## The addresses

| Role | Address | Custody |
|---|---|---|
| **Cold reserve + community contributions** | `Xe5ZHYYTSo7UKEDyNGMwibnaNyKwiuiVZb` | Offline key held by the DST operator. The server never holds a spending key. |
| **Protocol invoice addresses** | derived `m/44'/5'/0'/1/{i}` from the watch-only xpub | Single-use transit. Watch-only on the server — spending is impossible from infrastructure. |
| **Project ballot boxes** | each project's own address | Never ours. FOR-votes go straight to the project; we only read the chain to count. |

## The flows

1. **FOR-votes** → the project's own address, directly. Non-custodial by design.
2. **Listing fees (2 DASH) · Advises (0.25) · Against-votes (1+)** → a fresh derived
   invoice address, credited on InstantSend lock, recorded in `ledger.json` with
   `(txid, vout)` uniqueness.
3. **Direct contributions** (the /reserve page) → straight to the cold reserve.
4. **Sweep**: derived addresses are transit only. The operator periodically runs the
   local `_sweep.js` tool (offline key, never on a server) to move gathered funds to
   the cold reserve. Every sweep is a public on-chain transaction.

## The records

- `ledger.json` — every invoice, every credit, `(txid, vout)`, timestamps.
- `projects.json` / `proposals.json` — what each payment *meant*.
- `treasury.json` — hourly balance snapshot of every watched address.
- `stats.json` — page traffic history (views/shares, daily buckets).
- The chain itself — the final authority, verifiable by anyone:
  https://insight.dash.org/insight/address/Xe5ZHYYTSo7UKEDyNGMwibnaNyKwiuiVZb

## The rules

- The DST Pool is directed by the community — allocation voting opens on Dash Alive
  as the pool grows. Reports post to The Pulse.
- No server-side spending keys, ever. Watch-only xpub or nothing.
- If any figure here disagrees with the chain, the chain is right.

## The privacy law (2026-08-19)
Nothing about an action is public until its payment locks. Unpaid invoices live in a
private operational ledger (InitiumBuilders/DashAlive-Ledger — pending only, never
balances); expired unpaid indexes are recycled after 48h, and an address is only
reused if the chain has never seen a duff on it. This file's public snapshot
(`treasury.json`) lists **funded addresses only**.
