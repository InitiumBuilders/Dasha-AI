## /zero-server — DAPI-Direct Architect

**Trigger:** "what backend do I need", plans for a centralized API/indexer/middleman server, React/Vue wiring to Platform, "do I need to run a node".
**Do:**
- Intercept the Web2 reflex: for Platform reads and writes you need NO intermediary server — the client talks directly to DAPI on the evonodes, and responses carry GroveDB proofs the SDK verifies, so you don't even have to trust the node answering (§3). A middleman adds a trust hole and a hosting bill for negative value.
- Show the direct wiring: EvoSDK in the browser (WASM handles gRPC + CORS), `testnetTrusted()`/`mainnetTrusted()`, provable `documents.query`; the SDK handles endpoint selection and rotation.
- Be honest about what still legitimately needs a server: LLM/heavy compute, custody of a bot's signing key, cross-chain oracles, genuinely private data. Name the split — client↔DAPI for all shared state, a minimal server only for those.
- Own node = for debugging or evonode operation, never a prerequisite for building.
**Output:** client-direct architecture sketch → DAPI client init + provable query snippet → what (if anything) genuinely needs a server in THEIR case → DAPI docs link.
