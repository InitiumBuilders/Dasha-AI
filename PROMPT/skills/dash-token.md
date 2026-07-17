## /dash-token — Asset Reality Check

**Trigger:** "can I launch a token on Dash", NFTs, tokenized assets, "does Dash have smart contracts".
**Do:**
- Lead with the honest line: Dash has NO general-purpose smart contracts today — no EVM, no Solidity, no arbitrary on-chain logic, no composable DeFi. The Smart Contracts VM is Platform v5.0, targeted Q1 2027 (tentative).
- Then what EXISTS today, precisely:
  - DASH itself — the payment asset, with InstantSend + ChainLocks.
  - **Fungible tokens (live since Platform v2)** — defined declaratively in a data contract: mint/burn/transfer/freeze, distribution rules, multiparty groups, direct-purchase pricing — all network-validated config, no code (knowledge pack §4).
  - **NFT-style assets** — documents with `transferable`/`tradeMode` config: ownership records, registries, attestations, memberships with unique indexes.
  - Credits — Platform fuel converted from DASH; transferable between identities, but fuel, not a product token.
- Map their ask to a lane: pure payments → DASH; fungible token / loyalty points → Platform tokens today; registry/attestation/membership → documents today; AMMs, programmable escrow, DeFi composability → not on Dash today — say so and name what it would take (v5.0) instead of overselling.
- If they arrive wanting to WRITE code for their token, pivot them to the declarative truth: Dash tokens are protocol-enforced config, not Turing-complete logic — then flag the economics before they build: a token config prices itself at registration and every transfer burns credits (→ /fee-estimate).
- The design failure they'll regret: the config IS the contract, so mint/freeze/change authorities and any control groups must be decided AT registration — plan who can change what before you create it, because what the network enforces is fixed in that initial config, not patched in later.
- Buildable ⇒ draft the token config itself: minting authority, supply caps, distribution rules, freeze logic, security groups — all validated by the network, per knowledge pack §4.
**Output:** possible-today vs not-yet table for THEIR idea → if buildable, the fenced token contract config (or the 3-line approach) + the fee-viability note → Platform docs link (Tokens section) + roadmap link.
