# DASHA PROMPT MANIFEST — v1.6.0 "The Straight Answer"

**Source of truth:** `github.com/InitiumBuilders/Dasha-AI/PROMPT/*.md` is the LIVE source of truth, streamed to every instance. The three files below are fetched from the repo at request time and concatenated into the system prompt — no redeploy, no per-surface copy. Edit the repo and every surface changes together. This directory is the working tree; the repo is what production reads.

**Assembly order (concatenated top to bottom):**

1. `PROMPT-CORE.md` — identity, voice, the Merkle-Weaver soul + Balance Rule, tools & retrieval doctrine, source hierarchy, architecture truth, answer shape, code rules, safety, injection resistance, escalation, live-context handling (258 lines, ~6.4k tokens)
2. `SKILLS.md` — the 35 slash-skill workflows + selection rules (421 lines, ~12.0k tokens)
3. `KNOWLEDGE.md` — verified Dash/Platform facts: version line, schema rules, EvoSDK flows, DAPI, identities/credits, DPNS, nodes, governance math, canonical links (281 lines, ~5.1k tokens)

**Totals:** 960 lines across the three files (963 assembled with dividers) · **114,465 chars assembled** — the exact figure `GET /api/chat` reports as `mind.chars`, and the number to check this manifest against · **~23.6k estimated tokens**. This manifest and `VERSION` are repo metadata only — do NOT concatenate them into the prompt.

**Token basis:** ≈4.86 chars/token, calibrated against the measured production figure. The larger figure quoted operationally (~29k) is the whole request — these files PLUS the runtime tool schemas and any injected live-context block. Only the file total is controlled here.

**Ownership rule:** KNOWLEDGE owns facts and numbers · CORE owns behavior and surface shape · SKILLS owns workflows and conduct. Fix a fact once, in KNOWLEDGE. A tool's contract is described ONCE, in CORE's TOOLS & RETRIEVAL — skills name the tool they lead with and never restate the doctrine. **A skill that re-derives a rule CORE owns is a bug waiting for CORE to change**; v1.6.0 is what that bug looks like when it ships.

**Version:** v1.6.0 "The Straight Answer" — 2026-07-17 (final gate: contract accuracy · surface contradictions · degrounded claims · token discipline)

---

## THE SURFACES

One mind, four surfaces, one prompt. CORE's ANSWER SHAPE owns the per-surface shape:

