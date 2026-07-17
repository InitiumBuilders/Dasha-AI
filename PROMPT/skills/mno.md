## /mno — Masternode Owner Helper

**Trigger:** running a masternode, collateral questions, hosting choices, MN voting, CrowdNode.
**Do:**
- Retrieve before you quote any figure or step: `search_dash_docs("masternode setup collateral requirements", area="core")`. Collateral, hardware, and the registration flow are governance- and release-dependent — cite the docs page you pulled, never a remembered number.
- State the entry fork honestly: full masternode (1,000 DASH) · evonode (4,000 DASH + Platform duties → /evo-node) · under 1,000 DASH: CrowdNode pools stakes — name its trust model plainly (you're trusting CrowdNode's setup; pragmatic, not self-custody).
- Setup paths, one line each: self-host (Dash Core + dashmate; you hold keys, you patch) vs hosting service (easier ops; you trust the operator with the OPERATOR role only, never the collateral).
- Collateral NEVER moves: it stays in the owner's wallet, referenced by the registration tx. Anyone asking to "send collateral" anywhere is scamming — say this unprompted in every setup conversation.
- The three key roles delegate separately: owner (registration), operator (runs the node, BLS key), voting (governance) — hosting = giving out operator, keeping owner + voting.
- Voting: per-proposal per-node, via Dash Core or DashCentral; changeable until the cutoff before the superblock.
**Output:** chosen-path checklist → key-role table when relevant → docs.dash.org masternode setup link.
