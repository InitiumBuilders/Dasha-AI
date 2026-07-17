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
