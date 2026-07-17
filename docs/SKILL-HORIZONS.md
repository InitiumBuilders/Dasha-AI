# Skill Horizons

*Where each of her skills stands today — and where it could walk next.*

A skill is a living thing. It is not a finished tool bolted to a machine; it is a way of thinking
that will grow as Dash grows, as her tools multiply, and as the community that shapes her mind
learns more about what people actually need. So each entry here comes in two parts.

The **Foundation** is what a skill does today — its solid, standable core. The ground is real:
you can build on it right now. The **Horizon** is a direction that same skill could genuinely
walk — a deeper capability, a new tool it would reach for, a place it composes with another skill,
a way it could teach a little better. A horizon is not a promise and not a plan. It is a line of
sight: honest about the distance, and worth the walking.

Read this as an invitation. Every horizon here is a door someone could open with a pull request —
a source, a schema, a sharper diagnosis, a new tool contract. If one of these directions is yours
to walk, [the contributing guide](../CONTRIBUTING.md) shows how a merged change becomes part of
every Dasha in the world within about ten minutes. A foundation you can stand on, and a direction
you can walk. That is the whole idea.

---

## Build
*Making something on Dash Platform.*

### /dash-plan — Dash Builder Plan Mode
**Foundation:** Splits an app idea into the payments rail (Core) and the data rail (Platform), picks the SDK, and stages a testnet-first build where every stage ends in a "verify by" step.
**Horizon:** The staged plan could grow a living cost spine — each stage carrying a running credit estimate drawn straight from /fee-estimate's retrieved schedule, so a builder watches the bill accrue as the architecture takes shape rather than after. As the v5.0 Smart Contracts VM approaches (~Q1 2027, tentative), it could learn to mark the stages worth designing to be VM-ready today, showing where declarative token config will one day meet programmable logic. The deepest move is to hand its contract sketch directly into /data-contract as a structured draft instead of prose — turning the plan into the first commit.

### /data-contract — Data Contract Author + Validator
**Foundation:** Translates a plain-English app into a validated JSON-Schema data contract, enforcing every rejection-cause rule and designing indexes from the queries the app will actually run.
**Horizon:** It could carry a self-checking validation harness — a small set of testnet-registerable fixtures emitted alongside the contract, so a builder proves the schema is accepted before trusting it. As GroveDB's composite-index and aggregate-filtering support firms up from tentative to confirmed, the skill can promise index shapes it must hedge on today. Paired with /risk-audit it could ship contracts that are secure by construction — creationRestrictionMode and tight maxLength chosen at authoring time, not bolted on after the first abuse.

### /state-transition — SDK Code Writer
**Foundation:** Writes complete EvoSDK (or Rust rs-sdk) code for the real write path — contracts, documents, identity and credit lifecycle — with key hygiene and cost class baked into every snippet.
**Horizon:** As the SDK families settle, it could pin each snippet to a verified version and emit a matching test that fetches the write back, so "how do I verify it landed" is answered by running code rather than instruction. A credit-balance reader among her tools would let it price a broadcast against the identity's actual purse before the user spends. When the v5.0 VM arrives it becomes the natural place to teach the boundary between a state transition and a contract call — the same author, a new verb.

### /grove-query — GroveDB Query Optimizer + Proof Demystifier
**Foundation:** Maps a query onto GroveDB's Merkle operations, kills brute-force fetch-and-filter patterns, and demystifies proof errors down to the version-skew or node-rotation that caused them.
**Horizon:** The proof explanation could deepen into a walked-through view of the verification chain — response to Merkle proof to quorum threshold-signature — so a builder trusts the "why" and not only the "retry". As composite indexes move off the tentative list, it could offer a query planner that names the exact index a where-clause needs and drafts the /schema-migrate to add it in one pass. A future query-cost read would turn "this is slow" into a measured number rather than a diagnosis.

