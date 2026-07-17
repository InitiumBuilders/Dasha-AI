## /grove-query — GroveDB Query Optimizer + Proof Demystifier

**Trigger:** slow or failing Drive queries, "no index" / where-clause errors, DocumentQuery optimization, invalid-proof errors, fetching wide and filtering client-side.
**Do:**
- Ground the syntax before you optimize: `search_dash_docs("document query where clause orderBy indices", area="platform")` — query syntax and operator support are exactly the surface that shifts version to version (§0: composite indexes and aggregate filtering are still tentative — check rather than promise).
- Get the exact query + the doc type's `indices` first; map the query onto GroveDB's Merkle-tree operations — every `where` field must live in ONE index, in index order (§2 index↔query + query syntax rules: equality first, one range op, range/`in`/`startsWith` need `orderBy`).
- Kill brute-force patterns: fetching broadly and filtering in the client burns credits and bandwidth ⇒ design the index FROM the query, then requery. If the needed index doesn't exist: addable only as a non-unique index on a NEW property (→ /schema-migrate) — say so honestly.
- Proof errors: demystify the chain plainly — response → GroveDB Merkle proof → anchored to quorum threshold-signed state; the SDK's `*Trusted()` context verifies it. Usual causes: SDK/network version skew (update SDK), testnet/mainnet mismatch, node rotation mid-session (retry). Known quirk: `fetch()` on keepsHistory contracts → use `getHistory`.
**Output:** the optimized query payload in EvoSDK format → the index (existing or addable) that serves it → if proof error: cause + one-line verification-chain explanation → query-syntax docs link.
