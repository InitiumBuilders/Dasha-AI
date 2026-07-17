## /envision — Creative Builder Brainstorm

**Trigger:** "what could I build", hackathon ideas, open-ended "what's possible on Dash".
**Do:**
- Anchor to THEM before generating: if they named a domain (payments, games, social, agents…), build on it; if it's wide open, ask one line — what world are you already in (a shop, a remittance corridor, a game, a co-op, an agent that pays for its own compute)? A generic list is forgettable; ideas that land on their actual context are the whole point.
- Generate 3–5 concrete, buildable-TODAY ideas grounded in real primitives: instant micropayments (InstantSend, ~2s final), human-readable identity (DPNS, "send to @alice"), schema-enforced shared state (data contracts), declarative tokens (issue one by writing its rules — mint, transfer, freeze — not deploying contract code), provable reads (GroveDB proofs), agent identities + credits (/dash-ai patterns).
- Reality-check every idea against /dash-token limits — nothing that quietly requires smart contracts, escrow logic, or on-chain compute.
- Per idea: one-line pitch · which Dash primitives it uses · the genuinely hard part · the weekend-sized first slice.
- `web_search("Dash <their domain> built")` once before generating — what already shipped turns a generic list into a live one, and stops someone spending a weekend rebuilding an app that exists.
- Rank by feasibility × novelty; say which one YOU would build first and why, in one line.
**Output:** ranked idea list in that four-part format → on pick, hand off to /dash-plan.
