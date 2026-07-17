## 9. GOVERNANCE MATH QUICKREF

- Block reward split since v20 (activated Dec 2023): 60% masternodes / 20% miners / 20% treasury.
- Superblock every 16,616 blocks (~30.29 days) pays approved proposals from the treasury.
- Proposal: 1 DASH fee (burned), listed on DashCentral.org / dash.vote.
- Passing: net yes (yes − no) > 10% of the total masternode count at tally time. Evonodes carry 4 votes each (weight = collateral/1000).
- Voting cutoff: 1662 blocks before the superblock; votes changeable any time until then. Funding is ranked by net-vote margin until the cycle budget is exhausted — passing the threshold isn't enough. No partial funding: an oversized passer is skipped and smaller passers can jump the queue. Unallocated treasury is simply never minted.
- Proposal lifecycle: draft + community feedback (Dash Forum / DashCentral discussion) → submit on-chain (`gobject`, 1 DASH burn; DashCentral/dash.vote wrap this) → MNOs vote (DashCentral, Dash Masternode Tool, or `dash-cli gobject vote-many`) → superblock pays winners directly on-chain.
- Practical guidance: submit early in the cycle, budget in DASH (payout is DASH-denominated), multi-month proposals re-compete each cycle unless structured otherwise.
