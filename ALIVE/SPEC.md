# DASH ALIVE — The Founding Specification
*August's full order, 2026-08-19 — the sacred page. Build in phases; lose nothing.*

**What it is:** the live public database of everything alive on Dash — projects, initiatives, proposals — replacing the /build page as the site's final section. "This is why we exist."

## The features (complete list)
1. **DashCentral ingestion** — every active proposal auto-listed with everything DashCentral shows (title, owner, amounts, yes/no/abstain, passing status, deadlines, payments remaining, URL) + live/approved indicators.
2. **Submit-a-project form** — complete: name, one-liner, description, category, links, the project's own Dash address (its voting/tipping address), optional Evo username, contact. **Listing fee: 2 DASH** = the application for review; reviewed by the team → **"DST Verified" badge** (Dash Support Team Verified).
3. **Voting = crowdfunding (non-custodial).** Vote FOR by sending **≥ 1 DASH directly to the project's own address** — votes = floor(total DASH received there). The community funds what it believes in; we only count, never touch. Vote AGAINST via a derived pool address — against-votes are weighed in the score and the DASH lands in the **DST Pool**.
4. **"Dash Aligned" score** — the public DAO-approval weight per project: votes for − against, advise engagement, verification — formula published, measured over time.
5. **Advise, not comments** — the comment section is called **Advise**: guidance, tips, direction (the support ethos; Dash Advise = a community core team). **0.25 DASH per Advise** (anti-spam + engagement score + funds the pool).
6. **Rankings & stats platform** — Top Projects by Aligned score / total raised / advise count; per-project stats documented over time.
7. **Discover** — full search across the database: keywords, categories, status, verified, sort by votes/raised/advise.
8. **The DST Pool** (a.k.a. Dash Support Pool) — the community treasury: all against-votes + advise fees + listing fees. Used to operate and to allocate support to projects/teams that need it; the community votes on allocation focus. Own page/section.
9. **Founding project #1: DashSupport.Team** — listed first in the DAO-wide database.
10. **No accounts** — anyone can vote/advise privately; payment IS the identity.

## The payment rails (the Davara/Votus system — dashbuilder discipline)
- **xpub-only server** (`DASH_ACCOUNT_XPUB`, same wallet as davara.dev) — the server derives watch-only addresses; **the private key never exists server-side**. A unique derived address per action (Dash Alive uses the m/44'/5'/0'/**1**/{i} branch so indices never collide with Davara's own invoices).
- **InstantSend auto-confirm**: credit on `txlock: true` (≈1–2s, irreversible) via insight.dash.org — fast, no waiting, double-spend-safe.
- **No claiming, no double-votes**: each invoice owns its single-use address; effects bind to the invoice; `(txid, vout)` ledger = idempotent crediting; FOR-votes are plain chain facts at the project's own address.
- `dash:` deep links + QR on every payment screen.

## Phases
- **P1 (shipped first):** page + DashCentral live list + Discover + submit flow w/ live 2-DASH invoice + FOR-vote counting from chain + Advise w/ 0.25 invoice + against-vote pool + rankings + founding entry + pool section.
- **P2:** DST-review console for verification, allocation voting for the pool, deeper time-series stats, project profile pages.
- **P3:** community allocation governance, badges evolution, integrations (Dasha /agent-ready + /dash-review per project).

## v1.1 — The Evolution (2026-08-19, August's order)
- **Hero laws**: the six public laws (List · Vote real DASH · Advise · Against→Pool · Dash Aligned · Proof over promises) pitched at the top of /alive. Stat labels: "projects in motion", + DST Verified count.
- **Proposal pages**: every DashCentral proposal gets its own page at /alive/p/<hash> — full description (their words, rendered as prose), every DashCentral comment, USD amounts (CoinGecko→Kraken spot), months × ask totals, abstain counts.
- **Community layer on proposals** (proposals.json): paid Advises (0.25) + weigh-in-against votes (1+ → DST Pool) attach to any live DAO proposal. The DAO ballot stays masternode-only — we are the community voice beside it, never a fake ballot.
- **Claim flow**: proposal owners claim their listing (prefilled submit form, claimOf=hash) — the DST review cross-checks against DashCentral before Verified. This is how proposals gain a registered Dash address for direct community funding (payout addresses are not keylessly public anywhere — claiming is the honest bridge).
- **Vote marks**: the blue Dash mark = FOR/yes/raised; the red Dash mark = AGAINST/no. Everywhere, always with live numbers.
- **The Dash Support Pool page** (/reserve = /pool = /contribute): the electric Dash Vibes register (from August's neon poster, which is the page's centerpiece). Direct contributions to the cold reserve Xe5ZHYYTSo7UKEDyNGMwibnaNyKwiuiVZb with amount chips + wallet-triggering dash: links + QR. Live totals: reserve received + protocol pool + combined, in DASH and USD.
- **Listings carry media**: YouTube URL (embedded) + up to 3 https image links.
- **Sweep custody**: all protocol-address funds sweep to the cold reserve via the operator-run local _sweep.js (key never server-side). Accounting in TREASURY.md + hourly treasury.json snapshots.
- **Page stats**: views + shares tracked (stats.json, daily buckets) and shown on the page.
- **No alert() anywhere**: inline errors + toasts; ghost-tap guard on sheets; renders never shift under an open sheet.

## v1.2 — The Privacy Law + the compounding layer (2026-08-19, August's order)
- **Nothing is public until the payment locks.** Unpaid invoices — derived addresses, names, advise drafts, listing metadata — never touch the public commons. They wait in a PRIVATE operational ledger (InitiumBuilders/DashAlive-Ledger) and only a locked payment promotes the action into the open ALIVE/ files. No spam, no fake votes, no wasted addresses: unpaid invoices expire after 48h and their indexes are RECYCLED (an address is only ever reused if the chain has never seen a duff on it).
- **treasury.json logs FUNDED addresses only** — an address becomes public knowledge the moment it receives DASH, never before.
- **The Allocation Law v1** (the Support Pool pays forward): monthly, the pool allocates to DST-Verified projects in proportion to their Dash Aligned scores; every allocation is announced on The Pulse BEFORE it moves and proven on-chain after. First allocation opens when the pool crosses 10 DASH. Community allocation voting ships with it.
- **The fuel log**: /reserve renders every real movement at the reserve address live from the chain (in = fuel, out = support), with per-tx proof links.
- **history.json**: one snapshot per day (pool, reserve, every project's aligned/votes/raised) — the time-series that powers charts later. Compounds forever.
- **Dasha v2.9.0 'The Living Database'**: the /alive skill — she keeps the database now.

## v1.3 — Cards, Charts, Console, Concierge (2026-08-19)
- **Share cards**: /api/og renders a live 1200x630 PNG per proposal and per project (real tallies, USD, the blue/red Dash marks). /api/p serves the Alive page with a rewritten head so crawlers see it. Share URLs: /alive/p/<hash> and /alive/project/<id>.
- **The climb**: /api/alive?series=pool|project draws a step chart straight from the chain — every vertex is a transaction, no smoothing. ALIVE/history.json adds a daily row for longer-run trends.
- **DST review console**: /ops, key-gated (DST_OPS_KEY), never linked. Grants or withdraws the Verified seal, shows the private waiting room and the treasury. Every act is a commit in this commons.
- **Concierge**: every project and proposal has an Ask Dasha hand-off (/dasha?ask=...) — she answers with the /alive skill and, on proposals, is told to report the tallies and never advise a vote.
