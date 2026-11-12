/* THE HOURS LEDGER — the proposal's promise, kept as a public file:
   "Logged hours · each lead · every weekday · posted in the Telegram group, totals on the Pulse."

   A lead logs in the team's Telegram group:
     /hours 3.5 Office Hours and two listing reviews
     /hours 2 yesterday answered builders in the group
     /hours -1 correction: counted the same session twice
     /hours            (this month's totals so far)

   Only the team's own bot, only in the team's own group, only from the group's admins: the
   webhook serves anyone's bot, so anything less would let a stranger log hours for the team.
   Each entry links to the public Telegram message it came from, so every hour on the Pulse
   points at where it was posted. A correction is a new entry, never an edit. Everything goes to
   HOURS/ in the public Dasha-AI repo: ledger.json for the Pulse, ledger.md for people. */
const REPO = 'InitiumBuilders/Dasha-AI';
const GH = 'https://api.github.com/repos/' + REPO + '/contents/';
const JSONF = 'HOURS/ledger.json', MDF = 'HOURS/ledger.md';
const TZ = 'America/Chicago';

const HDRS = () => ({ Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-hours', Accept: 'application/vnd.github+json' });
async function ghGet(path) {
  try {
    const r = await fetch(GH + path + '?t=' + Date.now(), { headers: HDRS() });
    if (r.status === 404) return { text: null, sha: null, missing: true };
    if (!r.ok) return { text: null, sha: null, failed: true };
    const d = await r.json();
    return { text: Buffer.from(d.content || '', 'base64').toString('utf8'), sha: d.sha || null };
  } catch (e) { return { text: null, sha: null, failed: true }; }
}
async function ghPut(path, content, message, sha, by) {
  try {
    const body = { message, content: Buffer.from(content).toString('base64'), committer: { name: by || 'Dasha Hours', email: 'Help@DashSupport.Team' } };
    if (sha) body.sha = sha;
    const r = await fetch(GH + path, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, HDRS()), body: JSON.stringify(body) });
    return r.status;
  } catch (e) { return 0; }
}

