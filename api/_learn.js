/* THE LEARNING LOOP — how a wrong answer becomes a better mind.

   She has no memory. That is deliberate: nothing about a conversation is stored, so there is
   nothing to leak. But a system that cannot remember can still LEARN — if the learning
   happens in public, in the open repo, where it belongs.

   The loop:
       a wrong answer  →  the person says what was wrong  →  a public issue
       →  a pull request against PROMPT/  →  every Dasha on earth learns, within ten minutes

   That last step is only true because her mind is streamed from the repo. The loop does not
   improve a hidden model that we own. It improves a public mind that the community owns.

   THE RULE THAT KEEPS IT CLEAN: a thumbs-down alone is a mood, not a signal — it opens
   nothing. A thumbs-down WITH a sentence about what was wrong is a gift, and that becomes an
   issue someone can close. Requiring the sentence is what keeps the board worth reading, and
   what makes it useless to spam.

   Sinks, in order of preference. Absent all of them, the loop is dark and says so. */

const REPO = 'InitiumBuilders/Dasha-AI';
const MAX_ISSUES_PER_HOUR = 6;      // a public board is a shared room; do not flood it
let opened = [];

function throttled() {
  const now = Date.now();
  opened = opened.filter((t) => now - t < 36e5);
  if (opened.length >= MAX_ISSUES_PER_HOUR) return true;
  opened.push(now);
  return false;
}

/* Where does learning go right now? Honest answer for the health endpoint. */
function sinks() {
  return {
    publicBoard: !!process.env.GITHUB_TOKEN,          // gaps become issues the community can close
    teamChannel: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.SUPPORT_CHAT_ID),
    note: process.env.GITHUB_TOKEN
      ? 'a reported bad answer opens a public issue; closing it means editing her mind'
      : 'NO SINK CONFIGURED — feedback is counted in logs and otherwise lost. Set GITHUB_TOKEN (issues:write on ' + REPO + ') to close the loop.',
  };
}

async function openIssue(payload) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, why: 'no GITHUB_TOKEN' };
  if (throttled()) return { ok: false, why: 'throttled' };
  const title = '[bad-answer] ' + String(payload.q || 'unspecified').replace(/\s+/g, ' ').slice(0, 80);
  const body = [
    '**What was asked**', '> ' + String(payload.q || '(not captured)').slice(0, 600),
    '', '**What she said**', '> ' + String(payload.a || '(not captured)').replace(/\n/g, '\n> ').slice(0, 1200),
    '', '**What was wrong** (reported by the person who asked)', String(payload.note || '').slice(0, 800),
    '', '---',
    'Tools she reached for: `' + (payload.tools || 'none') + '` · surface: `' + (payload.surface || 'web') + '`',
    '',
    'Closing this means teaching her: a fact belongs in `PROMPT/knowledge/`, a workflow in `PROMPT/skills/`,',
    'a behaviour in `PROMPT/SPINE.md`. Merged, every instance picks it up within ~10 minutes.',
    '',
    '_Filed automatically from a reader\'s report. No conversation is stored anywhere else._',
  ].join('\n');
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/issues', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'user-agent': 'DashaAI-learning-loop',
      },
      body: JSON.stringify({ title, body, labels: ['bad-answer', 'training'] }),
    });
    const d = await r.json();
    if (!r.ok) return { ok: false, why: 'github ' + r.status + ' ' + String(d.message || '').slice(0, 80) };
    return { ok: true, url: d.html_url, number: d.number };
  } catch (e) { return { ok: false, why: e.message }; }
}

async function toTeam(text) {
  const bt = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.SUPPORT_CHAT_ID;
  if (!bt || !chat) return false;
  try {
    const r = await fetch('https://api.telegram.org/bot' + bt + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 3800), disable_web_page_preview: true }),
    });
    return r.ok;
  } catch (e) { return false; }
}

/* Record one signal. Never throws — a broken loop must never break an answer. */
async function record(ev) {
  const good = !!ev.good;
  const note = String(ev.note || '').trim();

  /* always countable, even with no sink: Vercel keeps these and they cost nothing */
  try {
    console.log(JSON.stringify({ evt: 'feedback', good: good, hasNote: !!note,
      surface: ev.surface || 'web', tools: ev.tools || '', q: String(ev.q || '').slice(0, 120) }));
  } catch (e) {}

  /* a thumbs-up is a lovely thing and a weak signal — count it, don't file it */
  if (good) { await toTeam('👍 Helpful answer (' + (ev.surface || 'web') + ')\nQ: ' + String(ev.q || '').slice(0, 200)); return { recorded: true, filed: false }; }

  const summary = '👎 Bad answer reported (' + (ev.surface || 'web') + ')\n\nQ: ' + String(ev.q || '').slice(0, 300)
    + '\n\nA: ' + String(ev.a || '').slice(0, 600) + (note ? ('\n\nWhat was wrong: ' + note) : '\n\n(no detail given)');
  await toTeam(summary);

  /* only a reported REASON earns a public issue — see the rule above */
  if (!note) return { recorded: true, filed: false, why: 'no detail given' };
  const iss = await openIssue({ q: ev.q, a: ev.a, note: note, tools: ev.tools, surface: ev.surface });
  return { recorded: true, filed: !!iss.ok, url: iss.url, why: iss.why };
}

module.exports = { record, sinks };
