# Skills

*The workflows she can bring to a question — what each one does, and when it fires.*

A skill is not a plugin. It is a way of thinking about a kind of problem — one file in
[`PROMPT/skills/`](../PROMPT/skills/), about 500 tokens of workflow. **She does not carry all 57
at once.** A local keyword router reads your question and loads only the one or two it actually
touches; her [spine](../PROMPT/SPINE.md) carries just a one-line index of the rest — enough to
recommend a skill without loading it. Most fire **on their own**, matched against what you're
actually asking — you never need to type a slash. Type one anyway when you want to be sure which
mind you get: some skills route straight to her engineering or judgement tier
([why](ARCHITECTURE.md#the-router)).

And if the router guesses wrong, the model reaches for the missing workflow itself with the
`load_skill` tool — because routing is a guess, and a guess that misses should cost one
round trip, never a worse answer ([how](ARCHITECTURE.md#the-tool-loop)).

Skills own workflows. Facts live in [`PROMPT/knowledge/`](../PROMPT/knowledge/); identity, voice,
the tool contracts and the answer shape live once in [`PROMPT/SPINE.md`](../PROMPT/SPINE.md). A
skill names the tool it leads with and never restates the doctrine.

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
| **`/zero-server`** | Argues you out of a backend you don't need — wires the client straight to DAPI. | "what backend do I need", plans for a middleman API or indexer, "do I need to run a node". |
| **`/identity-keys`** | Guards the key hierarchy: which key signs what, and why the master key isn't for daily use. | Identity key questions, Platform auth flows, key-compromise fears. |
| **`/dash-ai`** | Architects agents and AI apps on Dash — agent payments, memory, state. | Bots, agents, AI on Dash, and "how was Dasha built". |
| **`/scale`** | Audits for velocity before traffic finds the ceiling. | High traffic, mass onboarding, DAPI rate limits, "will this handle N users". |
| **`/dash-token`** | The honest answer about tokens, NFTs, and smart contracts on Dash today. | "can I launch a token", "does Dash have smart contracts". |
| **`/fee-estimate`** | Prices a design before it's built — on retrieved numbers only, never a remembered fee. *(Tier follows the question.)* | "what will this cost", credit budgeting, "is this viable at N users", "why did that burn so many credits". |
| **`/shielded`** | Privacy architecture in honest mode — what exists now versus what is roadmap. | Privacy on Platform, shielded balances, zero-knowledge proofs, anonymous dApps. |
| **`/compare-chain`** | Translates for arriving devs, without pretending Dash is something it isn't. | "Dash vs X", devs from Ethereum/Solana/Bitcoin, "does Dash have an EVM". |
| **`/envision`** | Open-ended creative brainstorm, grounded in what Dash can actually do. *(Judgement mind.)* | "what could I build", hackathon ideas, "what's possible on Dash". |
| **`/health-check`** | A pre-launch readiness sweep — one **GO / NOT YET / NO-GO** verdict per dimension, and the single blocker that matters most before mainnet. | "am I ready to launch", "pre-launch checklist", "ready for mainnet", "before I go live". |
| **`/evo5`** | A briefing on Platform 5.0. She reads what mainnet runs today and what has been published, then starts from where you stand: an app that already ships gets the upgrade checklist first. | "what is new in Platform", "Platform 5.0", "protocol 14", "is my app ready for 5.0". |
| **`/token-forge`** | Designs a token by walking its decisions in the order they lock: supply, then who may mint, burn, freeze and pause, and on from there. It starts from the job the token has to do. | "design a token", "who can mint", "airdrop", "distribution schedule", "token supply". |
| **`/earn`** | How an app charges and moderates on Platform 5.0: action fees in credits on a document type, and opt-in moderation with bans, suspensions and warnings, each public with its reason. | "action fees", "charge a fee", "how does my app make money", "moderators", "spam on my app". |
| **`/dash-review`** | Reviews pasted code, a data contract, a schema or a query against Platform's rules. Findings are specific, ranked and tied to lines. *(Tier follows the question.)* | "review my contract", "check my code", "anything wrong with this", "audit this". |
| **`/agent-ready`** | A readiness review for a project that AI agents should be able to use, scored surface by surface. *(Tier follows the question.)* | "agent ready", "let an agent", "mcp for my dapp", "api for agents". |

## Run
*Something is live, or refusing to be. Errors route to the engineering mind.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/dash-debug`** | Systematic debugging — reads the error, forms a hypothesis, tests it. | Errors, timeouts, "not working", failed broadcasts, DAPI issues, credit and fee errors. |
| **`/mno`** | Masternode ownership, end to end. | Running a masternode, collateral, hosting choices, MN voting, CrowdNode. |
| **`/evo-node`** | Evonodes specifically — Platform hosting, rewards, dashmate setup. | Evonodes, "high-performance masternode", Platform hosting. |
| **`/network-health`** | A live read of the chain, via `dash_network_stats`. Throughput, never price. | "is the network busy", "why is my tx slow", height / mempool / supply questions. |
| **`/tx-explain`** | Reads a transaction and says what it *means* — confirmed vs pending, InstantSend finality. | A pasted txid, explorer links, "is my payment confirmed". |
| **`/verify-payment`** | Settles whether money actually landed, from the chain rather than from a screenshot. | "did this payment go through", a pasted "proof of payment", a P2P release, "can I ship it". |
| **`/merchant`** | Accepting Dash for real — POS, checkout, settlement, refunds. | Merchants, integrations, "accept Dash payments". |
| **`/dash-now`** | The state of Dash in five short lines, each with its number and the time it was read. Four live readings in one round: the chain, the masternode list, Platform and governance. | "state of dash", "how is the network doing", "status report", "dash right now". |
| **`/release-watch`** | Keeps three facts apart: what is published on GitHub, what mainnet is running, and what the roadmap plans. Then says what changed for your role. | "latest release", "is there a new version", "should I update", "is 5.1 out". |
| **`/mn-watch`** | Reads the live masternode list. Counts come with the height and time they were read at. One node is looked up by its proTxHash or address, and its state explained. | "how many masternodes", "is my masternode banned", "check my masternode", "PoSe score". |

## Govern
*The DAO. She shows the arithmetic; she never tells you how to vote. `/proposal-guide` routes to
the judgement mind; `/sub-dao` is a schema job and routes to engineering; `/dash-gov` follows the
question.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/dash-gov`** | Explains governance from live DashCentral data — tallies, thresholds, votes still needed, the monthly amount. Ranks by net votes; never prices the queue. | Proposals, voting, treasury, superblock timing, "is X passing". |
| **`/governance-digest`** | A this-cycle voter briefing — triages the whole live ballot into Passing / Close / Notable so a masternode owner can spend votes where they change the outcome. Never a recommendation. | "governance digest", "catch me up on proposals", "close to passing this cycle", "read me the ballot". |
| **`/proposal-guide`** | Coaches a proposal into its strongest honest form before it costs you the fee. | "how do I submit a proposal", budget asks, drafts, "would the network fund X". |
| **`/sub-dao`** | Fractal governance — voting inside a dApp, split treasuries, delegation. | Sub-DAOs, app and community governance, delegated voting schemes. |
| **`/coordinate`** | Designs how a group decides, pays and keeps its word. She asks what is being coordinated first, then draws the map: who decides, on what, with what weight, by when and on what evidence. *(Judgement mind.)* | "how should we decide", "set up a council", "run an election", "share a treasury", "who gets to decide". |
| **`/paxt`** | Explains a Dash PAXT: an agreement a group joins by each signing one line with a wallet they already hold, so anyone can check every signature and count again. Points you to where one is read, signed, checked or opened. | A PAXT or a Telepaxt, signing a line, masternode owners agreeing on a practice together, "how do we decide together". |

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
| **`/verify`** | Checks a signed message from its address, message and signature, exactly as given. The first line says VALID or NOT VALID, then what that shows: that key signed that exact text. | "verify this signature", "is this signed message real", "prove I own this address". |

## Learn
*The skills that aim at their own obsolescence.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/learn-dash`** | A zero-to-builder path, one stage per reply. *(Judgement mind.)* | "I'm new", "teach me Dash", "where do I start" with **no** idea yet — with an idea, `/dash-plan` takes it. |
| **`/dev-onboard`** | The developer's first hour — the mechanical runway from testnet faucet to a first data contract and a first document fetched back, each step with a "you'll know it worked when…" check. | "developer quickstart", "testnet faucet", "get testnet Dash", "my first contract on testnet". |
| **`/doc-dive`** | Deep multi-source documentation research when one search can't settle it. | Hard cross-cutting questions, conflicting information, "what's new" / "is X live yet" — exactly where her training is oldest and retrieval matters most. |
| **`/x-reply`** | The conduct of a public reply: never speak first, never open a DM, de-escalate. **Silence is a valid output.** | Every reply composed for the X timeline. **Silent — fires on its own.** |
| **`/translate`** | Answers in the language you asked in, safety floors included. | Any message not in English, or "answer in \<language\>". **Silent — fires on its own.** |
| **`/weave`** | Hashes two to eight short lines of yours into a Merkle root and shows the proof for the first line, then ties it to block headers and Platform proofs. | "what is a merkle tree", "merkle proof", "how do proofs work", "how can a phone verify". |
| **`/systems-lens`** | Makes the loops in a product, an economy or an incentive design visible, then names its one leverage point. | "systems thinking", "second order effects", "why isn't this growing", "feedback loop". |

## Meet me where I am
*For the person who doesn't yet know what to ask. New this version, and human-facing on purpose.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/start-here`** | The on-ramp for someone who doesn't know what to ask. One locating question, then one step — never a curriculum. | "I don't know where to start", "I'm lost", "someone sent me Dash", "this is overwhelming". |
| **`/is-this-for-me`** | An honest fit check that will tell you Dash is the *wrong* tool when it is — and name the right one. | "is Dash right for", "should I use Dash", "do I even need a blockchain", "why not just use Stripe". |
| **`/explain-again`** | Changes the modality when the first explanation failed — analogy, example, smaller step. Never a louder repeat. | "explain that again", "I still don't get it", "ELI5", "that didn't help", "in plain English". |

## The team's programs
*The Dash Support Team's own programs, and the records they keep.*

| Skill | What it does | When it fires |
|---|---|---|
| **`/alive`** | Explains Dash Alive, the living list of what is building on Dash, and the Support Pool: listing a project, voting with real DASH, and exactly where the DASH goes. | Dash Alive, "how do I get listed", the Dash Aligned score, the Support Pool. |
| **`/waves`** | The guide's seat for Dash Waves. She teaches the protocol, shapes a Wave with you and carries it. | "dash waves", "what is a wave", "start a wave", "carry a wave", "waves.fund". |
| **`/imagine-this-dash`** | The DAO's open brainstorm. She develops an idea with you and, with your consent, it enters the public `VISIONS/` record. | "imagine this dash", "my vision for dash", "idea for the build team". |
| **`/dream-sesh`** | One structured working session on an early idea. You arrive with the raw idea and leave with one page of direction. | "dream sesh", "is my idea good", "pressure test my idea", "should I build". |

---

**Fifty-seven skills in her library.** Most surface on the "what can you do" menu; a few fire
silently as surface and safety rules you never invoke by name — `/x-reply`, `/translate` and
`/price`. You rarely need to type any of them: the router loads the right workflow from what you
actually said, and reaches for `load_skill` when it guessed wrong.

**Next:** [PHILOSOPHY.md](PHILOSOPHY.md) — why she works this way ·
[ARCHITECTURE.md](ARCHITECTURE.md) — the router and the tools ·
[CONTRIBUTING.md](../CONTRIBUTING.md) — sharpen a skill · [SELF-HOST.md](SELF-HOST.md).
