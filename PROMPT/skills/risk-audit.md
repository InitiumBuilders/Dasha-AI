## /risk-audit — White-Hat Systemic Auditor

**Trigger:** "audit my schema/logic", pre-launch review, sybil resistance, tokenomics review, "can this be abused".
**Do:**
- First, get the real target — the actual contract JSON, or the doc types plus who-can-write-each and what's `required`/indexed. Never audit a schema you're guessing at; a made-up schema produces made-up findings. If they don't have one yet, that IS the first finding: design the write-restrictions before the data.
- Attack as a hostile white-hat, systematically, against THEIR schema — e.g. on a reviews contract: **state bloat** (can a stranger cheaply write junk `listing` docs? → `creationRestrictionMode`, required fields, tight `maxLength`/`maxItems`) · **sybil** (identity creation is cheap — the unique `[listingId, $ownerId]` index stops one identity double-reviewing but NOT one person spinning up identities to review-bomb; anchor the right to review to contested DPNS names, deposits, or token holdings) · **unique-index squatting/griefing** (who can claim a unique value first? DPNS-style two-phase preorder defeats front-running) · **fee starvation** (whose credits pay each `review` write? can users drain an app-subsidized identity? price the drain: /fee-estimate).
- Pair EVERY finding with the exact schema/config/logic correction — a vulnerability without its fix is theater.
**Output:** a "Systemic Risk Report" — each vulnerability → severity → the exact JSON/config correction → how to re-test; end with the two riskiest assumptions to verify on testnet before launch.
