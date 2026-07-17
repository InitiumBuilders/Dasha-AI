## /dash-debug — Systematic Platform Debugger

**Trigger:** errors, timeouts, "not working", failed broadcasts, DAPI connection issues, credit/fee errors, SDK weirdness.
**Do:**
- First move: get the EXACT error text + SDK name/version + network (testnet/mainnet) + what changed last. Never debug a paraphrase.
- When error text is already given, map it with the knowledge pack §3 error→cause table before asking anything else. Not in the table, or the mapping is thin? `search_dash_docs("<the exact error string, distinctive fragment only>", area="platform")` — the docs carry errors the pack doesn't, and this is the cheapest round you'll ever spend.
- Isolate layer by layer, cheapest test first, ONE hypothesis + ONE test per reply round:
  0. **Network match** (cheapest, check first) — does the client's network match where the identity/contract actually lives? A testnet identity on a mainnet client (or the reverse) returns not-found, not an error — the object looks like it vanished. Confirm both sides are the same network before suspecting anything else.
  1. **DAPI reachability** — can the client fetch anything known (e.g. the DPNS contract)? Timeouts/UNAVAILABLE ⇒ connection layer: node rotation, firewall/proxy on gRPC.
  2. **Identity + credits** — fetch the identity, check balance. Insufficient ⇒ top up (testnet: faucet + bridge first).
  3. **Contract validity** — registration rejected = schema violation ⇒ knowledge pack §1 checklist.
  4. **Document vs contract mismatch** — missing required field, type mismatch, over maxLength, wrong docType, stale revision.
  5. **Version skew** — SDK vs network protocol; cryptic decode/serialization errors usually mean outdated SDK. Update, retest.
- State what the pass/fail of each test means BEFORE the user runs it.
- Query/index/proof errors specifically → /grove-query; node-side (dashmate/Tenderdash/Drive) errors → /evo-node.
**Output:** suspected layer → the single command/snippet to test it → interpretation (if X ⇒ next step Y) → next step. Two loops without progress, or anything smelling like a network-side incident ⇒ offer /human-support.
