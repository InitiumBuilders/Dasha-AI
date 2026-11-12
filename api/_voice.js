/* HER VOICE, the shared half. /api/chat signs what she said; /api/voice reads it aloud.

   The voice is Honor, on ElevenLabs. It costs money per character, so it is closed three ways:
     1. The key is read from the environment (ELEVENLABS_API_KEY) and nowhere else. It is never logged, never sent
        to a browser, never part of an error. With no key the voice is simply off and the page uses the device's own.
     2. Only a reply she really gave can be read. /api/chat hands each reply a ticket (an HMAC of its text, keyed
        from the voice key), and /api/voice refuses any text whose ticket does not match. So the endpoint cannot be
        used to read arbitrary text in her voice or to spend the account on someone else's words.
     3. /api/voice also answers only its own pages and keeps hourly and daily limits (see there).

   Nothing here stores a question, an answer or anything about a person. */
const crypto = require('crypto');

const HONOR = 'cHlKR8aJujyitGaZzzp0';          /* the anchor voice of the team's projects */
const MAX_SPEECH = 6000;                        /* characters read from one reply, about six minutes */
const MAX_PARTS = 12;
const FIRST = 420, REST = 900;                  /* a short first part starts playing sooner */

const key = () => String(process.env.ELEVENLABS_API_KEY || '').trim();
const ready = () => key().length >= 20;
const voiceId = () => {
  const v = String(process.env.ELEVENLABS_VOICE_ID || '').trim();
  return /^[A-Za-z0-9]{16,32}$/.test(v) ? v : HONOR;
};
const model = () => {
  const m = String(process.env.ELEVENLABS_MODEL || '').trim();
  return /^[a-z0-9_.]{6,40}$/.test(m) ? m : 'eleven_flash_v2_5';
};

/* the ticket key is derived from the voice key, so there is no second secret to set or to leak */
function secret() { return crypto.createHmac('sha256', key()).update('dasha-voice-ticket-v1').digest(); }
function ticket(text) {
  if (!ready() || !text) return null;
  return crypto.createHmac('sha256', secret()).update(String(text), 'utf8').digest('base64url').slice(0, 32);
}
function valid(text, t) {
  const want = ticket(text);
  if (!want || typeof t !== 'string' || t.length !== want.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(t)); } catch (e) { return false; }
}

/* a reply as it should be heard: the skill mark, the code and the markup are for the eye */
function speakable(md) {
  let t = String(md || '');
  t = t.replace(/^\s*(?:\[\/[a-z0-9-]+\]\s*)+/i, '');
  t = t.replace(/```[\s\S]*?```/g, ' The code is on your screen. ');
  t = t.replace(/`([^`\n]{1,80})`/g, '$1').replace(/`[^`\n]*`/g, ' ');
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  t = t.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1');                       /* a link is read as its label */
  t = t.replace(/https?:\/\/(?:www\.)?([^\s/)]+)[^\s)]*/g, '$1');          /* a bare link is read as its site */
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*+]\s+/gm, '').replace(/^\s*>\s?/gm, '');
  t = t.replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, ' ').replace(/\s*\|\s*/g, ', ');   /* tables */
  t = t.replace(/\*+/g, '').replace(/~~/g, '');
  t = t.split(String.fromCharCode(8594)).join(', then ').split(String.fromCharCode(8658)).join(', then ').split(String.fromCharCode(183)).join(', ');
  t = t.replace(/\s*\n\s*\n\s*/g, '. ').replace(/\s*\n\s*/g, '. ').replace(/\s+/g, ' ');
  t = t.replace(/([:;,])\s*\./g, '.').replace(/([.!?])\s*(?:\.\s*)+/g, '$1 ').replace(/^[\s.,]+/, '').trim();
  return t.slice(0, MAX_SPEECH);
}

/* the reply in parts, cut only between sentences (never inside a number such as 0.1) */
function parts(text) {
  const sents = speakable(text).split(/(?<=[.!?]["')\]]?)\s+(?=\S)/).filter(Boolean);
  const out = [];
  let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (let s of sents) {
    const cap = out.length ? REST : FIRST;
    if (cur && cur.length + 1 + s.length > cap) push();
    while (s.length > REST) {                       /* one very long sentence: cut at a space */
      let at = s.lastIndexOf(' ', REST);
      if (at < 200) at = REST;
      cur = s.slice(0, at); push(); s = s.slice(at).trim();
    }
    cur = cur ? cur + ' ' + s : s;
  }
  push();
  return out.slice(0, MAX_PARTS);
}

module.exports = { HONOR, ready, key, voiceId, model, ticket, valid, speakable, parts, MAX_SPEECH };
