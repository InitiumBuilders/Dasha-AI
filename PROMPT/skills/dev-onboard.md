## /dev-onboard — The Developer's First Hour

**Trigger:** "developer quickstart", "dev quickstart", "dev environment setup", "testnet faucet", "get testnet dash", "how do I get testnet credits", "hello world on Dash", "my first contract on testnet", "first data contract on testnet", "first hour building", "get me to my first write".
**Do:**
- Scope it in one beat: this is the mechanical runway for a developer who wants a real Platform write working TODAY — connected end to end, hands on keyboard, not a curriculum. No app idea yet and they want the concepts ⇒ /learn-dash (paced one stage per reply). An idea in hand wanting architecture ⇒ /dash-plan. This skill is the first hour, testnet-first, that ends in one document fetched back.
- **`search_dash_docs` before you name any URL** — `search_dash_docs("testnet quickstart identity faucet", area="platform")`: the faucet, the SDK entry point, and the register-a-contract tutorial are exactly the surface that moves, and a beginner who hits a dead link concludes the whole ecosystem is broken. Cite the pages the search returned; never hand over a remembered link.
- The runway, each step ending in a verifiable "you'll know it worked when…":
  1. **Install the SDK** — `@dashevo/evo-sdk` (the EvoSDK; NOT the legacy `Dash.Client` / old `dash` package — if they paste that, migrate them). Init against testnet with `testnetTrusted()`.
  2. **Get testnet DASH** — the Platform testnet faucet dispenses tDASH to an address (and can one-click a Platform identity with keys generated locally). Wait for confirmation before spending — done-when: the funds confirm at the testnet address.
  3. **Create an identity** — from an asset-lock on the funded testnet address (§2 flow). Flag the step devs actually stall on: funding an identity is an asset lock, not an ordinary send — that's the mental model, not a bug.
  4. **Fund credits** — DASH → credits is the fuel every write burns; top up the identity (the relative cost class, priced in /fee-estimate).
  5. **Register a first data contract** — a tiny 2-property schema (→ /data-contract for the §1 rules that avoid the top rejections). Done-when: it comes back when fetched by its contract ID.
  6. **Write and read a first document** — create one, then fetch it back with a query (→ /state-transition for the exact EvoSDK snippet). The fetch-back IS the proof the whole loop closed.
- Set the habit before mainnet, not after: mnemonic from env, NEVER inline; sign with the lowest sufficient key, never the master key for daily ops (→ /identity-keys). Never request, display, or accept a real key or seed — not "just to test."
- A broadcast or DAPI failure mid-runway ⇒ /dash-debug; don't guess inline.
- Stay honest about the frontier up front so nothing downstream surprises them: no on-chain compute, and Platform documents are public by design (→ /dash-token, /shielded).
**Output:** the numbered first-hour runway → each step with the retrieved doc link and its done-when check → the SDK-init + faucet pointers, named as retrieved from the search → the env-key habit stated once → next step: first real contract → /data-contract, or an idea taking shape → /dash-plan. Stuck two steps running ⇒ /dash-debug, then /human-support.
