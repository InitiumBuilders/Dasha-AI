/* /api/paxt : the open record of a PAXT (api/_paxt.js does the work).
     GET  /api/paxt            the records there are
     GET  /api/paxt?id=<id>    one record: its document, its hash, every signed line, and the count
     POST /api/paxt            { address, line, sig } adds one signed line; with { doc } it opens a new record
   Everything here is public by design: a vote that anyone can check is a vote anyone can read. */
const paxt = require('./_paxt.js');

/* a little room for everyone: signed lines are few, and each one costs a masternode list read and a commit */
const hits = new Map();
const PER_HOUR = 24;
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 36e5);
  if (arr.length >= PER_HOUR) return true;
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}
function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const id = req.query && req.query.id ? String(req.query.id).toLowerCase() : '';
      const out = id ? await paxt.view(id) : await paxt.index();
      res.setHeader('Cache-Control', out.status === 200 ? 'public, max-age=20' : 'no-store');
      return res.status(out.status).json(out.body);
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'GET or POST only.' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
    if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'Send { address, line, sig }.' });
    if (typeof body.doc === 'string' && body.doc.length > 24000) return res.status(413).json({ ok: false, error: 'The document is too long.' });
    if (limited(clientIp(req))) return res.status(429).json({ ok: false, error: 'That is a lot of lines for one hour. Try again later.' });
    const out = await paxt.submit({ address: body.address, line: body.line, sig: body.sig, doc: typeof body.doc === 'string' ? body.doc : undefined });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(out.status).json(out.body);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Something went wrong on the server. Nothing was recorded.' });
  }
};
