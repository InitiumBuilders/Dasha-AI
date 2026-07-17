# DASHA KNOWLEDGE PACK — Dash Platform developer memory
Rule: this pack is the spine — structure, flows, verified numbers. The live docs are the truth. When a `search_dash_docs` result and this pack conflict, the retrieved page wins and you say so plainly. Nothing here is a reason not to check.

## 0. PLATFORM VERSION LINE (verified 2026-07, dash.org/roadmap)
v1.0 mainnet Jul 2024 → v1.2 activation + DPNS/DashPay contracts Sep 2024 → v2.0 Jun 2025 fungible tokens → v2.1 Oct 2025 new Evo JS SDK → v3.0 Jan 2026 Platform Address System (LIVE) → v4.0 ~Jul 2026 shielded balances = Zcash Orchard pool (rolling out — check docs) → v4.1–4.3 2026 tentative (count trees, composite indexes, aggregate filtering) → **v5.0 Q1 2027 tentative: Smart Contracts VM** → v6.0 2027 tentative: IBC. Nothing after v3.0 is safe to assert as live without checking.

## 1. DATA CONTRACT JSON SCHEMA RULES

A data contract = JSON Schema definitions of an app's document types, registered on Platform, stored/enforced by Drive (GroveDB) with cryptographic proofs. A contract must define ≥1 document type (or token).

### Document type — hard rules
- `type` must be `"object"`; 1–100 properties per document type.
- Property names: 1–64 chars, only `A-Z a-z 0-9 - _`.
- Every property MUST have a unique integer `position` (starts at 0, increments per level; resets to 0 inside nested objects). Required since v0.25.16 for backward-compatible contract updates.
- `additionalProperties: false` is REQUIRED at every level where `properties` appears (including nested objects). Missing it = validation failure.
- `object` properties cannot be empty — must define ≥1 sub-property.
- Allowed types: `string`, `number`, `integer`, `boolean`, `array`, `object`.
- Binary data: `"type": "array", "byteArray": true` (+ `maxItems`); returned as base64 in `.toJSON()`.
- `required`: properties that must be present. Include `$createdAt`/`$updatedAt` in `required` to make Platform store those timestamps.
- `transient`: properties validated but NOT stored (e.g. DPNS `preorderSalt`).
- Optional per-doc-type config (include only when non-default): `documentsMutable` (default true), `canBeDeleted` (default true), `documentsKeepHistory` (default false), `transferable` 0|1, `tradeMode` 0|1, `creationRestrictionMode` 0|1|2, `signatureSecurityLevelRequirement` 1|2|3 (default High).
- Contract-level config (set in code, not schema): `canBeDeleted`, `readonly`, `keepsHistory`, `documentsMutableContractDefault`, etc. Optional: `keywords` (≤50), `description` (3–100 chars) for the search system contract.

### Restricted JSON Schema keywords (validation fails)
- Disallowed: `$ref`, `if/then/else`, `allOf/anyOf/oneOf/not`, `default`, `propertyNames`, `patternProperties`.
- `dependencies` → use `dependentRequired`/`dependentSchema` instead; `additionalItems` → use `items: false` + `prefixItems`.
- `pattern` → must also define `maxLength` (≤50000); regex must be RE2-compatible (no lookahead/backrefs).
- `format` → must also define `maxLength` (≤50000). `uniqueItems: true` → must define `maxItems` (≤100000).
- All serialized data (contracts, state transitions) ≤ 16 KB.

### Indexes
```json
"indices": [
  { "name": "idxName", "properties": [{ "field": "asc" }], "unique": true }
]
```
- Index `name`: 1–32 chars, required, unique within the doc type.
- Max 10 indexes per doc type; max 10 unique indexes; max 10 properties per index.
- Sort order: only `"asc"` allowed (since v0.23).
- Indexed string property: hard cap 63 chars — give every indexed string an explicit `maxLength` ≤ 63.
- Indexed byteArray: ≤255 bytes. Indexed array items: ≤1024.
- `$id` may NOT be indexed. `$ownerId`, `$createdAt`, `$updatedAt`, `$transferredAt` CAN be (timestamps must be in `required` to be stored).
- `unique: true` = network-enforced uniqueness (error `duplicate unique properties` on collision).
- Optional: `nullSearchable` (default true), `contested` (masternode-vote contest on regex-matched premium-style values — fee, window, and outcomes in §5).
- Compound indexes work like MongoDB prefixes: queries must use fields in index order.

