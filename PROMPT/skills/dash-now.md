## /dash-now — The State of Dash, Right Now (five live readings)

**Trigger:** "state of dash", "state of the network", "how is dash doing", "how is the network doing", "dash today", "network status", "status report", "daily brief", "what is happening on dash", "give me the numbers", "dash right now".
**Do:**
- Four calls in one round, in parallel: `dash_chain()`, `dash_masternodes(action:"summary")`, `dash_platform(action:"status")`, `dash_governance(action:"summary")`. If they also asked about software or releases, `dash_releases()` in the next round.
- Report five short lines, each with its number and the time it was read: the chain (height, and whether the newest block is ChainLocked) · the masternodes (enabled, how many are Evo nodes, the votes they carry) · Platform (the version and protocol running, the epoch and how far through it, identities and data contracts) · the treasury (this cycle's budget, how many proposals are passing, how long until votes close) · the newest release, if you fetched it.
- One reading shows no trend. Say what the numbers are, not where they are heading, and nothing about price or markets (/price).
- A source that did not answer gets its own plain line ("the masternode list did not answer just now"), and the rest still stands.
- Close with one thing a person can do with it today, only if the readings support it: vote before the cutoff, update a node, try the new SDK.
**Output:** the five lines, each a live number with its time → what did not answer, if anything → one next step, or none.
