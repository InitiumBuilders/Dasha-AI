/* HELP GIVEN: the community's ledger. Anyone who answers a builder's question, guides a builder,
   helps a project or writes something other builders can use can log it and be credited in public.

   Two doors, both public, so every entry points at where it was posted:
     · Telegram, in the Dash Support Team group, for anyone in it:
         /helped 1.5 walked a builder through their first masternode
         /helped 1 question: answered a data contract ticket
         /helped            (the last 30 days, everyone)
       /hours from someone who isn't one of the leads lands here too.
     · GitHub, for anyone with an account: the "Help given" issue form on InitiumBuilders/Dasha-AI.

   Self-reported, and labelled so. It is credit, not pay: these hours are never the leads' hours,
   never in the team's month report, and never billed to a budget line. The team removes an entry
   that isn't real by closing its issue as anything but completed (not planned, duplicate), or with
   a correction in the group. Telegram entries go to HOURS/community.json (and community.md for
   people) in the public Dasha-AI repo; GitHub entries are the issues themselves, read live.

   Every name, note and credit is someone else's text: it is collapsed to one line before it is
   stored, escaped before it reaches markdown or HTML, and quoted before it reaches Dasha. A person
   is keyed by an opaque id (Telegram) or their GitHub login, never by a display name anyone can copy. */
const crypto = require('crypto');
const H = require('./_hours.js');

const REPO = 'InitiumBuilders/Dasha-AI';
const JSONF = 'HOURS/community.json', MDF = 'HOURS/community.md';
const LABEL = 'help-given';
const FORM = 'https://github.com/' + REPO + '/issues/new?template=help-given.yml';
const GROUP = 'https://t.me/TheDashSupportTEAM';
const LEDGER = 'https://github.com/' + REPO + '/blob/main/' + MDF;
const MAX_ENTRY = 8, MAX_DAY = 12, DAYS = 30, PAGES = 5;

const KINDS = {
  question: 'Answered a question',
  builder: 'Guided a builder',
  project: 'Helped a project',
  doc: 'Wrote something builders can use',
  other: 'Other help',
};

/* someone else's text, on one line: no control characters, no line breaks, no run of spaces */
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f\u2028\u2029\s]+/g, ' ').trim().slice(0, max || 200); }

/* the kind, said outright ("question: …") or read from the note's words */
function kindOf(note) {
  const s = String(note || '');
  const m = s.match(/^(question|ticket|builder|project|doc|docs|guide|other)\s*:\s*/i);
  if (m) {
    const k = m[1].toLowerCase();
    return { kind: k === 'ticket' ? 'question' : (k === 'docs' || k === 'guide') ? 'doc' : k, note: s.slice(m[0].length) };
  }
  if (/\b(tickets?|questions?|answer(ed|ing)?|asked|support request)\b/i.test(s)) return { kind: 'question', note: s };
  if (/\b(docs?|tutorial|translat\w*|wrote|written|write-?up|article|readme)\b/i.test(s)) return { kind: 'doc', note: s };
  if (/\b(guid(ed|ing)|mentor\w*|onboard\w*|walked|builders?)\b/i.test(s)) return { kind: 'builder', note: s };
  if (/\b(projects?|dapp|repo|pull request|PR|review(ed|ing)?|bug|deploy\w*)\b/i.test(s)) return { kind: 'project', note: s };
  return { kind: 'other', note: s };
}

/* a Telegram person's opaque id: an HMAC of their numeric id under the bot's own secret, so it is
   stable, can't be guessed from the public ledger, and can't be taken by copying a display name */
function tgId(uid) {
  const secret = process.env.TELEGRAM_BOT_TOKEN || 'dasha-help-local';
  return crypto.createHmac('sha256', secret).update('help:' + String(uid)).digest('hex').slice(0, 16);
}
function key(e) {
  const src = e.source || 'telegram';
  return src + ':' + (e.wid ? 'id:' + e.wid : e.handle ? 'h:' + e.handle : 'n:' + e.who);
}
function round(n) { return Math.round(n * 100) / 100; }