/* the day, in the team's time zone */
function day(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
/* n days before today, counted on the Central calendar (a DST day is 23 or 25 hours, never 24) */
function daysBack(now, n) { return new Date(Date.parse(day(now) + 'T12:00:00Z') - n * 864e5).toISOString().slice(0, 10); }
/* one markdown table cell from untrusted text: one line, no pipes, no markdown or HTML that renders */
function cell(v) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f\u2028\u2029\s]+/g, ' ').trim().replace(/[\\`*_{}\[\]()<>#!|~]/g, '\\$&'); }
const CORRECTION = /\bcorrect(ion|ed|ing)?\b/i;

/* "/hours 3.5 yesterday note…" → { kind: 'log', hours, date, note } | { kind: 'totals' } | { kind: 'usage', why }
   cmd is the command (or an alternation, 'helped|hours'); max is the most one entry may log */
function parse(text, now, cmd, opts) {
  const max = (opts && opts.max) || 12;
  const m = String(text || '').match(new RegExp('^\\/(?:' + (cmd || 'hours') + ')(?:@\\w+)?\\b\\s*([\\s\\S]*)$', 'i'));
  if (!m) return null;
  let rest = m[1].trim();
  if (!rest || /^(me|total|totals|month|summary)$/i.test(rest)) return { kind: 'totals' };
  const h = rest.match(/^([+-]?\d{1,2}(?:[.,]\d{1,2})?)\s*(?:h|hr|hrs|hour|hours)?(?=\s|$)\s*/i);
  if (!h) return { kind: 'usage', why: 'Start with the hours, like: /hours 3.5 Office Hours and two listing reviews' };
  let hours = Math.round(parseFloat(h[1].replace(',', '.')) * 4) / 4;
  if (!hours || Math.abs(hours) > max) return { kind: 'usage', why: 'Log between 0.25 and ' + max + ' hours at a time (a negative number corrects an earlier entry).' };
  rest = rest.slice(h[0].length);
  let date = day(now);
  const dm = rest.match(/^(today|yesterday|\d{4}-\d{2}-\d{2})\b\s*/i);
  if (dm) {
    const w = dm[1].toLowerCase();
    if (w === 'yesterday') date = daysBack(now, 1);
    else if (w !== 'today') date = w;
    rest = rest.slice(dm[0].length);
    const age = (new Date(day(now) + 'T12:00:00Z') - new Date(date + 'T12:00:00Z')) / 864e5;
    if (!(age >= 0 && age <= 7)) return { kind: 'usage', why: 'Log for today or up to 7 days back, like: /hours 2 yesterday answered builders in the group' };
  }
  const note = rest.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (note.length < 3) return { kind: 'usage', why: 'Say what the hours were for, like: /hours 3.5 Office Hours and two listing reviews' };
  if (hours < 0 && !CORRECTION.test(note)) return { kind: 'usage', why: 'A negative entry corrects an earlier one; say so, like: /hours -1 correction: counted the same session twice' };
  return { kind: 'log', hours, date, note };
}

/* the webhook also takes requests without a token (it falls back to the team's own bot), so a
   forged update could name the team group and a lead. Telegram sends webhooks only from
   149.154.160.0/20 and 91.108.4.0/22 (core.telegram.org/bots/webhooks); an hour is logged only
   from there. The address is Vercel's, which a client cannot set. */
function ip4(s) { const p = String(s || '').trim().split('.'); if (p.length !== 4) return null; let n = 0; for (const x of p) { const v = +x; if (!(v >= 0 && v <= 255) || x === '') return null; n = n * 256 + v; } return n; }
function inNet(n, base, bits) { const b = ip4(base), m = Math.pow(2, 32 - bits); return Math.floor(n / m) === Math.floor(b / m); }
function srcIp(req) {
  const h = (req && req.headers) || {};
  const raw = h['x-vercel-forwarded-for'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0];
  return String(raw || '').trim().replace(/^::ffff:/, '');
}
function fromTelegram(req) {
  const n = ip4(srcIp(req));
  return n != null && (inNet(n, '149.154.160.0', 20) || inNet(n, '91.108.4.0', 22));
}
/* one log line per webhook: the connecting server's address and whether it is Telegram's, never
   the message or the person. Real group traffic proves the check before a lead's first /hours. */
function source(req) { return 'tg-src ' + srcIp(req) + ' telegram=' + fromTelegram(req); }

/* who may log: the team's own bot, in the team's own group, an admin of that group */
function teamChat(token, chatId) {
  return !!(token && process.env.TELEGRAM_BOT_TOKEN && token === process.env.TELEGRAM_BOT_TOKEN
    && process.env.SUPPORT_CHAT_ID && String(chatId) === String(process.env.SUPPORT_CHAT_ID));
}
/* true, false, or null when Telegram couldn't say (then nothing is logged anywhere) */
async function isAdmin(token, chatId, userId) {
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/getChatMember?chat_id=' + encodeURIComponent(chatId) + '&user_id=' + encodeURIComponent(userId));
    const d = await r.json();
    if (!d || !d.ok || !d.result || !d.result.status) return null;
    return d.result.status === 'creator' || d.result.status === 'administrator';
  } catch (e) { return null; }
}

function who(from) {
  const name = [from && from.first_name, from && from.last_name].filter(Boolean).join(' ').trim() || 'A lead';
  return { who: name.slice(0, 60), handle: from && from.username ? '@' + String(from.username).slice(0, 40) : null };
}
function key(e) { return e.handle || e.who; }

/* the last 30 days (in the team's time zone) by person */
function totals(entries, now) {
  const from = daysBack(now, 29);
  const by = {};
  entries.filter((e) => e.date >= from).forEach((e) => {
    const k = key(e);
    const t = by[k] || (by[k] = { who: e.who, handle: e.handle, hours: 0, days: {} });
    t.hours += e.hours; t.days[e.date] = true;
  });
  return Object.values(by).map((t) => ({ who: t.who, handle: t.handle, hours: Math.round(t.hours * 100) / 100, days: Object.keys(t.days).length }))
    .sort((a, b) => b.hours - a.hours);
}

/* Office Hours held: a day counts when any positive entry that day says "Office Hours" (the
   Pulse promises "every Office Hours session held", and the leads log them anyway) */
function sessions(entries, now) {
  const from = daysBack(now, 29);
  const days = {};
  entries.filter((e) => e.date >= from && e.hours > 0 && /office\s*hours/i.test(e.note || '')).forEach((e) => { days[e.date] = true; });
  return Object.keys(days).sort();
}

function renderMd(entries) {
  const rows = entries.slice().reverse().map((e) => '| ' + cell(e.date) + ' | ' + cell(e.who) + (e.handle ? ' (' + cell(e.handle) + ')' : '') + ' | ' + cell(e.hours) + ' | '
    + cell(e.note) + ' | ' + (e.link && /^https:\/\/t\.me\/[\w/]+$/.test(e.link) ? '[message](' + e.link + ')' : 'self-reported') + ' |');
  return '# Logged hours\n\n'
    + 'Each lead logs their hours in the Dash Support Team\'s Telegram group with `/hours`, and each entry links to the message it came from. '
    + 'A correction is a new entry with a negative number, never an edit. Totals appear on [The Pulse](https://www.dashsupport.team/pulse).\n\n'
    + '| Date (Central) | Who | Hours | What for | Evidence |\n|---|---|---|---|---|\n' + rows.join('\n') + '\n';
}

/* append one entry; the file's sha guards against two writes at once, so a clash just retries */
async function append(entry) {
  for (let i = 0; i < 3; i++) {
    const cur = await ghGet(JSONF);
    if (cur.failed) return false;
    let data = { about: 'Logged hours of the Dash Support Team leads. Written by Dasha from /hours in the team Telegram group.', entries: [] };
    if (cur.text) { try { data = JSON.parse(cur.text); } catch (e) { return false; } }
    if (!Array.isArray(data.entries)) data.entries = [];
    if (data.entries.some((e) => e.id === entry.id)) return true;   /* a retried update, already in */
    data.entries.push(entry);
    const st = await ghPut(JSONF, JSON.stringify(data, null, 1) + '\n', 'hours: ' + entry.who + ' ' + (entry.hours > 0 ? '+' : '') + entry.hours + ' h (' + entry.date + ')', cur.sha);
    if (st === 200 || st === 201) {
      const md = await ghGet(MDF);
      await ghPut(MDF, renderMd(data.entries), 'hours: ledger.md', md.sha);
      return data.entries;
    }
    if (st !== 409 && st !== 422) return false;
  }
  return false;
}

function fmt(n) { return (Math.round(n * 100) / 100).toString(); }

/* the whole Telegram exchange for one /hours message; returns the reply, or null when it isn't one */
async function handle(token, msg, req) {
  const now = new Date();
  const p = parse(msg && msg.text, now);
  if (!p) return null;
  if (!fromTelegram(req)) return null;   /* not from Telegram: say nothing, log nothing */
  if (!teamChat(token, msg.chat && msg.chat.id)) return require('./_help.js').handleTelegram(token, msg, req);
  /* not a lead: welcome all the same; their help is credited in the community ledger */
  /* sent as the group itself (an anonymous admin): nobody can be credited, so nothing is logged */
  if (!msg.from || msg.sender_chat || msg.from.username === 'GroupAnonymousBot') return 'Log hours from your own account, not as the group, so they can be credited to you.';
  const admin = await isAdmin(token, msg.chat.id, msg.from.id);
  if (admin === null) return 'I couldn\'t check the group\'s admins just now. Nothing was logged; please try again in a minute.';
  /* not a lead: welcome all the same; their help is credited in the community ledger */
  if (!admin) return require('./_help.js').handleTelegram(token, msg, req, { fromHours: true });
  if (p.kind === 'usage') return p.why;
  if (p.kind === 'totals') {
    const cur = await ghGet(JSONF);
    let entries = [];
    try { entries = cur.text ? (JSON.parse(cur.text).entries || []) : []; } catch (e) {}
    const t = totals(entries, now);
    if (!t.length) return 'No hours logged in the last 30 days yet. Log with: /hours 3.5 Office Hours and two listing reviews';
    const oh = sessions(entries, now).length;
    return 'Logged hours, last 30 days:\n' + t.map((x) => '• ' + x.who + ': ' + fmt(x.hours) + ' h over ' + x.days + ' day' + (x.days === 1 ? '' : 's')).join('\n')
      + '\nOffice Hours held on ' + oh + ' day' + (oh === 1 ? '' : 's') + '.\n\nEvery entry: dashsupport.team/pulse';
  }
  const id = 'h' + msg.chat.id.toString().replace('-', '') + '-' + msg.message_id;
  const w = who(msg.from);
  const link = msg.chat.username ? 'https://t.me/' + msg.chat.username + '/' + msg.message_id : null;
  const entry = { id, date: p.date, who: w.who, handle: w.handle, hours: p.hours, note: p.note, link, logged: now.toISOString() };
  const saved = await append(entry);
  if (!saved) return 'I couldn\'t save that just now. Nothing was logged; please try again in a minute.';
  const mine = totals(Array.isArray(saved) ? saved : [entry], now).find((x) => (x.handle || x.who) === (w.handle || w.who));
  return (p.hours > 0 ? 'Logged ' + fmt(p.hours) + ' h' : 'Corrected ' + fmt(p.hours) + ' h') + ' for ' + w.who + ' on ' + p.date + '.'
    + (mine ? ' Last 30 days: ' + fmt(mine.hours) + ' h over ' + mine.days + ' day' + (mine.days === 1 ? '' : 's') + '.' : '')
    + ' It\'s on the Pulse: dashsupport.team/pulse';
}

module.exports = { handle, parse, totals, sessions, renderMd, teamChat, fromTelegram, source, JSONF, ghGet, ghPut, day, daysBack, cell, who, isAdmin, CORRECTION };
