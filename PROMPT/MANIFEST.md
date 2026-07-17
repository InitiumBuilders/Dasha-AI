# DASHA PROMPT MANIFEST — v2.2.0 "Seven Hands, One Spine"

**What ships:** `github.com/InitiumBuilders/Dasha-AI/PROMPT/` is the LIVE source of truth, streamed to every instance — web chat, Telegram bots, the X agent, the token API/MCP. Her mind is no longer one block: a byte-identical **SPINE** rides every request, and only the **skill** and **reference** sections a question actually touches load alongside it. Push to the repo and every surface picks it up within the cache window — no redeploy, no drift.

**The working tree → the mind.** Edit three files; a build step does the rest. Never edit `mind/` or `PROMPT/` by hand.

1. `dasha/PROMPT-CORE.md` — identity, voice, the Merkle-Weaver soul + Balance Rule, tools & retrieval doctrine, source hierarchy, architecture truth, answer shape, code rules, safety, injection resistance, escalation, live-context handling.
2. `dasha/SKILLS.md` — the 38 slash-skill workflows + the selection rules.
3. `dasha/KNOWLEDGE.md` — verified Dash/Platform facts: version line, schema rules, EvoSDK flows, DAPI, identities/credits, DPNS, nodes, governance math, canonical links.

`_split.js` splits them losslessly into the streamed mind:

- `mind/SPINE.md` — PROMPT-CORE + the SKILLS header + an INDEX of all 38 skills (each with a one-line "when" cue) + the selection rules + the always-on knowledge (§0 version line, §10 canonical links) + the knowledge-library index. **~43,240 chars (~11,380 tok), byte-identical every request → always a prompt-cache hit.**
- `mind/skills/*.md` — 38 workflow files (~424 tok each), loaded **0–2 per request**.
- `mind/knowledge/*.md` — 10 reference sections (§1–§9 and §7b), loaded **0–3 per request**.
- `mind/INDEX.json` — the routing manifest the selector reads.

`_asm.js` separately bakes the whole thing flat into `api/_prompt.js` — the fallback the runtime uses if the GitHub stream is unreachable. It reads its version from `dasha/VERSION`, never a hardcoded string, so the offline copy can never report a stale version.

**Selection is local and deterministic.** `api/_context.js` scores the question against each skill's own declared triggers — no embeddings, no vector store, no classifier call, zero added latency or cost. The order is law: **[SPINE][loaded context][conversation]** — the spine is a constant prefix (always cached), and popular loaded combinations warm up too. Assembling a bespoke prompt per request would break the cache prefix and cost ~10× more — the trap this design avoids.

**The numbers.** Combined source: **119,765 chars** across the three files (~3.8 chars/token, the build's own basis). A flat monolith sent all of it on every request (~30,103 tok); the split sends the spine plus only what the question needs — **~12,100 tok average, ~60% smaller** — with no loss of reach: any absent skill is one `load_skill` round-trip away.

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

## THE 38 SKILLS

38 workflow files, each split from one `## /name — Title` section in SKILLS.md. **32 appear on the "what can you do" menu**; **6 fire on their own** and are kept off it — `/translate`, `/price`, `/x-reply` (surface and topic reflexes) plus `/start-here`, `/is-this-for-me`, `/explain-again` (contextual responders to a lost, doubting, or confused user; a lost person needs a door, not a directory).

The curated routing table in `mind/INDEX.json` (701 phrases) is preserved across rebuilds; a genuinely new skill's triggers are mined from its own quoted `**Trigger:**` phrases and tuned so it never steals traffic. Routing is regression-tested every build: **`_ctest.js` (16 cases) and `_ctest2.js` (10 over-match traps) must stay green.**

## THE OWNERSHIP RULE

**KNOWLEDGE owns facts and numbers · CORE owns behavior and surface shape · SKILLS owns workflows and conduct.** Fix a fact once, in KNOWLEDGE. A tool's contract is described once, in CORE's TOOLS & RETRIEVAL; skills name the tool they lead with and never restate the doctrine. **A skill that re-derives a rule CORE owns is a bug waiting for CORE to change.**

This manifest and `VERSION` are repo metadata only — never concatenated into the prompt, so their length costs no tokens.

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