### /schema-migrate — Contract Update Navigator
**Foundation:** Verdicts a proposed contract change against the append-only update rules — permitted, forbidden, or needs-a-new-type — and always confirms the irreversible call against the live docs before blessing a mainnet change.
**Horizon:** It could generate the full client-side migration itself for genuinely breaking changes — the new contract, the document re-creation loop, and the deprecation-window copy — so the honest hard path arrives with its tooling attached. A testnet rehearsal harness would let it run the update against a throwaway contract and report the real validation result before the mainnet attempt. Composed with /fee-estimate it can price a migration per-document before a builder commits history they can never edit.

### /zero-server — DAPI-Direct Architect
**Foundation:** Intercepts the Web2 reflex — for Platform reads and writes the client talks straight to DAPI over proofs, so a middleman server is a trust hole and a hosting bill for negative value.
**Horizon:** It could ship a reference edge-cache pattern — verify a proof once, trust the cached result until the revision changes — turning "no server" from a principle into a deployable snippet that still scales. As agent architectures multiply (/dash-ai), it can sharpen the honest split it already draws: exactly which signing and compute genuinely need a server versus what the browser can prove for itself. A worked CORS-and-WASM starter for each major frontend framework would make the direct path the path of least resistance.

### /scale — Network Velocity Auditor
**Foundation:** Audits the hot path — which state transitions fire per user action — then slims writes, caches verified reads, and hands over the backoff-and-nonce discipline that survives congestion.
**Horizon:** With dash_network_stats already in her hands, it could read live mempool and throughput to tell a builder whether the congestion they fear is real right now or imagined, folding /network-health's live read into a scaling verdict. A subsidy-identity balance monitor would let it warn on drain before an app-funded purse runs dry rather than after. The deepest version projects a user load against the fee schedule and returns the credit burn per thousand actions as arithmetic, not a guess.

### /fee-estimate — Cost Before Commit
**Foundation:** Prices a design on retrieved numbers only — never a remembered fee — summing the one-time registration and the permanent per-byte storage terms against the builder's actual contract structure.
**Horizon:** It could become a true budget model: structure in, a curve out — registration once, storage compounding with projected volume, laid out so a builder sees the year-two bill while the design is still changeable. The refund-on-delete lever it already knows could be made concrete with the exact retrieved rule, turning expiry from hygiene into a costed budget dial. A credit-balance tool would let it check a plan against what an identity can actually afford, not only what it will cost.

### /dash-debug — Systematic Platform Debugger
**Foundation:** Demands the exact error, SDK version and network, maps it against the error-to-cause table, then isolates the failing layer with one hypothesis and one cheapest-first test per round.
**Horizon:** The error-to-cause table is the natural place for the network's debugging memory to accumulate — every unmapped error the docs didn't carry becomes a new row, a corpus that compounds toward one-round diagnosis. A live DAPI reachability probe among her tools would let her run the cheapest test herself instead of narrating it for the user to run. Paired with /doc-dive it could auto-escalate a cryptic decode error into a parallel docs search on the distinctive fragment before the user has to ask twice.

### /dash-ai — AI-on-Dash Architect
**Foundation:** Names the buildable agent patterns — agents that pay and get paid over ~2s InstantSend, agent identities with their own credits and DPNS names, agent memory as versioned documents — with a key and credit blast-radius plan for anything that signs on its own.
**Horizon:** Dasha is her own reference architecture, so this skill could evolve into a published, forkable agent template — identity, capped purse, scheduled top-up, provable memory contract — that a builder clones instead of assembles. As multi-agent coordination matures it can specify shared-contract message-board and task-queue schemas that several agents prove against without a trusted broker. When on-chain compute arrives with v5.0 it becomes the place to teach the new line between what the model does off-chain and what the network can finally enforce.

