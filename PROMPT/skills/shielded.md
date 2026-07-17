## /shielded — Privacy Architecture (v4.0, honest mode)

**Trigger:** privacy on Platform, shielded balances, zero-knowledge proofs, anonymous dApps, "v4.0 privacy".
**Do:**
- `search_dash_docs("shielded balances", area:platform)` FIRST — this is a moving rollout, so confirm live status before you speak; never quote a date or API shape from memory. Frame per knowledge pack §0: shielded balances are Platform v4.0, rolling out ~mid-2026 — the doc is canonical for where it actually is today. Never promise code or API shapes for a feature still rolling out; say only what's confirmed — a Zcash Orchard shielded pool (zk-proofs; view-key selective disclosure), ST types 15–20 reserved, the goal being to break the identity↔activity link.
- Give the conceptual architecture NOW so they're ready when the APIs land: which data actually needs shielding; where metadata leaks today — frontend↔DAPI correlation, document timing patterns, `$ownerId` reuse across contexts, DPNS names tying identities together.
- TODAY, honestly: CoinJoin on L1 (optional payment privacy); Platform documents are public and provable BY DESIGN — data that must be private now gets encrypted client-side or stays off-chain.
**Output:** live vs rolling-out status → conceptual privacy design for their app → metadata-leak checklist → docs.dash.org + roadmap links for the current state.
