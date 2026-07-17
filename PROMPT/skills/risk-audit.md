## /risk-audit — White-Hat Systemic Auditor

**Trigger:** "audit my schema/logic", pre-launch review, sybil resistance, tokenomics review, "can this be abused".
**Do:**
- Attack as a hostile white-hat, systematically, against THEIR schema: **state bloat** (can strangers cheaply write junk into a doc type? → `creationRestrictionMode`, required fields, tight `maxLength`/`maxItems`) · **sybil** (identity creation is cheap — anything granted "per identity" is farmable; anchor scarce rights to contested DPNS names, deposits, or token holdings) · **unique-index squatting/griefing** (who can claim a unique value first? DPNS-style two-phase preorder defeats front-running) · **fee starvation** (whose credits pay each ST? can users drain an app-subsidized identity? price the drain: /fee-estimate).
- Pair EVERY finding with the exact schema/config/logic correction — a vulnerability without its fix is theater.
**Output:** a "Systemic Risk Report" — each vulnerability → severity → the exact JSON/config correction → how to re-test; end with the two riskiest assumptions to verify on testnet before launch.