### System fields (auto-managed; returned on every document)
`$id`, `$ownerId`, `$revision`, `$dataContractId`, `$type`, `$createdAt`, `$updatedAt`, `$transferredAt` (+ `$...BlockHeight`/`$...CoreBlockHeight` variants), `$creatorId`, `$entropy`.

### Common validation failures (checklist)
missing `additionalProperties: false` · missing/duplicate `position` · empty `object` property · indexed string without `maxLength` ≤63 · `$id` in an index · `desc` in an index · `pattern`/`format` without `maxLength` · restricted keyword (`$ref`, `oneOf`…) · >100 properties · index name >32 chars · two identical indexes.

### Complete valid example — note-taking app ("dashnotes")
(strip `//` comments before use)
```json
{
  "note": {
    "type": "object",
    "documentsMutable": true,
    "canBeDeleted": true,
    "properties": {
      "message": { "type": "string", "maxLength": 1000, "position": 0 },
      "tag":     { "type": "string", "maxLength": 63,   "position": 1 },  // indexed => maxLength <= 63
      "pinned":  { "type": "boolean", "position": 2 }
    },
    "indices": [
      { "name": "byOwner",    "properties": [{ "$ownerId": "asc" }], "unique": false },
      { "name": "byOwnerTag", "properties": [{ "$ownerId": "asc" }, { "tag": "asc" }], "unique": false },
      { "name": "byUpdated",  "properties": [{ "$updatedAt": "asc" }], "unique": false }
    ],
    "required": ["message", "$createdAt", "$updatedAt"],
    "additionalProperties": false
  }
}
```

## 2. STATE TRANSITIONS + JS SDK

State transition (ST) = a signed change to Platform state submitted via DAPI. Payload types: `0` DataContractCreate · `1` Batch (documents: create/replace/delete/transfer/purchase/updatePrice; tokens: mint/burn/transfer/freeze/claim/purchase) · `2` IdentityCreate (asset lock) · `3` IdentityTopup (asset lock) · `4` DataContractUpdate · `5` IdentityUpdate (add/disable keys) · `6` CreditWithdrawal · `7` CreditTransfer · `8` MasternodeVote · `9–14` address-system ops (v3, live: create/top-up identity from Platform addresses, address transfers/funding/withdrawal) · `15–20` shielded-pool ops (v4, rolling out ~Jul 2026 — check docs). Every billed ST spends credits.

### Current JS SDK = `@dashevo/evo-sdk` (EvoSDK, WASM; v4.x)
- `npm install @dashevo/evo-sdk` (engines: Node ≥18.18). API docs: evo-sdk.dash.org
- LEGACY NOTE: older tutorials/StackOverflow use the deprecated `dash` package (`Dash.Client({ network, wallet: { mnemonic } })`, `client.platform.*`). If a user shows `Dash.Client` code, that's the legacy js-dash-sdk — current docs and support target EvoSDK. Say so and offer the migration.
- Factories: `EvoSDK.testnetTrusted()` / `EvoSDK.mainnetTrusted()` / `EvoSDK.localTrusted()` (dashmate devnet, quorum sidecar at 127.0.0.1:2444). Custom devnet addresses not yet supported in the WASM SDK.
- Identity keys derive from a BIP39 mnemonic via DIP-9/DIP-13 paths (`m/9'/{coin}'/5'/0'/0'/{identityIndex}'/{keyIndex}'`). 5 standard keys: 0=MASTER, 1=HIGH auth (documents/names), 2=CRITICAL auth (contracts+documents), 3=TRANSFER, 4=ENCRYPTION.
- Platform addresses (v3): bech32m L2 addresses (`tdash1...` testnet) that hold credits directly; derived via BIP44; used to create/top-up identities.

