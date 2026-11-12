/* THE FEED — Dasha's X voice, mirrored to the website and to Telegram.
   Her timeline (posts AND replies to builders) is fetched, normalized, and stored publicly
   in her own repo. The /pulse page reads it. A mirror pushes each NEW item into the
   DASHA-AI Telegram topic with a link back to X. History is never back-filled. */
const { xGet, botUser } = require('./_x.js');

const REPO = 'InitiumBuilders/Dasha-AI';
const FEED_PATH = 'WATCH/feed.json';
const KEEP = 60;
const MIRROR_PER_RUN = 6;   // never flood the topic

async function ghGet(path) {
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-feed', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function ghPut(path, content, message, sha) {
  const body = { message, content: Buffer.from(content).toString('base64'),
    committer: { name: 'Dasha Feed', email: 'Help@DashSupport.Team' } };
  if (sha) body.sha = sha;
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-feed',
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body) });
    return r.ok;
  } catch (e) { return false; }
}
async function loadFeed() {
  const f = await ghGet(FEED_PATH);
  const empty = { username: null, items: [], mirrored: {} };
  if (!f) return { sha: null, data: empty };
  try { return { sha: f.sha, data: Object.assign(empty, JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'))) }; }
  catch (e) { return { sha: f.sha, data: empty }; }
}

function stripTail(s) { return String(s || '').replace(/\s*https:\/\/t\.co\/\w+\s*$/, '').trim(); }
function stripNum(s) { return String(s || '').replace(/\s*\(?\d{1,2}\/\d{1,2}\)?\s*$/, '').trim(); }

async function fetchTimeline() {
  const me = await botUser();
  const d = await xGet('/2/users/' + me.id + '/tweets', {
    max_results: '80',
    'tweet.fields': 'created_at,referenced_tweets,in_reply_to_user_id,note_tweet,public_metrics',
    exclude: 'retweets',
  });
  const raw = ((d && d.data) || []).map(function (t) {
    const rep = (t.referenced_tweets || []).filter(function (r) { return r.type === 'replied_to'; })[0];
    const full = (t.note_tweet && t.note_tweet.text) ? t.note_tweet.text : (t.text || '');
    const pm = t.public_metrics || {};
    return { id: String(t.id), text: String(full), at: t.created_at || null,
      replyToId: rep ? String(rep.id) : null,
      replyToUser: t.in_reply_to_user_id ? String(t.in_reply_to_user_id) : null,
      m: { l: pm.like_count | 0, r: (pm.retweet_count | 0) + (pm.quote_count | 0), c: pm.reply_count | 0 } };
  });
  return buildThreads(me, raw);
}

/* Reassemble her self-reply chains into single logical items (full posts / full answers),
   so a threaded reply reads as ONE message, not a string of fragments. */
function buildThreads(me, raw) {
  const byId = {}; raw.forEach(function (t) { byId[t.id] = t; });
  function rootOf(t) {
    var cur = t, g = 0;
    while (cur.replyToId && byId[cur.replyToId] && String(cur.replyToUser) === String(me.id) && g++ < 40) cur = byId[cur.replyToId];
    return cur;
  }
  const groups = {};
  raw.forEach(function (t) { const r = rootOf(t); (groups[r.id] = groups[r.id] || []).push(t); });
  const threads = Object.keys(groups).map(function (rootId) {
    const arr = groups[rootId].slice().sort(function (a, b) { return (a.at < b.at ? -1 : (a.at > b.at ? 1 : 0)); });
    const root = byId[rootId] || arr[0];
    /* a genuine reply is the START of a chain that answers SOMEONE ELSE */
    const isReply = !!root.replyToUser && String(root.replyToUser) !== String(me.id);
    const parts = arr.map(function (t, i) {
      var s = stripTail(stripNum(t.text));
      if (i > 0) s = s.replace(/^(@\w+\s+)+/, '');   /* drop repeated @handles on continuations */
      return s;
    }).filter(function (s) { return s.length; });
    /* engagement rides the ROOT tweet — summing self-reply parts would double-count the thread */
    return { id: rootId, text: parts.join('\n\n'), at: root.at, reply: isReply,
      count: arr.length, m: root.m || { l: 0, r: 0, c: 0 },
      url: 'https://x.com/' + me.username + '/status/' + rootId };
  });
  threads.sort(function (a, b) { return (a.at < b.at ? 1 : (a.at > b.at ? -1 : 0)); });
  return { username: me.username, items: threads.slice(0, KEEP) };
}

function tgEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
async function tgSend(token, chatId, threadId, text) {
  const body = { chat_id: chatId, text: text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (threadId) body.message_thread_id = Number(threadId);
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return r.ok;
  } catch (e) { return false; }
}
/* strip a t.co tail X appends to its own thread tweets, so the card reads clean */
function cleanTweet(s) { return String(s || '').replace(/\s*https:\/\/t\.co\/\w+\s*$/,'').trim(); }
function mirrorText(it) {
  const head = it.reply ? '↩️ <b>Dasha replied on X</b>' : '🔷 <b>Dasha posted on X</b>';
  const tag = (it.count && it.count > 1) ? ' 🧵×' + it.count : '';
  return head + tag + '\n\n' + tgEsc(it.text) + '\n\n<a href="' + it.url + '">View on X ↗</a>';
}

async function runFeed(opts) {
  opts = opts || {};
  let tl;
  try { tl = await fetchTimeline(); } catch (e) { return { ok: false, error: 'timeline: ' + (e && e.message) }; }

  const { sha, data } = await loadFeed();
  data.mirrored = data.mirrored || {};
  const merged = tl.items;   /* threads, recomputed fresh from the timeline each run */
  data.items = merged;
  data.username = tl.username;
  data.updated = new Date().toISOString();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.SUPPORT_CHAT_ID;
  const topic = process.env.DASHA_TG_FEED_TOPIC;
  const mirrorReady = !!(token && chat && topic);
  let mirrored = 0, seeded = false;

  if (opts.mirror && mirrorReady) {
    if (opts.reset) data.mirrored = {};
    /* surface her recent reply-threads that were seeded out at launch */
    if (opts.surfaceReplies) merged.filter((it) => it.reply).slice(0, MIRROR_PER_RUN).forEach((it) => { delete data.mirrored[it.id]; });
    if (Object.keys(data.mirrored).length === 0) {
      /* first time the topic is live: open with her latest 6, mark the rest seen (no history dump) */
      const opener = merged.slice(0, 6).map((it) => it.id);
      for (const it of merged) if (opener.indexOf(it.id) < 0) data.mirrored[it.id] = true;
      seeded = true;
    }
    const todo = merged.filter((it) => !data.mirrored[it.id])
      .sort((a, b) => (a.at > b.at ? 1 : -1))   /* oldest first, chronological in the topic */
      .slice(0, MIRROR_PER_RUN);
    for (const it of todo) {
      const ok = await tgSend(token, chat, topic, mirrorText(it));
      if (ok) { data.mirrored[it.id] = true; mirrored++; }
    }
    /* keep the mirrored map bounded to ids we still track */
    const known = {}; for (const it of merged) known[it.id] = 1;
    for (const k of Object.keys(data.mirrored)) if (!known[k]) delete data.mirrored[k];
  }

  if (!opts.dry) await ghPut(FEED_PATH, JSON.stringify(data, null, 2), 'feed: ' + data.updated.slice(0, 16), sha);
  return { ok: true, count: merged.length, mirrored, seeded, mirrorReady,
    mirrorNote: mirrorReady ? undefined : 'set DASHA_TG_FEED_TOPIC (the DASHA-AI topic thread id) to start mirroring', updated: data.updated };
}

async function readFeed() {
  const { data } = await loadFeed();
  return { username: data.username || null, items: data.items || [], updated: data.updated || null };
}
async function sendIntro() {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.SUPPORT_CHAT_ID, topic = process.env.DASHA_TG_FEED_TOPIC;
  if (!(token && chat && topic)) return { ok: false, reason: 'topic not configured' };
  const text = '🔷 <b>Dasha’s X activity streams here.</b>\n\nEvery post and every reply she makes on X appears in this topic, each with a link back to the original — so you can follow the whole conversation without leaving Telegram.\n\nFollow live: https://x.com/DashSupportTeam';
  const ok = await tgSend(token, chat, topic, text);
  return { ok };
}
module.exports = { runFeed, fetchTimeline, readFeed, sendIntro };