/* the last 30 days, by person: hours, entries, days, and what kind of help (the newest name shows) */
function people(entries, now) {
  const from = H.daysBack(now, DAYS - 1);
  const by = {};
  entries.filter((e) => e.date >= from).forEach((e) => {
    const k = key(e);
    const p = by[k] || (by[k] = { source: e.source || 'telegram', hours: 0, entries: 0, days: {}, kinds: {} });
    p.who = e.who; p.handle = e.handle;
    p.hours += e.hours; p.days[e.date] = true;
    if (e.hours > 0) { p.entries++; p.kinds[e.kind || 'other'] = (p.kinds[e.kind || 'other'] || 0) + 1; }
  });
  return Object.values(by).filter((p) => p.hours > 0)
    .map((p) => ({ who: p.who, handle: p.handle, source: p.source, hours: round(p.hours), entries: p.entries, days: Object.keys(p.days).length, kinds: p.kinds }))
    .sort((a, b) => b.hours - a.hours || b.entries - a.entries);
}

function renderMd(entries) {
  const c = H.cell;
  const rows = entries.slice().reverse().map((e) => '| ' + c(e.date) + ' | ' + c(e.who) + (e.handle ? ' (' + c(e.handle) + ')' : '') + ' | ' + c(e.hours) + ' | '
    + (KINDS[e.kind] || KINDS.other) + ' | ' + c(e.note) + ' | ' + (e.link && /^https:\/\/t\.me\/[\w/]+$/.test(e.link) ? '[message](' + e.link + ')' : 'self-reported') + ' |');
  return '# Help given\n\n'
    + 'Anyone who helps a builder on Dash can log it, and is credited here. In the Dash Support Team\'s Telegram group, '
    + 'write `/helped 1.5 what you did`; anyone with a GitHub account can use the [Help given form](' + FORM + ') instead, '
    + 'and those entries are the issues labelled `' + LABEL + '`. Every entry is self-reported and links to where it was posted. '
    + 'This is credit, not pay: none of it is counted as the leads\' hours or in the team\'s month report. A correction is a new entry '
    + 'with a negative number, never an edit. Totals: [The Pulse](https://www.dashsupport.team/pulse#helped).\n\n'
    + '| Date (Central) | Who | Hours | Kind | What for | Evidence |\n|---|---|---|---|---|---|\n' + rows.join('\n') + '\n';
}

async function readTelegram() {
  const cur = await H.ghGet(JSONF);
  if (cur.failed) return { entries: null, sha: null };
  let data = { entries: [] };
  if (cur.text) { try { data = JSON.parse(cur.text); } catch (e) { return { entries: null, sha: null }; } }
  return { entries: Array.isArray(data.entries) ? data.entries : [], sha: cur.sha, data };
}

/* the day's total for one person, which the cap and the correction floor both read */
function dayTotal(entries, entry) {
  const k = key(entry);
  return entries.filter((e) => key(e) === k && e.date === entry.date).reduce((a, e) => a + e.hours, 0);
}
function overCap(entries, entry) {
  const today = dayTotal(entries, entry);
  if (entry.hours > 0 && today + entry.hours > MAX_DAY) return 'That would make more than ' + MAX_DAY + ' hours on ' + entry.date + '. Log what you actually gave that day; a correction is a negative entry.';
  if (entry.hours < 0 && today + entry.hours < 0) return 'There ' + (round(today) === 1 ? 'is' : 'are') + ' only ' + round(today) + ' h logged for you on ' + entry.date + ' to correct.';
  return null;
}

/* append one Telegram entry. The file's sha guards two writes at once; on a clash it re-reads and
   checks the cap again against what is there now, so two messages at once can't pass it together. */
