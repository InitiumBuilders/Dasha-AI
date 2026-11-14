/* THE VISION COMMONS — /ImagineThisDash sessions become public, buildable ideas.

   When a brainstorm completes WITH consent, Dasha's final reply carries one
   [[VISION-LOG]]{json}[[/VISION-LOG]] block. The brain strips it before anyone sees it
   and hands it here. This module files the vision into the public commons:

     VISIONS/index.json     every vision, newest first — the single machine truth
     VISIONS/<team>.md      the human-readable per-team stream
     VISIONS/TOPVISIONS.md  score ≥ 8 — the ideas worth building next, per team
     VISIONS/INITIUMTHIS.md score ≥ 9 — the strongest, numbered; initium = beginning

   Consent is structural: the skill only emits the block after the consent round, a
   private session emits nothing, and share flags are true only on an explicit yes.
   The server stamps date + channel; nothing else is ever added to their words. */
const { xPost } = require('./_x.js');
const { quiet } = require('./_learn.js');   /* text a stranger wrote, made safe for the bot to repeat */

/* A VISION IS A STRANGER'S WORDS, and this server repeats them in four public places: the repository, the Pulse
   page, the team's Telegram feed and the team's X account. So every field goes out with no link, no live domain
   and no mention that can ping anyone. A tip is a Dash address or an Evo username, or it is left out. A proposal
   link is a DashCentral page, or it is treated as plain words. A vision whose words carried a link, a mention,
   an address or a cashtag is kept in the commons, scored no higher than 7, and posted nowhere. And no more than
   six are filed in an hour. Found 14 Nov 2026: the words went out as written, and an answer that had been talked
   into carrying the block could put any line on the team's X account. */
const ZW = String.fromCharCode(0x200b);
const DASH_ADDRESS = /^[X7][1-9A-HJ-NP-Za-km-z]{33}$/;
const EVO_NAME = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9](?:\.dash)?$/i;   /* 3 to 30 characters: an address of another chain is longer */
const DASHCENTRAL = /^https:\/\/(?:www\.)?dashcentral\.org\/p\/[A-Za-z0-9_-]{1,80}$/;
const LOUD = /[a-z][\w+.-]*:\/\/|\bwww\.|\bt\.me\/|@\w{2,}|\b[\w-]+\.(?:com|org|net|io|me|xyz|app|link|info|co|gg|ly|to|cc|team|love|fund|site|online|top|vip|click|finance|exchange|dev|ai|dash)\b|\b[X7][1-9A-HJ-NP-Za-km-z]{25,34}\b|\bbc1[0-9a-z]{20,}\b|\b0x[0-9a-fA-F]{20,}\b|\$[A-Za-z]{2,}\b/i;
const MAX_VISIONS_PER_HOUR = 6;
const filed = [];
function roomForOne() {
  const now = Date.now(), kept = filed.filter((t) => now - t < 36e5);
  filed.length = 0; kept.forEach((t) => filed.push(t));
  if (filed.length >= MAX_VISIONS_PER_HOUR) return false;
  filed.push(now);
  return true;
}

const REPO = 'InitiumBuilders/Dasha-AI';
const TEAMS = ['support', 'dream', 'build', 'design', 'growth', 'dao'];
const TEAM_LABEL = { support: 'Support', dream: 'Dash Waves', build: 'Build', design: 'Design', growth: 'Growth', dao: 'The DAO At Large' };
const clamp = (s, n) => String(s == null ? '' : s).trim().slice(0, n);

/* ---------- GitHub contents API ---------- */
const GH = 'https://api.github.com/repos/' + REPO + '/contents/';
const HDRS = () => ({ Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-visions', Accept: 'application/vnd.github+json' });
async function ghGet(path) {
  try {
    const r = await fetch(GH + path + '?t=' + Date.now(), { headers: HDRS() });
    if (!r.ok) return { text: null, sha: null };
    const d = await r.json();
    return { text: Buffer.from(d.content || '', 'base64').toString('utf8'), sha: d.sha || null };
  } catch (e) { return { text: null, sha: null }; }
}
async function ghPut(path, content, message, sha) {
  try {
    const body = { message, content: Buffer.from(content).toString('base64'), committer: { name: 'Dasha Visions', email: 'Help@DashSupport.Team' } };
    if (sha) body.sha = sha;
    const r = await fetch(GH + path, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, HDRS()), body: JSON.stringify(body) });
    return r.ok;
  } catch (e) { return false; }
}

