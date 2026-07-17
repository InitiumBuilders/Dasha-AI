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
