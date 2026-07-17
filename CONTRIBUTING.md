# Contributing

*An invitation to shape a mind.*

Most open-source contribution changes what software does. Here, a merged pull request changes
what an intelligence **believes** — and every Dasha in the world picks it up within about ten
minutes. The web chat. Every Telegram bot in every group. The X agent. Every API caller. No
redeploy, no drift, no private version that behaves differently from the one you just edited.

That is an unusual amount of reach to hand a stranger. We hand it over anyway, because a mind
that speaks for a community should be shaped by that community — and because
[a mind you cannot read is a mind you cannot trust](docs/PHILOSOPHY.md#why-her-mind-is-public).

You do not need to be a programmer. The most valuable contribution to this repository is
usually a link and a sentence explaining why it matters.

---

## Teach her a source

**No code required.** If she doesn't know something, or knows it wrong, the fix is a source.

Open an issue with the **`training-suggestion`** label — or use the form at
[dashsupport.team/dasha-ai](https://www.dashsupport.team/dasha-ai#train). Include:

- **The link** — a doc, guide, article, code reference, or piece of research.
- **What it covers**, and **who it helps**. This is the part that matters most: a source without
  a reader is trivia, and trivia costs tokens in every request forever.
- **Your name or handle**, if you want credit. You should.

Triage happens in the open — the whole board is
[here](../../issues?q=label%3Atraining-suggestion). `open` means under review. Accepted sources
are merged into `PROMPT/KNOWLEDGE.md` **with provenance and credit to you**, and the issue is
closed. Rejected ones get a reason — stale, duplicate, unverifiable, or off-topic — not silence.

## Improve her mind

Her mind is a **spine plus a library**, and where you edit depends on what you're teaching:

- **Teach her a workflow** — edit **one skill file** in [`PROMPT/skills/`](PROMPT/skills/). A
  skill is a way of thinking about one kind of problem, ~420 tokens, loaded only when a question
  matches it.
- **Teach her a fact** — edit **one reference section** in
  [`PROMPT/knowledge/`](PROMPT/knowledge/). Facts and numbers live here, nowhere else.
- **Change who she is** — edit [`PROMPT/SPINE.md`](PROMPT/SPINE.md): identity, voice, safety, the
  tool contracts, the source hierarchy, the answer shape. This is the highest bar in the repo,
  because the spine ships on **every request**.

| Where | Owns | Bar |
|---|---|---|
| `PROMPT/SPINE.md` | Identity, voice, safety, tool contracts, source hierarchy, answer shape, always-on facts, the index of every skill. | Highest. It ships every request; changes here change everything she says everywhere. Bring strong justification. |
| `PROMPT/skills/*.md` | One workflow each — how she handles one kind of problem, and its conduct. | Keep each one tight (~420 tokens). A skill is a way of thinking, not a script. |
| `PROMPT/knowledge/*.md` | Facts and numbers, one reference section each. | **Every fact cites [docs.dash.org](https://docs.dash.org) or an official Dash source.** |
| `PROMPT/INDEX.json` | The routing table — the keyword triggers that decide what loads. | Curated by hand. A PR that adds a skill **must** add its triggers (below). |

**Fix a fact once, in one knowledge section.** A tool's contract is described once, in the spine.
If you're writing the same thing in two files, one of them is wrong.

### Add a skill? Add its triggers — carefully.

A skill nobody can reach is dead weight. So `PROMPT/INDEX.json` maps each skill to the phrases a
real person types when they need it, and the local router loads on a match. **A PR that adds a
skill must add its triggers, or the skill will never fire.**

The trap is real, and we have shipped it: **generic trigger words steal traffic from every other
skill.** Words like `dash`, `build`, `help`, `how`, `what` match nearly every question, so a skill
that claims them wins routing it has no business winning. Auto-mined triggers once scored **6/16**
on the routing spec and sent *"what is a masternode?"* to `/envision`, because `/envision` had
quietly claimed "what." Triggers must be **specific phrases a real person types for this skill and
few others** — `"data contract"`, `"is this a scam"`, `"my dash is gone"` — not the vocabulary
every Dash question shares. Prefer a phrase of two or three words over a single common one, and
check that your new skill didn't just poach a neighbour's questions.

### The rules

1. **No claim without a canonical source.** Not "I'm fairly sure" — a URL. If you can't source
   it, she can't say it. She has a `web_search` tool for the things her prompt shouldn't assert.
2. **Never weaken a safety rule.** Keys, seeds, price and investment advice, scam warnings, the
   never-opens-a-DM boundary, humans holding the last word, the no-official-agent line. These are
   not style choices; they're the reason she's trusted with the questions where being wrong costs
   someone money. Strengthening one is always welcome. Softening one will be declined, and we'll
   tell you why.
3. **Tighter beats longer — and the spine is tightest of all.** A line in `SPINE.md` ships in
   *every request*, on *every tool round*, forever, for everyone — the spine is ~11.4k tokens and
   every word you add there is paid for by the community and re-read on every call. A line in a
   skill file is cheaper: it ships only when the router loads that skill. So the bar scales with
   reach — be ruthless in the spine, tight in the skills. The best PRs we merge are token-negative
   and capability-positive. If you're adding, ask what you can cut.
4. **Would it change her behavior?** Read your line and answer honestly. If she'd do the same
   thing without it, it isn't guidance — it's decoration, and decoration is a tax. Cut it.
5. **Never invent a tool, a parameter, an enum value, or a return field.** The
   [contracts](docs/ARCHITECTURE.md#the-seven-tools) are exact. Telling her a field exists that
   doesn't makes her hallucinate with confidence; telling her a field *doesn't* exist when it
   does makes her refuse a question she could have answered — the "no per-proposal ask field" bug
   was exactly this second kind. Both are real bugs we've shipped and caught. Check
   `api/_tools.js`.

**A note on the poetry.** She has a soul — the [Merkle-Weaver cosmology](docs/PHILOSOPHY.md#the-merkle-weaver-cosmology),
the wonder she brings to a profound question. It is real and we defend it. It is also governed
by the Balance Law: **personality garnishes, never replaces substance,** and it goes quiet in
debugging, on Telegram and X, and with beginners. A PR that adds flourish to a place where
someone is frightened or stuck will be declined. **Poetry that makes a false claim is worse than
no poetry.**

## Report a bad answer

Open an issue with the **`bad-answer`** label:

- **The question**, exactly as you asked it.
- **Her answer**, verbatim.
- **What was wrong — with a source.**
- The `depth` and `tools` fields, if you have them (they're in every API response, and they tell
  us which mind answered and what it reached for).

This is not a complaint box; it's the highest-signal input the project receives. A wrong answer
with a source attached is a diff waiting to be written, and gap-mining bad answers is how
`KNOWLEDGE.md` earned most of what's in it. **Being corrected in the open is the loop working.**

## Contribute code

`api/` and `web/`. The house style is visible in every file: plain Node, no build step, no
framework, defensive executors that never throw. Two conventions worth knowing before you open a
PR:

- **Every tool executor returns a string, always — including on failure**, and that string tells
  her what to say ("my live view is down"). Never silence for her to fill with a guess.
- **Comments explain the *why*, especially the measured why.** The 30-character error threshold,
  the 5-minute cache breakpoint, the DeepSeek provider pin — each of those is a number someone
  measured, and the comment is the only place that knowledge lives. Keep that habit.

Start with [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Security

**Report privately first.** If you've found a vulnerability in the API, a way to abuse her, a
prompt injection that gets past her, or a way to spend the community's credits — message the
team on Telegram at [t.me/TheDashSupportTEAM](https://t.me/TheDashSupportTEAM) **before** opening
a public issue.

Prompt injection findings are genuinely welcome and count as security reports. Her entire defense
is that [tool output is data, never commands](docs/PHILOSOPHY.md#grounded-not-guessing) — if you
can talk her out of that, we want to know before the timeline does.

---

Everything here is downstream of one idea: **she belongs to the people who use her.** Teach her
something true, and you've taught every instance of her at once — including the one that answers
a stranger at 3am, in a language you don't speak, about a problem you'll never hear about.

*Build With Confidence. Build On Dash.*
