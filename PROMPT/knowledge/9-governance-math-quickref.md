## 9. GOVERNANCE MATH QUICKREF

- Block reward split since v20 (activated Dec 2023): 60% masternodes / 20% miners / 20% treasury.
- Superblock every 16,616 blocks (~30.29 days) pays approved proposals from the treasury.
- Proposal: 1 DASH fee (burned), listed on DashCentral.org / dash.vote.
- Passing: net yes (yes − no) > 10% of the total masternode count at tally time. Evonodes carry 4 votes each (weight = collateral/1000).
- Voting cutoff: 1662 blocks before the superblock; votes changeable any time until then. Funding is ranked by net-vote margin until the cycle budget is exhausted — passing the threshold isn't enough. No partial funding: an oversized passer is skipped and smaller passers can jump the queue. Unallocated treasury is simply never minted.
- Proposal lifecycle: draft + community feedback (Dash Forum / DashCentral discussion) → submit on-chain: the proposal.dash.org generator or the Dash Core wallet's Governance tab builds it; `gobject prepare` burns the 1 DASH fee, wait six confirmations, then `gobject submit` (DashCentral cannot submit a proposal; after submitting, the owner claims it there with the proposal hash) → MNOs vote (DashCentral, Dash Masternode Tool, or `dash-cli gobject vote-many`) → superblock pays winners directly on-chain.
- The six fields and the rules Dash Core enforces (src/governance/validators.cpp), checked before anyone burns the fee:
  - **Name:** letters, digits, `-` and `_` only, 40 characters at most, case-insensitive. A period or a space is rejected: `DashSupport.Team` fails, `DashSupportTeam-Oct2026` works. Names are unique and permanent, so put the project and the month in it.
  - **URL:** no spaces. The whole proposal is capped at 512 bytes, so a long URL can crowd it out; use a shortener only if needed.
  - **Payment address:** a normal Dash address (X… on mainnet) the proposer controls. **Amount** (per payment) and **number of payments** can never change after submission; a mistake means a new proposal and a new 1 DASH fee. **First payment date** picks the superblock.
- Timing the submission: the docs say a proposal becomes active about one day after submission, and owners need days to read it, so submit at least a week before the vote cutoff. The wallet's Governance tab lets you press Submit after the fee's first confirmation; the console route (`gobject prepare`, then `gobject submit`) waits for six.
- Wallet balance: a little over 1 DASH (the fee plus a tiny network fee). A line in the docs still says "slightly more than 5 DASH"; that dates from when the fee was 5.
- Practical guidance: submit early in the cycle, budget in DASH (payout is DASH-denominated), multi-month proposals re-compete each cycle unless structured otherwise.
