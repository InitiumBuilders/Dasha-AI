/* GET /api/x — Dasha on X. Runs on a Vercel cron: reads mentions, answers new ones.
   Stateless dedupe: we ask X what we already replied to (our own timeline) rather than
   keeping a database — serverless instances share no memory.
   ?status=1 → config/health report, posts nothing. */
const { xGet, xPost, botUser, thread } = require('./_x.js');
const { askDasha } = require('./_brain.js');
const { buildDigest } = require('./_digest.js');
const { runDMs } = require('./_dm.js');
const { runWatch, ballot, snapshot, govData } = require('./_watch.js');
const { runFeed, readFeed, sendIntro } = require('./_feed.js');
const { workRecord } = require('./_work.js');
let govCache = { at: 0, data: null };
let feedCache = { at: 0, data: null };
let workCache = { at: 0, data: null };
const { runEditor, commitEditorState } = require('./_editor.js');
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

async function postedRecently(myId, marker, hours) {
  try {
    const d = await xGet('/2/users/' + myId + '/tweets', { max_results: '30', 'tweet.fields': 'created_at' });
    const since = Date.now() - (hours || 20) * 36e5;
    return (d.data || []).some(function (t) {
      const ts = Date.parse(t.created_at || 0);
      return String(t.text || '').includes(marker) && isFinite(ts) && ts > since;
    });
  } catch (e) { return true; }   // cannot verify → stay silent
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
  /* ---- public: her X feed for the /pulse stream (cached 2 min; own origin, always fresh) ----
     Served from the GitHub mirror, so it stays up when the X API does not (credits, outages). */
  if (req.query && req.query.feed) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!feedCache.data || Date.now() - feedCache.at > 2 * 60000) {
      try { feedCache = { at: Date.now(), data: await readFeed() }; }
      catch (e) { feedCache = { at: Date.now(), data: { items: [] } }; }
    }
    return res.status(200).json({ ok: true, feed: feedCache.data });
  }

  /* ---- public: live ballot data for the /pulse widget (cached 5 min). DashCentral only, no X. ---- */
  if (req.query && (req.query.gov || req.query.ics)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', req.query.ics ? 'public, s-maxage=1800, stale-while-revalidate=86400' : 'public, s-maxage=120, stale-while-revalidate=600');
    if (!govCache.data || Date.now() - govCache.at > 5 * 60000) {
      const s = snapshot(await govData());
      /* the size of the ballot: every vote a masternode can cast (an evonode carries four) */
      let mn = null;
      try {
        const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 6000);
        const r = await fetch('https://www.dashcentral.org/api/v1/public', { signal: ac.signal, headers: { 'user-agent': 'DashaAI (+https://www.dashsupport.team)' } });
        clearTimeout(tm);
        const gen = ((await r.json()) || {}).general || {};
        mn = { votes: gen.consensus_masternodes_weighted | 0, nodes: gen.consensus_masternodes | 0 };
      } catch (e) { mn = null; }
      govCache = { at: Date.now(), data: s ? {
        votes: mn && mn.votes > 0 ? mn.votes : null, nodes: mn && mn.nodes > 0 ? mn.nodes : null,
        superblock: s.superblock, hoursToCutoff: s.hoursToCutoff, cutoffTs: s.cutoffTs || null, payTs: s.payTs || null,
        /* cutoffTs and payTs are always the next vote a proposal can still win. For the three days between a
           superblock's cutoff and its payment they already describe the round after it, while superblock still
           names the one about to pay: closed says so, and sbPayTs is when that one pays. */
        sbPayTs: s.sbPayTs || null, closed: !!(s.cutoffTs && s.sbPayTs && s.cutoffTs > s.sbPayTs),
        days: s.hoursToCutoff != null ? Math.round(s.hoursToCutoff / 24) : null,
        active: s.props.length, passing: s.passing.length,
        allotted: s.allotted, total: s.total,
        bubble: s.bubble.slice(0, 5).map((p) => ({ title: p.title, short: p.short, url: p.url })),
        passingList: s.passing.slice(0, 6).map((p) => ({ title: p.title, net: p.net, url: p.url })),
        /* our own proposal, once it is on the ballot: the pages and the ring show where it stands */
        ours: (function () {
          const o = s.props.find((p) => /dash[\s_-]*support[\s_-]*team|dashsupport/i.test(p.name + ' ' + p.title));
          return o ? { name: o.name, title: o.title, url: o.url, hash: o.hash, net: o.net, short: o.short, passing: o.passing, ask: o.ask, months: o.months, yes: o.yes, no: o.no } : null;
        })(),
      } : null };
    }
    /* the same ballot as a calendar feed: the vote cutoffs and superblocks ahead, for /tools and any calendar app */
    if (req.query.ics) {
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="dash-dao-votes.ics"');
      return res.status(200).send(require('./_ics').icsFeed(govCache.data));
    }
    return res.status(200).json({ ok: true, gov: govCache.data });
  }

  /* ---- public: her work on the public record, for the /pulse heartbeat (cached 10 min).
     GitHub counts anyone can re-run; no X involved. A failed read keeps the last good one. ---- */
  if (req.query && req.query.work) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    if (!workCache.data || Date.now() - workCache.at > 10 * 60000) {
      let w = null;
      try { w = await workRecord(); } catch (e) { w = null; }
      if (w) workCache = { at: Date.now(), data: w };
    }
    return res.status(200).json({ ok: !!workCache.data, work: workCache.data });
  }

  /* ---- the daily pulse → the team channel: what fired yesterday, never what was said.
     Above the X login on purpose: it needs no X, and it went silent on 2026-09-14 when an
     X credit outage stopped every job behind that login. ---- */
  if (req.query && req.query.pulse) {
    if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
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
    const worthPosting = metrics.HAS_SB || metrics.HAS_KV || p.answers >= 20 || req.query.force;
    let posted = false;
    if (bt && chat && !req.query.dry && worthPosting) {
      try { const r = await fetch('https://api.telegram.org/bot' + bt + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: text, disable_web_page_preview: true }) }); posted = r.ok; } catch (e) {}
    }
    return res.status(200).json({ ok: true, posted: posted, pulse: p, preview: text });
  }

  /* ---- the ballot record: Dasha-AI WATCH/state.json, the treasury as she last saw it.
     Above the X login on purpose, like the pulse: it went silent on 2026-09-14 with every job
     behind that login, and the record needs no X. Only the posting further down waits for X. ---- */
  let watchOut = null;
  if (req.query && req.query.watch) {
    if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
    const wq = req.query.watch;
    const preview = wq === 'preview' || wq === 'dry';
    const switchedOn = String(process.env.DASHA_X_WATCH || '').toLowerCase() === 'on';
    const speak = !preview && switchedOn && !!(cfg.handle && cfg.consumer && cfg.canPost);
    watchOut = await runWatch({ dry: preview, max: parseInt(req.query.max, 10) || 2, compose: preview || speak });
    if (!watchOut.ok) return res.status(200).json(watchOut);
    if (preview) return res.status(200).json({ ok: true, mode: 'preview', posted: false, ...watchOut });
    if (!speak) {
      return res.status(200).json({ ok: true, posted: false, recorded: true,
        reason: switchedOn ? 'posting needs X configured with the OAuth1 user token' : 'watch disabled (set DASHA_X_WATCH=on)', ...watchOut });
    }
  }

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

  /* ---- the feed mirror: refresh her X timeline into the repo + push new items to Telegram ---- */
  if (req.query && req.query.mirror === 'intro') { return res.status(200).json(await sendIntro()); }
  if (req.query && req.query.mirror) {
    var mv = String(req.query.mirror);
    const out = await runFeed({ mirror: true, dry: !!req.query.dry, reset: mv === 'reset', surfaceReplies: (mv === 'replies' || mv === 'surfacereplies') });
    return res.status(200).json(out);
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

  /* ---- THE EDITOR: gather every candidate, score, spend the budget, or stay silent ---- */
  const eq = req.query && req.query.editor;
  if (eq) {
    const preview = eq === 'preview' || eq === 'dry';
    const out = await runEditor({ dry: preview, verbose: preview, max: parseInt(req.query.max, 10) || 2, budget: parseInt(req.query.budget, 10) || undefined });
    if (!out.ok) return res.status(200).json(out);
    const brief = { ok: true, cutoffHours: out.ctx.hoursToCutoff, ledgerSize: out.ledgerSize,
      considered: out.considered, chose: out.chosen.map((c) => ({ kind: c.kind, key: c.key, text: c.text })) };
    if (preview) return res.status(200).json({ ...brief, mode: 'preview', posted: 0 });
    if (String(process.env.DASHA_X_WATCH || '').toLowerCase() !== 'on') {
      return res.status(200).json({ ...brief, posted: 0, reason: 'watch disabled (set DASHA_X_WATCH=on)' });
    }
    if (!cfg.canPost) return res.status(200).json({ ...brief, posted: 0, reason: 'posting needs the OAuth1 user token' });
    if (!out.chosen.length) return res.status(200).json({ ...brief, posted: 0, reason: 'nothing worth saying — silence is a valid output' });
    /* belt: never repeat a brief the timeline already carries */
    const fresh = [];
    for (const c of out.chosen) {
      if (c.kind === 'ballot' && await postedRecently(me.id, 'Dash ballot —', 20)) continue;
      fresh.push(c);
    }
    if (!fresh.length) return res.status(200).json({ ...brief, posted: 0, reason: 'already said within the cooldown' });
    const results = [];
    for (const c of fresh) {
      const shaped = thread(c.text, 280);
      let parent = null, ids = [];
      for (const piece of shaped) {
        const r = await xPost('/2/tweets', parent ? { text: piece, reply: { in_reply_to_tweet_id: parent } } : { text: piece });
        if (r.error) { ids.push({ error: r.error }); break; }
        parent = r.data && r.data.id; ids.push(parent);
      }
      results.push({ kind: c.kind, key: c.key, tweets: ids,
        url: ids[0] && !ids[0].error ? ('https://x.com/' + me.username + '/status/' + ids[0]) : null });
    }
    await commitEditorState(out.state, out.sha, fresh);
    return res.status(200).json({ ...brief, posted: results.length, results });
  }

  /* ---- THE GOVERNANCE WATCH: speak only when the ballot actually changed.
     The record above already ran; this only posts what it found, and only when she may speak. ---- */
  if (watchOut) {
    const out = watchOut;
    const results = [];
    for (const ev of out.posts) {
      const shaped = thread(ev.text, 280);
      let parent = null, ids = [];
      for (const piece of shaped) {
        const r = await xPost('/2/tweets', parent ? { text: piece, reply: { in_reply_to_tweet_id: parent } } : { text: piece });
        if (r.error) { ids.push({ error: r.error }); break; }
        parent = r.data && r.data.id; ids.push(parent);
      }
      results.push({ kind: ev.kind, key: ev.key, tweets: ids,
        url: ids[0] && !ids[0].error ? ('https://x.com/' + me.username + '/status/' + ids[0]) : null });
    }
    return res.status(200).json({ ok: true, posted: results.length, snapshot: out.snapshot, results });
  }

  /* ---- THE DAILY BALLOT BRIEF: vote informed in ten seconds ---- */
  const bq = req.query && req.query.ballot;
  if (bq) {
    const preview = bq === 'preview' || bq === 'dry';
    const out = await ballot();
    if (!out.ok) return res.status(200).json(out);
    const shaped = thread(out.text, 280);
    if (preview) return res.status(200).json({ ok: true, mode: 'preview', posted: false, snapshot: out.snapshot, wouldPost: shaped });
    if (String(process.env.DASHA_X_WATCH || '').toLowerCase() !== 'on') {
      return res.status(200).json({ ok: true, posted: false, reason: 'watch disabled (set DASHA_X_WATCH=on)', wouldPost: shaped });
    }
    if (!cfg.canPost) return res.status(200).json({ ok: false, reason: 'posting needs the OAuth1 user token' });
    if (await postedRecently(me.id, 'Dash ballot —', 20)) {
      return res.status(200).json({ ok: true, posted: false, reason: 'already briefed within 20h' });
    }
    let parent = null, ids = [];
    for (const piece of shaped) {
      const r = await xPost('/2/tweets', parent ? { text: piece, reply: { in_reply_to_tweet_id: parent } } : { text: piece });
      if (r.error) { ids.push({ error: r.error }); break; }
      parent = r.data && r.data.id; ids.push(parent);
    }
    return res.status(200).json({ ok: true, posted: true, snapshot: out.snapshot, tweets: ids,
      url: ids[0] && !ids[0].error ? ('https://x.com/' + me.username + '/status/' + ids[0]) : null });
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
