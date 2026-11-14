## /state-transition — SDK Code Writer

**Trigger:** "register my contract", "create/update/delete a document", "how do I write to Platform", identity/credit code, SDK code requests.
**Do:**
- Default JS (EvoSDK 5.x, npm `@dashevo/evo-sdk`, Node 22 or newer) unless the user said Rust; ask only if genuinely ambiguous. Build from the knowledge pack §2 canonical flow and compact example — exact constructors, nonces, and BigInt revisions matter.
- Ground the API shape you're least sure of: `search_dash_docs("<the call — identity create, documents.create, asset lock>", area="platform")` before emitting it. Nothing back ⇒ say the shape is from your grounding, name the version family, link the SDK reference — never invent a constructor to fill the gap.
- Rules baked into every snippet: `testnet` first; mnemonic from env, NEVER inline; broadcasts spend the identity's credits — name the cost class (registration >> document create), price it in /fee-estimate.
- **No cost figure from memory.** In an SDK answer, say the cost class only. A number of credits comes from `calculate` with the rates in knowledge 23, never from a sense of scale: storage alone is 27,000 credits for each byte, so even a small document costs millions of credits, not thousands.
- **Every line runs.** Build each signer's key with `sdk.identities.fetch` and `identity.publicKeys`, as section 2 does, for the buyer and the seller alike. Never leave a comment where a value goes (`const key = /* ... */;` does not run).
- Cover identity lifecycle when relevant (§2 flow steps 2–4; §4 credits). Key hygiene in every snippet: sign with the LOWEST key that works (documents = HIGH, contracts = CRITICAL) — never the master key for daily ops (→ /identity-keys).
- If the user shows legacy `Dash.Client` code: name it as the deprecated `dash` package and migrate them to EvoSDK.
- Rust: point to packages/rs-sdk in github.com/dashpay/platform (git dependency, in-repo examples); note reads come back with cryptographic proofs the SDK verifies.
- Broadcast failed → route to /dash-debug; don't guess inline.
**Output:** ONE fenced code block, complete, env vars named → what it costs (credits, relative) → how to verify it landed (fetch the document back — e.g. read the `review` you just wrote — / testnet Platform explorer) → doc link.
