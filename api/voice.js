/* /api/voice — Dasha's replies, read aloud in the Honor voice (ElevenLabs).

   GET   says whether her voice is switched on. No secret is involved in the answer.
   POST  { text, ticket, part } returns one part of one reply as audio/mpeg. `text` is a reply exactly as /api/chat
         gave it and `ticket` is the `say` value that came with it; a text without its ticket is refused, so only
         her own words are ever read (api/_voice.js explains the three locks).

   What leaves this server: the text of that one reply goes to ElevenLabs to be turned into speech, when a person
   presses Listen or is on a voice call. Nothing is stored here, and nothing about the person is sent. */
const V = require('./_voice.js');

const ALLOW = ['https://www.dashsupport.team', 'https://dashsupport.team', 'https://unitium-safe.vercel.app'];
function originOk(origin, host) {
  if (!origin) return false;
  try { if (new URL(origin).host === host) return true; } catch (e) { return false; }    /* our own page, a preview included */
  if (ALLOW.indexOf(origin) >= 0) return true;
  const extra = String(process.env.VOICE_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return extra.indexOf(origin) >= 0;
}

/* best-effort limits, per running instance (the same honest kind /api/chat keeps). The hard ceiling is the
   quota set on the ElevenLabs key itself. */
const PER_HOUR = 80, CHARS_PER_HOUR = 30000, CHARS_PER_DAY = +process.env.VOICE_DAY_CHARS || 300000;
const hits = new Map();          /* ip -> [{ t, n }] */
let dayChars = 0, dayStart = Date.now();
function limited(ip, n) {
  const now = Date.now();
  if (now - dayStart > 864e5) { dayChars = 0; dayStart = now; }
  if (dayChars + n > CHARS_PER_DAY) return 'day';
  const arr = (hits.get(ip) || []).filter((x) => now - x.t < 36e5);
  if (arr.length >= PER_HOUR || arr.reduce((a, x) => a + x.n, 0) + n > CHARS_PER_HOUR) { hits.set(ip, arr); return 'hour'; }
  arr.push({ t: now, n: n }); hits.set(ip, arr); dayChars += n;
  if (hits.size > 5000) hits.clear();
  return null;
}
function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim();
}

module.exports = async (req, res) => {
  const origin = String(req.headers.origin || ''), ok = originOk(origin, String(req.headers.host || ''));
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'X-Voice-Parts'); res.setHeader('Access-Control-Max-Age', '600');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(ok ? 204 : 403).end();
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, voice: V.ready(), name: 'Honor', by: 'ElevenLabs',
      how: 'POST { text, ticket, part }: text is a reply exactly as /api/chat returned it, ticket is its "say" value. Only her own replies are read.' });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  if (!ok) return res.status(403).json({ ok: false, error: 'Her voice reads on DashSupport.Team and its partner pages.' });
  if (!V.ready()) return res.status(503).json({ ok: false, voice: false, error: 'Her voice is not switched on.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const text = body && typeof body.text === 'string' ? body.text : '';
  if (!text || text.length > 24000) return res.status(400).json({ ok: false, error: 'Send the reply to read.' });
  if (!V.valid(text, body.ticket)) return res.status(403).json({ ok: false, error: 'Only a reply Dasha gave can be read aloud.' });
  const list = V.parts(text), i = Number.isInteger(body.part) ? body.part : 0;
  if (!list.length) return res.status(400).json({ ok: false, error: 'There is nothing to read in that reply.' });
  if (i < 0 || i >= list.length) return res.status(416).json({ ok: false, error: 'That reply has ' + list.length + ' part' + (list.length === 1 ? '' : 's') + '.' });

  const stop = limited(clientIp(req), list[i].length);
  if (stop) return res.status(429).json({ ok: false, error: stop === 'day' ? 'Her voice has read its fill for today. Your device can still read to you.' : 'That is a lot of listening for one hour. Your device can still read to you.' });

  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + V.voiceId() + '/stream?output_format=mp3_44100_128', {
      method: 'POST', signal: ctl.signal,
      headers: { 'xi-api-key': V.key(), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: list[i], model_id: V.model(),
        previous_text: i > 0 ? list[i - 1].slice(-300) : undefined, next_text: i + 1 < list.length ? list[i + 1].slice(0, 300) : undefined,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true } }),
    });
    if (!r.ok || !r.body) {
      /* the status only: what the voice service says in its body stays between it and this server */
      console.error('voice: the voice service answered ' + r.status);
      return res.status(r.status === 429 ? 503 : 502).json({ ok: false, error: 'Her voice could not be reached just now. Your device can still read to you.' });
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Voice-Parts', String(list.length));
    for await (const chunk of r.body) res.write(chunk);
    return res.end();
  } catch (e) {
    if (res.headersSent) { try { res.end(); } catch (x) { /* the listener left */ } return; }
    return res.status(504).json({ ok: false, error: 'Her voice took too long. Your device can still read to you.' });
  } finally { clearTimeout(timer); }
};