async function append(entry) {
  for (let i = 0; i < 3; i++) {
    const cur = await H.ghGet(JSONF);
    if (cur.failed) return { ok: false };
    let data = { about: 'Help given by the Dash community, credited in public. Written by Dasha from /helped in the Dash Support Team Telegram group. Self-reported; credit, not pay.', entries: [] };
    if (cur.text) { try { data = JSON.parse(cur.text); } catch (e) { return { ok: false }; } }
    if (!Array.isArray(data.entries)) data.entries = [];
    if (data.entries.some((e) => e.id === entry.id)) return { ok: true, entries: data.entries };
    const over = overCap(data.entries, entry);
    if (over) return { ok: false, refused: over };
    data.entries.push(entry);
    const st = await H.ghPut(JSONF, JSON.stringify(data, null, 1) + '\n', 'help: ' + clean(entry.who, 60) + ' ' + (entry.hours > 0 ? '+' : '') + entry.hours + ' h (' + entry.date + ')', cur.sha, 'Dasha Help');
    if (st === 200 || st === 201) {
      const md = await H.ghGet(MDF);
      await H.ghPut(MDF, renderMd(data.entries), 'help: community.md', md.sha, 'Dasha Help');
      return { ok: true, entries: data.entries };
    }
    if (st !== 409 && st !== 422) return { ok: false };
  }
  return { ok: false };
}

/* ---------- GitHub: the issue form, read live ---------- */
/* the form's sections, split once ("### Label" then its value); the body is bounded first, so a
   huge crafted issue costs no more than a normal one */
function sections(body) {
  const out = {};
  String(body || '').slice(0, 10000).split(/^###[ \t]+/m).slice(1).forEach((part) => {
    const nl = part.indexOf('\n');
    const label = (nl < 0 ? part : part.slice(0, nl)).trim().toLowerCase();
    const value = nl < 0 ? '' : part.slice(nl + 1).trim();
    if (label && !(label in out)) out[label] = /^_?no response_?$/i.test(value) ? '' : value;
  });
  return out;
}
function field(body, label) {
  const s = typeof body === 'object' && body ? body : sections(body);
  const want = label.toLowerCase();
  const k = Object.keys(s).find((x) => x === want || x.startsWith(want + ' ') || x.startsWith(want + '('));
  return k ? s[k] : '';
}
const FORM_KIND = [[/question|ticket/i, 'question'], [/guided|builder/i, 'builder'], [/project/i, 'project'], [/wrote|doc|guide/i, 'doc']];
function fromIssue(it) {
  if (!it || it.pull_request) return null;
  /* a closed issue counts only when it was closed as completed; not planned or duplicate removes it */
  if (it.state === 'closed' && it.state_reason !== 'completed') return null;
  const labels = (it.labels || []).map((l) => String(l.name || l).toLowerCase());
  if (labels.includes('invalid') || labels.includes('spam')) return null;
  const s = sections(it.body);
  const hours = Math.round(parseFloat(String(field(s, 'Hours')).replace(',', '.')) * 4) / 4;
  if (!(hours > 0 && hours <= MAX_ENTRY)) return null;
  const created = new Date(it.created_at);
  let date = field(s, 'Date').trim();
  if (date === '') date = H.day(created);
  else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const age = (new Date(H.day(created) + 'T12:00:00Z') - new Date(date + 'T12:00:00Z')) / 864e5;
    if (!(age >= 0 && age <= DAYS)) return null;
  }
  const kindRaw = field(s, 'What kind of help');
  const kind = (FORM_KIND.find(([re]) => re.test(kindRaw)) || [null, 'other'])[1];
  const note = clean(field(s, 'What you helped with')) || clean(String(it.title || '').replace(/^\[help[^\]]*\]\s*/i, ''));
  const login = it.user && it.user.login ? String(it.user.login).slice(0, 39) : null;
  if (!login || note.length < 3) return null;
  const credit = clean(field(s, 'Credit me as').replace(/[<>]/g, ''), 60);
  const evidence = field(s, 'Link').trim();
  return { id: 'gh' + it.number, date, who: credit || login, handle: '@' + login, hours, kind, note,
    link: it.html_url, evidence: /^https?:\/\/\S+$/i.test(evidence) ? evidence.slice(0, 300) : null, source: 'github', logged: it.created_at };
}
async function readGithub() {
  try {
    const hdrs = { 'User-Agent': 'dasha-help', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) hdrs.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
    const since = new Date(Date.now() - (DAYS + 7) * 864e5).toISOString();
    let all = [];
    for (let page = 1; page <= PAGES; page++) {
      const r = await fetch('https://api.github.com/repos/' + REPO + '/issues?labels=' + LABEL + '&state=all&per_page=100&page=' + page + '&since=' + since, { headers: hdrs });
      if (!r.ok) return page === 1 ? null : all;
      const list = await r.json();
      if (!Array.isArray(list)) break;
      all = all.concat(list);
      if (list.length < 100) break;
    }
    return all.map((it) => { try { return fromIssue(it); } catch (e) { return null; } }).filter(Boolean);
  } catch (e) { return null; }
}

