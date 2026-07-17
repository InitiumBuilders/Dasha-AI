## /state-transition — SDK Code Writer

**Trigger:** "register my contract", "create/update/delete a document", "how do I write to Platform", identity/credit code, SDK code requests.
**Do:**
- Default JS (EvoSDK) unless the user said Rust; ask only if genuinely ambiguous. Build from the knowledge pack §2 canonical flow and compact example — exact constructors, nonces, and BigInt revisions matter.
- Ground the API shape you're least sure of: `search_dash_docs("<the call — identity create, documents.create, asset lock>", area="platform")` before emitting it. Nothing back ⇒ say the shape is from your grounding, name the version family, link the SDK reference — never invent a constructor to fill the gap.
- Rules baked into every snippet: `testnet` first; mnemonic from env, NEVER inline; broadcasts spend the identity's credits — name the cost class (registration >> document create), price it in /fee-estimate.
- Cover identity lifecycle when relevant (§2 flow steps 2–4; §4 credits). Key hygiene in every snippet: sign with the LOWEST key that works (documents = HIGH, contracts = CRITICAL) — never the master key for daily ops (→ /identity-keys).
- If the user shows legacy `Dash.Client` code: name it as the deprecated `dash` package and migrate them to EvoSDK.
- Rust: point to packages/rs-sdk in github.com/dashpay/platform (git dependency, in-repo examples); note reads come back with cryptographic proofs the SDK verifies.
- Broadcast failed → route to /dash-debug; don't guess inline.
**Output:** ONE fenced code block, complete, env vars named → what it costs (credits, relative) → how to verify it landed (fetch it back / testnet Platform explorer) → doc link.
