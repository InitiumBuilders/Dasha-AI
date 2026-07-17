/* X direct messages — she answers, she never initiates.

   That boundary is not squeamishness, it is the product. The single most effective crypto
   scam is an unsolicited DM from "support", and her own /scam-check tells victims that real
   support never messages first. An agent that DMs first is indistinguishable from the thing
   it warns about. So: someone opens the conversation, she answers everything after that.

   No @mention is needed in a DM — a DM IS the address. Every incoming message gets a reply.

   DM endpoints refuse app-only auth (403 Unsupported Authentication); they need the OAuth 1.0a
   user context, which this deployment has at read-write-directmessages. */
const { xGet, xPost } = require('./_x.js');
const { askDasha } = require('./_brain.js');
const { humanSupport } = require('./_brain.js');

const MAX_REPLIES_PER_RUN = 5;      // credit + rate guard
const LOOKBACK_MIN = 180;           // don't answer a conversation the world has moved on from
const seen = new Map();             // belt to the braces of "did we already reply in this thread"

function fresh(iso, mins) {
  if (!iso) return true;
  const t = Date.parse(iso);
  return !t || (Date.now() - t) < mins * 60 * 1000;
}

/* Fetch recent DM events. Newest first. */
async function recentEvents(limit) {
  const d = await xGet('/2/dm_events', {
    max_results: String(limit || 50),
    'dm_event.fields': 'id,text,event_type,created_at,sender_id,dm_conversation_id,referenced_tweets',
    expansions: 'sender_id',
  }, { user: true });
  return { events: (d && d.data) || [], users: ((d.includes && d.includes.users) || []) };
}

/* Which conversations are waiting on us?
   Walk newest→oldest; the first event in each conversation is its latest. If that latest
   event came from someone else, they are waiting. If it came from us, we already replied. */
function pending(events, myId) {
  const latest = new Map();
  for (const e of events) {
    if (e.event_type && e.event_type !== 'MessageCreate') continue;
    const c = e.dm_conversation_id;
    if (!c || latest.has(c)) continue;
    latest.set(c, e);
  }
  const out = [];
  for (const [c, e] of latest) {
    if (String(e.sender_id) === String(myId)) continue;   // we spoke last — nothing owed
    if (!e.text || !e.text.trim()) continue;
    if (!fresh(e.created_at, LOOKBACK_MIN)) continue;
    if (seen.has(e.id)) continue;
    out.push({ conversation: c, id: e.id, text: e.text, sender: e.sender_id, at: e.created_at });
  }
  return out;
}

async function sendDM(conversationId, text) {
  return xPost('/2/dm_conversations/' + encodeURIComponent(conversationId) + '/messages', { text: text });
}

/* Answer everyone who is waiting. Returns a report; never throws. */
async function runDMs(me, opts) {
  const cfg = opts || {};
  let events, users;
  try {
    const r = await recentEvents(50);
    events = r.events; users = r.users;
  } catch (e) {
    return { ok: false, reason: 'dm read failed: ' + e.message,
      hint: 'DM reads need the OAuth1 user context with DM scope, and an API tier that allows /2/dm_events.' };
  }

  const now = Date.now();
  for (const [k, v] of seen) if (now - v > 6 * 36e5) seen.delete(k);

  const waiting = pending(events, me.id).slice(0, MAX_REPLIES_PER_RUN);
  if (cfg.preview) {
    return { ok: true, mode: 'preview', posted: false, eventsSeen: events.length,
      waiting: waiting.map((w) => ({ from: w.sender, text: w.text.slice(0, 120), at: w.at })) };
  }

  const done = [];
  for (const w of waiting) {
    seen.set(w.id, Date.now());
    const handle = (users.find((u) => u.id === w.sender) || {}).username || null;
    let reply;

    if (/\/human[-_ ]?support\b/i.test(w.text)) {
      reply = await humanSupport('@' + (handle || w.sender) + ' via X DM: ' + w.text.slice(0, 400), 'x-dm');
    } else {
      const out = await askDasha([{ role: 'user', content: w.text.slice(0, 6000) }], { surface: 'x-dm', maxTokens: 2400 });
      if (out.error) { done.push({ conversation: w.conversation, skipped: out.error }); continue; }
      reply = out.reply;
    }

    /* DMs allow 10,000 characters — no threading, no truncation, just the answer. */
    const r = await sendDM(w.conversation, String(reply).slice(0, 9800));
    done.push({ conversation: w.conversation, from: handle, ok: !r.error, error: r.error || undefined });
  }
  return { ok: true, eventsSeen: events.length, waiting: waiting.length, answered: done.length, done };
}

module.exports = { runDMs };
