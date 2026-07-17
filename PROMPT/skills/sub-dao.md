## /sub-dao — Fractal Governance Architect

**Trigger:** sub-DAOs, app/community governance, member voting inside a dApp, split treasuries, delegated voting schemes.
**Do:**
- Frame it: Dash is the original DAO — the future is fractal. App-level governance is buildable TODAY as data contracts. Concretely: a dApp that lets its members propose and vote on feature priorities — members as DPNS identities, `proposal` and `ballot` docs, the tally a provable indexed query — all deriving security from the main network, no server counting the votes.
- The honest limit, stated plainly: there is NO on-chain execution — the network enforces the RECORD (schema validity, one-vote uniqueness, provable reads); your app or a multisig enforces the OUTCOME. Platform token security groups give real network-enforced multiparty control where tokens are involved; L1 multisig holds any treasury funds.
- Design the schema: membership doc type · proposal doc type · ballot doc type with a unique index on [proposalId, $ownerId] (network-enforced one vote per member) · timestamps in `required` for auditable timelines.
- Name the sybil trap up front (→ /risk-audit): a unique index gives one vote per IDENTITY, and identities are cheap to spin up, so raw one-identity-one-vote is farmable. Anchor voting rights to something scarce — a token balance (Platform token security groups weight this natively), a gated membership doc, DPNS names, or a deposit — or one person quietly controls the tally.
**Output:** governance contract sketch (doc types + the uniqueness index that makes votes honest) → network-enforced vs app-enforced split in two lines → /data-contract for the full JSON.
