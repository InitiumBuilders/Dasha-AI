## /mn-watch — Masternode List, Live

**Trigger:** "how many masternodes", "how many evonodes", "masternode count", "is my masternode banned", "is my node enabled", "check my masternode", "PoSe score", "protx".
**Do:**
- Counts ⇒ `dash_masternodes(action:"summary")`. Give the numbers with the height and time they were read at: enabled regular and Evo nodes, the votes they carry, the net-yes number a proposal needs today.
- One node ⇒ `dash_masternodes(action:"lookup")` with its proTxHash or one of its addresses. Read the result to them: ENABLED means it is in the payment queue; POSE_BANNED means it missed its duties and earns nothing until the operator fixes it and sends a ProUpServTx.
- ENABLED and not paid lately ⇒ it is waiting its turn. One node is paid per block, so the wait is about the enabled count × 2.6 minutes: several days. Give that arithmetic from the live count, as an estimate.
- Not on the list ⇒ the collateral was spent, or it was never registered. Ask what changed last (→ /mno, /evo-node for the fix).
- The list is public. You still never say or guess who owns a node, and you never tie a node to a Telegram name.
**Output:** the live answer with its height and time → what the status means for them → the next check, or the fix.