/* ---------- shape the entry — only what was agreed, nothing more ---------- */
function shape(v, surface) {
  if (!v || typeof v !== 'object') return null;
  const loud = LOUD.test([v.idea, v.title, v.reflection].map((s) => String(s == null ? '' : s)).join('\n'));
  const idea = quiet(clamp(v.idea, 600), 600);
  if (idea.length < 12) return null;                       /* no idea, no entry */
  const team = TEAMS.indexOf(String(v.team || '').toLowerCase()) >= 0 ? String(v.team).toLowerCase() : 'dao';
  let score = parseInt(v.score, 10); if (!(score >= 1 && score <= 10)) score = 5;
  if (loud && score > 7) score = 7;                        /* it stays out of the lists of the strongest */
  const tip = clamp(v.tips, 90), about = clamp(v.proposal, 120);
  const e = {
    id: 'v' + Date.now().toString(36),
    date: new Date().toISOString().slice(0, 10),
    channel: clamp(surface || 'web', 12),
    team, title: quiet(clamp(v.title, 60), 60) || 'Untitled vision', idea,
    reflection: quiet(clamp(v.reflection, 300), 300), score,
    tags: (Array.isArray(v.tags) ? v.tags : []).slice(0, 5).map((t) => quiet(clamp(t, 24), 24)).filter(Boolean),
    credit: quiet(clamp(v.credit, 40), 40).split(ZW).join('') || 'anonymous',   /* a handle stays readable here; it is made unpingable where it is posted */
    tips: (DASH_ADDRESS.test(tip) || EVO_NAME.test(tip)) ? tip : null,
    proposal: about ? (DASHCENTRAL.test(about) ? about : quiet(about, 120)) : null,
    shared: { tg: false, x: false },
  };
  Object.defineProperty(e, 'loud', { value: loud, enumerable: false });   /* for this run only: it is never stored */
  return e;
}

