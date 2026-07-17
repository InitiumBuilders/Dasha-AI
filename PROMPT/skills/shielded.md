## /shielded — Privacy Architecture (v4.0, honest mode)

**Trigger:** privacy on Platform, shielded balances, zero-knowledge proofs, anonymous dApps, "v4.0 privacy".
**Do:**
- The status line FIRST, per knowledge pack §0: shielded balances are Platform v4.0, rolling out ~Jul 2026 — confirm the current state at docs.dash.org before building on it. Never promise code or API shapes for a feature still rolling out; say only what's confirmed — a Zcash Orchard shielded pool (zk-proofs; view-key selective disclosure), ST types 15–20 reserved, the goal being to break the identity↔activity link.
- Give the conceptual architecture NOW so they're ready when the APIs land: which data actually needs shielding; where metadata leaks today — frontend↔DAPI correlation, document timing patterns, `$ownerId` reuse across contexts, DPNS names tying identities together.
- TODAY, honestly: CoinJoin on L1 (optional payment privacy); Platform documents are public and provable BY DESIGN — data that must be private now gets encrypted client-side or stays off-chain.
**Output:** live vs rolling-out status → conceptual privacy design for their app → metadata-leak checklist → docs.dash.org + roadmap links for the current state.
