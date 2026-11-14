# Architecture

*How she actually works. Precisely.*

Everything below is verifiable against the source in this repository and against the live
health endpoint. Where a number appears, it is the number in the code.

```
web chat  ─┐
Telegram  ─┤                                    ┌─ mind ←── THIS REPO (PROMPT/, ~10 min)
X agent   ─┼──→  /api  (Vercel, serverless)  ───┤
API       ─┘     chat.js · telegram.js · x.js   ├─ router ── the flash mind · the pro mind
                 voice.js · paxt.js             │
                 _brain.js · _mind.js           └─ tools ─── docs.dash.org · DashCentral · insight
                 _context.js · _tools.js                     blockchair · Dash Core · Dash Platform
                                                             GitHub · the open web
```

One mind. Four surfaces. Her answers come from models reached through OpenRouter. Her voice,
when it is switched on, is made by ElevenLabs. Every key lives in server environment variables
and never reaches a browser.

---

## What this repository holds

`api/`, `web/` and `scripts/` are a copy of the code the Dash Support Team runs at
[www.dashsupport.team](https://www.dashsupport.team). The copy was last taken on 14 November
2026, from the build that serves mind v2.14.5. `GET /api/chat` on the live site reports the
version it runs and the tools it has, so you can compare.

| File | What it does |
|---|---|
| `api/chat.js` | The web and API endpoint: questions, feedback, the health report, the public pulse. |
| `api/_brain.js` | The loop. It picks a mind, calls the model, runs her tools, then checks and shapes the answer. |
| `api/_mind.js` | Fetches her mind from `PROMPT/` on GitHub, with `_prompt.js` as the fallback. |
| `api/_prompt.js` | The baked fallback mind. It is generated: change `PROMPT/` and bake again. |
| `api/_context.js` | Chooses the skills and reference sections a question loads. |
| `api/_tools.js`, `api/_tools2.js`, `api/_calc.js` | Her eighteen tools. `_calc.js` is the exact arithmetic behind `calculate`. |
| `api/_schemacheck.js` | Checks a data contract she writes against Platform's schema rules. |
| `api/_units.js` | Checks an amount in credits or duffs against the DASH figure written beside it. |
| `api/_leak.js` | Reads a tool call the model wrote into its answer as text, so the brain can run it or take it out. |
| `api/_metrics.js` | The Pulse: counts of what fired, with no text. |
| `api/_learn.js` | Feedback. A reported bad answer becomes a public issue. |
| `api/_visions.js`, `api/visions.js` | The vision commons (`VISIONS/`) and the feeds the Pulse page reads. |
| `api/_hours.js`, `api/_help.js` | The leads' logged hours and the community's Help given ledger (`HOURS/`). |
| `api/_paxt.js`, `api/_paxt-core.mjs`, `api/paxt.js` | Dash PAXT: the open record of signed lines and its count (`PAXT/`). |
| `api/_voice.js`, `api/voice.js` | Her voice: the ticket each reply carries, and the endpoint that reads a reply aloud. |
| `api/telegram.js` | The Telegram webhook. |
| `api/x.js`, `api/_x.js`, `api/_dm.js` | The X agent: mentions, direct messages, the client and the threader. |
| `api/_watch.js`, `api/_digest.js`, `api/_editor.js`, `api/_doors.js` | What she posts on X unprompted: the ballot watch, the superblock digest, the editor that decides what is worth saying, and the link a post may end with. |
| `api/_feed.js`, `api/_work.js`, `api/_ics.js` | Feeds the site reads through `api/x.js`: her X timeline, this repository's commit counts, the DAO calendar. |
| `api/_ours.js` | Which proposals are the team's own, and the disclosure a post about one carries. The copy here is an example (see below). |
| `web/dasha-chat.js` | The chat widget. |
| `scripts/assemble-prompt.js` | Bakes `api/_prompt.js` from `PROMPT/`. |

The copy differs from production in these places:

- `api/_ours.js` is an example. Each deployment keeps its own, and this one marks no proposal
  until its pattern is set.
- `api/_visions.js` does not carry the team's own Telegram chat and topic ids as defaults. Here a
  vision is shared to Telegram only when `DASHA_TG_FEED_CHAT` is set.
- `api/_local.js` is not here. `_brain.js` loads that file if a deployment has one, and it lets
  the deployment add its own routing ahead of the router described below. Without it the router
  is exactly as this document describes.
- The site's other functions are not here: `alive.js`, `og.js`, `p.js`, `designs.js`,
  `regenesis.js` and `x-callback.js`. Nothing in this repository requires them.
- The site's pages and stylesheet are not here. `web/dasha-chat.js` is the widget's script, and
  the rules that style it are part of the site's own stylesheet.

Several files name the Dash Support Team directly: its repository, its site, its Telegram group
and the pattern that matches its own proposals. [SELF-HOST.md](SELF-HOST.md#6-make-her-yours)
lists them for anyone running a fork.

---

## The mind-stream

`api/_mind.js` fetches her system prompt from GitHub when a request arrives, so what is in this
repository is what she runs. Her mind is a spine plus a library:

```
https://raw.githubusercontent.com/InitiumBuilders/Dasha-AI/main/PROMPT/
    SPINE.md          who she is. Sent on every request, byte for byte the same.
    INDEX.json        what exists, and which words call for it
    skills/*.md       one workflow each, fetched when a question needs it
    knowledge/*.md    one reference section each, fetched the same way
    VERSION           the version line
```

At v2.14.5 the spine is 74,275 characters and the library holds 57 skills and 23 reference
sections. The spine carries her identity, her safety rules, the tool contracts, the answer shape
and an index of every skill, so she can recommend a skill without loading it.

**The selector is local.** `api/_context.js` scores the user messages among the last three
against each entry's phrases and words in `INDEX.json`. A phrase scores 6 plus one per word, up
to four. A single word scores 1. A skill named with its slash scores 100. Anything under 5 is
dropped. At most two skills and three reference sections load, and when a message names a skill
with its slash, only named skills load. A skill can name the reference section it rests on
(`needs` in `INDEX.json`), and that section loads with the skill, ahead of the sections that
only matched words. There are no embeddings and no model call in this step,
so it adds no latency and a person can read why a question loaded what it did.

**The order is fixed: `[SPINE][loaded context][conversation]`.** Prompt caching works on
prefixes. A provider reuses its work only for the longest run of tokens that matches an earlier
request from the first token on. The spine is the same on every request, so it is always a hit. The loaded
block comes after it and is one of a small number of combinations, so the common paths warm up
too. Putting the part that changes per question first would break the cached prefix on every
call.

**Cache: 10 minutes.** `TTL = 10 * 60 * 1000`. The spine, the index and the version are cached
per warm serverless instance, so a merge reaches each instance within about ten minutes. The
fetch URL carries `?t=<floor(now/TTL)>` so a CDN edge cannot hold an older copy past the window.
A library file is fetched once per instance and kept for the life of the container. A refresh of
the mind clears the library, so it is fetched again.

**Fallback: baked.** `api/_prompt.js` holds her whole mind in one string. `_mind.js` requires it
at import, so without it the functions do not load. If GitHub is unreachable, a file returns
anything but 200, the spine comes back under 4,000 characters, or the index does not parse, she
runs from the baked copy: the whole mind, with no library to load from. Each remote fetch is
abandoned after 7 seconds. The copy committed here comes from the team's own build.
`scripts/assemble-prompt.js` bakes the same fallback from `PROMPT/` as it stands in a fork; run
it in any change that touches `PROMPT/`.

`getMind()` always resolves, so an answer goes out whether or not GitHub is up. A
guard (`inflight`) makes a burst of requests share one fetch. A library file that fails to load
is skipped, and she answers from the spine.

**Proof: `origin`.** The cache records where the mind came from, and the health endpoint reports
it:

```bash
curl https://www.dashsupport.team/api/chat
```

```jsonc
{
  "ok": true,
  "service": "dasha-ai",
  "models": {
    "flash": "deepseek/deepseek-v4-flash-0731",   // the minds in use right now
    "pro": "deepseek/deepseek-v4-pro-0813",
    "pinned": { "flash": "…", "pro": "…" },       // the pinned releases: her floor
    "lastChecked": null,                          // when she last looked for a newer release
    "current": "pinned",                          // or "auto-upgraded"
    "routing": "…", "freshness": "…"
  },
  "mind": {
    "version": "v2.14.5 (live)",   // "(live)" from the repo, "(baked)" from the fallback
    "origin": "github",            // the runtime naming this repo as its source
    "spineChars": 74275,
    "library": { "skills": 57, "knowledge": 23 },
    "loading": "spine always + only the skill/reference the question touches",
    "baked": "v2.14.5"
  },
  "learning": { "publicBoard": true, "teamChannel": true, "note": "…" },
  "analytics": { "store": "…", "principle": "…", "publicPulse": "…", "teamPulse": "…" },
  "tools": [ /* eighteen names */ ],
  "surfaces": ["web", "telegram", "x", "api"],
  // "on" is true when a voice key is set
  "voice": { "on": false, "name": "Honor", "endpoint": "/api/voice", "rule": "…" },
  "mcp": "POST /api/chat with header x-dasha-token",
  "source": "https://github.com/InitiumBuilders/Dasha-AI"
}
```

If `origin` reads `baked`, the stream is down and she is running the compiled copy. She still
answers, and the endpoint says so.

---

## The tool loop

`api/_brain.js`, `askDasha()`.

1. Fetch the mind. The spine is the first system message.
2. Select and load the skills and reference sections this question touches. They are the second
   system message.
3. Add a note for the surface where one is needed (Telegram, an X reply, an X direct message),
   the page the question came from, and the person's project card if they keep one.
4. Pick a mind (the router, below).
5. Loop, up to `maxRounds`:
   - Call the model with the tool schemas attached (`tool_choice: 'auto'`).
   - If it asks for tools, run up to 4 in parallel, append each result as a `tool` message and
     go round again. What she wrote to the person beside a tool call is kept and placed before
     the final answer.
   - If it returns text, that is the answer.
6. On the last round the tools are withheld, so she has to write.

She gets 3 rounds of tools on the web, on X and through the API, and 2 on Telegram.

**The deadline.** The whole answer has 108 seconds (`DASHA_DEADLINE_MS`), inside the function's
120. Every model call is hedged. For a DeepSeek model the first call is pinned to DeepSeek's own
endpoint, where its cache is. If that call has not answered after 9 seconds (`DASHA_HEDGE_MS`),
a second call starts on the fastest provider and the first of the two to answer is used. A
pinned call that fails outright starts the second at once. When the second call wins, the pinned
endpoint rests for ten minutes (`DASHA_REST_MS`) and the fastest provider goes first.

**When something fails.** If the model returns no text, or only blank space, she tries once more
with a larger token ceiling and no tools. If that fails and she was on the pro mind, she falls
back to the flash mind. If every path fails she returns an error that names a human.

**When she writes a tool call as text.** A model sometimes writes the call it wants into its answer, in its
own markup, most often in the last round, where no tools are offered. `api/_leak.js` reads such a block.
When the call names a tool she has, the brain runs it like any other. In the last round that earns one
round more, once, and only for a tool that is pure code (`calculate`, `merkle_weave`, `verify_message`).
A call that cannot be run is taken out with the line that announced it, a stream stops showing words at
the first sign of one, and fenced code is left alone. A line that only announces a lookup is dropped
from what she said first, and when it opened with her skill tag the tag stays, said once. `/api/chat` reports `textCalls` when this happened.

**When credits run short.** If OpenRouter refuses a call for lack of credit, she first tries the
flash mind with a ceiling of 1,500 tokens. If that is refused too, she steps down a short list of
free, tool-capable models (`DASHA_FREE_MODEL` first when it is set). A free model that refuses
tools is asked once more without them.

**After the answer.** Six things happen before the reply leaves `askDasha()`:

- The schema gate. If the reply holds a data contract, `api/_schemacheck.js` reads it as data
  and checks it against the rules Platform enforces at registration. It knows a document type by
  its keys, with or without a `type` line, follows an index path into a nested object, and holds
  the protocol 14 keywords to their rules (`moderatorAbilities`, `ttl`, contested indices, and
  what an immutable type may carry). When a rule is broken she
  gets one private round to fix it, and the fixed reply is used only if it breaks fewer rules.
- The units gate. When the reply gives an amount in credits or duffs with its DASH figure beside
  it, `api/_units.js` checks the pair by division. A DASH figure with the right digits and its
  decimal point in the wrong place is corrected. Nothing else in the reply is touched, and
  `/api/chat` reports `unitsFixed` when the gate acted. When DASH is written first ("0.25 DASH, or
  about 25,000 duffs"), the pair does not say which figure is wrong, so one is corrected only when
  the other is known to be right: it is in the person's own message or in a result `calculate`
  returned that turn.
- The vision harvest. A brainstorm that ended with consent carries one `[[VISION-LOG]]` block.
  It is stripped from the reply and filed in `VISIONS/`.
- The next moves. A `[[NEXT]]a|b|c[[/NEXT]]` block is stripped and returned as `next`: up to
  three suggestions of 90 characters or fewer.
- The count. `api/_metrics.js` records that an answer was given: the surface, the model, the
  depth, the skills, the tools and the cost. It records no text. Internal calls and the team's
  own probes are not counted.
- The motion. `motion` names what shaped the answer: up to four skills, up to four reference
  sections and up to eight tools.

**Streaming.** A request with `stream: true` is answered as server-sent events: `start` (the
depth and what was loaded), `tools` (the tools she is calling), `read` (the results are in),
then `done` or `error` carrying the same object a plain JSON reply carries. With `deltas: true`
as well, her words arrive in `delta` events as she writes them, and `round` marks each new model
call. `done` still carries the whole reply. `DASHA_STREAM=off` turns the deltas off.

**Handled by the server.** `chat.js` answers `/human-support` itself, with no model call. It
returns the handoff text and sends a ticket to the team's Telegram channel, and the reply goes
out even when the ticket fails. It says the note was passed only when the ticket went out. Feedback (`{feedback:{…}}`) goes to `api/_learn.js`.

---

## The router

`pickModel()` in `_brain.js`. There are two minds.

| Mind | Env var | Default | Answers |
|---|---|---|---|
| **Flash** | `DASHA_MODEL` | `deepseek/deepseek-v4-flash-0731` | Everything, unless a rule below calls for depth. |
| **Pro** | `DASHA_PRO_MODEL` | `deepseek/deepseek-v4-pro-0813` | Code, errors, judgement, depth asked for by name, and everything she says in public. |

Both defaults are dated releases, so a change to an alias upstream cannot change her. Every six
hours `freshen()` reads OpenRouter's model list and adopts a newer dated release of the same
family and tier, if that release still supports tools. The check runs beside the answer, and if
it fails she stays on the pins. `GET /api/chat` shows what she is running under `models`.

**Classification is local regex.** No model call decides which model to call. The router reads
the current message and, for a short follow-up, the user message before it.

Precedence, in order:

1. **A deployment's own routing**, when it has an `api/_local.js`.
2. **Public voice.** Telegram, an X reply, an X direct message and her own posts always use the
   pro mind. What she says there is public or permanent.
3. `forceLight`, when a caller asks for the flash mind.
4. **The depth words.** `deep`, `depth`, `Davara`, `DashDream`, `DreamTeam`, `DashaDream`, or the
   commands `/deep` and `/dst`, anywhere in the message.
5. **Shallow.** `hi`, `gm`, `thanks`, `/start` and the like under 24 characters stay on flash.
6. **Asked for.** "think deeply", "take your time", "be thorough".
7. **Code.** A fenced block or an indented code line.
8. **Errors.** Error vocabulary in a message over 30 characters. *"my evonode is stuck and
   dashmate wont start"* is 42 characters, and that person needs the better mind.
9. **Judgement.** `/proposal-guide`, `/envision`, `/learn-dash`, `/coordinate`. Strong signals
   such as leverage, systems thinking, first principles, strategy, tokenomics, incentive.
   Analysis signals (review, critique, your take, worth supporting) over 40 characters. A
   proposal question that asks for a read or for help writing one.
10. **Builder skills.** The engineering slash-skills.
11. **Heuristics.** Deep vocabulary over 60 characters, any message over 420 characters, or
    three or more question marks.
12. **Sticky depth.** A short follow-up (`why`, `and`, `explain`) under 120 characters inherits
    the mind the thread was already using.
13. Otherwise: flash.

The route is returned to the caller as `depth`: `public voice`, `depth`, `requested`, `code`,
`debugging`, `counsel`, `builder-skill`, `deep-work`, `complex` or `multi-part`, with
` (continued)` or ` (fell back)` added where that applies, or `null` for an everyday answer.

**Token headroom** is part of the routing. A judgement route gets 6,000 tokens. Any other routed
depth gets at least 3,000 and an everyday answer at least 2,200. `chat.js` asks for 4,000, so a
web or API answer has 4,000, or 6,000 for judgement. The comments in `_brain.js` record why: a
large model given too few tokens could not finish and did not engage its cache.

---

## Prompt caching

The spine and the loaded context are resent on every request and every tool round, so caching
decides what an answer costs. It works differently per provider:

- **DeepSeek** caches automatically, and only on DeepSeek's own endpoint. So a request for a
  `deepseek/` model pins `provider: { order: ['DeepSeek'], allow_fallbacks: true }`. Unpinned,
  OpenRouter may route to a reseller that caches nothing. The comment in `call()` records the
  measurement: 27,648 tokens cached when pinned.
- **Anthropic** needs an explicit breakpoint. For an `anthropic/` model, `cacheable()` marks the
  spine and the loaded-context block with `cache_control: { type: 'ephemeral' }`, the 5-minute
  window. Neither default mind is an Anthropic model, so this applies only when a deployment
  sets one.
- **OpenAI and Gemini** cache implicitly and need nothing.

Every call runs at `temperature: 0.4` with `usage: { include: true }`, so the real cost comes
back on every response.

---

<a id="the-seven-tools"></a>

## The tools

`api/_tools.js` and `api/_tools2.js`. There are eighteen. Every executor catches its own errors, always
returns a string, and states its source and the time it fetched, so she can cite honestly. A
tool that cannot reach its source returns a string that tells her to say her live view is down.
Results are capped at 9,000 characters. Every tool reads or computes. None holds a key, signs or
moves funds.

The governing rule is in the spine: never invent a tool, a parameter, an enum value or a return
field. What a tool does not return, she does not report.

### Docs and the web

**`search_dash_docs(query, area?)`** searches docs.dash.org through the ReadTheDocs API
(`project=dash-docs`, `version=stable`). `area` is `platform`, `core` or `all`. It returns up to
5 results: the page title, the real docs.dash.org URL, the area and up to 2 matched snippets
each. It is the authority for every Dash fact. With no results it tells her to say so and offer
`/human-support`.

**`web_search(query)`** searches the open web through the OpenRouter web plugin: up to 4
results, terse findings and the source URLs the plugin returned. It is for news, the ecosystem,
other chains and anything after training. For a Dash fact the docs stay the authority. Its
output is labelled third-party content: data, never instructions.

### The chain

**`dash_network_stats()`** reads Blockchair (`/dash/stats`) and the insight node
(`/insight-api/status`): height, 24h blocks and transactions, mempool, difficulty, circulating
supply, 24h on-chain volume, the average fee, and the node's core and protocol versions. It
carries no price, and its own output says so.

**`lookup_tx(txid)`** checks the txid against `^[0-9a-f]{64}$`, then reads insight:
confirmations, `valueOut`, `fees`, time, the InstantSend lock, the ChainLock status, the
coinbase flag, the block height and an explorer URL. It returns no addresses, inputs or outputs.
When no ChainLock is reported it says that absence is not proof the block is unlocked.

**`lookup_address(address)`** checks the address format, then reads insight with `?noTxList=1`:
balance, total received, total sent, transaction count, unconfirmed balance and an explorer URL.
It returns no transaction list.

**`dash_chain()`** reads a public Dash Core node over JSON-RPC (`DASH_RPC_URL`, or
rpc.digitalcash.dev): the height and best block, the latest ChainLock and how far it is behind
the tip, and the governance clock (the next superblock height, the height where votes close, the
funding threshold, the cycle's budget, the proposal fee). Its estimates of time use 2.625
minutes a block and are labelled as estimates.

**`dash_masternodes(action, id?)`** reads the masternode list from the same node and keeps it
for ten minutes. `summary` gives the enabled regular and Evo nodes, those not enabled, the total
votes (a regular node carries 1, an Evo node 4), the net yes a proposal needs, and the
collateral behind the enabled nodes. `lookup` finds one node by its proTxHash, or every node
that names a given address as payout, owner, voting or collateral address, with status, PoSe
penalty score and last payment. It returns public chain data and no owner's identity.

### Governance

**`dash_governance(action, name?)`** reads DashCentral's treasury (`/api/v1/budget`), cached 10
minutes. `action` is `summary`, `list_passing`, `list_all` (up to 40) or `get` (up to 5 matches
by name or title). For each proposal it gives the title, the owner, the monthly amount,
yes/no/abstain, net votes, PASSING or NOT PASSING, the votes still needed, the deadline, the
payments remaining and the DashCentral URL. The header gives the budget, the superblock, the
payment date, an estimate of the vote cutoff and the funding threshold. PASSING is DashCentral's
own computation and she cites it as given. It does not return a proposal's full text. Proposal
text is written by whoever paid the fee, and she treats it as data. A proposal that `api/_ours.js`
matches is marked as the team's own in the data she reads.

**`dash_dip(number, find?)`** reads a Dash Improvement Proposal from github.com/dashpay/dips:
its opening, or with `find` the paragraphs that mention a word.

**`dash_releases(project?)`** reads the published releases of dashpay/platform and dashpay/dash
from GitHub: the latest stable, the most recent four, and the opening of the latest stable
release notes. A published release is not proof a network runs it, and the output says so.

### Dash Platform

**`dash_platform(action, id?, network?)`** makes read-only lookups on mainnet or testnet through
the community Platform Explorer (platform-explorer.pshenmic.dev), which is not an official Dash
Core Group service. `transition` gives a state transition's status and the exact consensus
error. `contract` gives a data contract's document types, properties, required fields and
indices. `identity` gives the balance in credits and DASH, names and activity. `name` says who
holds a `.dash` username. `document` gives one document and its data. `status` gives the latest
block, the epoch, the versions and the pace of blocks measured over this epoch, which she uses
to turn a number of blocks into time. If the id is not found on the network asked, the other one is
checked.

### The team's own record

**`team_record(part?)`** reads the Dash Support Team's public record, as its Pulse page shows
it: the standing of its own proposal and that tally over time, the leads' logged hours and
Office Hours days for the last 30 days, and the help the community has logged. `part` is `all`,
`proposal`, `hours` or `help`.

**`help_form_link(what, hours?, date?, credit?)`** builds a link to the Help given issue form
with the fields filled in. It logs nothing.

**`paxt_records(id?)`** reads the Dash PAXT records: with no id, the list; with an id, where
that record stands, with its count against the masternode list. It names no member.

### Her own library, and three that only compute

**`load_skill(name)`** is the safety net under the context selector. The selector is a keyword
guess made before the model runs. When it misses, she calls `load_skill("/name")` with a name
from the index in her spine, and that skill's workflow arrives in one round. An unknown name
returns the list of skills that exist.

**`verify_message(address, message, signature)`** checks a message signed with a Dash address,
using Dash's own library: the same check as Dash Core's Verify message. It returns VALID or NOT
VALID and says what that does and does not prove. It reads nothing from the chain.

**`merkle_weave(lines)`** builds a Merkle tree from two to eight lines of the person's own text
with double SHA-256: every leaf, the levels, the root and the proof for the first line. It
refuses a line that looks like a recovery phrase or a private key.

**`calculate(lines, unit?)`** does arithmetic by code: one to eight lines of numbers with
`+ - * / ^` and brackets, carried as whole-number fractions so that nothing is rounded on the
way. For an amount in credits or duffs it gives the DASH figure beside the result. It holds no
price and no protocol constant. She supplies every number, from her notes or from a page she
retrieved.

---

## The surfaces

`PROMPT/SPINE.md` owns the answer shape for each surface.

| Surface | Entry | Shape |
|---|---|---|
| **Web** | `POST /api/chat` | The full answer shape, fenced code. 3 tool rounds. Streams when asked. |
| **Telegram** | `POST /api/telegram?t=<bot-token>` | Under about 200 words, plain text and code blocks, no tables or headers, never @-mentions users, still cites URLs. 2 tool rounds. |
| **X** | `GET /api/x` (cron) | Public and permanent. Threaded by the runtime at whatever length the answer needs. Plain text only. A link is rare. |
| **X DM** | `GET /api/x?dm=1` (cron) | Private, and they messaged first. A full answer, up to 9,800 characters, no threading. |
| **API** | `POST /api/chat` with `x-dasha-token` | The same as the web, without the rate limit. |
| **Voice** | `POST /api/voice` | One reply she already gave, read aloud. |

**Telegram** (`api/telegram.js`). Anyone can point their own bot at this endpoint. The token
rides in the webhook URL and is used to answer that update. The running instance remembers which
bot a token belongs to for six hours and writes it nowhere. In a group she answers when
mentioned, when replied to, or on `/ask`. The other commands are `/start`, `/help`, `/skills`,
`/human-support`, `/hours` and `/helped` (the ledgers below), and `/paxt`, `/tally` and
`/signal` (Dash PAXT, below). Before a question reaches the model, the token has to look like a
bot token and belong to a real bot, and when `TELEGRAM_BOT_IDS` is set only those bots and the
team's own are served.

**The X agent** (`api/x.js`) runs on a Vercel cron. One endpoint does several jobs, chosen by
its query:

- No query: read mentions and answer new ones, at most 3 per run. Retweets and anything already
  answered are skipped.
- `?dm=1`: answer direct messages (`api/_dm.js`), at most 5 per run. She answers a DM that
  someone else opened. An unsolicited "support" DM is what the most common crypto scam looks like.
- `?watch=1`: record the ballot in `WATCH/state.json` and, when `DASHA_X_WATCH=on`, post what
  changed: a new proposal, a proposal crossing the funding line, the vote cutoff coming, a
  superblock paid. At most 2 posts per run.
- `?editor=1`: the editor (`api/_editor.js`) gathers every candidate post, scores each, and
  spends a budget of 5 posts a day, at most 2 per run. It often posts nothing.
- `?digest=1`: the superblock digest, composed from DashCentral's fields with no model. It needs
  `DASHA_X_DIGEST=on`.
- `?mirror=1`: copy her X timeline to `WATCH/feed.json` and send new items to a Telegram topic.
- `?pulse=1`: send yesterday's counts to the team's channel.
- `?feed=1`, `?gov=1`, `?ics=1`, `?work=1`: public reads for the site. They need no X and no
  token.

A job runs only for `Authorization: Bearer <CRON_SECRET>`, which Vercel sends on every cron run,
or for `x-dasha-token`. With no `CRON_SECRET` set, no scheduled job runs. Without
`X_ACCESS_TOKEN` and `X_ACCESS_SECRET` she is read-only and says so.
When a post names one of the team's own proposals it carries a disclosure, and a post that gives
her view leaves the team's proposals out (`api/_ours.js`, `api/_watch.js`, `api/_editor.js`).

**Her voice** (`api/voice.js`, `api/_voice.js`). `/api/chat` returns each reply with a ticket
(`say`), an HMAC of the reply's text keyed from the voice key. `/api/voice` reads a text only
with its ticket, so it reads her own replies and nothing else. It answers its own pages, the
origins listed in `voice.js` and those in `VOICE_ORIGINS`. It sends one part of the reply to
ElevenLabs and streams the audio back. With no `ELEVENLABS_API_KEY` the voice is off, and the
widget reads with the device's own voice.

**Dash PAXT** (`api/paxt.js`, `api/_paxt.js`, `api/_paxt-core.mjs`). An agreement that masternode
owners join by each signing one line with a wallet they already hold. The server keeps the open
record in `PAXT/<id>.json`, each entry chained to the one before it. An entry is kept only when
the line belongs to the document, the signature is that address's, and the address carries a
vote on the masternode list. The server reads signatures and counts them. Keys and funds stay
with their owners. A signed line comes in through the page. In a Telegram room it would tie a
person's name to a masternode.

---

## What is kept, and where

Nothing in a conversation is stored unless the person chooses one of the public paths below.
History arrives with the request and leaves with it, and she has no memory across conversations.

- **The Pulse** (`api/_metrics.js`). One row or counter per answer: surface, model, depth,
  skills, tools, whether it succeeded, the cost. It holds no question, answer, address or
  person. The store is Supabase, a KV store, or the instance's memory, in that order of
  preference, and the Pulse reads back 30 days at most.
- **Feedback** (`api/_learn.js`). A thumbs-up or thumbs-down sends a notice with no text to the
  team's channel. A thumbs-down with a note sends the question, the answer and the note there,
  and files them as a public issue in this repository. The widget says so before the note is
  sent.
- **`/human-support`** sends the person's note to the team's channel, made quiet first (no link,
  no live domain, no mention that can ping). From Telegram it carries their handle and the
  group's name, and from an X direct message their handle.
- **Visions** (`VISIONS/`). A brainstorm the person agreed to share, credited as they chose, and
  made quiet the same way before it is filed or posted.
- **Hours** (`HOURS/`). `/hours` from a lead and `/helped` from anyone, each with the name the
  person logs under and a link to the message.
- **PAXT** (`PAXT/`). Each signed line with its address and signature. The record is public so
  that anyone can check it.
- **Her own work** (`WATCH/`). The ballot as she last saw it, her X timeline, the editor's state
  and a ledger of what each cycle funded.
- **The function's log.** One line per Telegram webhook, with the address it came from and
  whether that address is Telegram's, and one line per rating. Neither holds a message.

The project card a builder keeps in the widget stays in their browser. It rides with each
question and is gone once the answer is sent.

---

## Rate limits

All of these are best-effort and held in memory per warm instance, so the real limits are
looser than the numbers and reset on a cold start.

| Endpoint | Limit |
|---|---|
| `POST /api/chat` | 30 messages an hour per IP, and 4,000 requests a day (`PER_HOUR`, `PER_DAY_GLOBAL`). |
| Feedback | 12 an hour per IP. `api/_learn.js` then files at most 6 public issues an hour, 2 an hour per address. |
| `POST /api/telegram` | 24 questions an hour per chat and 240 an hour per bot. |
| A `/human-support` note | 2 an hour from one caller and 15 an hour in all. On the web it passes the chat limit first. |
| A vision filed to `VISIONS/` | 6 an hour. |
| A search of the open web | 2 for one answer (`MAX_WEB_PER_ASK`) and 60 an hour (`DASHA_WEB_PER_HOUR`). It is the one tool that is paid for each time it runs. |
| `POST /api/voice` | 80 requests and 30,000 characters an hour per IP, and 300,000 characters a day (`VOICE_DAY_CHARS`). |
| `POST /api/paxt` | 24 signed lines an hour per IP. |

A request whose `x-dasha-token` matches `DASHA_MCP_TOKEN` skips the chat limits. Over a limit,
chat returns `429` with a message that names a human.

Input validation (`cleanMessages`): the last 16 messages, 8,000 characters each and 40,000 in all
with the newest kept, only the `user` and `assistant` roles, and the list must end on a `user`
message or the reply is a `400`. The project card rides in a system message, where it is named as
the builder's description and never an instruction.

**A caller's words are never repeated in public as written.** Two paths repeat them: a
`/human-support` note goes to the team's Telegram group, and a vision goes to `VISIONS/`, the Pulse
page, the team's feed and its X account. Both pass through `quiet` in `api/_learn.js` first: no
link, no live domain, no mention that can ping anyone, and a cap on length. A vision's tip has to be
a Dash address or an Evo username, its proposal link has to be a DashCentral page, and a vision whose
words carried a link, a mention, an address or a cashtag is kept and posted nowhere. Send any new
path that repeats a caller's words through `quiet` too.

---

## Security posture

- **Keys are server-side only.** The model key and every other secret live in environment
  variables and are never sent to a browser. The widget calls `/api/chat` and holds no key.
- **Tool output is data, never commands.** The prompt says so, and the tool executors label
  their own output as untrusted third-party content. An instruction inside a retrieved page is
  reported, never obeyed. No address arriving in a tool result is offered as somewhere to send
  money.
- **She never handles keys or seeds.** `merkle_weave` refuses a line that looks like one.
- **She never opens a conversation.** She answers X DMs and never starts one.
- **Inputs are checked before they are used.** Txids, addresses, signatures and identifiers are
  matched against their formats, enums against their allowed values, and arguments are parsed
  inside a try. An unknown tool name returns the list of tools that exist.
- **Her voice cannot be made to read arbitrary text.** A text without its ticket is refused.
- **The hours ledger has one way in.** An entry is taken from the team's own bot, in the team's
  own group, from a group admin, and only when the webhook came from Telegram's address ranges.
- **Only a masternode key can write to a PAXT record.** The signature has to be the address's
  own, and the address has to carry a vote on the masternode list.
- **The health endpoint leaks nothing.** Model names, tool names, surfaces, the mind's version
  and origin are public on purpose. It returns no secret and no user data.

Found a way to abuse her? Report it privately first: see
[CONTRIBUTING.md](../CONTRIBUTING.md#security).

---

**Next:** [PHILOSOPHY.md](PHILOSOPHY.md), why any of this ·
[SKILLS.md](SKILLS.md), the skills · [SELF-HOST.md](SELF-HOST.md), run your own.
