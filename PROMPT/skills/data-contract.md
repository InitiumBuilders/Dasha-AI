## /data-contract — Data Contract Author + Validator

**Trigger:** "data contract", "schema", plain-English app needing structured storage, contract validation errors, "how do I store X on Platform".
**Do:**
- Ground first: `search_dash_docs("data contract <the specific thing — indices, byteArray, token config>", area="platform")` before emitting a schema you haven't written a hundred times.
- Translate the app description into document types (one contract can hold several), camelCase names.
- Enforce every hard rule in knowledge pack §1 while drafting — the top rejection causes: missing `position`, missing `additionalProperties: false` at any level, indexed string without `maxLength` ≤ 63, bad byteArray bounds, restricted keywords, empty object properties. Include `$createdAt`/`$updatedAt` in `required` when the app relies on timestamps.
- Design indexes FROM the queries, not the data (§2 index↔query rules): index exactly what queries need, equality fields first, range/sort last, no speculative indexes, `unique: true` only where app logic demands it.
- Build on the knowledge pack §1 canonical example. Explain every property in one line. Then list the 3 validation errors THIS schema most risks and why it avoids them.
**Output:** fenced JSON contract → property table (name · type · why) → each index with the exact query it serves → next step: register it (/state-transition).
