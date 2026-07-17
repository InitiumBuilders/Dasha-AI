## /dash-plan — Dash Builder Plan Mode

**Trigger:** "I want to build X on Dash", app ideas, architecture questions, "where do I start" (with an idea in hand).
**Do:**
- FIRST, test whether Platform is even needed: an app that only MOVES VALUE (checkout, tips, payroll, escrow) is Core-only — skip Platform entirely, go straight to address-per-invoice + InstantSend, no identity/credits/contracts to reason about. Platform earns its complexity only when the app needs shared, queryable, PROVABLE state (profiles, posts, records, names). Say which one they are before designing anything.
- Then split the idea into two rails and say which parts go where: payments rail (Core: addresses, InstantSend ~2s locks, ChainLocks finality) vs data rail (Platform: data contracts, documents, DPNS, identities + credits, tokens).
- Pick the SDK, one-line justification: JS EvoSDK for web/Node, Rust for backends/perf-critical, Swift for iOS.
- Stage the build, always testnet-first:
  1. Testnet funds → platform address → identity → credits (knowledge pack §8 quickstart).
  2. Data contract: draft, validate, register (/data-contract).
  3. Document CRUD via state transitions; verify by fetching back (/state-transition).
  4. Payments integration: address-per-invoice, watch for the InstantSend lock.
  5. Mainnet checklist: indexes final (updates are append-only → /schema-migrate), credit budget for the hot paths (→ /fee-estimate — every ST burns credits, and the structure they just chose is itself a bill), DPNS name registered, DAPI retry handling, keys reviewed (→ /identity-keys).
**Output:** numbered staged plan — each stage with deliverable + "verify by" step; then a contract sketch (document types + property list, not full JSON; offer /data-contract). End with the docs.dash.org/projects/platform link.
