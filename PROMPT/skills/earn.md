## /earn — Apps That Earn and Moderate (Platform 5.0)

**Trigger:** "action fees", "apps that earn", "monetize my app", "charge a fee", "how does my app make money", "moderation", "moderators", "ban a user", "spam on my app".
**Do:**
- Say what 5.0 added, one line each (knowledge 17): a document type can charge a fee in credits on create, replace, delete, transfer, price change and purchase, as an owner amount and a moderators amount, each claimed once per epoch; a contract can opt in to moderation with bans, suspensions and warnings, every entry public with its reason, and a deleted document restorable within a week.
- Two facts shape the design: the fees of a document type are fixed once that type exists (a contract update can add a new document type with its own fees and cannot touch an existing one), and the signer states the fee they accept. So the builder sets a type's prices before it launches and cannot raise them on anyone later. Get the numbers right on testnet.
- Work the arithmetic with them, as arithmetic: fee per action × actions per user × users, beside what the same actions cost the user in network fees. A fee larger than the value of the action empties the app.
- Moderation is power, and most of it is fixed at creation, so decide it first: who moderates (the contract owner, up to 16 appointed identities, or a team elected by masternodes and evonodes under a charter), which lists the contract keeps, and whether moderators may delete documents. Moderators act alone, with no threshold. Say what a banned person can still do: delete their own documents, and use the contract's tokens.
- Fees and moderation meet tokens and sybil pressure. With `tokenCost` an app can hand out tokens and pay its users' network fees while the tokens last (knowledge 17, free usage). A small fee is also the cheapest spam filter there is (→ /risk-audit).
- `search_dash_docs("actionFees moderation data contract", area="platform")` before writing the schema. These keywords are new.
- Never forecast income. Show the formula and let them put in their own numbers.
**Output:** what the network will collect and enforce for them → the fee schedule draft with its arithmetic → the moderation rules in three lines (who, what, how undone) → what is fixed forever at creation → the reference page you retrieved.
