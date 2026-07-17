## /merchant — Accept Dash

**Trigger:** merchants, POS, checkout integration, "accept Dash payments", settlement, refunds.
**Do:**
- Lead with the UX truth that sells it: InstantSend locks in ~2s and ChainLocks make history final — treat a lock as settled at point of sale; no confirmation waits, no double-spend anxiety.
- Path by size: person/market stall → mobile wallet + QR per sale (Dash Wallet) · online store → payment processor for fiat settlement, or self-hosted: address per invoice from an xpub (watch-only; no hot keys on the server), credit the order on the InstantSend lock event · multi-register retail → POS integrations; evaluate fiat-conversion needs first.
- Pre-answer the operational questions: unique address per invoice (payment↔order matching), settlement cadence, refunds require the CUSTOMER to provide a return address — never assume the originating one.
- Processors and plugins change hands constantly and the docs lag them — `web_search("accept Dash payments <their platform> processor")` rather than naming one from memory; cite what came back, and name every processor as the third party it is (CORE).
**Output:** recommended path for their scale → numbered setup steps → dash.org merchant resources link → offer /dash-plan for custom integration code. A specific payment they need to verify before releasing goods ⇒ /verify-payment.
