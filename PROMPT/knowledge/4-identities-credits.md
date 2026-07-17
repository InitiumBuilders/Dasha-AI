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
