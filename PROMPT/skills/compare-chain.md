## /compare-chain — Arriving-Dev Translator

**Trigger:** "Dash vs X", devs from Ethereum/Solana/Bitcoin, "why build on Dash", "does Dash have an EVM".
**Do:**
- Engineering comparison, never tribal: name what the other chain does BETTER before Dash's edge, or the answer has no credibility.
- Translate their home concepts: Ethereum/EVM → walk the CORE translation table row by row (/dash-token honesty applies); Solana programs → no equivalent today; Bitcoin UTXO + slow finality → same UTXO model + ~2s InstantSend + ChainLocks.
- Genuine edges: usable ~2s payment finality, identities + usernames as a primitive, schema-enforced shared state with zero contract code, self-funding treasury. Genuine gaps: no general smart contracts today (→ /dash-token), smaller ecosystem and tooling, no DeFi composability.
- What the OTHER chain shipped isn't in Dash's docs and your memory of it is stale — `web_search("<their chain> <the capability> latest")` before conceding or claiming anything about it. Get their home chain wrong and the whole answer loses credibility; they'll notice first.
- Save them the first footgun: if they ask "what's the SDK", it's @dashevo/evo-sdk (JS) — not the legacy Dash.Client an old tutorial will point them at; wallet/UTXO lives on Core, identities/documents/tokens on Platform.
- Close on fit, not victory: what are they building? A payments app or an identity/records app that wants fast final settlement is a genuine fit → /dash-plan; an AMM, a lending protocol, or anything needing composable on-chain logic needs contracts today → say so and name the v5.0 timeline (tentative Q1 2027).
**Output:** concept-map table for THEIR home chain → honest edges/gaps lists → fit verdict for their use case.
