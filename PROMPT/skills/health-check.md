## /health-check — Pre-Launch Readiness Sweep

**Trigger:** "am I ready to launch", "pre-launch checklist", "ready for mainnet", "going to mainnet", "launch readiness", "is my app production ready", "before I go live", "mainnet checklist", "ship checklist", "go-live check".
**Do:**
- A GATE, not an explainer: they are about to move an app from testnet to mainnet, where mistakes cost real credits and can't be un-shipped. Your job is one verdict per dimension — **GO / NOT YET / NO-GO** — and the single blocker that matters most. (/dash-plan builds the plan; this sweeps it before it goes live.)
- Ground the one number you must never remember first: `search_dash_docs("data contract registration fee mainnet requirements", area="platform")` — the fee schedule and any current mainnet gate move version to version; cite the page, defer the arithmetic to /fee-estimate.
- Run the sweep across the dimensions that actually break a launch, cheapest-to-verify first, each stated as its own verdict:
  1. **Contract frozen** — indexes are final and the schema is locked. Index changes are append-only (add a non-unique index on a NEW property only → /schema-migrate); a schema you'll still be editing next week is NOT ready. NO-GO if indexes aren't settled.
  2. **Testnet-rehearsed** — the EXACT mainnet flow, including its failure paths, run end to end on testnet. A mainnet debut of an untested path is NOT YET, always — testnet is where the same structure costs nothing to get wrong.
  3. **Credit budget** — the hot paths priced and a funded identity with headroom + a top-up plan (registration one-time, storage compounds → /fee-estimate). "It worked once on testnet" is not a budget.
  4. **Key hygiene** — signing with the lowest sufficient key, master key NEVER in daily ops, mnemonic from env not code, blast radius capped (dedicated identity, bounded credit balance → /identity-keys). A master key in the runtime is NO-GO.
  5. **Identity + name** — mainnet identity funded; DPNS name registered if the app resolves users or itself by name.
  6. **DAPI resilience** — retry/backoff on transient failures, node-rotation handling, reads verified via `*Trusted()` proofs, no hidden trusted middleman (→ /zero-server, /scale).
  7. **Data reality** — nothing private or PII on-chain: Platform documents are PUBLIC by design (→ /shielded) — and no path secretly assumes smart contracts that don't exist today (→ /dash-token). Either one live ⇒ NO-GO until redesigned.
  8. **Adversary pass** — who else can write to your contract or make you pay for storage you didn't authorize (→ /risk-audit). An unpriced attacker is a live budget hole.
- State what each verdict rests on; never pass a dimension you couldn't actually confirm — name it NOT YET and say what evidence would flip it.
**Output:** the overall verdict on line one (**GO / NOT YET / NO-GO**) → the per-dimension checklist, each with its verdict and the one-line reason → the single most important blocker to clear next → the testnet-first reminder (rehearse the fix where it's free) → the named handoff for the weakest dimension. Anything money- or incident-shaped already in motion ⇒ /human-support.
