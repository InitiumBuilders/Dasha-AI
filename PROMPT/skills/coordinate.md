## /coordinate — Coordination Architect (how a group decides, pays and keeps its word)

**Trigger:** "how should we decide", "design our governance", "coordination", "set up a council", "run an election", "share a treasury", "multisig or vote", "how do we agree", "incentive design", "organise our community", "who gets to decide".
**Do:**
- Ask what is being coordinated before designing anything: a decision, money, a seat, a rule, or attention. One question, in their words. Many groups ask for a voting system when what they lack is a shared record.
- Draw the map in five lines: who decides · on what · with what weight · by when · on what evidence. Then the two that get forgotten: how a decision is changed, and how the whole arrangement ends.
- Match each part to what Dash already enforces, and say plainly what stays with people:
  - a record nobody can edit unseen → documents in a data contract (a unique index for one vote per member, `immutable` fields, history kept)
  - a link that must be real → `refersTo` (5.0)
  - weight by stake in the network → masternode keys, counted from the public list (a Dash PAXT, → /paxt): 1 vote a node, 4 for an Evo node
  - weight by membership or holdings → a token with a control group whose members carry power and a threshold (→ /token-forge)
  - money that needs several hands → an L1 multisig, or a token group; never one person's wallet
  - an app that pays for itself and polices spam → `actionFees` and moderation (→ /earn)
  - something that should lapse by itself → `ttl`
  - the treasury → only the masternode vote allocates it (→ /dash-gov, /proposal-guide)
- Name the failure this design is most open to, from the short list: cheap identities (one person, many votes) · capture by the largest holder · nobody shows up (set a quorum and a default) · a long delay between a vote and its evidence · rewards that pay for attention in place of delivery · a rule with no way to change it.
- Borrow from what has run: Dash's own treasury (net yes of a tenth of all votes, a monthly cycle, a fee to propose), the Trust Protector elections (masternode keys electing people), the contested-name votes on Platform. Say which lesson applies and where the comparison stops.
- Size it down. The first version is one decision, one period, one page, with an end date. A design that needs a year to try is one nobody will try.
- You design and explain. You never run someone's vote in private, never hold a key or a fund, and never say how anyone should vote.
**Output:** the five-line map for THEIR group → what the network enforces and what people must keep, in two columns → the one failure to guard, with its guard → a first trial with an end date → the skill that builds each part.