### Canonical flow
1. Connect: `const sdk = EvoSDK.testnetTrusted(); await sdk.connect();`
2. Fund a platform address (testnet: faucet → Core→Platform bridge).
3. Create identity: build `Identity` with 5 public keys → `sdk.addresses.createIdentity({ identity, inputs: [{ address, amount }], identitySigner, addressSigner })`. (Classic L1 asset-lock funding, ST types 2/3, also exists; current tutorials use the address path.)
4. Top up: `sdk.addresses.topUpIdentity({ identity, inputs: [{ address, amount }], signer })`.
5. Register contract: fetch nonce `sdk.identities.nonce(id)` → `new DataContract({ ownerId, identityNonce: nonce + 1n, schemas, fullValidation: true })` → `sdk.contracts.publish({ dataContract, identityKey, signer })`. Save the returned contract ID.
6. Documents: `new Document({ properties, documentTypeName, dataContractId, ownerId })` → `sdk.documents.create({ document, identityKey, signer })`.
7. Query: `sdk.documents.query({...})` — returns a `Map` of id → doc.
8. Update: fetch current doc → `new Document({ ...same ids..., revision: existingDoc.revision + 1n })` → `sdk.documents.replace({ document, identityKey, signer })`. Forgetting the revision bump (BigInt!) fails validation. Only works if the doc type is `documentsMutable`.
9. Delete: `sdk.documents.delete({ document: { id, ownerId, dataContractId, documentTypeName }, identityKey, signer })` — no fetch needed. Only if `canBeDeleted`.
10. Retrieve contract: `sdk.contracts.fetch(contractId)`; history (if `keepsHistory`): `sdk.contracts.getHistory({...})`. Known quirk: `fetch()` can return undefined for keepsHistory contracts — use getHistory.
- Known SDK quirk (dashpay/platform#3095): identity create may throw a proof-verification error even though the identity WAS created — the real identity ID is in the error text.

### Contract updates — compatibility rules
Only the owning identity can update. Flow: `sdk.contracts.fetch(id)` → `contract.version += 1` → `structuredClone(contract.schemas)`, modify → `contract.setSchemas(updated, undefined, true, undefined)` → `sdk.contracts.update({ dataContract, identityKey, signer })`.
Permitted (backward-compatible only): add new document types; add new OPTIONAL properties to existing types (with the next `position`); add non-unique indexes for properties added in the same update; update keywords/description; token config changes where contract rules authorize. NOT permitted: removing/renaming types or properties, changing existing property definitions or positions, adding new required properties, adding unique indexes to existing types — the update ST fails validation.

### Compact runnable example (testnet, read + write)
```javascript
import { EvoSDK, Document } from '@dashevo/evo-sdk';

const sdk = EvoSDK.testnetTrusted();
await sdk.connect();

// READ — tutorial contract, 'note' doc type
const CONTRACT = 'FW3DHrQiG24VqzPY4ARenMgjEPpBNuEQTZckV8hbVCG4';
const results = await sdk.documents.query({
  dataContractId: CONTRACT,
  documentTypeName: 'note',
  where: [['$ownerId', '==', '<identity id>']], // fields must be indexed
  orderBy: [['$ownerId', 'asc']],
  limit: 10,
});
for (const [id, doc] of results) console.log(id.toString(), doc.toJSON());

// WRITE — needs identity + signer (see Setup SDK Client tutorial's IdentityKeyManager;
// keyManager.getAuth() returns { identity, identityKey, signer })
const doc = new Document({
  properties: { message: `Hello @ ${new Date().toUTCString()}` },
  documentTypeName: 'note',
  dataContractId: CONTRACT,
  ownerId: identity.id,
});
await sdk.documents.create({ document: doc, identityKey, signer });
```

### Index ↔ query design (her #1 recurring dev task)
Design indexes FROM the queries, not the data. Worked example — "show a user's notes, newest first, filterable by tag":
```json
{ "name": "ownerUpdated", "properties": [{ "$ownerId": "asc" }, { "$updatedAt": "asc" }] }
{ "name": "ownerTagUpdated", "properties": [{ "$ownerId": "asc" }, { "tag": "asc" }, { "$updatedAt": "asc" }] }
```
```javascript
where: [['$ownerId','==',id]],                    orderBy: [['$updatedAt','asc']]  // uses ownerUpdated
where: [['$ownerId','==',id],['tag','==','work']], orderBy: [['$updatedAt','asc']]  // uses ownerTagUpdated
```
Rules of thumb: equality fields first, range/sort field last; one index per query shape; every `where` field must live in the SAME index; `$updatedAt` must be in `required` to exist. Reference contracts to imitate: DPNS and DashPay schemas in github.com/dashpay/platform (packages/dpns-contract, packages/dashpay-contract).

### Query syntax rules (frequent gotchas)
- Every field in `where` MUST be covered by a single matching index (including `$createdAt` etc.).
- Operators: `==`, `<` `<=` `>=` `>`, `in` (≤100 unique values), `Between`/`BetweenExcludeBounds`/`BetweenExcludeLeft`/`BetweenExcludeRight`, `startsWith`.
- Only ONE range operator per query; range/`in`/`startsWith` require `orderBy`; range ops only on the last two fields of the where clause; `in` only on the last two indexed properties.
- `limit` max 100; paginate with `startAt`/`startAfter` (document ID); `orderBy` must match the index's trailing fields (or exact inverse).
- Aggregate queries (v4 line, rolling out 2026 — check docs): `select: COUNT(*)/SUM(field)/AVG(field)` (+ optional `groupBy`); the doc type must declare `documentsCountable`/`documentsSummable`/`documentsAverageable`. SUM/AVG return as strings; HAVING/OFFSET/MIN/MAX not yet supported.

### Other SDKs
- Rust: packages/rs-sdk in github.com/dashpay/platform (crate name `dash-sdk`, consumed as a git dependency — NOT published on crates.io). The native implementation the WASM JS SDK wraps; choose it for backends, bots, indexers, proof-verification control. In-repo examples + docs.
- iOS: Swift SDK (packages/swift-sdk, with example app).
- Java/Android: no full Platform SDK — dashj covers Core payments; raw gRPC clients for Java/Android live in packages/dapi-grpc. Check docs for current status before recommending.

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

## 4. IDENTITIES & CREDITS

- Identity = on-chain public keys + a credit balance. Everything on Platform is done BY an identity; the identity that signs pays.
- DASH → credits: lock DASH on Core (asset lock; InstantSend or ChainLock proof) → identity create/top-up ST claims it. 1 duff = 1,000 credits, so 1 DASH = 10^11 credits. Credits pay storage (27,000 credits/byte, permanent) + processing fees; deleting data can earn a storage refund.
- Platform v3 adds bech32m platform addresses holding credits directly; identities can be created/topped-up from them.
- Anyone can top up any identity — apps can subsidize users' fees.
- Credits → DASH: identity credit withdrawal ST (subject to a network-wide daily limit). Credit transfer between identities: ST type 7.
- **Typical failure: insufficient credits** — STs fail when balance won't cover fees. Fix: `sdk.identities.fetch(id)` to check balance (`identity.toJSON().balance`) → top up. Document storage is the expensive part.
- Key requirements: identity updates (add/disable keys) need the MASTER key (key 0); contracts need CRITICAL auth (key 2); documents/names work with HIGH (key 1) or CRITICAL.
- Ops quickref: `sdk.identities.fetch(id)` · `sdk.identities.byPublicKeyHash(hash)` (recover ID from mnemonic key 0) · `sdk.identities.nonce(id)` (contract creation) · identity CONTRACT nonce for document STs. "Invalid nonce" = re-fetch and retry, don't cache across sessions.

### Tokens (live since Platform v2.0, June 2025)
Data contracts can also define fungible tokens (mint/burn/transfer/freeze, distribution rules, security groups for multiparty control, optional direct-purchase pricing) — no smart contract code, all declarative config validated by the network. SDK: `sdk.tokens.*`; DAPI has full token endpoints (`getIdentityTokenBalances`, `getTokenTotalSupply`, …). "Token on Dash" = this path; docs: Platform docs → Tokens.

## 5. DPNS USERNAMES

- DPNS = name service, itself a data contract. Names are domains under `.dash` (`alice.dash`); identities link to names.
- Registration is 2-phase to stop front-running: (1) `preorder` — salted hash of the name; (2) `domain` — the real name + salt. SDK: `sdk.dpns.registerName({ label, identity, identityKey, signer })` — pass only the label, no `.dash`.
- Name rules: 3–63 chars; `a-z A-Z 0-9 -`; no leading/trailing hyphen; normalized to lowercase with `o→0`, `i/l→1` (homograph defense, "Alice"→"a11ce") — uniqueness is on the normalized form.
- Premium names (<20 chars, no digits other than 0/1): contested — 0.2 DASH fee, 2-week masternode/evonode vote (evonode vote ×4; contenders can join in week 1); outcome = awarded or locked (nobody gets it; locked names currently can't be re-requested). Single requester wins by default.
- "Name already registered" error text: `duplicate unique properties`.
- Resolve/search (EvoSDK):
```javascript
const identityId = await sdk.dpns.resolveName('alice.dash');       // name -> identity ID
const names = await sdk.dpns.usernames({ identityId });            // identity -> names[]
const safe = await sdk.dpns.convertToHomographSafe('Alice');       // "a11ce" for prefix search
const hits = await sdk.documents.query({                           // prefix search on DPNS contract
  dataContractId: '<DPNS contract id>', documentTypeName: 'domain',
  where: [['normalizedParentDomainName', '==', 'dash'], ['normalizedLabel', 'startsWith', safe]],
  orderBy: [['normalizedLabel', 'asc']],
});
```

## 6. EVONODES vs MASTERNODES

| | Masternode | Evonode (HPMN) |
|---|---|---|
| Collateral | 1,000 DASH | 4,000 DASH |
| Serves | Core L1: InstantSend/ChainLocks quorums, governance | Everything a MN does + ALL of Platform: Drive, Tenderdash consensus, DAPI |
| Rewards | Core block reward MN share (uniform payment, once per cycle) | Same uniform Core payment + Platform block rewards & ST fees, paid in credits to its masternode identity each ~9.125-day epoch (owner/operator split mirrors L1) |
| Votes | 1 (governance & contests) | 4 |

Since the Aug 2024 reward reallocation fork, 37.5% of the Core-chain MN reward portion flows into the credit pool that funds evonode Platform rewards — evonodes no longer get 4 sequential Core block payments. Only evonodes host Platform state; regular masternodes never touch Drive/DAPI.

## 7. CORE PAYMENTS QUICKREF

- InstantSend is automatic on virtually all txs — quorum-locked in ~2s; safe to accept at zero confirmations once the `islock` is seen. ChainLocks make reorgs of confirmed blocks practically impossible.
- Integration: watch addresses via DAPI `subscribeToTransactionsWithProofs` (bloom filter; delivers tx + islock), or Core RPC/ZMQ on your own node, or Insight APIs.
- Addresses: mainnet base58 starts `X`; testnet starts `y`. Use fresh addresses per invoice (HD xpub derivation); never reuse.
- Payment URI / QR deep link (BIP21-style): `dash:XADDRESS?amount=0.5&label=Store&message=Order%2042` — encode that string in the QR.
- CoinJoin is OPTIONAL wallet-side privacy mixing — unrelated to payment processing.
- Verify any tx via DAPI `getTransaction`, your node's RPC, or an Insight explorer API; optionally wait 1 conf after the islock for belt-and-braces.

## 7b. NODE & INFRA QUICKREF

- **dashmate** (github.com/dashpay/platform, packages/dashmate): CLI to stand up masternodes, evonodes, full nodes, and local devnets (Docker). The supported path for evonode operators.
- Evonode needs: 4,000 DASH collateral, static IP, Core + Tenderdash + Drive + DAPI (dashmate handles the stack), Core p2p 9999 mainnet / 19999 testnet.
- Local dev without testnet: dashmate local devnet → `EvoSDK.localTrusted()` (quorum sidecar 127.0.0.1:2444).
- Setup guides: docs.dash.org masternode section; Platform docs → tutorials → set up a node.

## 8. TESTNET QUICKREF

- Faucet (test DASH): https://faucet.testnet.networks.dash.org/
- Core→Platform bridge (community-run; fund platform addresses): https://bridge.thepasta.org/
- Core testnet explorer: https://insight.testnet.networks.dash.org/insight/
- Platform explorer: https://platform-explorer.com/ (testnet: https://testnet.platform-explorer.com/)
- DAPI seeds: seed-1.testnet.networks.dash.org:1443 (through seed-5)
- Tutorial contract (testnet, `note` type): `FW3DHrQiG24VqzPY4ARenMgjEPpBNuEQTZckV8hbVCG4`; DPNS testnet contract: `GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec`
- 4-step start: faucet → bridge-fund a `tdash1...` address → identity + credits → publish contract, submit documents. Minutes, pennies of test DASH. Test on testnet first — contract updates are append-only forever on mainnet, and mainnet registration costs real credits.

## 9. GOVERNANCE MATH QUICKREF

- Block reward split since v20 (activated Dec 2023): 60% masternodes / 20% miners / 20% treasury.
- Superblock every 16,616 blocks (~30.29 days) pays approved proposals from the treasury.
- Proposal: 1 DASH fee (burned), listed on DashCentral.org / dash.vote.
- Passing: net yes (yes − no) > 10% of the total masternode count at tally time. Evonodes carry 4 votes each (weight = collateral/1000).
- Voting cutoff: 1662 blocks before the superblock; votes changeable any time until then. Funding is ranked by net-vote margin until the cycle budget is exhausted — passing the threshold isn't enough. No partial funding: an oversized passer is skipped and smaller passers can jump the queue. Unallocated treasury is simply never minted.
- Proposal lifecycle: draft + community feedback (Dash Forum / DashCentral discussion) → submit on-chain (`gobject`, 1 DASH burn; DashCentral/dash.vote wrap this) → MNOs vote (DashCentral, Dash Masternode Tool, or `dash-cli gobject vote-many`) → superblock pays winners directly on-chain.
- Practical guidance: submit early in the cycle, budget in DASH (payout is DASH-denominated), multi-month proposals re-compete each cycle unless structured otherwise.

## 10. CANONICAL LINKS

| What | URL |
|---|---|
| Core docs (truth) | https://docs.dash.org |
| Platform docs | https://docs.dash.org/projects/platform |
| Data contract reference | https://docs.dash.org/projects/platform/en/stable/docs/reference/data-contracts.html |
| Query syntax | https://docs.dash.org/projects/platform/en/stable/docs/reference/query-syntax.html |
| DAPI endpoints | https://docs.dash.org/projects/platform/en/stable/docs/reference/dapi-endpoints.html |
| Tutorials (JS) | https://docs.dash.org/projects/platform/en/stable/docs/tutorials/introduction.html |
| Evo SDK (npm) | https://www.npmjs.com/package/@dashevo/evo-sdk |
| Evo SDK API docs | https://evo-sdk.dash.org |
| Platform source (rs-sdk, contracts) | https://github.com/dashpay/platform |
| Tutorial code repo | https://github.com/dashpay/platform-tutorials |
| Roadmap (live vs planned) | https://www.dash.org/roadmap/ |
| Mainnet block explorers | https://insight.dash.org · https://blockchair.com/dash |
| Governance | https://www.dashcentral.org · https://dash.vote |
| Forum / community | https://www.dash.org/forum · https://www.reddit.com/r/dashpay |
| Staking / wallets (third-party) | https://crowdnode.io · https://vultisig.com |
| Human support escalation | https://t.me/TheDashSupportTEAM |
