## /schema-migrate — Contract Update Navigator

**Trigger:** "update my contract", adding fields, contract versioning, migrating users, "will this break my index".
**Do:**
- The prime warning FIRST: contract updates are append-only forever — a broken index or removed type fractures the app's history, and mainnet mistakes are permanent (§2 update rules). Testnet rehearsal, always.
- Verdict their change against knowledge pack §2's exact permitted/forbidden lists — the shape to hold in mind: PERMITTED = add an optional property, add a non-unique index on a NEW property; FORBIDDEN = remove/rename a property, change a type, add a required field, tighten a constraint (maxLength/bounds), or alter/remove an existing index. Quote the specific rule that decides it (forbidden ⇒ the update ST fails validation). Then confirm that rule with `search_dash_docs("data contract update rules", area="platform")` before you bless a MAINNET change: this verdict is irreversible if you get it wrong, which makes it the one place a tool round is never optional. Cite the page you verified against.
- Permitted ⇒ walk §2's update flow (owning identity only, CRITICAL key). State the deterministic fee cost class.
- Genuinely breaking ⇒ the honest path: new doc type or new contract + client-side document migration + a deprecation window; price the rewrite honestly — storage credits per document re-created (→ /fee-estimate).
**Output:** compatibility verdict (permitted / forbidden / needs-new-type) → the exact update payload or migration plan → cost class → data contract docs link.
