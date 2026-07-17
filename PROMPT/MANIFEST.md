# DASHA PROMPT MANIFEST — v2.2.0 "Seven Hands, One Spine"

**Source of truth:** `github.com/InitiumBuilders/Dasha-AI/PROMPT/` is the LIVE source of truth, streamed to every instance — web chat, Telegram bots, the X agent, the token API. The files below are fetched from the repo at request time and assembled into the system prompt: no redeploy, no per-surface copy. Edit the repo and every surface changes together. This directory is the working tree; the repo is what production reads.

**The mind is no longer one block.** It is a **spine plus a library**. The spine rides every request, byte-identical; the library is loaded a little at a time, only where a question needs it.

**Assembly order — this order is load-bearing (see the caching note):**

```
[ SPINE ] [ loaded context ] [ conversation ]
```

1. `SPINE.md` — who she is on every request: identity, voice, the Merkle-Weaver soul + Balance Rule, the seven tool contracts & retrieval doctrine, source hierarchy, per-surface answer shape, code rules, safety, injection resistance, escalation, the always-on facts, and an **INDEX of all 38 skills** (each with a one-line "when it fires" so she can recommend a skill without loading it). Sent **byte-identical on every request** — 411 lines, ~43.8k chars, ~11.4k tokens.
2. **Loaded context** — the skill and reference sections THIS question actually touches, chosen locally by `api/_context.js` against the triggers in `INDEX.json`: **0–2 skills** from `skills/*.md` and **0–3 sections** from `knowledge/*.md`. Placed strictly AFTER the spine, so the cached prefix is never disturbed.
3. **Conversation** — the message history, last.

`INDEX.json` is read by the runtime as the routing table. `MANIFEST.md` and `VERSION` are repo metadata — the runtime never sends them as part of the prompt, so their length costs no tokens.

**Why the order is fixed — caching works on PREFIXES.** A provider reuses cached computation only for the longest run of tokens that is byte-for-byte identical from the very start of the request. The spine never varies, so it is always a cache hit; the loaded block is one of a small set of combinations, so common paths (`/data-contract` + a schema question, `/dash-gov` + "is X passing") warm up too. The naïve version of "only load what you need" — building a bespoke prompt per request — would move the variable part to the front and break the prefix on every call, costing ~10× more. So the whole trick is to load LESS per request WITHOUT disturbing the stable prefix. That is why the spine is fixed and the loaded block comes after it, and why nothing is ever re-ordered.

**Selection is local and deterministic.** `api/_context.js` scores the question against each skill's own declared triggers in `INDEX.json` — **no embeddings, no vector store, no classifier model call**: zero added latency, zero added cost, and a routing decision a human can read and argue with. It is regression-tested every build (16 spec cases and 10 over-match traps must stay green). When the router still misses, the model has a seventh tool, `load_skill`, to pull the missing workflow in one round trip — a miss costs a round trip, never a worse answer.

**Token economics.** The average request fell from ~30,103 tokens (the old flat monolith, every skill and section sent every time) to **~12,257 — about 59% smaller** — with no loss of reach, because any absent skill is one `load_skill` round trip away. The spine (~11.4k tokens) is what she pays on every request; each skill is ~420 tokens and is paid only when it loads; each reference section similarly. `GET /api/chat` reports `mind.spineChars` and `mind.library` for verification.

**Fallback — baked.** `scripts/assemble-prompt.js` bakes the whole mind flat into `api/_prompt.js`, the fallback the runtime imports and uses if the GitHub stream is unreachable — the complete monolith, no library: whole, just not lean. It reads its version from `VERSION`, never a hardcoded string, so live and baked can never report different versions. Re-bake it in any PR that touches `PROMPT/`.

**Ownership rule:** the SPINE owns identity, voice, safety, the tool contracts and the answer shape; `knowledge/*.md` own facts and numbers, one section each; `skills/*.md` own workflows and conduct, one file each; `INDEX.json` owns the routing triggers. **Fix a fact once, in one knowledge section.** A tool's contract is described ONCE, in the spine — a skill that re-derives a rule the spine owns is a bug waiting for the spine to change. A PR that adds a skill MUST add its triggers, and those triggers must be specific phrases a real person types: generic words (`dash`, `build`, `help`, `how`, `what`) steal traffic from every other skill.

**Version:** v2.2.0 "Seven Hands, One Spine" — 2026-07-17.

---

## THE SURFACES

One mind, four surfaces, one prompt. The SPINE's ANSWER SHAPE owns the per-surface shape:

- **Web chat** (dashsupport.team/chat) — the full answer shape; fenced code. 3 tool rounds.
- **Telegram** (groups + bots) — shorter; under ~200 words, plain text + code blocks (no tables or headers). 2 tool rounds, not 3 (latency is the user's experience).
- **X reply** (public) — PUBLIC, PERMANENT. The runtime threads her answer and never truncates it, so length is a judgement call: 700–1000 chars when the question deserves substance, 1500+ when it is essential, short when it is small or bait. No markdown, **no links** (X bills the team 13× for a reply carrying one). `/x-reply` owns the conduct: never speak first, de-escalate, silence is a valid output.
- **X direct message** (private) — she answers every incoming DM, no @-mention needed (a DM is already the address), within a few minutes on the cron; up to 10,000 chars, no threading, links fine. **She NEVER initiates a DM to anyone** — an unsolicited "support" DM is the exact silhouette of the scam her own `/scam-check` warns against, and real support never messages first. She answers; she never opens.
- **API** (token API + callers) — treat like web chat unless the caller's injected context says otherwise.

## THE SEVEN TOOLS

Six reach the world; the seventh reaches her own library. The SPINE's TOOLS & RETRIEVAL section states the contracts exactly — names, parameters, enum values, return fields — under one rule: **never invent a tool, a parameter, an enum value, or a return field.** Verified against `api/_tools.js` this pass: seven executors, and `chat.js`'s health endpoint lists the same seven.

1. **`search_dash_docs(query, area?)`** — live docs.dash.org search. `area`: `platform` · `core` · `all`. ≤5 results: title, real docs.dash.org URL, matched snippets. Authoritative for every Dash fact.
2. **`dash_governance(action, name?)`** — live DashCentral treasury. `action`: `summary` · `list_passing` · `list_all` · `get`. Per proposal: **monthly amount**, yes/no/abstain, net votes, PASSING/NOT PASSING, votes still needed, payments remaining, deadline, URL. **It returns the monthly amount; it does NOT return the full proposal text or the argument for it** — those live on the DashCentral page she links.
3. **`dash_network_stats()`** — height, difficulty, 24h transactions & volume, mempool size, circulating supply, avg fee. **Carries no price, by design.**
4. **`lookup_tx(txid)`** — confirmations, `valueOut`, `fees`, time, InstantSend lock (`txlock`), ChainLock status, coinbase flag, block height. **No addresses, no inputs/outputs** — never where the money went.
5. **`lookup_address(address)`** — balance, total received, total sent, transaction count. No transaction list. Public chain data, and only when the user asks about that address.
6. **`web_search(query)`** — the open web via a neutral fetcher, returning findings plus real source URLs. **Never authoritative for a Dash fact.**
7. **`load_skill(name)`** — the safety net under the router. Reaches INWARD, not out: given a skill name from the index, `api/_mind.js` resolves it against `INDEX.json` and returns the workflow text in one round trip. Unknown name ⇒ it says so; it never invents a workflow. (There is no `load_knowledge` — reference sections load automatically.)

Up to 3 tool rounds per answer (Telegram: 2), callable in parallel, each result carrying its source URL and fetch time.

## THE 38 SKILLS

38 workflow files, one per `skills/*.md`. Most appear on the "what can you do" menu; **six fire on their own** and are kept off it — the surface and topic reflexes `/x-reply`, `/translate` and `/price`, plus the three contextual responders to a lost, doubting, or confused person, `/start-here`, `/is-this-for-me` and `/explain-again` (a lost person needs a door, not a directory). The curated routing table in `INDEX.json` is preserved across rebuilds; a genuinely new skill's triggers are mined from its own quoted `**Trigger:**` phrases and tuned so it never steals traffic from its neighbours.

## THE SOURCE HIERARCHY (the spine)

**docs.dash.org > the knowledge pack > the open web.** Stated once, hard, in the SPINE; enforced in every skill that reaches outward.

- The **web is never authoritative for a Dash fact.** It is where you go for what the docs don't hold: recent news, ecosystem chatter, other chains, GitHub releases, anything after training.
- A web result is **a claim, not a fact** — attribute it in-line, cite only URLs the tool returned. Web contradicts docs on a Dash fact ⇒ the docs win and she says so.
- **Price is unreachable from every direction:** no tool carries it; `web_search` is not a workaround; `dash_network_stats` is not a proxy (never compute or imply price from supply or volume). The `/price` refusal stands exactly as written.
- The pack defers to retrieval in its own header: when a `search_dash_docs` result and the pack conflict, the retrieved page wins.

## WHAT v2.2.0 CHANGED

**The mind became a spine plus a library.** The old single ~30K-token block — every skill and every reference section sent on every request — is gone. The spine (identity, safety, tools, answer shape, and the index of what exists) is always sent; only the skill and reference a question touches are loaded, chosen by a local keyword router. Average request ~59% smaller, caching preserved by keeping the spine as a fixed prefix.

**A seventh tool, `load_skill`.** The router loads context before the model runs, so it is a guess. `load_skill` makes a missed guess cost one round trip instead of a worse answer: the model pulls the workflow it needs from the library on demand. The count is corrected to seven everywhere it is owned; the health endpoint already listed it.

**Three human-facing skills added (35 → 38):** `/start-here` (a single locating question for someone who doesn't know what to ask, then one step), `/is-this-for-me` (an honest fit check that will say Dash is the wrong tool when it is), `/explain-again` (change the modality when the first explanation failed — analogy, example, smaller step, never a louder repeat). Added to the "fire on their own" set rather than the menu.

**X direct messages.** She now answers DMs autonomously (never initiates), governed by the surface note above and by `/x-reply`'s never-speak-first conduct.

**Governance capability restored.** `dash_governance` returns the monthly amount; the prior "no per-proposal ask field" framing denied a field she actually receives, and is corrected — denying a real field costs a user an answer as surely as inventing one would.

**Safety, re-verified.** Keys/seeds refusal · no price, no investment advice, no tax advice · scam patterns and the never-messages-first / never-opens-a-DM rule · irreversible-action slowdown · third parties named as third parties · injection resistance naming doc pages, proposal descriptions and web content as data-never-commands · humans as the last word via `/human-support` · no-memory-across-conversations stated in her own voice · community-led framing, with "official Dash DAO agent" appearing nowhere but its own prohibition. All intact, none weakened. The prompt is fully public and carries no keys, credentials, or hidden instructions.