### /envision — Creative Builder Brainstorm
**Foundation:** Generates three-to-five buildable-today ideas grounded in real primitives, reality-checked against the smart-contract limits, each with a pitch, its genuinely hard part, and a weekend-sized first slice.
**Horizon:** It could ground its live check more deeply — a web_search pass per domain that names what already shipped, so the list is provably novel rather than plausibly so, and no one spends a weekend rebuilding an app that exists. A read of what recent treasury proposals actually funded (via /dash-gov's live data) would let it point toward gaps the network is already paying to fill. Ranked ideas could carry straight into /dash-plan as a seeded architecture, closing the distance from spark to first stage.

### /compare-chain — Arriving-Dev Translator
**Foundation:** Translates an arriving dev's home concepts row by row — EVM, Solana programs, Bitcoin UTXO — naming what the other chain does better before Dash's genuine edges and gaps.
**Horizon:** The concept-translation tables could deepen into runnable side-by-sides — the same task in Solidity and in a Dash data contract — so a dev feels the difference rather than reading about it. Its web_search discipline for the other chain's latest could grow into a maintained delta the skill re-verifies, since a stale comparison is the fastest way to lose a dev's trust. As v5.0 approaches it can draw the honest map of what will and won't close the smart-contract gap, dated to the roadmap rather than promised.

---

## Govern
*The original DAO, and the fractal ones built on top of it.*

### /dash-gov — Governance Explainer
**Foundation:** Answers anything touching live proposals, budget or timing from DashCentral first — never from memory — reporting tallies, net votes, votes-needed and deadline as live numbers, strictly neutral on any verdict.
**Horizon:** It could compute the full budget-exhaustion picture the raw tool won't give — ranking passing proposals by net votes against the cycle total to show which fund and which fall off the bottom, stated as arithmetic and never as a forecast of how masternodes will vote. A series harvested across superblocks would let it show trajectory — how a proposal's support is moving — without ever crossing into prediction. Composed with /doc-dive it could pull the argument behind a proposal from its DashCentral page, keeping the tallies and the case for them in one answer.

### /proposal-guide — Proposal Crafting Coach
**Foundation:** Walks the real funding pipeline — forum discussion first, refine, the burned 1 DASH submission, then engagement — and audits a draft like an algorithmic VC, replacing every vague promise with an on-chain-verifiable KPI.
**Horizon:** It could read the losing field directly — dash_governance list_all mined for the patterns in what failed — and hand a drafter the specific, current reasons proposals like theirs got voted down, the cheapest lesson available. A KPI verifier would close the loop after funding: the txids, contract IDs and DPNS names a proposal promised, checked live against the chain as proof of delivery. Sized against the real live budget and the days to the next superblock, the coach turns a hopeful ask into one the network can see itself funding.

### /sub-dao — Fractal Governance Architect
**Foundation:** Frames app-level governance as buildable today — members as identities, proposals and ballots as documents, one honest vote enforced by a unique index on [proposalId, ownerId] — while stating plainly there is no on-chain execution yet.
**Horizon:** Platform token security groups already give real network-enforced multiparty control, so this skill could deepen into token-weighted and multi-signer ballot designs where the network enforces more of the outcome, not only the record. When the v5.0 VM lands, the gap it honestly names today — record enforced, outcome not — begins to close, and it becomes the place to teach on-chain execution of a tally for the first time. A reusable governance-contract library, versioned and forkable, would let each new fractal DAO start from a proven schema rather than a sketch.

---

## Nodes
*Running the network that runs everything above.*

### /mno — Masternode Owner Helper
**Foundation:** Retrieves collateral, hardware and registration figures before quoting them, states the entry forks honestly, and repeats the un-imitable floor — collateral (1,000 DASH) never moves, and anyone asking you to send it is scamming you.
**Horizon:** It could track the live network conditions that bear on the decision — a read of masternode count and reward cadence so a prospective owner weighs the real economics, not a remembered sense of them. A per-node status check would let an owner confirm their node is enabled and earning without leaving the conversation for a block explorer. Composed with /scam-check it hardens the collateral-scam warning into an active pattern match on any "send collateral" message a user pastes in.

### /evo-node — Evonode Specialist
**Foundation:** Defines the delta from a regular masternode — Drive, DAPI and Tenderdash running on top of Core — with the stricter 4,000 DASH requirements, the current rewards model, and log-first debugging across the three layers.
**Horizon:** As Platform usage grows the rewards story becomes concrete and measurable, so this skill could read live Platform throughput and epoch fee data to show an operator how usage actually translates into their evonode revenue. A dashmate log parser would let it locate the dissonance layer — Core, Drive, or Tenderdash — from a pasted crash rather than a described one. As shielded balances (v4.0) and the v5.0 VM raise the storage and compute an evonode carries, it becomes the operator's guide to the new hardware and uptime discipline those releases will demand.

---

## Money
*Moving value, and proving it moved.*

### /merchant — Accept Dash
**Foundation:** Leads with the UX truth — an InstantSend lock in ~2s is settlement at point of sale — then routes by scale from a market-stall QR to an xpub-per-invoice online store with no hot keys on the server.
**Horizon:** It could ship a complete watch-only reference checkout — xpub in, address per invoice out, order credited on the lock event — so a merchant deploys the pattern instead of assembling it. Its web_search for current processors could become a maintained, dated list, since the plugins and gateways turn over faster than any doc can follow. Paired with /verify-payment it closes the full loop: take the payment, then prove it landed from the chain before goods leave the counter.

### /verify-payment — Did It Actually Land?
**Foundation:** A decision skill, not an explainer — it collects only the txid, the invoice address and the amount, runs lookup_tx and lookup_address in one round, and returns RELEASE / DO NOT RELEASE / NOT YET with the screenshot-is-not-a-payment floor every time.
**Horizon:** A future output-level lookup — which output paid which address, the one thing today's two tools can't resolve — would let it settle the wrong-amount case without sending the user to an explorer at all. It could watch a not-yet-locked transaction and return the instant the lock arrives, turning "wait seconds and re-check" into a single answered call. Because the fabricated screenshot is now a standard fraud pattern, it deserves its own reflex — handing straight to /scam-check the moment chain data contradicts the receipt.

### /wallet-help — Wallet Chooser + Security
**Foundation:** Matches a wallet to the person — one recommendation, one alternative — and states the security floor every single time: never share seed words with anyone, including me, and download only from official sources.
**Horizon:** The chooser could stay current against what each wallet actually supports today — CoinJoin, hardware integration, seedless multi-device signing — verified rather than remembered, since wallet features move faster than training data. Backup discipline could deepen into a guided, testable restore drill a user completes on a clean device, so "I have a backup" becomes "I proved my backup works". Its seed-safety floor is the same one /scam-check and /wallet-rescue stand on — a shared, un-imitable refrain that grows stronger the more surfaces repeat it.

### /dash-token — Asset Reality Check
**Foundation:** Leads with the honest line — no general smart contracts today, the VM is v5.0 ~Q1 2027 (tentative) — then maps an idea to what exists now: DASH itself, declarative Platform tokens since v2, NFT-style documents, and credits.
**Horizon:** For anything buildable today it could draft the full token config — minting authority, supply caps, distribution rules, freeze logic, security groups — as validated, registerable JSON rather than a description. As v5.0 approaches, its possible-today-versus-not-yet table becomes a live migration map: which of today's declarative configs will gain programmable logic, and what that will take. A token-holdings lookup among her tools would let it reason about a live token's real distribution, not only its config on paper.

---

## Protect
*The skills that stand between a person and a bad day.*

### /scam-check — Scam Pattern Analyzer
**Foundation:** Takes the exact pasted text, looks the domain or handle up with web_search, turns a "proof" txid into truth with lookup_tx, and scores against a ten-pattern table — naming each hit with the user's own quoted words, never certifying "safe".
**Horizon:** The pattern table is the natural place for the network's memory to accumulate — every new scam a user brings that the table didn't cover becomes a row, so the whole community's worst day teaches the next person's defense. A domain-similarity check could make the look-alike test (dash.org versus its impostors) character-exact rather than eyeballed. Because scams cross languages, its floors and verdicts run through /translate so the safety warning lands in the victim's own tongue, never left behind in English.

### /tx-explain — Transaction & Explorer Reader
**Foundation:** On any pasted txid it runs lookup_tx immediately, reads the result onto the finality ladder — InstantSend lock to confirmations to ChainLock — and teaches transaction anatomy generically, since the tool gives status and totals but never where the money went.
**Horizon:** An output-resolving lookup would let it answer the "wrong amount" panic directly — separating change from payment, duffs from DASH — the exact anatomy it can only teach in the abstract today. It could render the finality ladder as a live position rather than a description, showing which rung a transaction sits on and what the next one adds. Composed with /wallet-rescue and /verify-payment, it is the shared reading-of-the-chain the other two lean on — one place that turns a raw txid into a plain-English story.

### /wallet-rescue — Missing Funds Triage
**Foundation:** Opens with the shield — I will never ask for your seed — then triages in order: display versus loss (settled by a lookup_address on a known-own address), access, theft, wrong-send, with the most calming true line being that funds visible on-chain are an access problem, not theft.
**Horizon:** The display-versus-loss check could deepen with a receiving-address history read that distinguishes an unsynced wallet from a genuinely emptied one in a single round, ending most cases faster and calmer. It could hold a gentle, sequential recovery walkthrough for the commonest fixable case — password lost, seed held — that restores into a fresh official wallet step by verified step. Its recovery-scam warning, that a fee-for-recovery service is a second predator, is the same pattern /scam-check names — the two should reinforce one lesson a shaken person hears twice.

### /network-health — Live Chain Read
**Foundation:** Runs dash_network_stats first, then answers the question actually underneath — is my money OK, will this be slow, will it cost more — translating mempool and height into meaning and guarding hard against any market inference.
**Horizon:** It could hold a short rolling baseline of normal throughput so "elevated" is measured against the chain's own recent history rather than asserted, making a genuine congestion call trustworthy. Paired with /tx-explain it can tell a worried user whether a slow transaction is the network or their own client in one combined read — mempool idle plus a broadcast txid equals "this is on your end". As Platform-side health becomes readable, the skill could grow a second lane for DAPI and state-transition latency, the layer today's Core-chain stats don't touch.

### /identity-keys — Key Hierarchy Guardian
**Foundation:** Runs the danger check first — the master key (key 0) is only for adding and disabling keys, never daily use — teaches the five-level hierarchy, and architects least privilege where every state transition is signed with the lowest sufficient key.
**Horizon:** It could generate a per-app key map as deployable config — purpose-specific keys, their security levels, and the signatureSecurityLevelRequirement each doc type demands — so least privilege is scaffolded, not merely advised. A key-status read would let it confirm which keys an identity actually carries and flag a master key doing daily work before a leak proves the point. As agent architectures grow (/dash-ai), it becomes the guardian of the capped, revocable signing identity that keeps a rogue agent's blast radius small.

### /risk-audit — White-Hat Systemic Auditor
**Foundation:** Attacks a builder's own schema as a hostile white-hat — state bloat, sybil farming, unique-index squatting, fee starvation — and pairs every finding with the exact JSON or config correction, because a vulnerability without its fix is theater.
**Horizon:** The attack library could grow from every real audit into a checklist that runs against a contract automatically, flagging a missing creationRestrictionMode or an unprotected unique index before a human reads a line. It could price each attack it finds — the credit cost of the state bloat or fee-drain it describes — turning severity from a label into a number via /fee-estimate. As tokens and security groups spread, its lens extends to tokenomics: who can mint, who can freeze, and which group holds authority that shouldn't rest in one place.

### /shielded — Privacy Architecture
**Foundation:** Leads with the honest status — shielded balances are Platform v4.0, rolling out ~Jul 2026, confirmed at the docs — gives the conceptual privacy design and metadata-leak checklist now, and never promises code for a feature still landing.
**Horizon:** As v4.0 confirms at docs.dash.org, this skill crosses from conceptual to concrete — the Zcash Orchard shielded pool, view-key selective disclosure, and the reserved state-transition types becoming real architecture a builder can implement, verified against live docs the moment they publish. Its metadata-leak checklist — frontend correlation, document timing, ownerId reuse across contexts — deepens into an audit that composes with /risk-audit, since a privacy leak is a systemic vulnerability by another name. Until the APIs land its discipline stays the same: say only what's confirmed, and let the roadmap, not hope, set the date.

---

## Learn & Teach
*Meeting a person where they are, and walking them one step forward.*

### /learn-dash — Zero-to-Builder Path
**Foundation:** Five stages, one per reply — use it, understand it, touch Platform, first contract, ship something small — each ending in a "you're done when" the learner can verify alone, with the canonical tutorial for their exact stage retrieved, never remembered.
**Horizon:** It could remember where a learner left off across a conversation, opening each session at the next stage with the last done-when confirmed, so the path feels like progress rather than a repeated menu. As the docs add tutorials it can widen its retrieval to always send the freshest canonical page, folding in community videos — honestly labelled as community-made — where the docs still have a gap. Its final stage already hands to /envision and /dash-plan; that seam could carry the learner's testnet identity and first contract forward, so learning ends inside building.

### /doc-dive — Deep Documentation Research
**Foundation:** The escalation for a question one search can't settle — it decomposes into three-to-five sub-queries, fires them in parallel, synthesizes cited pages into one answer, and marks the seams honestly: confirmed, inferred, web-only, not found.
**Horizon:** It could let round one genuinely shape round two by design — extracting the real term of art a first retrieval surfaces and searching that next, a feedback loop that beats ten blind guesses. A cross-check against github.com/dashpay releases would let it date an "is X live yet" answer to a commit rather than a blog, exactly where training data is oldest. Its confirmed-versus-web-only discipline is the standard every research-shaped skill borrows — /dash-ai, /merchant and /compare-chain all lean on the same honest split.

### /explain-again — Change the Modality
**Foundation:** Never repeats louder — it changes exactly one dimension deliberately (analogy, concrete example, smaller step, strip the jargon, show instead of tell), diagnosing from where the last attempt lost the person, always shorter than before.
**Horizon:** It could track which modality finally landed for a given person and reach for that shape first next time, learning an individual's way of understanding across a conversation. Its diagnosis could sharpen with the modality of the failed attempt as a signal — lost after code wants the analogy, lost after metaphor wants the concrete example — a mapping that grows more precise the more the whole system teaches it. And its hardest rule, that metaphors go fully off when there is money or fear in the room, is the same calm-before-cleverness floor /wallet-rescue and /scam-check stand on.

### /start-here — The Locating Question
**Foundation:** Asks one locating question, never a form — spend, fix, understand, or build — offered as four pickable options, and skips the question entirely into triage when something has already gone wrong, because fear makes menus unreadable.
**Horizon:** It could read the faintest signal in how someone arrived — a pasted txid, the word "gone", a stranger offering help — and pre-select the fork before asking, so a frightened person lands in triage without a single click. The four doors could each learn the single smoothest first step that most often ends in a real "it worked", refined by what actually helped the last thousand lost arrivals. It is the front door the whole registry opens from — every routing it makes is only as good as the skills behind each door, which is why it improves as they do.

### /is-this-for-me — Honest Fit Check
**Foundation:** Asks what moves, between whom, how often, and what breaks today — then is willing to say no in the first line, naming Stripe or a Postgres row or another chain when Dash is the wrong tool, because a recommendation against its own interest is the only trustworthy one.
**Horizon:** Its willingness to say no could deepen with a live check on the alternative — a web_search on the user's current tool and the thing that breaks — so a comparison is current fact, not a stale memory that ends the conversation when it's wrong. As v5.0 nears, the "wrong tool, needs contracts" verdict gains a date rather than a flat no, telling a builder honestly what to wait for. It is the honesty gate before /dash-plan — the more accurately it can say no, the more a yes from it is worth.

---

## Systems
*The whole, not the feature.*

### /motus — Systemic Movement Mapper
**Foundation:** Maps an idea across the SiD Object–Network–System levels to find the highest-leverage point where an immutable, provable record of movement changes behavior, then translates that leverage into a kinetic data contract of commitment and movement documents.
**Horizon:** It could grow a library of movement-log contract patterns — commitment, attestation, streak, collective-pledge — each a proven schema a community adapts rather than derives from scratch. As provable per-identity attribution accumulates, the skill could reason about the motion itself over time, reading the shape of a community's commitments from the very documents its schema records. Its honesty holds as it deepens: the chain keeps the trustworthy record of motion, the momentum always lives in the people — a line worth keeping true and unhurried as the tooling around it grows.

---

## Voice
*How she speaks, translates, and knows when to hand the conversation to a human.*

### /translate — Language Mirror
**Foundation:** Replies entirely in the user's language at the same quality bar, keeps code, error strings, URLs and canon terms verbatim in English with a first-use gloss, and never leaves a safety warning stranded in English.
**Horizon:** It could carry a growing glossary of Dash canon in each language — InstantSend, ChainLock, DPNS, evonode rendered the way a native speaker of that community actually says them — so the gloss reads as fluent, not machine-turned. Its safety-floors-always-land rule could become a checked invariant: no scam or seed warning ships until it is confirmed present in the user's language, the last line to survive every translation. As the community grows across regions it is the skill that lets every other skill speak — the mirror that makes the whole registry multilingual.

### /price — Price Talk Deflection
**Foundation:** One warm, unapologetic line — no price data and no price talk by design, no predictions or "not financial advice, but" workarounds — then a pivot to the utility question underneath, in four friendly lines at most.
**Horizon:** The pivot could grow sharper at hearing the real need beneath a price question — spending routes to /merchant, building to /dash-plan, understanding to /learn-dash — so a deflection becomes a genuinely useful redirect rather than a polite wall. Its clean line between price talk (never) and cost-of-operation facts (always answerable) could deepen into fuller fee and credit answers that hand straight to /fee-estimate. The discipline itself is the horizon: a boundary held warmly, every time, is what earns the trust the harder questions require.

### /x-reply — Public Reply Craft (X)
**Foundation:** Never speaks first — it answers only where tagged or asked, never by DM, because a bot that replies to "help" within seconds is the exact scam silhouette its own /scam-check warns about — settling reply-worthy questions with a fact or a live tool result, and treating silence as a correct output.
**Horizon:** It could learn the timeline's real patterns — which questions are genuine and settleable versus drama, price bait, or something already answered downthread — so its silence grows more precise and its rare replies land where they matter. A live tool result woven into a public reply — a lookup_tx that settles a "did it send" in the open — turns an answer into visible proof of how the whole system works. Its never-first, never-DM rule is the public face of the trust every Protect skill is built on: on X she is either the proof that real support never contacts first, or the reason no one believes it.

### /human-support — Human Escalation
**Foundation:** Surfaces the handoff at the right moments — frustration, funds at risk, a scam in progress, or debugging looped twice — with the direct Telegram line and a cold-start summary a human can pick up in three lines, every secret left out.
**Horizon:** The cold-start summary could deepen into a structured, secret-free handoff the receiving human reads at a glance — what was tried, what the chain showed, what's at stake — so the escalation loses nothing in translation from AI to person. It could learn the moments that most often should have escalated sooner and offer the door a beat earlier, since a loop caught at one turn instead of two is a person spared. It is the edge every skill runs to when it reaches the honest limit of what it can settle — the proof that the last word belongs to humans, and the warmer for being offered before it's begged for.

---

*These horizons are living lines, not fixed destinations. If one is yours to walk, open a pull
request — [the contributing guide](../CONTRIBUTING.md) shows how. A mind that speaks for a
community is shaped, in the end, by the community that walks ahead of it.*
