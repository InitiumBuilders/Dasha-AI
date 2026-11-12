# Self-host

*Run your own Dasha. Honestly.*

The exit is real. If you want her on infrastructure you control — a different community, a
different language, a private team channel, or simply because you'd rather not depend on us —
this is the whole path. [What the copy here leaves out](ARCHITECTURE.md#what-this-repository-holds)
is listed in the architecture notes. The one piece you will have to bring yourself is the
styling for the web widget.

**First, though:** if all you want is Dasha in a Telegram group, you don't need any of this.
[Mint one in two minutes](../README.md#mint-your-own-dasha-into-any-telegram-group). Your bot
token rides in your own webhook URL and is written nowhere on our side. Self-hosting is for when
you want to own the deployment, point her at your own mind, or change what she is.

**What you'll need:** a GitHub account, a [Vercel](https://vercel.com) account, an
[OpenRouter](https://openrouter.ai) account with credits, and about fifteen minutes.

---

## 1. Fork

```bash
gh repo fork InitiumBuilders/Dasha-AI --clone
cd Dasha-AI
```

You now have her complete mind and the code that runs it. `PROMPT/` is what she thinks with;
`api/` is how she thinks.

## 2. Get a model key

Create a key at [openrouter.ai/keys](https://openrouter.ai/keys) and fund it. One key covers
both minds and `web_search`. There is no second provider to sign up for.

**Set a spend limit on the key.** Your deployment will be on the public internet. The built-in
rate limiter is best-effort and per warm serverless instance; the key's own cap is the control
that actually holds.

## 3. Deploy

```bash
npm i -g vercel
vercel
```

Accept the defaults. Each file in `api/` whose name does not start with `_` becomes a serverless
function, and Vercel installs the one dependency in `package.json`. The first deploy runs
without a key: she answers every question by saying she isn't configured yet, which is a useful
smoke test.

Give the functions the time they need. Add a `vercel.json` at the repository root:

```json
{
  "functions": {
    "api/chat.js": { "maxDuration": 120 },
    "api/telegram.js": { "maxDuration": 60 },
    "api/paxt.js": { "maxDuration": 60 },
    "api/voice.js": { "maxDuration": 30 },
    "api/x.js": { "maxDuration": 300 }
  }
}
```

These are the values production runs with. If your plan caps a function at less, use your cap.
`_brain.js` plans an answer around a 120-second function: its own deadline is 108 seconds, which
leaves 12. With a lower cap on `chat.js`, set `DASHA_DEADLINE_MS` with the same margin under it.

## 4. Set the environment

Vercel dashboard → **Settings → Environment Variables** (or `vercel env add NAME production`).
Then redeploy, because a change to the environment needs one. Set values there and nowhere
else. A `.env` file stays out of git, and `.gitignore` already lists it.

### Required

| Variable | What it is |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter key. It powers both minds and `web_search`. Server-side only. |

That is the only required one. Everything below has a working default or turns a feature off.

### The two minds

| Variable | Default | Mind |
|---|---|---|
| `DASHA_MODEL` | `deepseek/deepseek-v4-flash-0731` | **Flash.** Most questions. |
| `DASHA_PRO_MODEL` | `deepseek/deepseek-v4-pro-0813` | **Pro.** Code, errors, judgement, and everything she says in public. |
| `DASHA_FREE_MODEL` | none | A free model to try first when credits run short. |

Any OpenRouter model id works. Read these before you change one:

- A `deepseek/*` model is pinned to DeepSeek's own endpoint, because that is the only place its
  automatic cache exists. An `anthropic/*` model gets an explicit cache breakpoint. For any
  other provider, check that it caches implicitly, or you will pay full price for the whole
  prompt on every call and every tool round.
- `freshen()` in `_brain.js` looks for newer releases every six hours, and it only knows the
  DeepSeek v4 families (`FAMILY`). If you set a model from another family, it can still replace
  your choice with a DeepSeek v4 release that is newer than your model. Change `FAMILY` to your
  own family's pattern. `GET /api/chat` shows what is running under `models`.

Read [prompt caching](ARCHITECTURE.md#prompt-caching) and [the router](ARCHITECTURE.md#the-router)
before changing a mind.

Five more names tune the timing and rarely need setting: `DASHA_DEADLINE_MS` (108000),
`DASHA_HEDGE_MS` (9000), `DASHA_REST_MS` (600000), `DASHA_STREAM_REST_MS` (600000), and
`DASHA_STREAM`, where `off` stops her words arriving as she writes them.

### Human escalation and feedback

| Variable | What it is |
|---|---|
| `TELEGRAM_BOT_TOKEN` | A bot token from [@BotFather](https://t.me/BotFather). This bot sends `/human-support` tickets and feedback to your team. It is also the team's own bot for `/hours`. |
| `SUPPORT_CHAT_ID` | The chat id of your team's channel or group. Add the bot to it, post a message, then read the id from `https://api.telegram.org/bot<TOKEN>/getUpdates`. Group ids are negative. |
| `TELEGRAM_BOT_IDS` | Optional. Bot ids, comma-separated (the number before the colon in a token). When set, the Telegram webhook serves only these bots and your own. |

Set the first two together or leave both out. `/human-support` returns its reply either way;
without them the ticket goes nowhere.

### The records on GitHub

| Variable | What it is |
|---|---|
| `GITHUB_TOKEN` | A token that can write contents and open issues on **your** repository. |

With it she files a reported bad answer as a public issue (`_learn.js`), keeps the vision
commons (`_visions.js`), the hours and help ledgers (`_hours.js`, `_help.js`), the PAXT records
(`_paxt.js`) and the state of her X work (`_watch.js`, `_feed.js`, `_editor.js`). Without it
those features are off, and the health report says the feedback loop has no sink.

**Change the repository name in the code before you set this.** See
[step 6](#6-make-her-yours). Until you do, your deployment aims its records at our repository.

### The token API

| Variable | What it is |
|---|---|
| `DASHA_MCP_TOKEN` | A long random secret. A caller that sends it as `x-dasha-token` skips the rate limiter, can read the team view of the Pulse, and can start an X job by hand. Treat it as a credential: it spends your credits. Generate one with `openssl rand -hex 32`. |

```bash
curl -s https://<your-deployment>/api/chat \
  -H 'Content-Type: application/json' \
  -H 'x-dasha-token: <your-token>' \
  -d '{"messages":[{"role":"user","content":"What is a data contract?"}]}'
```

### The Pulse store

Without a store the counts live in each instance's memory and the health report says so.

| Variable | What it is |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | A Supabase project and its service key (`SUPABASE_SERVICE_ROLE_KEY` is read too). Run `SUPABASE-SETUP.sql` from the repository root once to create the table. It has no column for a question, an answer or a person. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Or a Vercel KV or Upstash store (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are read too). Daily counters only. |

### The chain

| Variable | What it is |
|---|---|
| `DASH_RPC_URL` | Optional. A Dash Core JSON-RPC address for `dash_chain`, `dash_masternodes` and the PAXT count. The default is the public node at rpc.digitalcash.dev. If your address carries a user name or a password, only its host ever appears in a reply or a record. |

### Her voice (optional)

| Variable | What it is |
|---|---|
| `ELEVENLABS_API_KEY` | An ElevenLabs key. With no key the voice is off and the widget reads with the device's own voice. |
| `ELEVENLABS_VOICE_ID` | The voice. The default in `_voice.js` is the team's own, so set this to a voice your account can use. |
| `ELEVENLABS_MODEL` | Optional. The default is `eleven_flash_v2_5`. |
| `VOICE_ORIGINS` | Optional. Origins allowed to call `/api/voice` besides your own host, comma-separated. |
| `VOICE_DAY_CHARS` | Optional. Characters read per day, per instance. The default is 300000. |

Speech costs money per character. Put a quota on the key at ElevenLabs: the limits in `voice.js`
are per running instance. `ALLOW` in `voice.js` lists our own origins; replace them with yours.

### Telegram shares

| Variable | What it is |
|---|---|
| `DASHA_TG_FEED_CHAT` | Optional. The chat a vision is posted to when its author asked for that. |
| `DASHA_TG_FEED_TOPIC` | Optional. The topic (thread id) inside that chat. The X mirror posts to this topic in `SUPPORT_CHAT_ID`. |

### The X agent (optional)

Skip all of it unless you want her on X. It needs an X developer app with **Read + Write**
permission and OAuth 1.0a tokens **generated from the account that will post**.

| Variable | What it is |
|---|---|
| `X_HANDLE` | The exact handle she runs as, no `@`. |
| `X_CONSUMER_KEY` / `X_CONSUMER_SECRET` | Your X app's API key and secret. |
| `X_BEARER_TOKEN` | App-only token, for reading mentions. |
| `X_ACCESS_TOKEN` / `X_ACCESS_SECRET` | OAuth 1.0a, from the posting account. **Without these she is read-only** and says so. |
| `X_OAUTH2_ACCESS` | Optional. An OAuth 2.0 user token, used to post only when the two above are missing. |
| `CRON_SECRET` | Authorizes a scheduled run. Vercel's own cron header also authorizes, and `DASHA_MCP_TOKEN` authorizes a run by hand. Set it: with no `CRON_SECRET` the jobs run for any caller. |
| `DASHA_X_WATCH` | `on` lets the ballot watch, the editor and the ballot brief post. Without it nothing is posted, and the watch still keeps its record. |
| `DASHA_X_DIGEST` | `on` lets the superblock digest post. |
| `DAVARA_MCP_TOKEN` | Optional. With it the editor asks the Davara service for a read before two kinds of post (`davaraRead` in `_editor.js`). Without it that step is skipped. |

Add the schedules you want to `vercel.json`. These are the ones production runs for the jobs in
this repository:

```json
{
  "crons": [
    { "path": "/api/x", "schedule": "*/5 * * * *" },
    { "path": "/api/x?dm=1", "schedule": "*/5 * * * *" },
    { "path": "/api/x?watch=1", "schedule": "15,45 * * * *" },
    { "path": "/api/x?editor=1", "schedule": "10 8,12,16,20,23 * * *" },
    { "path": "/api/x?digest=1", "schedule": "0 15 * * *" },
    { "path": "/api/x?mirror=1", "schedule": "5,20,35,50 * * * *" },
    { "path": "/api/x?pulse=1", "schedule": "0 16 * * *" }
  ]
}
```

Check what your Vercel plan allows before adding a schedule this frequent. The watch writes
`WATCH/state.json` on every run, whether or not she may post. Check the wiring before you let
her speak: `GET /api/x?status=1` reports the configuration, whether she can post, and the
mentions she can see.

```bash
curl 'https://<your-deployment>/api/x?status=1'
```

Each job is described in [the surfaces](ARCHITECTURE.md#the-surfaces).

## 5. Verify

```bash
curl https://<your-deployment>/api/chat
```

Read `mind.origin` in the response. **`"github"`** means the live stream is feeding your
instance. **`"baked"`** means GitHub was unreachable and she's running the copy compiled at
build time — she still answers, but she isn't learning from your repo yet.

Then ask her something real. If she cites a `docs.dash.org` URL you can open, the whole loop —
mind, router, tools, citations — is working.

## 6. Make her yours

Until you do this, your deployment fetches its mind from *our* repository and aims its records
at it. Every pull request we merge changes your bot.

**The mind.** Edit `api/_mind.js`:

```js
const RAW = 'https://raw.githubusercontent.com/<your-org>/<your-fork>/main/PROMPT/';
```

Commit, push, redeploy. Now `PROMPT/` in **your** repository is what your Dasha thinks with, and
every merge to your `main` reaches your instances within about ten minutes, with no redeploy.

**The records.** `REPO` is set to `InitiumBuilders/Dasha-AI` in `_learn.js`, `_visions.js`,
`_help.js`, `_hours.js`, `_paxt.js`, `_watch.js`, `_feed.js`, `_editor.js` and `_work.js`, and
the same name appears in addresses in `visions.js`, `_tools.js`, `chat.js` and the widget.
Change them all to your fork before you set `GITHUB_TOKEN`. Writes to our repository fail
without access to it. Opening an issue is different: depending on your token's scope, your
users' bad-answer reports could be filed on our board.

**The names.** The code names the Dash Support Team in about a hundred lines: the human link in
`_brain.js`, the site in `_paxt.js` and `_doors.js`, the group in `_help.js`, the committer
address in each `ghPut`, the welcome texts in `telegram.js`, the allowed origins in `voice.js`,
the handle the editor may tag in `_editor.js`. This finds them:

```bash
grep -rniE "initiumbuilders|dashsupport|dash support team|builtbyaugust" api web --exclude=_prompt.js
```

`TZ` in `_hours.js` is the team's time zone, and the ledgers count their days in it.

**Your own proposals.** If your team asks the Dash treasury for funding, she has to say so
whenever she names that proposal. Set the pattern in `api/_ours.js`. The same kind of pattern
sits inline in `x.js` (the `ours` field), `_watch.js` (the tally over time) and `_tools.js`
(`team_record` and `OUR_MARK`), where it still matches the Dash Support Team's proposals.

**The team's record.** `team_record`, `help_form_link`, `/hours` and `/helped` report and write
the Dash Support Team's own public record. Point them at your own, or take the two tools out of
`DEFS` and `IMPL` in `_tools.js` and out of the tool list in `PROMPT/SPINE.md`.

Two things to keep honest if you change what she says:

- **Re-bake the fallback** — `node scripts/assemble-prompt.js` regenerates `api/_prompt.js` from
  your `PROMPT/`. A stale fallback means that when GitHub blinks, your bot reverts to a mind
  you no longer agree with — the worst kind of bug, because it's rare and silent.
- **She is not the official Dash DAO agent, and neither is your fork.** That rule is in
  `PROMPT/SPINE.md` for good reason: it protects users from mistaking any of us for authority
  nobody granted. Keep it. Same for the safety rules — never keys, never seeds, never price,
  humans hold the last word. Everything else is yours to shape.

## 7. Mint a Telegram bot into it

Point your own bot at your own deployment:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-deployment>/api/telegram%3Ft%3D<YOUR_BOT_TOKEN>"
```

Add the bot to your group. She answers when mentioned, when replied to, or on `/ask`, in under
about 200 words of plain text, with 2 tool rounds ([why](ARCHITECTURE.md#the-surfaces)). The
token rides the webhook URL. The running instance remembers which bot a token belongs to for six
hours and writes it nowhere.

On Telegram she always answers with the pro mind, so each question costs more than one on the
web. The webhook address is public. Set `TELEGRAM_BOT_IDS` so that only your own bots can spend
your credits through it.

Verify: `curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo` — check
`pending_update_count` isn't climbing and `last_error_message` is absent.

## 8. Put the widget on a page

`web/dasha-chat.js` mounts on any `<div data-dasha="full">` (the other modes are `panel` and
`sheet`) and calls `/api/chat` and `/api/voice` on the same origin:

```html
<div data-dasha="full"></div>
<script src="/web/dasha-chat.js" defer></script>
```

It writes plain HTML with its own class names (`dchat`, `dmsg`, `dtool` and the rest). The rules
for those classes are part of the Dash Support Team's site stylesheet, which is not in this
repository. On your own page the widget works and is unstyled until you write CSS for it. The
starter questions in `STARTERS` are keyed to our site's pages; replace them with your own.

---

## Honest operating notes

- **Rate limiting is best-effort.** 30/hour per IP and 4,000/day global, held in memory per warm
  serverless instance — so real limits are looser than the numbers suggest, and reset on cold
  starts. It stops casual abuse, not a determined attacker. **Your OpenRouter spend cap is the
  real control.**
- **The daily global cap will bite before your wallet does** — 4,000 requests, then she names a
  human and stops. Tune `PER_DAY_GLOBAL` in `api/chat.js` to your budget deliberately, in both
  directions.
- **No conversation is stored.** History arrives with the request and leaves with it, so she has
  no memory across conversations. Some things are kept on purpose: counts with no text, and the
  public records a person chooses to add to. [The architecture notes list each
  one](ARCHITECTURE.md#what-is-kept-and-where). Read that list before you tell your own users
  what you keep.
- **Third-party endpoints can go down.** docs.dash.org search, DashCentral, Blockchair,
  insight.dash.org, the Platform Explorer, the public Dash Core node, GitHub. Every tool fails to
  a string that tells her to say her live view is down. If she starts sounding vague, check
  whether her tools are reaching anything.
- **Costs are real and reported.** Every response carries `usage.cost` from OpenRouter. Watch the
  judgement tier: a starved big model is the expensive mistake (measured: $0.196 vs $0.032 for
  the *same* model with enough headroom to engage its cache).
- **Keys stay server-side.** The web widget calls `/api/chat` and never holds a model key. Keep
  it that way — a key in a browser bundle is a key on the public internet.
- **Node 20 or later.** The code uses the built-in `fetch` and the global Web Crypto API.
  Vercel's current runtimes are new enough.

If you run a Dasha, tell us — [t.me/TheDashSupportTEAM](https://t.me/TheDashSupportTEAM). Not
for permission. Because a fork that teaches its mind something true is a fork we'd like to learn
from, and the stream runs both ways if you open a PR.

---

**Next:** [ARCHITECTURE.md](ARCHITECTURE.md) — what you just deployed ·
[PHILOSOPHY.md](PHILOSOPHY.md) — what to keep if you change her ·
[CONTRIBUTING.md](../CONTRIBUTING.md) — send it back upstream.
