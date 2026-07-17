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

Pull requests against `PROMPT/*.md`. Know which file you're in before you write a line — the
ownership rule keeps her from contradicting herself:

| File | Owns | Bar |
|---|---|---|
| `PROMPT-CORE.md` | Identity, voice, safety, tool doctrine, source hierarchy, answer shape. | Highest. Changes here change everything she says everywhere. Bring strong justification. |
| `PROMPT/SKILLS.md` | The 35 skill workflows and conduct. | Keep each one tight. A skill is a way of thinking, not a script. |
| `PROMPT/KNOWLEDGE.md` | Facts and numbers. | **Every fact cites [docs.dash.org](https://docs.dash.org) or an official Dash source.** |

**Fix a fact once, in KNOWLEDGE.** A tool's contract is described once, in CORE. If you're
writing the same thing in two files, one of them is wrong.

### The rules

1. **No claim without a canonical source.** Not "I'm fairly sure" — a URL. If you can't source
   it, she can't say it. She has a `web_search` tool for the things her prompt shouldn't assert.
2. **Never weaken a safety rule.** Keys, seeds, price and investment advice, scam warnings,
   humans holding the last word, the no-official-agent line. These are not style choices;
   they're the reason she's trusted with the questions where being wrong costs someone money.
   Strengthening one is always welcome. Softening one will be declined, and we'll tell you why.
3. **Tighter beats longer. Every line ships in production.** Not once — in *every request*, on
   *every tool round*, forever, for everyone. Her mind is ~23.6k tokens and every word you add is
   paid for by the community and re-read by the model on every call. The best PRs we merge are
   token-negative and capability-positive. If you're adding, ask what you can cut.
4. **Would it change her behavior?** Read your line and answer honestly. If she'd do the same
   thing without it, it isn't guidance — it's decoration, and decoration is a tax. Cut it.
5. **Never invent a tool, a parameter, an enum value, or a return field.** The
   [contracts](docs/ARCHITECTURE.md#the-six-tools) are exact. Telling her a field exists that
   doesn't makes her hallucinate with confidence; telling her a field *doesn't* exist when it
   does makes her refuse a question she could have answered. Both are real bugs we've shipped and
   caught. Check `api/_tools.js`.

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
