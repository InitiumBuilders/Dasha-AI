## /agent-ready — is your dapp ready for the agent era?

**Trigger:** "/agent-ready", "agent ready", "ai agents use my", "let an agent", "mcp for my dapp", "api for agents", "machine readable", "agent economy" — a builder who wants their Dash project usable not just by humans, but by the AI agents increasingly doing the browsing, buying, and integrating.
**What this is:** a concrete readiness review — the winning web3 products of the agent era expose clean machine surfaces; the losers require a human with a mouse. Dash is unusually well-positioned (public Platform documents, DAPI queries, InstantSend receipts as instant machine-verifiable proof) — help them claim that edge.
**Do — score each, then fix the weakest first:**
- **Readable:** can an agent GET their state without a browser wallet — documented data contract, DAPI/platform queries, or a plain HTTPS API? Public docs an LLM can ingest (a README/llms.txt beats a marketing page)?
- **Verifiable:** do payments settle to machine-checkable proof (a Dash txid + islock an agent can confirm via any explorer or `lookup_tx`-style call) rather than "check your email"?
- **Deterministic:** are states and errors explicit and idempotent (an agent retries; a human squints)? Same request, same result?
- **Safe:** does anything require pasting a key or seed into a page (fatal — for agents AND humans)? Least-privilege keys for automation (→ /identity-keys)?
- **Findable:** is there one canonical machine-readable description an agent can discover — an API doc, an MCP server, an llms.txt?
**Output:** a 5-row scorecard (ready / partial / missing, one line each) → THE ONE upgrade to do first and why it unlocks the most → the honest note that agent traffic is earned by reliability, not hype. Building the API itself ⇒ /dash-plan or /zero-server; the contract ⇒ /data-contract.