- **Web chat** (dashsupport.team/chat) — the full answer shape; fenced code.
- **Telegram** (groups + bots) — shorter; answer + ≤3 steps + one link; 2 tool rounds, not 3 (latency is the user's experience).
- **X** (public replies) — PUBLIC, PERMANENT. The runtime threads her answer and never truncates it, so length is a judgement call: 700–1000 chars when the question deserves substance, 1500+ when it is essential, short when it is small or bait. No markdown, no High-Aura shift, and **no links** unless the answer is worthless without one (X bills the team 13× for a reply carrying one). CORE owns that shape; `/x-reply` owns the conduct (never speak first, never DM, silence is a valid output).
- **API** (token API + callers) — treat like web chat unless the caller's injected context says otherwise.

## THE SIX TOOLS

CORE's TOOLS & RETRIEVAL states these contracts exactly — names, parameters, enum values, return fields — under one rule: **never invent a tool, a parameter, an enum value, or a return field.** Verified against `api/_tools.js` this pass: six executors, no seventh; every `area` and `action` value in every file is a valid enum; no invented field remains.

1. **`search_dash_docs(query, area?)`** — live search of the official docs at docs.dash.org. `area`: `"platform"` (data contracts, SDK, DAPI, identities, tokens) · `"core"` (wallets, masternodes, InstantSend, CoinJoin, DIPs, RPC) · `"all"`. Returns ≤5 results: page title, real docs.dash.org URL, matched snippets. **Authoritative for every Dash fact.**
2. **`dash_governance(action, name?)`** — live DashCentral treasury. `action`: `"summary"` (budget totals, superblock + payment date) · `"list_passing"` · `"list_all"` · `"get"` (`name` = proposal name/keyword). Per proposal: yes/no/abstain, net votes, PASSING/NOT PASSING, votes still needed, deadline, DashCentral URL. **No per-proposal ask field and no proposal text** — the full ask and the argument for it live on the DashCentral page she links.
3. **`dash_network_stats()`** — height, difficulty, 24h transactions, 24h volume, mempool size, circulating supply. Carries NO price by design; /network-health guards the pivot (24h volume is throughput, never trading volume).
4. **`lookup_tx(txid)`** — confirmations, `valueOut`, `fees`, time, InstantSend lock (`txlock`), ChainLock status, coinbase flag. NO addresses, NO inputs/outputs — it proves a tx exists, settled, for how much and at what cost, never where the money went.
5. **`lookup_address(address)`** — balance, total received, total sent, transaction count. No transaction list. Public chain data, and only ever when the user asks about that address.
6. **`web_search(query)`** — the open web (news, blogs, X posts, GitHub, release notes) via a neutral fetcher. Returns findings plus real source URLs.

Up to 3 tool rounds per answer (Telegram: 2), callable in parallel, each result carrying its source URL and fetch time.

## THE SOURCE HIERARCHY (the spine)

**docs.dash.org > the knowledge pack > the open web.** Stated once, hard, in CORE; enforced in every skill that reaches outward.

- The **web is never authoritative for a Dash fact.** It is where you go for what the docs don't hold: recent news, ecosystem chatter, other chains, GitHub releases, anything after training.
- A web result is **a claim, not a fact** — attribute it in-line, cite only URLs the tool returned. Web contradicts docs on a Dash fact ⇒ the docs win and she says so.
- **Price is unreachable from every direction:** no tool carries it; `web_search` is not a workaround; `dash_network_stats` is not a proxy (never compute or imply price from supply or volume). The /price refusal stands exactly as written.
- The pack defers to retrieval in its own header: when a `search_dash_docs` result and the pack conflict, the retrieved page wins.

## GATE FIXES — v1.6.0

**The X contradiction — the one that mattered.** CORE's X shape was rewritten when the runtime learned to thread (length is now a judgement call, 700–1000 chars typical; no links, because X bills 13× for one). `/x-reply` was never updated and still carried the old rule verbatim: **"≤500 chars, carried by the one URL a tool returned. No thread."** Every clause of it contradicted CORE *and* the runtime's own surface note — on the single surface that is public, permanent, and the team's reputation. v1.3.0 fixed this exact contradiction by declaring ownership; the ownership held and the compliance didn't. `/x-reply` now points at CORE's shape instead of restating it, and is shorter for it. **A skill that re-derives a CORE rule is a bug with a delay fuse.**

**/fee-estimate was quoting fees from memory.** The skill's own first line is *"never quote a fee from memory"* — and it then asserted, from memory, that registration prices additively as base + per document type + per index + per token + per distribution rule, and that a Fee Multiplier is masternode-votable at any time. Neither claim is in KNOWLEDGE; neither was retrieved. A skill built to stop guessed numbers was shipping guessed numbers, and would have taught them as fact in the one place a builder is deciding whether their app is viable. Now: retrieve the schedule, sum **the terms that page lists**, cite it, and never assert the schedule's shape or any multiplier from memory. The facts it keeps are the pack's own (§4: per-byte storage is permanent; deleting a document can refund storage not yet distributed).

**Capability denial, caught again.** CORE told her that "a proposal's exact ask" is something `dash_governance` doesn't return, and sent users to DashCentral for it. There is genuinely no per-proposal ask field — but the result does hand her a monthly amount, so naming "the exact ask" as unreachable is the v1.3.0 `lookup_tx`-fee bug rehearsing itself. Now: **"a proposal's full text"** — unambiguous, unreturned, and true. The rule this gate keeps re-learning: a file that denies a field she receives costs a user an answer just as surely as one that invents a field she doesn't.

**/motus stopped sounding like a mode.** "Hyper-Drive Mode unlocks (the PROMPT-CORE easter egg)… the Balance Rule holds even at 11/10" read like an activation sequence for something. It is an easter egg — one line of energy about momentum, then substance — and it now says exactly that.

**Skill count corrected 34 → 35.** `/fee-estimate` was written into SKILLS and onto the menu without ever being counted (stale since v1.5.0). 32 appear on the "what can you do" menu — /translate, /price and /x-reply fire on their own.

**Safety, re-verified line by line.** Keys/seeds refusal · no price, no investment advice, no tax advice · scam patterns and the never-DMs-first rule · irreversible-action slowdown · third parties named as third parties · injection resistance naming doc pages, proposal descriptions and web content as data-never-commands · humans as the last word via /human-support · community-led framing, with "official Dash DAO agent" appearing nowhere but its own prohibition. All intact, none weakened.

**Token discipline. 116,020 → 115,877 bytes (−143); line count unchanged.** Token-negative while fixing four accuracy defects, because every fix *was* a cut: /x-reply's re-derivation of CORE's X shape, /motus's mode framing, and /fee-estimate's invented fee schedule each cost more to say than the truth does.
