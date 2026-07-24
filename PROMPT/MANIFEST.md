# DASHA PROMPT MANIFEST — v2.6.1 "Imagine, Guided"

**New in v2.6.1:** THE NEXT MOVES — every reply ends with an invisible `[[NEXT]]` block carrying 2–3 concrete, high-leverage next moves for the user (the sharper question, the unlocking skill, the decision due now). The runtime strips it on every surface; the web chat renders the moves as tappable choices. One step downstream, always.

**New in v2.6.0:** `/imagine-this-dash` (alias `/ImagineThis`) — the DAO's open brainstorm. Anyone, on any surface, can bring an idea for the Dash Support Team's five teams or the DAO at large; Dasha co-develops it, synthesizes it honestly, and — with explicit, structural consent (credit chosen by the author, private-means-private, share only on yes) — files it into the public `VISIONS/` commons, featured on dashsupport.team/pulse under "Dream With Dasha". Skills: 40 → 41.

**What ships:** `github.com/InitiumBuilders/Dasha-AI/PROMPT/` is the LIVE source of truth, streamed to every instance — web chat, Telegram bots, the X agent, the token API/MCP. Her mind is no longer one block: a byte-identical **SPINE** rides every request, and only the **skill** and **reference** sections a question actually touches load alongside it. Push to the repo and every surface picks it up within the cache window — no redeploy, no drift.

**The working tree → the mind.** Edit three files; a build step does the rest. Never edit `mind/` or `PROMPT/` by hand.

1. `dasha/PROMPT-CORE.md` — identity, voice, the Merkle-Weaver soul + Balance Rule, tools & retrieval doctrine, source hierarchy, architecture truth, answer shape, code rules, safety, injection resistance, escalation, live-context handling.
2. `dasha/SKILLS.md` — the 41 slash-skill workflows + the selection rules.
3. `dasha/KNOWLEDGE.md` — verified Dash/Platform facts: version line, schema rules, EvoSDK flows, DAPI, identities/credits, DPNS, nodes, governance math, canonical links.

`_split.js` splits them losslessly into the streamed mind:

- `mind/SPINE.md` — PROMPT-CORE + the SKILLS header + an INDEX of all 40 skills (each with a one-line "when" cue) + the selection rules + the always-on knowledge (§0 version line, §10 canonical links) + the knowledge-library index. **~43,768 chars (~11,518 tok), byte-identical every request → always a prompt-cache hit.**
- `mind/skills/*.md` — 40 workflow files (~557 tok each), loaded **0–2 per request**.
- `mind/knowledge/*.md` — 10 reference sections (§1–§9 and §7b), loaded **0–3 per request**.
- `mind/INDEX.json` — the routing manifest the selector reads.

`_asm.js` separately bakes the whole thing flat into `api/_prompt.js` — the fallback the runtime uses if the GitHub stream is unreachable. It reads its version from `dasha/VERSION`, never a hardcoded string, so the offline copy can never report a stale version.

**Selection is local and deterministic.** `api/_context.js` scores the question against each skill's own declared triggers — no embeddings, no vector store, no classifier call, zero added latency or cost. The order is law: **[SPINE][loaded context][conversation]** — the spine is a constant prefix (always cached), and popular loaded combinations warm up too. Assembling a bespoke prompt per request would break the cache prefix and cost ~10× more — the trap this design avoids.

