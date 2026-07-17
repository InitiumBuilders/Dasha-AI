# Skills

*The 35 workflows she can bring to a question — what each one does, and when it fires.*

A skill is not a plugin. It is a way of thinking about a kind of problem, written into
[`PROMPT/SKILLS.md`](../PROMPT/SKILLS.md) and shipped in every request. Most fire **on their own**,
matched against what you're actually asking — you never need to type a slash. Type one anyway
when you want to be sure which mind you get: some skills route straight to her engineering or
judgement tier ([why](ARCHITECTURE.md#the-router)).

Three of them never appear on a menu at all — `/x-reply`, `/translate` and `/price` are surface
and safety rules that fire silently, whenever the situation calls for them.

Skills own workflows. Facts live in [`PROMPT/KNOWLEDGE.md`](../PROMPT/KNOWLEDGE.md); tool
contracts live once in `PROMPT/PROMPT-CORE.md`. A skill names the tool it leads with and never
restates the doctrine.

---

## Build
*Making something on Dash Platform. Most route to the engineering mind; the exceptions are marked.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/dash-plan`** | Turns "I want to build X on Dash" into a real architecture and a first step. | An app idea in hand; "where do I start" *with* something to start on. |
| **`/data-contract`** | Authors and validates data contracts — plain English in, JSON Schema the network will accept out. | "data contract", "schema", contract validation errors, "how do I store X on Platform". |
| **`/state-transition`** | Writes the SDK code that actually writes to Platform. | "register my contract", create/update/delete a document, identity and credit code. |
| **`/grove-query`** | Optimizes Drive queries and demystifies proofs. | Slow or failing queries, "no index" and where-clause errors, invalid-proof errors, fetching wide and filtering client-side. |
| **`/schema-migrate`** | Navigates contract updates without breaking the users you already have. | "update my contract", adding fields, versioning, "will this break my index". |
| **`/zero-server`** | Argues you out of a backend you don't need — wires the client to DAPI directly. | "what backend do I need", plans for a middleman API or indexer, "do I need to run a node". |
| **`/identity-keys`** | Guards the key hierarchy: which key signs what, and why the master key isn't for daily use. | Identity key questions, Platform auth flows, key compromise fears. |
| **`/dash-ai`** | Architects agents and AI apps on Dash — agent payments, memory, state. | Bots, agents, AI on Dash, and "how was Dasha built". |
| **`/scale`** | Audits for velocity before traffic finds the ceiling. | High traffic, mass onboarding, DAPI rate limits, "will this handle N users". |
| **`/dash-token`** | The honest answer about tokens, NFTs, and smart contracts on Dash today. | "can I launch a token", "does Dash have smart contracts". |
| **`/fee-estimate`** | Prices a design before it's built — on retrieved numbers only, never a remembered fee. *(Not force-routed: the tier follows the question.)* | "what will this cost", credit budgeting, "is this viable at N users", "why did that burn so many credits". |
| **`/shielded`** | Privacy architecture in honest mode — what exists now versus what is roadmap. | Privacy on Platform, shielded balances, zero-knowledge proofs, anonymous dApps. |
| **`/compare-chain`** | Translates for arriving devs, without pretending Dash is something it isn't. | "Dash vs X", devs from Ethereum/Solana/Bitcoin, "does Dash have an EVM". |
| **`/envision`** | Open-ended creative brainstorm, grounded in what Dash can actually do. *(Judgement mind.)* | "what could I build", hackathon ideas, "what's possible on Dash". |

## Run
*Something is live, or refusing to be. Errors route to the engineering mind.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/dash-debug`** | Systematic debugging — reads the error, forms a hypothesis, tests it. | Errors, timeouts, "not working", failed broadcasts, DAPI issues, credit and fee errors. |
| **`/mno`** | Masternode ownership, end to end. | Running a masternode, collateral, hosting choices, MN voting, CrowdNode. |
| **`/evo-node`** | Evonodes specifically — Platform hosting, rewards, dashmate setup. | Evonodes, "high-performance masternode", Platform hosting. |
| **`/network-health`** | A live read of the chain, via `dash_network_stats`. Throughput, never price. | "is the network busy", "why is my tx slow", height / mempool / supply questions. |
| **`/tx-explain`** | Reads a transaction and says what it *means* — confirmed vs pending, InstantSend finality. | A pasted txid, explorer links, "is my payment confirmed". |
| **`/verify-payment`** | Settles whether money actually landed, from the chain rather than from a screenshot. | "did this payment go through", a pasted "proof of payment", P2P release, "can I ship it". |
| **`/merchant`** | Accepting Dash for real — POS, checkout, settlement, refunds. | Merchants, integrations, "accept Dash payments". |

## Govern
*The DAO. She shows the arithmetic; she never tells you how to vote. `/proposal-guide` and `/motus`
route to the judgement mind; `/sub-dao` is a schema job and routes to engineering; `/dash-gov`
follows the question.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/dash-gov`** | Explains governance from live DashCentral data — tallies, thresholds, votes still needed. Ranks by net votes; never prices the queue. | Proposals, voting, treasury, superblock timing, "is X passing". |
| **`/proposal-guide`** | Coaches a proposal into its strongest honest form before it costs you the fee. | "how do I submit a proposal", budget asks, drafts, "would the network fund X". |
| **`/sub-dao`** | Fractal governance — voting inside a dApp, split treasuries, delegation. | Sub-DAOs, app and community governance, delegated voting schemes. |
| **`/motus`** | Maps systemic movement: values in motion, collective commitments, movement economies. | Motus, Motivus, Unitium, Currence, SiD, systemic change. |

## Protect
*The skills where being wrong costs someone real money. She is at her plainest here.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/scam-check`** | Names the pattern in what someone just sent you. | "is this legit", a pasted DM or offer, "someone from Dash support contacted me", giveaways. |
| **`/wallet-help`** | Chooses a wallet and secures it. Never keys, never seeds — no exceptions. | Which wallet, backup, recovery, setup problems, "is my wallet safe". |
| **`/wallet-rescue`** | Triages missing funds calmly — `lookup_address`'s `totalSent` settles *display bug* versus *real loss* in one round. | "my Dash is gone", zero balance, locked out, "was I hacked". |
| **`/risk-audit`** | White-hat systemic audit — attacks your design before someone else does. | "audit my schema", pre-launch review, sybil resistance, "can this be abused". |
| **`/price`** | Deflects price talk. Closed from every direction: no tool carries price, `web_search` is not a workaround, stats are not a proxy. | "price of DASH", "will it pump", predictions, portfolio questions. **Silent — never in the menu.** [Why](PHILOSOPHY.md#why-she-will-not-talk-price). |
| **`/human-support`** | Hands you to a real person and streams a ticket to the team's channel. **Server-handled** — never reaches a model. Her job is to offer it at the right moment. | Any time a human is the better answer. Always available. |

## Learn
*The skills that aim at their own obsolescence.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/learn-dash`** | A zero-to-builder path. *(Judgement mind.)* | "I'm new", "teach me Dash", "where do I start" with **no** idea yet — with an idea, `/dash-plan` takes it. |
| **`/doc-dive`** | Deep multi-source documentation research when one search can't settle it. | Hard cross-cutting questions, conflicting information, "what's new" / "is X live yet" — exactly where her training is oldest and retrieval matters most. |
| **`/x-reply`** | The conduct of a public reply: never speak first, never DM, de-escalate. **Silence is a valid output.** | Every reply composed for the X timeline. **Silent — fires on its own.** |
| **`/translate`** | Answers in the language you asked in. | Any message not in English, or "answer in \<language\>". **Silent — fires on its own.** |

---

**35 skills.** 32 appear on the "what can you do" menu; `/x-reply`, `/translate` and `/price`
fire on their own.

**Next:** [PHILOSOPHY.md](PHILOSOPHY.md) — why she works this way ·
[ARCHITECTURE.md](ARCHITECTURE.md) — the router and the tools ·
[CONTRIBUTING.md](../CONTRIBUTING.md) — sharpen a skill · [SELF-HOST.md](SELF-HOST.md).