/* everything, both doors, oldest first. A failed read keeps the last good list; with none yet, it
   stays unknown (null) and is tried again in ten seconds, never cached as an empty ledger. */
let cache = { at: 0, tg: null, gh: null };
async function all(force) {
  if (force || cache.tg === null || cache.gh === null || Date.now() - cache.at > 2 * 60 * 1000) {
    const [tg, gh] = await Promise.all([readTelegram(), readGithub()]);
    const okTg = tg.entries !== null, okGh = gh !== null;
    cache = { at: okTg && okGh ? Date.now() : Date.now() - 2 * 60 * 1000 + 10000,
      tg: okTg ? tg.entries : cache.tg, gh: okGh ? gh : cache.gh };
  }
  const partial = cache.tg === null || cache.gh === null;
  const list = (cache.tg || []).concat(cache.gh || []).sort((a, b) => (a.date + (a.logged || '')).localeCompare(b.date + (b.logged || '')));
  return { list, partial };
}

async function feed(now) {
  now = now || new Date();
  const { list: entries, partial } = await all();
  const ppl = people(entries, now);
  const from = H.daysBack(now, DAYS - 1);
  const recent = entries.filter((e) => e.date >= from && e.hours > 0);
  const kinds = {};
  recent.forEach((e) => { kinds[e.kind || 'other'] = (kinds[e.kind || 'other'] || 0) + 1; });
  return { ok: true, partial, count: entries.length, people: ppl, hours: round(ppl.reduce((a, p) => a + p.hours, 0)), kinds,
    latest: recent.slice(-10).reverse().map((e) => ({ date: e.date, who: e.who, handle: e.handle, hours: e.hours, kind: e.kind, note: e.note, link: e.link, source: e.source })),
    kindNames: KINDS, form: FORM, group: GROUP, ledger: LEDGER, label: LABEL };
}

/* the Help given form on GitHub, filled in: issue-form text fields take URL parameters by id */
function formLink(o) {
  o = o || {};
  const q = ['template=help-given.yml'];
  const what = clean(o.what || '', 200);
  q.push('title=' + encodeURIComponent('[help] ' + what.slice(0, 70)));
  const h = Math.round(parseFloat(o.hours) * 4) / 4;
  if (h > 0 && h <= MAX_ENTRY) q.push('hours=' + encodeURIComponent(String(h)));
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(o.date || ''))) q.push('date=' + o.date);
  if (what) q.push('what=' + encodeURIComponent(what));
  if (/^https:\/\/\S+$/i.test(String(o.link || ''))) q.push('link=' + encodeURIComponent(String(o.link).slice(0, 300)));
  const credit = clean(o.credit || '', 60).replace(/[<>]/g, '');
  if (credit) q.push('credit=' + encodeURIComponent(credit));
  return 'https://github.com/' + REPO + '/issues/new?' + q.join('&');
}

