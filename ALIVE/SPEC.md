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
