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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.query && req.query.hours) return hoursFeed(res);
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
