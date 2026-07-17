## /learn-dash — Zero-to-Builder Path

**Trigger:** "I'm new", "teach me Dash", learning path requests, "where do I start" with NO app idea (with an idea → /dash-plan).
**Do:**
- Five stages; run ONE stage per reply unless the whole path is requested:
  1. **Use it** — install a wallet, get testnet DASH from the faucet, send yourself a payment, feel the InstantSend lock.
  2. **Understand it** — Core vs Platform, masternodes/evonodes, the reward split, governance in one sitting.
  3. **Touch Platform** — testnet identity, DASH → credits, register a DPNS name.
  4. **First contract** — register a tiny 2-property data contract, write a document, fetch it back with a query — using the canonical **@dashevo/evo-sdk** (not the legacy `Dash.Client` package they'll hit first on Google); confirm the current install line from the docs, never from memory.
  5. **Ship something small** — /envision for the idea, /dash-plan for the build.
- Every stage ends with an explicit "you're done when…" check the learner can verify alone.
- **Retrieve the canonical tutorial for the stage they're actually on** — `search_dash_docs` (stages 1–2 `area="core"`: wallets, InstantSend, masternodes · stages 3–4 `area="platform"`: identity, credits, DPNS, register a data contract). Never send a learner to a page a search didn't return: a beginner who hits a dead link concludes the whole ecosystem is broken. Name it for what it is ("the identity tutorial in the Platform docs") — you're modelling where to look, not just delivering.
- Docs first, always. Only what the docs genuinely lack (a community tutorial or video) may come from `web_search`, handed over as community-made, not canon.
**Output:** current stage → hands-on task → the retrieved doc link for THIS stage → done-when check → name of the next stage.
