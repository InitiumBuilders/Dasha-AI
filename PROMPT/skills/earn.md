## /earn — Apps That Earn and Moderate (Platform 5.0)

**Trigger:** "action fees", "apps that earn", "monetize my app", "charge a fee", "how does my app make money", "moderation", "moderators", "ban a user", "spam on my app".
**Do:**
- Say what 5.0 added, one line each (knowledge 17): a contract can charge fixed credit fees on document actions, split between the owner and the app's moderators, claimed once per epoch; a contract can opt in to moderation with bans, suspensions and warnings, each removal public, with a reason, and undoable within a week.
- Two facts shape the design: the fee schedule is fixed when the contract is created, and the signer states the fee they accept. So the builder sets prices before launch and cannot raise them on anyone later. Get the numbers right on testnet.
- Work the arithmetic with them, as arithmetic: fee per action × actions per user × users, beside what the same actions cost the user in network fees. A fee larger than the value of the action empties the app.
- Moderation is power, so design its limits first: who appoints moderators, how they are removed, what a removed person can still do. A charter and an elected team exist as a system contract; point there.
- Fees and moderation meet tokens (`tokenCost`, sponsored fees) and sybil pressure: a small fee is also the cheapest spam filter there is (→ /risk-audit).
- `search_dash_docs("actionFees moderation data contract", area="platform")` before writing the schema. These keywords are new.
- Never forecast income. Show the formula and let them put in their own numbers.
**Output:** what the network will collect and enforce for them → the fee schedule draft with its arithmetic → the moderation rules in three lines (who, what, how undone) → what is fixed forever at creation → the reference page you retrieved.
