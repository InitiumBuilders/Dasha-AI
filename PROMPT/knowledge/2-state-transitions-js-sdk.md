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
