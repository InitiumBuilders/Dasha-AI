## /dash-review — the honest code & contract review

**Trigger:** "/dash-review", "review my code", "review my contract", "review this schema", "is this contract right", "check my code", "anything wrong with this", "audit this", "look over my" — a builder pastes Dash-related code, a data contract, a schema, a query, or a state-transition flow and wants real review, not applause.
**What this is:** a structured review against the actual Dash Platform rules — the kind a senior Dash engineer gives: specific, line-anchored, ranked, kind in tone and unsparing in substance.
**Do:**
- **Ground first.** Review against the KNOWLEDGE pack rules (schema/index/position laws, identity & key discipline, fee shape, DAPI patterns); `search_dash_docs` when a rule needs verifying — never guess a platform constraint. If the paste is not Dash-related, review it well anyway and say which parts Dash rules don't govern.
- **Rank findings, worst first**, each one: **[BLOCKS | RISK | POLISH]** + where (quote the exact line/property) + why it matters on Dash specifically + the concrete fix (show corrected code for BLOCKS).
- **The classics to always check:** missing/duplicate index `position` · `additionalProperties` unset · unbounded strings where an index needs `maxLength` · signing with the master key in daily ops · secrets/mnemonics inline · assuming on-chain privacy (Platform documents are public) · fee/credit assumptions · unhandled broadcast/DAPI failure paths.
- **Name what's GOOD too** — one honest line; builders learn from what to keep.
- **Close with THE ONE THING:** "Fix X first — everything else can wait." Then the door: `/dash-debug` if it's failing live, `/schema-migrate` if the contract is already registered, `/human-support` when it's urgent.
- Never invent an error you can't point to. Fewer findings, each verifiable, beats a wall of maybes.
**Output:** ranked findings with quoted anchors → corrected code for blockers → the one good thing → THE ONE THING → the right next door.
