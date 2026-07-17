/* GET /api/x — Dasha on X. Runs on a Vercel cron: reads mentions, answers new ones.
   Stateless dedupe: we ask X what we already replied to (our own timeline) rather than
   keeping a database — serverless instances share no memory.
   ?status=1 → config/health report, posts nothing. */
const { xGet, xPost, botUser, thread } = require('./_x.js');
const { askDasha } = require('./_brain.js');
const { buildDigest } = require('./_digest.js');
const { runDMs } = require('./_dm.js');
const metrics = require('./_metrics.js');

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

/* Have we already said this? A broadcast repeated is a broadcast unfollowed, and serverless
   keeps no state — so we ask X what we've already posted rather than trusting memory. */
async function alreadyPosted(myId, marker) {
  try {
    const d = await xGet('/2/users/' + myId + '/tweets', { max_results: '50', 'tweet.fields': 'created_at' });
    return (d.data || []).some(function (t) { return String(t.text || '').includes(marker); });
  } catch (e) { return true; }   // can't verify → stay silent. Never risk a duplicate broadcast.
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

  /* ---- the daily pulse → the team channel: what fired yesterday, never what was said ---- */
  if (req.query && req.query.pulse) {
    const snap = await metrics.snapshot(parseInt(req.query.days, 10) || 1);
    const p = metrics.rollup(snap);
    const bt = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.SUPPORT_CHAT_ID;
    const lines = ['📊 Dasha pulse — ' + (p.scope || ''),
      p.answers + ' answers · ' + p.satisfaction + ' helpful (' + p.thumbs_up + '👍 / ' + p.thumbs_down + '👎)',
      '', 'Most-used skills:'].concat((p.topSkills || []).slice(0, 6).map(function (s) { return '  ' + s[0] + ' × ' + s[1]; }));
    if (p.tools && p.tools.length) lines.push('', 'Tools reached: ' + p.tools.map(function (t) { return t[0] + '×' + t[1]; }).join(' · '));
    lines.push('', 'aggregate only — no question, answer, or user is ever stored.');
    const text = lines.join('\n');
    /* don't post a near-empty pulse: without a shared store each instance sees only its own
       recent traffic, so a daily post would be noise. Post only with a real store, or when forced. */
    const worthPosting = metrics.HAS_KV || p.answers >= 20 || req.query.force;
    let posted = false;
    if (bt && chat && !req.query.dry && worthPosting) {
      try { const r = await fetch('https://api.telegram.org/bot' + bt + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text, disable_web_page_preview: true }) }); posted = r.ok; } catch (e) {}
    }
    return res.status(200).json({ ok: true, posted: posted, pulse: p, preview: text });
  }

  /* ---- direct messages: every incoming one gets an answer, no @mention needed ---- */
  const dmq = req.query && req.query.dm;
  if (dmq) {
    if (!cfg.canPost) return res.status(200).json({ ok: false, reason: 'DMs need the OAuth1 user token (X_ACCESS_TOKEN/SECRET)' });
    const out = await runDMs(me, { preview: dmq === 'preview' });
    return res.status(200).json(out);
  }

  /* ---- the superblock digest: the one unprompted thing worth saying ---- */
  const dq = req.query && req.query.digest;
  if (dq) {
    const preview = dq === 'preview';
    const dig = await buildDigest({ force: preview || dq === 'force' });
    if (!dig) return res.status(200).json({ ok: false, reason: 'no governance data' });
    if (dig.skip) return res.status(200).json({ ok: true, posted: false, reason: dig.skip });

    /* thread the whole digest at once so the n/N counter is global, not per-section */
    const shaped = thread(dig.tweets.join('\n\n'), 280);
    if (preview) {
      return res.status(200).json({ ok: true, posted: false, mode: 'preview',
        superblock: dig.superblock, daysAway: Math.round(dig.days * 10) / 10,
        passing: dig.passing, ofTotal: dig.total, closeToLine: dig.close,
        wouldPost: shaped });
    }
    if (String(process.env.DASHA_X_DIGEST || '').toLowerCase() !== 'on') {
      return res.status(200).json({ ok: true, posted: false, reason: 'digest disabled (set DASHA_X_DIGEST=on)', wouldPost: shaped });
    }
    if (await alreadyPosted(me.id, dig.marker)) {
      return res.status(200).json({ ok: true, posted: false, reason: 'already posted for ' + dig.marker });
    }
    let parent = null, ids = [];
    for (const p of shaped) {
      const r = await xPost('/2/tweets', parent ? { text: p, reply: { in_reply_to_tweet_id: parent } } : { text: p });
      if (r.error) { ids.push({ error: r.error }); break; }
      parent = r.data && r.data.id; ids.push(parent);
    }
    return res.status(200).json({ ok: true, posted: true, superblock: dig.superblock, tweets: ids,
      url: ids[0] ? ('https://x.com/' + me.username + '/status/' + ids[0]) : null });
  }

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
