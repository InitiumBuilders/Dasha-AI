# Self-host

*Run your own Dasha. Honestly.*

The exit is real. If you want her on infrastructure you control — a different community, a
different language, a private team channel, or simply because you'd rather not depend on us —
this is the whole path. Nothing is withheld.

**First, though:** if all you want is Dasha in a Telegram group, you don't need any of this.
[Mint one in two minutes](../README.md#mint-your-own-dasha-into-any-telegram-group) — your bot
token never touches our server. Self-hosting is for when you want to own the deployment, point
her at your own mind, or change what she is.

**What you'll need:** a GitHub account, a [Vercel](https://vercel.com) account (the free tier is
enough to start), an [OpenRouter](https://openrouter.ai) account with credits, and about fifteen
minutes.

---

## 1. Fork

```bash
gh repo fork InitiumBuilders/Dasha-AI --clone
cd Dasha-AI
```

You now have her complete mind and brain. `PROMPT/` is what she thinks with; `api/` is how she
thinks.

## 2. Get a model key

Create a key at [openrouter.ai/keys](https://openrouter.ai/keys) and fund it. One key covers all
three tiers and `web_search` — there is no second provider to sign up for.

**Set a spend limit on the key.** Your deployment will be on the public internet. The built-in
rate limiter is best-effort and per warm serverless instance; the key's own cap is the control
that actually holds.

## 3. Deploy

```bash
npm i -g vercel
vercel
```

Accept the defaults. `api/*.js` become serverless functions; `web/` is served static. The first
deploy will run without a key — she'll answer every request by telling you she isn't configured
yet, which is the correct behavior and a useful smoke test.

## 4. Set the environment

Vercel dashboard → **Settings → Environment Variables** (or `vercel env add NAME production`).
Then redeploy — env changes need one.

### Required

| Variable | What it is |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter key. Powers all three tiers **and** `web_search` — without it, web search returns "unavailable" and says so rather than guessing. **Server-side only.** Never expose it to a browser. |

That is genuinely the only required one. Everything below has a working default or turns a
feature off cleanly.

### The three minds

Defaults are what we run in production. Override to change cost, latency, or character — the
tiers themselves are fixed at three ([why](ARCHITECTURE.md#the-router)).

| Variable | Default | Tier |
|---|---|---|
| `DASHA_MODEL` | `deepseek/deepseek-v3.2` | **Everyday** — most questions. ~$0.0006, ~3s. |
| `DASHA_DEEP_MODEL` | `openai/gpt-5.1-codex` | **Engineering** — code, stack traces, schemas, architecture. |
| `DASHA_COUNSEL_MODEL` | `anthropic/claude-sonnet-5` | **Judgement** — proposals, insight, leverage, systems thinking. |

Any OpenRouter model id works. Two caching notes worth real money before you swap anything:

- An `anthropic/*` model gets an **explicit cache breakpoint** automatically. A model from
  another provider on that tier will not — check that it caches implicitly, or you'll pay full
  price for a ~29k-token prompt on every call and every tool round.
- A `deepseek/*` model is **pinned to DeepSeek's own endpoint**, because that's the only place
  their automatic cache exists. Unpinned, OpenRouter may route to a reseller that caches nothing.

Read [prompt caching](ARCHITECTURE.md#prompt-caching) before changing a tier. The mind is resent
on every round; caching is the economics of the whole system.

### Human escalation and feedback

Both use the same pair. Set both or neither — `/human-support` still returns its reply either
way; only the ticket goes nowhere.

| Variable | What it is |
|---|---|
| `TELEGRAM_BOT_TOKEN` | A bot token from [@BotFather](https://t.me/BotFather). Also the bot that streams `/human-support` tickets and 👍/👎 feedback to your team. |
| `SUPPORT_CHAT_ID` | The chat id of your team's channel or group. Add the bot to it, post a message, then read the id from `https://api.telegram.org/bot<TOKEN>/getUpdates`. Group ids are negative. |

Feedback is the loop that turns a bad answer into a fix. Wire it up on day one — it's where
almost everything you'll learn about her comes from.

### The token API

| Variable | What it is |
|---|---|
| `DASHA_MCP_TOKEN` | A long random secret. Callers sending it as `x-dasha-token` **skip the rate limiter** and get a 3,200-token answer ceiling. Treat it as a credential — it spends your credits. Generate: `openssl rand -hex 32`. |

```bash
curl -s https://<your-deployment>/api/chat \
  -H 'Content-Type: application/json' \
  -H 'x-dasha-token: <your-token>' \
  -d '{"messages":[{"role":"user","content":"What is a data contract?"}]}'
```

### The X agent (optional)

Skip all of it unless you want her on X. Requires an X developer app with **Read + Write**
permission and OAuth 1.0a tokens **generated from the account that will post**.

| Variable | What it is |
|---|---|
| `X_HANDLE` | The exact handle she runs as, no `@`. |
| `X_CONSUMER_KEY` / `X_CONSUMER_SECRET` | Your X app's API key and secret. |
| `X_BEARER_TOKEN` | App-only token, for reading mentions. |
| `X_ACCESS_TOKEN` / `X_ACCESS_SECRET` | OAuth 1.0a, from the posting account. **Without these she is read-only** and says so. |
| `CRON_SECRET` | Authorizes the cron run. Vercel's own cron header also authorizes; `DASHA_MCP_TOKEN` authorizes a manual run. |

Add the schedule in `vercel.json` at the repo root:

```json
{
  "crons": [{ "path": "/api/x", "schedule": "*/5 * * * *" }]
}
```

She reads mentions and answers new ones, **max 3 replies per run**. Check the wiring before you
let her speak — `GET /api/x` reports config status, whether she can post, and what mentions she
can see:

```bash
curl -H 'x-dasha-token: <your-token>' https://<your-deployment>/api/x
```

## 5. Verify

```bash
curl https://<your-deployment>/api/chat
```

Read `mind.origin` in the response. **`"github"`** means the live stream is feeding your
instance. **`"baked"`** means GitHub was unreachable and she's running the copy compiled at
build time — she still answers, but she isn't learning from your repo yet.

Then ask her something real. If she cites a `docs.dash.org` URL you can open, the whole loop —
mind, router, tools, citations — is working.

## 6. Point her at your own mind

**This is the step that makes her yours.** Until you do it, your deployment fetches its prompt
from *our* repo — you're running our mind on your infrastructure, and every PR we merge changes
your bot.

Edit `api/_mind.js`:

```js
const RAW = 'https://raw.githubusercontent.com/<your-org>/<your-fork>/main/PROMPT/';
```

Commit, push, redeploy. Now `PROMPT/*.md` in **your** repo is what your Dasha thinks with, and
every merge to your `main` teaches your instances within ~10 minutes. No redeploy — that's the
point of the stream.

Two things to keep honest if you change what she says:

- **Re-bake the fallback** — `node scripts/assemble-prompt.js` regenerates `api/_prompt.js` from
  your `PROMPT/*.md`. A stale fallback means that when GitHub blinks, your bot reverts to a mind
  you no longer agree with — the worst kind of bug, because it's rare and silent.
- **She is not the official Dash DAO agent, and neither is your fork.** That rule is in
  `PROMPT-CORE.md` for good reason: it protects users from mistaking any of us for authority
  nobody granted. Keep it. Same for the safety rules — never keys, never seeds, never price,
  humans hold the last word. Everything else is yours to shape.

## 7. Mint a Telegram bot into it

Point your own bot at your own deployment:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-deployment>/api/telegram%3Ft%3D<YOUR_BOT_TOKEN>"
```

Add the bot to your group. She answers when mentioned, when replied to, or on `/ask` — under
~200 words, plain text, 2 tool rounds ([why](ARCHITECTURE.md#the-surfaces)). The token rides the
webhook URL and is never stored.

Verify: `curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo` — check
`pending_update_count` isn't climbing and `last_error_message` is absent.

---

## Honest operating notes

- **Rate limiting is best-effort.** 30/hour per IP and 4,000/day global, held in memory per warm
  serverless instance — so real limits are looser than the numbers suggest, and reset on cold
  starts. It stops casual abuse, not a determined attacker. **Your OpenRouter spend cap is the
  real control.**
- **The daily global cap will bite before your wallet does** — 4,000 requests, then she names a
  human and stops. Tune `PER_DAY_GLOBAL` in `api/chat.js` to your budget deliberately, in both
  directions.
- **Nothing is stored.** No database, no conversation history, no user records. History arrives
  with the request and leaves with it. Nothing to back up, nothing to breach, and no memory
  across conversations — by design, but plan around it.
- **Third-party endpoints can go down.** docs.dash.org search, DashCentral, blockchair,
  insight.dash.org. Every executor fails to a string that tells her to say her live view is down.
  Nothing you need to handle — but if she starts sounding vague, check whether her hands are
  reaching anything.
- **Costs are real and reported.** Every response carries `usage.cost` from OpenRouter. Watch the
  judgement tier: a starved big model is the expensive mistake (measured: $0.196 vs $0.032 for
  the *same* model with enough headroom to engage its cache).
- **Keys stay server-side.** The web widget calls `/api/chat` and never holds a model key. Keep
  it that way — a key in a browser bundle is a key on the public internet.

If you run a Dasha, tell us — [t.me/TheDashSupportTEAM](https://t.me/TheDashSupportTEAM). Not
for permission. Because a fork that teaches its mind something true is a fork we'd like to learn
from, and the stream runs both ways if you open a PR.

---

**Next:** [ARCHITECTURE.md](ARCHITECTURE.md) — what you just deployed ·
[PHILOSOPHY.md](PHILOSOPHY.md) — what to keep if you change her ·
[CONTRIBUTING.md](../CONTRIBUTING.md) — send it back upstream.