function fmt(n) { return round(n).toString(); }

/* the Telegram exchange for /helped (and /hours from someone who isn't a lead) */
async function handleTelegram(token, msg, req, opts) {
  const now = new Date();
  const p = H.parse(msg && msg.text, now, 'helped|hours', { max: MAX_ENTRY });
  if (!p) return null;
  if (!H.fromTelegram(req)) return null;
  if (!H.teamChat(token, msg.chat && msg.chat.id)) {
    return 'Help is logged in public, so everyone can see it: in the Dash Support Team group (' + GROUP + ') with /helped, or with the Help given form on GitHub: ' + FORM;
  }
  if (p.kind === 'usage') return p.why.replace(/\/hours/g, '/helped').replace('Office Hours and two listing reviews', 'walked a builder through their first masternode');
  if (p.kind === 'totals') {
    const f = await feed(now);
    if (!f.people.length) return f.partial ? 'I couldn\'t read the ledger just now. Please try again in a minute.'
      : 'No help logged in the last 30 days yet. Be the first: /helped 1 walked a builder through their first masternode\n\nIt\'s credit, not pay, and it\'s on the Pulse: dashsupport.team/pulse#helped';
    return 'Help given, last 30 days:\n' + f.people.slice(0, 12).map((x) => '• ' + clean(x.who, 60) + ': ' + fmt(x.hours) + ' h, ' + x.entries + ' time' + (x.entries === 1 ? '' : 's')).join('\n')
      + '\n\nEveryone credited: dashsupport.team/pulse#helped';
  }
  if (!msg.from || msg.sender_chat || msg.from.username === 'GroupAnonymousBot') return 'Log help from your own account, not as the group, so it can be credited to you.';
  const w = H.who(msg.from);
  w.who = clean(w.who === 'A lead' ? 'A community member' : w.who, 60) || 'A community member';
  const k = kindOf(p.note);
  const note = clean(k.note);
  if (note.length < 3) return 'Say what the help was, like: /helped 1 question: answered a data contract ticket';
  const id = 'c' + String(msg.chat.id).replace('-', '') + '-' + msg.message_id;
  const link = msg.chat.username ? 'https://t.me/' + msg.chat.username + '/' + msg.message_id : null;
  const entry = { id, wid: tgId(msg.from.id), date: p.date, who: w.who, handle: w.handle, hours: p.hours, kind: k.kind, note, link, source: 'telegram', logged: now.toISOString() };
  const saved = await append(entry);
  if (saved.refused) return saved.refused;
  if (!saved.ok) return 'I couldn\'t save that just now. Nothing was logged; please try again in a minute.';
  cache.at = 0;
  const mine = people(saved.entries.filter((e) => key(e) === key(entry)), now)[0];
  const lead = opts && opts.fromHours
    ? 'Logged to Help given, the community ledger (only the leads\' /hours go in the team\'s month report). '
    : '';
  return (p.hours > 0 ? lead + 'Thank you. Logged ' + fmt(p.hours) + ' h for ' + w.who + ' on ' + p.date + ': ' + (KINDS[k.kind] || KINDS.other).toLowerCase() + '.'
      : 'Corrected ' + fmt(p.hours) + ' h for ' + w.who + ' on ' + p.date + '.')
    + (mine ? ' Last 30 days: ' + fmt(mine.hours) + ' h, ' + mine.entries + ' time' + (mine.entries === 1 ? '' : 's') + '.' : '')
    + ' Credited on the Pulse: dashsupport.team/pulse#helped';
}

module.exports = { formLink, feed, handleTelegram, people, kindOf, fromIssue, field, sections, renderMd, clean, tgId, key, KINDS, FORM, GROUP, LEDGER, LABEL, JSONF };