/* ---------- renderers for the human-readable files ---------- */
function mdEntry(e) {
  return '### ' + e.title + '\n'
    + '*' + e.date + ' · via ' + e.channel + ' · suggested by ' + e.credit + ' · score ' + e.score + '/10*'
    + (e.tags.length ? '  \n`' + e.tags.join('` `') + '`' : '') + '\n\n'
    + '> ' + e.idea.replace(/\n/g, '\n> ') + '\n\n'
    + (e.reflection ? "**Dasha's reflection:** " + e.reflection + '\n\n' : '')
    + (e.tips ? '**Tip / fund this idea:** `' + e.tips + '`\n\n' : '')
    + (e.proposal ? '**Related proposal:** ' + e.proposal + '\n\n' : '')
    + '---\n';
}
function renderTop(visions, min, title, intro, numbered) {
  const keep = visions.filter((e) => e.score >= min);
  let out = '# ' + title + '\n\n' + intro + '\n\n';
  if (!keep.length) return out + '*The first ones are still forming — invoke `/ImagineThisDash` anywhere Dasha lives.*\n';
  if (numbered) {
    keep.forEach((e, i) => { out += '## ' + (i + 1) + '. ' + e.title + ' — ' + TEAM_LABEL[e.team] + '\n\n' + mdEntry(e).replace(/^### .*\n/, '') + '\n'; });
  } else {
    for (const t of TEAMS) {
      const rows = keep.filter((e) => e.team === t);
      if (!rows.length) continue;
      out += '## ' + TEAM_LABEL[t] + '\n\n' + rows.map(mdEntry).join('\n') + '\n';
    }
  }
  return out;
}

/* ---------- the consented shares ---------- */
async function shareTelegram(e) {
  /* Open-source copy: production falls back to the team's own feed chat and topic here. Those two ids are left
     out, so a vision is shared to Telegram only when DASHA_TG_FEED_CHAT is set. DASHA_TG_FEED_TOPIC is optional. */
  const tok = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.DASHA_TG_FEED_CHAT || '';
  const topic = process.env.DASHA_TG_FEED_TOPIC || '';
  if (!tok || !chat) return false;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = '💡 <b>A new vision for the ' + esc(TEAM_LABEL[e.team]) + ' team</b>\n\n'
    + '“' + esc(e.idea) + '”\n\n— ' + esc(quiet(e.credit, 40)) + ' · score ' + e.score + '/10\n\n'
    + '<a href="https://dashsupport.team/pulse">Dream With Dasha — see every vision</a>';
  try {
    const r = await fetch('https://api.telegram.org/bot' + tok + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, message_thread_id: topic ? parseInt(topic, 10) : undefined, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    return r.ok;
  } catch (e2) { return false; }
}
async function shareX(e, priorToday) {
  if (priorToday >= 2) return false;                      /* restraint: 2 vision shares a day, max */
  const quote = e.idea.length > 150 ? e.idea.slice(0, 147) + '…' : e.idea;
  const text = 'A vision from the Dash community, for the ' + TEAM_LABEL[e.team] + ' team:\n\n“' + quote + '”\n\n— '
    + quiet(e.credit, 40) + '\n\nEvery vision, public: dashsupport.team/pulse';
  try { const d = await xPost('/2/tweets', { text: text.slice(0, 275) }); return !!(d && d.data && d.data.id); }
  catch (e2) { return false; }
}

/* ---------- the record — never throws, never blocks an answer for long ---------- */
async function recordVision(raw, surface) {
  if (!process.env.GITHUB_TOKEN) return { ok: false, error: 'no token' };
  const e = shape(raw, surface);
  if (!e) return { ok: false, error: 'unusable' };
  if (!roomForOne()) return { ok: false, error: 'throttled' };

  const idx = await ghGet('VISIONS/index.json');
  let data = { visions: [] };
  try { if (idx.text) data = JSON.parse(idx.text); } catch (e2) {}
  if (!Array.isArray(data.visions)) data.visions = [];

  /* consented shares happen first so the stored entry records what truly went out */
  if (raw.share_tg === true && !e.loud) e.shared.tg = await shareTelegram(e);
  if (raw.share_x === true && !e.loud) {
    const today = e.date, priorToday = data.visions.filter((v) => v.date === today && v.shared && v.shared.x).length;
    e.shared.x = await shareX(e, priorToday);
  }

  data.visions.unshift(e);
  if (data.visions.length > 500) data.visions.length = 500;
  await ghPut('VISIONS/index.json', JSON.stringify(data, null, 2), 'vision: ' + e.title + ' (' + e.team + ')', idx.sha);

  /* the per-team human stream */
  const teamPath = 'VISIONS/' + e.team + '.md';
  const cur = await ghGet(teamPath);
  const head = cur.text || ('# ' + TEAM_LABEL[e.team] + ' — visions from the community\n\n*Born in `/ImagineThisDash` sessions with Dasha. Newest first. Every entry consented, credited as its author chose.*\n\n');
  const parts = head.split('\n\n');
  const body = parts.slice(0, 2).join('\n\n') + '\n\n' + mdEntry(e) + '\n' + parts.slice(2).join('\n\n');
  await ghPut(teamPath, body, 'vision: ' + e.title, cur.sha);

  /* the curated views regenerate from the index — her own hand prunes nothing here */
  if (e.score >= 8) {
    const top = await ghGet('VISIONS/TOPVISIONS.md');
    await ghPut('VISIONS/TOPVISIONS.md', renderTop(data.visions, 8, 'TOP VISIONS',
      'The community ideas Dasha scored 8+ — the ones worth building next. Grouped by team, newest first.', false), 'topvisions refresh', top.sha);
  }
  if (e.score >= 9) {
    const ini = await ghGet('VISIONS/INITIUMTHIS.md');
    await ghPut('VISIONS/INITIUMTHIS.md', renderTop(data.visions, 9, 'INITIUM THIS',
      'The strongest, highest-leverage visions the Dash community has given Dasha — numbered, in order of arrival. Initium: the beginning. These are the ones that want to become real.', true), 'initiumthis refresh', ini.sha);
  }
  return { ok: true, id: e.id, team: e.team, shared: e.shared };
}

module.exports = { recordVision, _shape: shape };
