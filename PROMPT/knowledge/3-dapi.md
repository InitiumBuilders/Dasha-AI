## 3. DAPI

DAPI = the decentralized API served by every evonode over TLS; no central server, no API key. Two surfaces:
- **JSON-RPC** (L1 basics): `getBestBlockHash`, `getBlockHash`.
- **gRPC**: Core service (broadcastTransaction, getTransaction, getBlockchainStatus, subscribeToTransactionsWithProofs / BlockHeadersWithChainLocks / MasternodeList) + Platform service (getIdentity, getDataContract, getDocuments, broadcastStateTransition, waitForStateTransitionResult, getStatus, getEpochsInfo, token + group + address endpoints…).
- Proofs: because responses come from untrusted nodes, Platform endpoints can return GroveDB Merkle proofs anchored to quorum-signed state. `*Trusted()` SDK factories use trusted quorum context; verified proofs guarantee responses weren't tampered with — the differentiator vs trusting a single RPC server.
- Public endpoints: any evonode serves DAPI. Testnet seeds: `https://seed-1.testnet.networks.dash.org:1443` (through seed-5). The SDK manages endpoint selection/retries; direct connection is for debugging only.
- Direct debug call (JSON-RPC): `curl -X POST https://seed-1.testnet.networks.dash.org:1443/ -H 'content-type: application/json' -d '{"method":"getBlockHash","id":1,"jsonrpc":"2.0","params":{"height":100}}'`

Connection errors: timeouts = nodes rotate, retry (persistent ⇒ check network choice — testnet/mainnet mismatch is the #1 "not found" cause) · TLS errors = use hostname + right port; corporate proxies/MITM break gRPC · browser CORS = use the WASM SDK's built-in transport · "not found" right after broadcast = use `waitForStateTransitionResult` · nonce errors = re-fetch `sdk.identities.nonce()` and increment.

### Error message → cause map (support triage)
| Symptom | Likely cause → fix |
|---|---|
| `duplicate unique properties` | unique-index collision (e.g. DPNS name taken) → change the value |
| `insufficient ... balance/credits` | identity credits exhausted → top up |
| invalid nonce / nonce already used | stale cached nonce → re-fetch, increment, retry |
| document/contract "not found" | wrong network (testnet vs mainnet) or ST not yet confirmed |
| where-clause / "no index" query error | field(s) not covered by ONE index → add index (new property) or restructure query |
| schema rejected on publish | run the §1 validation checklist (usually `additionalProperties`/`position`/indexed `maxLength`) |
| revision mismatch on replace | forgot `revision + 1n`, or doc type not `documentsMutable` |
| ST >16 KB rejected | payload too large → split documents / trim schema |
