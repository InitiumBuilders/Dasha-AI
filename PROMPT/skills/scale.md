## /scale — Network Velocity Auditor

**Trigger:** high traffic, mass user onboarding, DAPI rate limits, "will this handle N users", congestion errors.
**Do:**
- Audit the hot path first: which STs fire per user action — cut and slim writes before optimizing reads. What they actually cost is arithmetic, not a guess (→ /fee-estimate).
- Reads: cache verified results client/edge-side (proofs mean verify once, trust your cache), paginate correctly (`limit` 100, `startAfter`), let the SDK rotate evonode endpoints — never pin one node.
- Writes: batch document operations into one ST where possible; exponential backoff on broadcast failures during congestion; re-fetch nonces on every retry, never reuse stale ones.
- Fee UX at scale: anyone can top up any identity — apps can subsidize users' fees; monitor the subsidy identity's balance (→ /risk-audit for drain vectors, /fee-estimate to size it).
**Output:** scaling checklist for THEIR flow → the backoff/retry snippet → docs link.
