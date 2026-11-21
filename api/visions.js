/* GET /api/visions — the Dream With Dasha stream, served from our own origin.

   Reads VISIONS/index.json via the GitHub CONTENTS API (live — the raw CDN ignores
   cache-busting and even caches 404s for files that didn't exist minutes ago), cached
   5 minutes per instance. Public, CORS-open: the commons belongs to everyone. */
const API = 'https://api.github.com/repos/InitiumBuilders/Dasha-AI/contents/VISIONS/index.json';
const TTL = 5 * 60 * 1000;
let cache = { at: 0, data: null };

/* GET /api/visions?hours=1 — the leads' logged hours (HOURS/ledger.json, written by /hours in the
   team Telegram group): 30-day totals by person and the latest entries, cached 2 minutes */
const { totals, sessions } = require('./_hours.js');
const HOURS_API = 'https://api.github.com/repos/InitiumBuilders/Dasha-AI/contents/HOURS/ledger.json';
let hcache = { at: 0, entries: null };
async function hoursFeed(res) {
  if (!hcache.entries || Date.now() - hcache.at > 2 * 60 * 1000) {
    try {
      const hdrs = { 'user-agent': 'DashaHours/1.0', Accept: 'application/vnd.github+json' };
      if (process.env.GITHUB_TOKEN) hdrs.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
      const r = await fetch(HOURS_API, { headers: hdrs });
      if (r.ok) {
        const g = await r.json();
        const d = JSON.parse(Buffer.from(g.content || '', 'base64').toString('utf8'));
        hcache = { at: Date.now(), entries: Array.isArray(d.entries) ? d.entries : [] };
      } else if (r.status === 404) hcache = { at: Date.now(), entries: [] };
    } catch (e) { /* keep whatever we have */ }
  }
  const entries = hcache.entries || [];
  return res.status(200).json({
    ok: true, count: entries.length, totals: totals(entries, new Date()), officeHoursDays: sessions(entries, new Date()), latest: entries.slice(-12).reverse(),
    ledger: 'https://github.com/InitiumBuilders/Dasha-AI/blob/main/HOURS/ledger.md',
  });
}

/* GET /api/visions?board=training — the training board on /dasha, from our own origin, so the page asks no outside
   host when it opens: the 10 newest issues labelled training-suggestion in Dasha-AI, open and closed, newest first.
   Titles lose < > &, a link is kept only when it is one of the repo's own issues, and the login only when it is a
   GitHub login. A failed read keeps the last good board and tries again in ten seconds; with no board yet it answers
   { ok: false } with no-store, so no cache ever holds an error as an empty board. */
const BOARD_API = 'https://api.github.com/repos/InitiumBuilders/Dasha-AI/issues?labels=training-suggestion&state=all&per_page=10';
const BOARD_TTL = 5 * 60 * 1000, BOARD_RETRY = 10 * 1000;
let bcache = { at: 0, items: null };
function boardItem(it) {
  const url = String(it.html_url || ''), login = String((it.user && it.user.login) || '');
  return {
    title: String(it.title || '').replace(/[<>&]/g, '').slice(0, 200),
    state: it.state === 'closed' ? 'closed' : 'open',
    url: /^https:\/\/github\.com\/InitiumBuilders\/Dasha-AI\/issues\/\d+$/.test(url) ? url : null,
    by: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login) ? login : null,
    date: typeof it.created_at === 'string' && !isNaN(Date.parse(it.created_at)) ? it.created_at : null,
  };
}
async function boardFeed(res) {
  const age = Date.now() - bcache.at;
  if (bcache.items === null ? age > BOARD_RETRY : age > BOARD_TTL) {
    let list = null;
    try {
      const hdrs = { 'user-agent': 'DashaBoard/1.0', Accept: 'application/vnd.github+json' };
      if (process.env.GITHUB_TOKEN) hdrs.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
      const r = await fetch(BOARD_API, { headers: hdrs });
      if (r.ok) list = await r.json();
    } catch (e) { list = null; }
    if (Array.isArray(list)) bcache = { at: Date.now(), items: list.filter((it) => it && !it.pull_request).slice(0, 10).map(boardItem) };
    else bcache.at = bcache.items === null ? Date.now() : Date.now() - BOARD_TTL + BOARD_RETRY;
  }
  if (bcache.items === null) { res.setHeader('Cache-Control', 'no-store'); return res.status(200).json({ ok: false, items: [] }); }
  res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
  return res.status(200).json({ ok: true, items: bcache.items });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.query && req.query.hours) return hoursFeed(res);
  if (req.query && req.query.board === 'training') return boardFeed(res);
  /* GET /api/visions?help=1 — Help given, the community's ledger (api/_help.js): everyone who helped,
     credited, from /helped in the team group and the Help given form on GitHub. Self-reported; credit, not pay. */
  if (req.query && req.query.help) {
    try { return res.status(200).json(await require('./_help.js').feed()); }
    catch (e) { return res.status(200).json({ ok: false, people: [], latest: [] }); }
  }
  if (!cache.data || Date.now() - cache.at > TTL) {
    try {
      const hdrs = { 'user-agent': 'DashaVisions/1.0', Accept: 'application/vnd.github+json' };
      if (process.env.GITHUB_TOKEN) hdrs.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
      const r = await fetch(API, { headers: hdrs });
      if (r.ok) {
        const g = await r.json();
        const d = JSON.parse(Buffer.from(g.content || '', 'base64').toString('utf8'));
        if (d && Array.isArray(d.visions)) cache = { at: Date.now(), data: d };
      } else if (r.status === 404) cache = { at: Date.now(), data: { visions: [] } };
    } catch (e) { /* keep whatever we have */ }
  }
  const visions = (cache.data && cache.data.visions) || [];
  return res.status(200).json({
    ok: true, count: visions.length, visions: visions.slice(0, 200),
    commons: 'https://github.com/InitiumBuilders/Dasha-AI/tree/main/VISIONS',
  });
};
