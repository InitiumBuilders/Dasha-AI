/* GET /api/x — Dasha on X. Runs on a Vercel cron: reads mentions, answers new ones.
   Stateless dedupe: we ask X what we already replied to (our own timeline) rather than
   keeping a database — serverless instances share no memory.
   ?status=1 → config/health report, posts nothing. */
const { xGet, xPost, botUser, thread } = require('./_x.js');
const { askDasha } = require('./_brain.js');

const MAX_REPLIES_PER_RUN = 3;   // rate + credit guard
const LOOKBACK_MIN = 90;         // ignore anything older (cold starts / backfill storms)
const recent = new Map();        // in-memory belt to the timeline's braces

function authorized(req) {
  const cs = process.env.CRON_SECRET;
  const auth = req.headers['authorization'] || '';
  if (cs && auth === 'Bearer ' + cs) return true;               // Vercel cron
  if (req.headers['x-vercel-cron']) return true;                 // Vercel cron header
  const tok = req.headers['x-dasha-token'];
  if (tok && process.env.DASHA_MCP_TOKEN && tok === process.env.DASHA_MCP_TOKEN) return true; // manual
  return !cs;                                                    // no secret set → open (still read-only unless configured)
}

async function repliedSet(myId) {
  const out = new Set();
  try {
    const d = await xGet('/2/users/' + myId + '/tweets', { max_results: '100', 'tweet.fields': 'referenced_tweets' });
    for (const t of (d.data || [])) {
      for (const r of (t.referenced_tweets || [])) {
        if (r.type === 'replied_to') out.add(r.id);
      }
    }
  } catch (e) { /* if this fails we fall back to the in-memory set only */ }
  return out;
}

module.exports = async (req, res) => {
  const status = req.query && (req.query.status === '1' || req.query.status === 'true');
  const cfg = {
    handle: process.env.X_HANDLE || null,
    consumer: !!process.env.X_CONSUMER_KEY,
    bearer: !!process.env.X_BEARER_TOKEN,
    canPost: !!(process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_SECRET),
  };
  if (!cfg.handle || !cfg.consumer) {
    return res.status(200).json({ ok: false, reason: 'X not configured', cfg });
  }

  let me;
  try { me = await botUser(); }
  catch (e) { return res.status(200).json({ ok: false, reason: String(e.message), cfg, hint: 'Create the X account, then set X_HANDLE to its exact handle.' }); }

  if (status) {
    let mentions = null;
    try {
      const d = await xGet('/2/users/' + me.id + '/mentions', { max_results: '5', 'tweet.fields': 'created_at,author_id' });
      mentions = (d.data || []).length;
    } catch (e) { mentions = 'read failed: ' + e.message; }
    return res.status(200).json({ ok: true, bot: { id: me.id, handle: me.username, name: me.name }, cfg, mentionsVisible: mentions,
      note: cfg.canPost ? 'Fully live: reads mentions and replies.' : 'READ-ONLY: set X_ACCESS_TOKEN + X_ACCESS_SECRET (OAuth 1.0a, from the posting account, app permission Read+Write) to enable replies.' });
  }

  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  let mentions = [];
  try {
    const d = await xGet('/2/users/' + me.id + '/mentions', {
      max_results: '20',
      'tweet.fields': 'created_at,author_id,conversation_id,referenced_tweets',
      expansions: 'author_id',
      'user.fields': 'username',
    });
    mentions = d.data || [];
    var users = {};
    for (const u of ((d.includes && d.includes.users) || [])) users[u.id] = u.username;
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'mentions read failed: ' + e.message,
      hint: 'The mentions endpoint needs an X API tier that allows reads (Basic or higher).' });
  }

  const already = await repliedSet(me.id);
  const cutoff = Date.now() - LOOKBACK_MIN * 60 * 1000;
  const now = Date.now();
  for (const [k, v] of recent) if (now - v > 36e5) recent.delete(k);

  const todo = mentions.filter((t) => {
    if (t.author_id === me.id) return false;                        // never answer herself
    if (/^RT @/.test(t.text || '')) return false;                    // ignore retweets
    if (already.has(t.id) || recent.has(t.id)) return false;         // already handled
    if (t.created_at && new Date(t.created_at).getTime() < cutoff) return false;
    return true;
  }).slice(0, MAX_REPLIES_PER_RUN);

  if (!cfg.canPost) {
    return res.status(200).json({ ok: true, mode: 'read-only', bot: me.username, newMentions: todo.length,
      wouldAnswer: todo.map((t) => ({ id: t.id, text: String(t.text).slice(0, 120) })),
      hint: 'Set X_ACCESS_TOKEN + X_ACCESS_SECRET to let her reply.' });
  }

  const done = [];
  for (const t of todo) {
    recent.set(t.id, Date.now());
    const asker = (typeof users !== 'undefined' && users[t.author_id]) ? users[t.author_id] : null;
    const q = String(t.text || '').replace(new RegExp('@' + me.username, 'ig'), '').trim();
    if (!q) continue;

    let reply;
    if (/\/human[-_ ]?support\b/i.test(q)) {
      reply = 'A real person from the Dash Support Team is one message away: t.me/TheDashSupportTEAM — bring what you tried and any exact error text.';
    } else {
      const out = await askDasha([{ role: 'user', content: q.slice(0, 4000) }], { surface: 'x', maxTokens: 2000 });
      reply = out.error ? null : out.reply;
      if (!reply) { done.push({ id: t.id, skipped: out.error || 'empty' }); continue; }
    }

    const parts = thread(reply, 280);
    let parent = t.id, posted = [];
    for (const p of parts) {
      const r = await xPost('/2/tweets', { text: p, reply: { in_reply_to_tweet_id: parent } });
      if (r.error) { posted.push({ error: r.error }); break; }
      parent = r.data && r.data.id;
      posted.push(parent);
    }
    done.push({ mention: t.id, from: asker, tweets: posted });
  }

  return res.status(200).json({ ok: true, bot: me.username, checked: mentions.length, answered: done.length, done });
};