**The numbers.** Combined source: **143,413 chars** across the three files (~3.8 chars/token, the build's own basis). A flat monolith would send all of it on every request (~37,740 tok); the split sends the spine (~11,518 tok, always cached) plus only what the question needs — **~12,100–12,500 tok average**. The routing suites pin the win against a fixed 114,390-char historical monolith baseline (~30,103 tok) and hold **~58–60% smaller** — with no loss of reach: any absent skill is one `load_skill` round-trip away.

## THE SEVEN TOOLS

Six reach the world; the seventh reaches her own library. CORE's TOOLS & RETRIEVAL states the contracts exactly — names, parameters, enum values, return fields — under one rule: **never invent a tool, a parameter, an enum value, or a return field.** Verified against `api/_tools.js` this pass: seven executors, and `chat.js`'s health endpoint lists the same seven.

1. **`search_dash_docs(query, area?)`** — live docs.dash.org search. `area`: `platform` · `core` · `all`. ≤5 results: title, real docs.dash.org URL, matched snippets. Authoritative for every Dash fact.
2. **`dash_governance(action, name?)`** — live DashCentral treasury. `action`: `summary` · `list_passing` · `list_all` · `get`. Per proposal: monthly amount, yes/no/abstain, net votes, PASSING/NOT PASSING, votes still needed, deadline, payments remaining, URL. **No full proposal text and no argument for it** — those live on the DashCentral page she links.
3. **`dash_network_stats()`** — height, difficulty, 24h transactions & volume, mempool size, circulating supply, avg fee. **Carries no price, by design.**
4. **`lookup_tx(txid)`** — confirmations, `valueOut`, `fees`, time, InstantSend lock (`txlock`), ChainLock status, coinbase flag, block height. **No addresses, no inputs/outputs** — never where the money went.
5. **`lookup_address(address)`** — balance, total received, total sent, transaction count. No transaction list. Public chain data, and only when the user asks about that address.
6. **`web_search(query)`** — the open web via a neutral fetcher, returning findings plus real source URLs. **Never authoritative for a Dash fact.**
7. **`load_skill(name)`** — pulls in one of her own skill workflows when the router didn't pre-load it. Plumbing under the selector, not a source; the skill index names it. There is **no `load_knowledge`** — reference sections load automatically and have no on-demand fetch.

Up to 3 tool rounds per answer (Telegram: 2), callable in parallel, each result carrying its source URL and fetch time.

## THE 40 SKILLS

40 workflow files, each split from one `## /name — Title` section in SKILLS.md. **34 appear on the "what can you do" menu**; **6 fire on their own** and are kept off it — `/translate`, `/price`, `/x-reply` (surface and topic reflexes) plus `/start-here`, `/is-this-for-me`, `/explain-again` (contextual responders to a lost, doubting, or confused user; a lost person needs a door, not a directory).

The curated routing table in `mind/INDEX.json` (728 phrases) is preserved across rebuilds; a genuinely new skill's triggers are mined from its own quoted `**Trigger:**` phrases and tuned so it never steals traffic. Routing is regression-tested every build: **`_ctest.js` (16 cases) and `_ctest2.js` (10 over-match traps) must stay green.**

## THE OWNERSHIP RULE

**KNOWLEDGE owns facts and numbers · CORE owns behavior and surface shape · SKILLS owns workflows and conduct.** Fix a fact once, in KNOWLEDGE. A tool's contract is described once, in CORE's TOOLS & RETRIEVAL; skills name the tool they lead with and never restate the doctrine. **A skill that re-derives a rule CORE owns is a bug waiting for CORE to change.**

This manifest and `VERSION` are repo metadata only — never concatenated into the prompt, so their length costs no tokens.

## THE v2.5.0 PASS — "COMMUNITY FIRST"

**Scope discipline.** Dasha serves the Dash community and nothing else — no cross-project vocabulary, no personal plugs. One legacy skill that pointed outside Dash's scope was removed at the source: its skill section, menu entry, easter egg, and routing phrases are gone from CORE, SKILLS, the spine, the library, and the docs. Skill count **41 → 40**, menu **35 → 34**, routing table **738 → 728 phrases**. No other skill, trigger, or fact was touched.

**Deployment hygiene.** The site's static allow-list now ships runtime files only; local build tooling is excluded by root-anchored ignore rules, and access credentials were rotated as routine hardening.

**Build integrity.** `_asm.js` + `_split.js` rebuilt clean — 40 skills, zero stray references verified by pattern scan across the built mind and the baked fallback — and routing held: **`_ctest.js` 16/16, `_ctest2.js` 10/10.**

## GATE FIXES — v2.4.0

**The "real examples" pass — concrete cases, every one true.** This pass wove worked examples through the 41 skills so the abstract lands. A single running **reviews-app** schema — a `listing` doc type plus a `review` doc type with a unique `[listingId, $ownerId]` index — threads `/data-contract`, `/grove-query`, `/schema-migrate`, `/risk-audit`, `/fee-estimate`, `/scale` and `/identity-keys`, so a builder watches the SAME app get designed, indexed, costed, migrated, attacked and scaled. Real use-case archetypes ground `/is-this-for-me`, `/merchant`, `/wallet-help` and `/start-here` (the shop owner keeping the slice a card processor takes, the cross-border freelancer, the holder outrunning a sliding local currency); `/dash-ai` uses Dasha's own architecture as the reference. **Skill count unchanged at 41; no new skills, no triggers touched.**

**Every example verified TRUE — against the tool source and the knowledge pack, not memory.** The accuracy gate checked each added specific at its root:
- **Tool fields — confirmed against `api/_tools.js`:** every example calls only fields its tool actually returns. `lookup_tx` really surfaces `time`, coinbase and block height — and still carries NO addresses or inputs/outputs, so no skill ever narrates where money went. `dash_network_stats` really returns height / difficulty / 24h-tx / 24h-volume / mempool / supply / avg-fee. `dash_governance` returns tallies + monthly amount + deadline + URL but no full proposal text — every skill says exactly that.
- **Version claims are sourced, never invented:** fungible tokens "live since Platform v2" (KNOWLEDGE §0 + §4: v2.0, Jun 2025); shielded balances = Zcash Orchard pool at v4.0 with ST types 15–20 reserved (§0 version line + ST-type table); Smart-Contract VM at v5.0 ~Q1 2027 (tentative). Every hard number matches KNOWLEDGE — 1,000 / 4,000 DASH, 60/20/20, ~16,616-block / ~30-day superblock, 1,662-block / ~3-day voting cutoff, net-10%, ~2s InstantSend, ~2.5-min blocks, 1 DASH = 100,000,000 duffs.
- **Named resources are real:** the Vultisig wallet mention is backed by an official Dash–Vultisig partnership; `insight.dash.org` is the live Dash Core Group explorer (and is literally the backend the chain-lookup tools call); CrowdNode, blockchair.com/dash, dash.vote and dashcentral.org all check out. **No invented company, person, statistic, package, version, or URL survived the pass** — the concrete examples are hypothetical schemas and real use-case categories, not fabricated adoption claims.

**No financial promotion.** The anti-price discipline is intact and re-verified: `/price` refuses every price / predict / buy-sell ask with no "not advice, but…" loophole; `/network-health` guards "chain stats, never market signals" (24h volume is throughput, not trading volume); `/merchant` labels its invoice price-lock "an operational settlement rule, not investment advice." Store-of-value and remittance framings stay on utility — self-custody, ~2s finality, sub-cent fees — never appreciation.

**Tone: inspiring but grounded.** The examples add concreteness, not hype — several deliberately UNDERSELL, e.g. `/dash-ai` positions Dash as where an agent rail "COULD fit, not a live one," since machine-to-machine volume today runs on stablecoins. Nothing needed toning down.

**Secret sweep: clean.** `dasha/_wip/`, `dasha/`, and the prompt-bearing siblings (`dashaPrompt.json`, `dasha-chat.js`, `mind/`) were re-scanned for hardcoded keys, tokens, or private configuration — none present. The prompt stays fully public. Exactly three model tiers, named plainly.

**Build integrity.** `_reassemble.js` → **41 skills, 88,794 chars** (each file kept its `## /name — Title` heading, `**Trigger:**`, `**Do:**` and `**Output:**`, so none dropped silently) → `_split.js` preserved the curated **738-phrase** routing table → **`_ctest.js` 16/16, `_ctest2.js` 10/10.** No trigger was edited, so routing is unchanged from v2.3.0.

**Version:** v2.5.0 "Community First" — 2026-07-17 (the scope-discipline pass: out-of-scope vocabulary gone at every layer · 40 skills · deployment hygiene hardened · secret sweep clean · 16/16 + 10/10).

## GATE FIXES — v2.3.0

**Three skills added — 38 → 41.** `/dev-onboard` (the developer's first hour: testnet faucet → identity → first data contract → a first document fetched back, each step with a done-when check), `/health-check` (a pre-launch **GO / NOT YET / NO-GO** sweep across the dimensions that actually break a mainnet debut), and `/governance-digest` (a this-cycle voter briefing that triages the whole ballot into Passing / Close / Notable for a masternode owner, live from DashCentral). Each splits cleanly, routes to itself, and is priced into the numbers above. `/dev-onboard` joins the menu's **Learn** group, `/health-check` its **Build** group, `/governance-digest` its **Govern** group; the "fire on their own" set is unchanged at six.

**A new skill that was silently stealing every "What…" question — fixed.** `/governance-digest`'s trigger line names `"what's close to passing"`; the phrase-mining regex treats the apostrophe in `what's` as a closing quote and captured the bare phrase `"what"`, which scored above the load floor on *any* question beginning with "What" — "what is a masternode?", "what is InstantSend?", "what position should the property have". `_ctest2.js` caught it at 8/10. The curated phrase is now `"close to passing"` (specific, apostrophe-free), and the source trigger line was reworded so a from-scratch re-mine can't reintroduce it. Both suites are green again: **16/16 and 10/10.**

**Generic-word trigger trimming on all three new skills.** Their mined `words` lists carried near-universal tokens — `/dev-onboard` had `dash`, `get`, `first`, `data`, `contract`; `/health-check` had `app`, `live`, `check`, `ready`; `/governance-digest` had `should`, `vote`, `read`, `passing`. Each word is one point and it takes five to load, so none broke a test today — but a latent five-word collision is exactly how the next silent theft happens. Trimmed to the distinctive tokens only (e.g. `/dev-onboard` → `quickstart`, `faucet`, `onboard`, `testnet`), matching the curated style of the inherited table.

**Secret sweep: clean.** Every file under `dasha/_wip/`, `dasha/`, and the `dasha-ai-repo` clone re-scanned for operator / hidden-tier machinery — none present. The system prompt stays fully public (dashsupport.team/dasha-ai): no keys, no credentials, no hidden instructions. Exactly three model tiers, named plainly.

**Accuracy re-verified against the seven-tool contract and the knowledge pack.** The new skills call only fields their tool returns (`dash_governance`'s monthly amount and tallies, never full proposal text; `lookup_tx` totals and lock, never addresses; `lookup_address` for the merchant's own invoice address only), and every Dash fact — evonodes carry 4 governance votes (weight = collateral/1000), the 1662-block voting cutoff, `@dashevo/evo-sdk` over the legacy `Dash.Client`, no general smart contracts before Platform v5.0 (~Q1 2027, tentative) — matches KNOWLEDGE. No invented package, version, URL, or capability found across the library.

**Token note.** SKILLS.md grew ~19K chars (64,548 → 84,307 bytes) — three new dense workflows plus the in-place sharpening of the inherited 38, not bloat: the largest new file (`/dev-onboard`, ~3.2K) still sits under the pre-existing `/scam-check`. Spine ~11,516 tok, always cached; average request ~12,100 tok. Because this manifest is repo metadata and never enters the prompt, none of it costs a token at inference.

**Version:** v2.3.0 "Runway, Gate, Ballot" — 2026-07-17 (final gate: three new skills routed clean · trigger-theft bug closed · secret sweep · seven-tool accuracy · token discipline · 16/16 + 10/10).

## GATE FIXES — v2.2.0

**Tool count: six → SEVEN.** The split architecture added `load_skill` as a real, model-callable tool (it lives in `api/_tools.js`'s `DEFS`, and the health endpoint already returned it), but CORE still said "these six exactly" and this manifest said "no seventh." CORE now names the seventh as plumbing under the selector; the count is corrected everywhere it is owned.

**Phantom tool removed.** The SPINE generator promised `load_knowledge("<title>")` — a tool that does not exist in `api/_tools.js`. Reference sections load automatically and have no on-demand fetch, so `_split.js` no longer instructs Dasha to call something that isn't there. An invented capability costs a user an answer exactly like a denied real one.

**Skill count: 35 → 38.** `/start-here`, `/is-this-for-me`, and `/explain-again` were written into SKILLS.md but never split, counted, or routed. They now split cleanly, mine their own triggers, route to themselves, and are counted — added to the "fire on their own" set rather than the menu.

**`/dash-gov` stopped denying a field it receives.** It told her the result "doesn't carry the exact ask" — but `dash_governance` returns the monthly amount and the remaining payment count. Corrected: it carries the monthly amount, tallies, status and deadline; only the full proposal text and the argument for it live on the DashCentral page.

**No-memory honesty added.** The mind never told her she is stateless. She now states plainly, if asked, that she keeps no memory between conversations — a privacy fact in her own voice, not left only to the external docs.

**Baked-fallback version desync fixed.** `_asm.js` hardcoded the version, so a source bump left the offline fallback reporting a stale one. It now reads `dasha/VERSION`; live and baked can never disagree again.

**The system prompt holds no secrets.** It is fully public (dashsupport.team/dasha-ai) and carries no keys, credentials, or hidden instructions — INJECTION RESISTANCE says so, and this pass re-verified it across every prompt file.

**Token discipline: neutral. 119,752 → 119,765 chars (+13).** Every added character is required accuracy or honesty (the seventh tool, the no-memory line, the three-skill accounting); each was offset by cutting a CORE-owned rule a skill or header had re-derived. Spine ~11,380 tok, always cached.

**Version:** v2.2.0 "Seven Hands, One Spine" — 2026-07-17 (final gate: secret sweep · build integrity · seven-tool accuracy · honest limits · token discipline).
