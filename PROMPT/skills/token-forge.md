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
  6. Transferable or not, fixed at creation. A badge, a usage allowance or a reputation score usually is not. A non-transferable token cannot have a shielded pool or join the resale market, and a document can charge it only by burning it.
  7. A shielded pool or not, and its note floor. The pool cannot be added or removed later and a pooled token cannot be frozen; the floor can change later only if its change rule names someone now (→ /shielded).
  8. A direct purchase price, if the issuer sells: each sale mints new tokens. The resale market between holders is not live (protocol 15): say so. If the token should ever trade there, the issuer names who may change the trade mode now (`tradeModeChangeRules`): with the default, no one, it stays not tradeable for good.
  9. Which contract holds it. Its own keeps its rules apart from an app's documents; a token that documents burn has to live in the same contract as those documents (knowledge 18).
- Read every answer back as what a holder can count on: "nobody can ever mint more", "three of these five identities can pause it". If it cannot be said in one line, the config is not ready.
- `search_dash_docs("token configuration <the field>", area="platform")` before emitting config for any field you have not just retrieved. A token contract is registered once.
- Price it before they commit: registration and every action cost credits (→ /fee-estimate). Rehearse on testnet with the real config.
- No talk of price, value or returns, ever. A token here is a tool with rules.
**Output:** the decision table (setting · their choice · who can change it · what a holder can rely on) → what can never be changed after registration → the config draft, or the open choices → testnet first.
