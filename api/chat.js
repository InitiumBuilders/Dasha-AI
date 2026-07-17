/* POST /api/chat — Dasha's public web endpoint (also the "MCP" programmatic endpoint with x-dasha-token). */
const { askDasha, humanSupport, cleanMessages, mindStatus, VERSION, MODEL, DEEP_MODEL, COUNSEL_MODEL } = require('./_brain.js');
const learn = require('./_learn.js');

/* best-effort per-instance rate limiting (protects the credit pool from casual abuse) */
const hits = new Map(); // ip -> [ts]
let dayCount = 0, dayStart = Date.now();
const PER_HOUR = 30, PER_DAY_GLOBAL = 4000;

function limited(ip) {
  if (Date.now() - dayStart > 864e5) { dayCount = 0; dayStart = Date.now(); }
  if (++dayCount > PER_DAY_GLOBAL) return 'Dasha has hit her daily community budget. A human is always available: https://t.me/TheDashSupportTEAM';
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 36e5);
  if (arr.length >= PER_HOUR) return 'You have reached the hourly message limit — give it a little time, or talk to a human: https://t.me/TheDashSupportTEAM';
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return null;
}

module.exports = async (req, res) => {
  const token = req.headers['x-dasha-token'];
  const isMcp = !!(token && process.env.DASHA_MCP_TOKEN && token === process.env.DASHA_MCP_TOKEN);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-dasha-token');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const mind = await mindStatus();
    return res.status(200).json({ ok: true, service: 'dasha-ai',
      models: { everyday: MODEL, engineering: DEEP_MODEL, judgement: COUNSEL_MODEL,
        routing: 'automatic — code/errors/schemas go to the engineering mind; proposals, insight, leverage and systems thinking go to the judgement mind; everything else stays fast' },
      mind: mind, // version + origin: 'github' proves the live stream is feeding this instance
      learning: learn.sinks(), // honest: is the feedback loop actually closed, or dark?
      tools: ['search_dash_docs', 'dash_governance', 'dash_network_stats', 'lookup_tx', 'lookup_address', 'web_search', 'load_skill'],
      surfaces: ['web', 'telegram', 'x', 'api'],
      mcp: 'POST /api/chat with header x-dasha-token', source: 'https://github.com/InitiumBuilders/Dasha-AI' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }

  /* answer feedback → the learning loop. A reported reason becomes a public issue that,
     when someone closes it by editing PROMPT/, teaches every instance at once. */
  if (body && body.feedback) {
    const f = body.feedback;
    const out = await learn.record({ good: !!f.good, q: f.q, a: f.a, note: f.note, tools: f.tools, surface: 'web' });
    return res.status(200).json({ ok: true, filed: !!out.filed, url: out.url || null });
  }

  const messages = cleanMessages(body && body.messages);
  if (!messages) return res.status(400).json({ error: 'Send {messages:[{role:"user",content:"…"}]} ending with a user message.' });

  const last = messages[messages.length - 1].content.trim();

  /* server-handled skill: /human-support */
  if (/^\/human[-_ ]?support\b/i.test(last)) {
    const reply = await humanSupport(last.replace(/^\/human[-_ ]?support\b/i, '').trim(), isMcp ? 'mcp' : 'web');
    return res.status(200).json({ reply, skill: 'human-support' });
  }

  if (!isMcp) {
    const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const stop = limited(ip);
    if (stop) return res.status(429).json({ error: stop });
  }

  const out = await askDasha(messages, { maxTokens: isMcp ? 3200 : 2600 });
  if (out.error) return res.status(502).json({ error: out.error });
  return res.status(200).json({ reply: out.reply, tools: out.tools || [], depth: out.depth || null,
    model: out.model, usage: out.usage, version: VERSION });
};
