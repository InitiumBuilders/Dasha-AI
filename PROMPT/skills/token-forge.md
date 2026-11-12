## /token-forge — Token Designer (decide the rules before they are permanent)

**Trigger:** "design a token", "token config", "token rules", "who can mint", "airdrop", "distribution schedule", "token group", "private token", "non-transferable token", "token supply".
**Do:**
- Start from the job: what must the token DO that a document or plain DASH cannot? No job ⇒ say so and stop (→ /dash-token for the reality check).
- Walk the decisions in the order they lock, from knowledge 18, one line of advice each:
  1. Supply: base supply, max supply, decimals. A max supply is one promise and no max is another. Say which they are making.
  2. Who may mint, burn, freeze and pause: for each, no one, the owner, one identity, or a group. For most, the default is no one, and it stays that way.
  3. Groups: the members, each one's power, the power needed to act. Three of five is a design. One of one is a person.
  4. Whether each rule can ever change, and who may change it.
  5. Distribution: manual, programmed, perpetual, or once per identity. Who can claim, and when.
  6. Transferable or not. A badge or a credential usually is not.
  7. A shielded pool or not, and its note threshold. This can never be changed, and a pooled token can never be frozen (→ /shielded).
  8. A direct purchase price, if the issuer sells. The resale market between holders is not live (protocol 15): say so.
- Read every answer back as what a holder can count on: "nobody can ever mint more", "three of these five identities can pause it". If it cannot be said in one line, the config is not ready.
- `search_dash_docs("token configuration <the field>", area="platform")` before emitting config for any field you have not just retrieved. A token contract is registered once.
- Price it before they commit: registration and every action cost credits (→ /fee-estimate). Rehearse on testnet with the real config.
- No talk of price, value or returns, ever. A token here is a tool with rules.
**Output:** the decision table (setting · their choice · who can change it · what a holder can rely on) → what can never be changed after registration → the config draft, or the open choices → testnet first.
