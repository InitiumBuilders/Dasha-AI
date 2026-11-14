/* POST /api/telegram?t=<bot_token> — Dasha as a Telegram bot.
   Anyone can mint their own Dasha: create a bot with @BotFather, then point its webhook here
   with their token in the URL. We never store the token — it lives in THEIR webhook URL and
   is used only to reply to the update Telegram just sent us. */
const { askDasha, humanSupport, HUMAN_LINK } = require('./_brain.js');
const hours = require('./_hours.js');
const help = require('./_help.js');
const paxt = require('./_paxt.js');

const meCache = new Map(); // botToken -> {username, at}
async function botUsername(t) {
  const hit = meCache.get(t);
  if (hit && Date.now() - hit.at < 6 * 36e5) return hit.username;
  try {
    const r = await fetch('https://api.telegram.org/bot' + t + '/getMe');
    const d = await r.json();
    const u = d && d.result && d.result.username ? d.result.username.toLowerCase() : null;
    if (u) { meCache.set(t, { username: u, at: Date.now() }); if (meCache.size > 500) meCache.clear(); return u; }
  } catch (e) {}
  return null;
}
/* THE COST GUARD (2026-11-12). This address is public and an answer here is written by the deeper mind, so a forged
   update must never reach the model. The token has to look like a bot token and belong to a real bot (getMe, kept
   six hours). When TELEGRAM_BOT_IDS is set (bot ids, comma-separated: the number before the colon in a token), only
   those bots and the team's own are served. Then each chat and each bot gets an hourly share. Best-effort and per
   running instance, like /api/chat's own limits. */
const TOKEN = /^(\d{6,12}):[A-Za-z0-9_-]{30,60}$/;
function botAllowed(t) {
  const m = TOKEN.exec(String(t || ''));
  if (!m) return false;
  if (t === process.env.TELEGRAM_BOT_TOKEN) return true;
  const ids = String(process.env.TELEGRAM_BOT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return !ids.length || ids.indexOf(m[1]) >= 0;
}
const CHAT_PER_HOUR = 24, BOT_PER_HOUR = 240;
const tgHits = new Map();   /* key -> [timestamps] */
function tgLimited(key, cap) {
  const now = Date.now(), a = (tgHits.get(key) || []).filter((x) => now - x < 36e5);
  if (a.length >= cap) { tgHits.set(key, a); return true; }
  a.push(now); tgHits.set(key, a);
  if (tgHits.size > 8000) tgHits.clear();
  return false;
}
/* retries from Telegram (slow tool rounds) must never double-answer */
const seen = new Map(); // update_id -> ts
function isDupe(id) {
  if (id == null) return false;
  const now = Date.now();
  for (const [k, v] of seen) if (now - v > 6e5) seen.delete(k);
  if (seen.has(id)) return true;
  seen.set(id, now);
  if (seen.size > 2000) seen.clear();
  return false;
}
async function typing(t, chatId) {
  try {
    await fetch('https://api.telegram.org/bot' + t + '/sendChatAction', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });
  } catch (e) {}
}
async function send(t, chatId, text, replyTo) {
  const chunks = [];
  for (let s = String(text); s.length; s = s.slice(3800)) chunks.push(s.slice(0, 3800));
  for (const c of chunks) {
    await fetch('https://api.telegram.org/bot' + t + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: c, reply_to_message_id: replyTo, disable_web_page_preview: true }),
    }).catch(function () {});
  }
}

const INTRO = 'Hi, I am Dasha — the Dash support AI, built by the community-led Dash Support Team.\n\nI can search the official Dash docs live, read current DashCentral proposals with real vote counts, check network stats, and look up any transaction or address. Ask me about wallets, masternodes, Platform data contracts, developer code, or governance.\n\nIn groups: mention me, reply to me, or use /ask.\n\nCommands:\n/ask <question> — ask me directly\n/skills — what I can do\n/human-support — reach a real person\n/helped <hours> <what you did> — helped a builder? get credited (in the team group)\n/paxt — an agreement a group signs with its Dash keys, and its count\n\nMore: https://dashsupport.team/dasha-ai';

const SKILLS_MSG = 'What I can reach, live:\n\n🔎 The official Dash docs (docs.dash.org) — I search them and cite real pages\n🏛 DashCentral governance — every active proposal, votes, passing status, superblock timing\n📊 Network stats — height, difficulty, 24h volume, mempool\n🔗 Any transaction — confirmations + InstantSend/ChainLock status\n💼 Any address — balance and history (public chain data)\n🧩 Dash Platform — any state transition (and why it failed), data contract, identity or .dash name, mainnet or testnet\n\nWhat I do:\nBuilder help (Platform data contracts, JSON schemas, EvoSDK code, DAPI debugging) · masternode + evonode guidance · governance and proposal analysis · scam checks · wallet safety · merchant integration · learning paths.\n\nWhat I never do:\nAsk for your seed phrase or keys. Give price or investment advice.\n\nStuck? /human-support reaches a real person.';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, hint: 'Telegram webhook endpoint. See https://dashsupport.team/dasha-ai' });
  /* Always 200 fast so Telegram doesn't retry-storm; do the work before responding (Vercel functions
     can't reliably continue after res.end). */
  const t = (req.query && req.query.t) || process.env.TELEGRAM_BOT_TOKEN;
  if (!botAllowed(t)) return res.status(200).json({ ok: true });   /* not a bot token, or not one of ours when the list is set */
  /* /topicid — reply with this chat + topic thread id, so the feed mirror can target the DASHA-AI topic */
  try {
    const _u = req.body && (req.body.message || req.body.channel_post);
    if (_u && typeof _u.text === 'string' && _u.text.trim().toLowerCase().startsWith('/topicid')) {
      const cid = _u.chat && _u.chat.id;
      const thread = _u.message_thread_id || null;
      const reply = 'chat_id: ' + cid + (thread ? ('\nmessage_thread_id (this topic): ' + thread) : '\n(this is the General channel — no topic thread id)');
      await fetch('https://api.telegram.org/bot' + t + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cid, message_thread_id: thread || undefined, text: reply }) });
      return res.status(200).json({ ok: true, topicid: { chat: cid, thread: thread } });
    }
  } catch (e) {}
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const msg = body && (body.message || body.channel_post);
  console.log(hours.source(req));
  try {
    if (!t || !msg || !msg.chat || !msg.text) return res.status(200).json({ ok: true });
    if (isDupe(body.update_id)) return res.status(200).json({ ok: true, dupe: true });
    const chatId = msg.chat.id, text = msg.text.trim(), isGroup = msg.chat.type !== 'private';
    const uname = await botUsername(t);

    /* /hours: the leads log their hours in the team group (api/_hours.js owns who may, and where);
       anyone else's /hours, and anyone's /helped, is credited in Help given (api/_help.js) */
    if (/^\/hours(@\w+)?\b/i.test(text)) {
      const reply = await hours.handle(t, msg, req);
      if (reply) await send(t, chatId, reply, msg.message_id);
      return res.status(200).json({ ok: true });
    }
    if (/^\/helped(@\w+)?\b/i.test(text)) {
      const reply = await help.handleTelegram(t, msg, req);
      if (reply) await send(t, chatId, reply, msg.message_id);
      return res.status(200).json({ ok: true });
    }

    /* A Telepaxt: where a PAXT stands, and a quick Signal poll for the room (api/_paxt.js). She is the clerk here:
       she holds no key, and a signed line never passes through a room, where it would tie a name to a masternode. */
    if (/^\/(paxt|tally)(@\w+)?\b/i.test(text)) {
      await typing(t, chatId);
      await send(t, chatId, await paxt.telegram(text), msg.message_id);
      return res.status(200).json({ ok: true });
    }
    if (/^\/(vote|sign)(@\w+)?\b/i.test(text)) { await send(t, chatId, paxt.IN_ROOM, msg.message_id); return res.status(200).json({ ok: true }); }
    if (/^\/signal(@\w+)?\b/i.test(text)) {
      const sp = paxt.parseSignal(text);
      if (!sp) { await send(t, chatId, paxt.SIGNAL_USAGE, msg.message_id); return res.status(200).json({ ok: true }); }
      /* in a group only an admin opens a poll, so a room is not filled with them */
      if (isGroup) {
        const admin = msg.from ? await hours.isAdmin(t, chatId, msg.from.id) : false;
        if (admin !== true) { await send(t, chatId, 'A Signal poll is opened by an admin of this group.', msg.message_id); return res.status(200).json({ ok: true }); }
      }
      await fetch('https://api.telegram.org/bot' + t + '/sendPoll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_thread_id: msg.message_thread_id || undefined, question: sp.question,
          options: sp.options.map(function (o) { return { text: o }; }), is_anonymous: true, allows_multiple_answers: false }),
      }).catch(function () {});
      await send(t, chatId, 'A Signal shows where the room stands and binds no one. For a count that binds, each key signs one line: https://www.dashsupport.team/paxt');
      return res.status(200).json({ ok: true });
    }

    if (/^\/(start|help)\b/i.test(text)) { await send(t, chatId, INTRO); return res.status(200).json({ ok: true }); }
    if (/^\/skills\b/i.test(text)) { await send(t, chatId, SKILLS_MSG); return res.status(200).json({ ok: true }); }

    if (/^\/human[-_ ]?support\b/i.test(text)) {
      const who = msg.from ? ('@' + (msg.from.username || msg.from.first_name || 'someone')) : 'someone';
      const where = msg.chat.title ? ('group "' + msg.chat.title + '"') : 'a direct chat';
      const detail = text.replace(/^\/human[-_ ]?support\b/i, '').trim();
      const reply = await humanSupport(who + ' in ' + where + (detail ? (': ' + detail) : ''), 'telegram', String((msg.from && msg.from.id) || chatId));
      await send(t, chatId, reply, msg.message_id);
      return res.status(200).json({ ok: true });
    }

    /* group etiquette: only answer when addressed */
    let q = text;
    const mentioned = uname && text.toLowerCase().includes('@' + uname);
    const isAsk = /^\/ask\b/i.test(text);
    const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.is_bot;
    if (isGroup && !mentioned && !isAsk && !isReplyToBot) return res.status(200).json({ ok: true });
    if (isAsk) q = text.replace(/^\/ask(@\w+)?\s*/i, '');
    if (mentioned) q = q.replace(new RegExp('@' + uname, 'ig'), '').trim();
    if (!q) { await send(t, chatId, 'Ask me anything about Dash — or /human-support to reach the team.', msg.message_id); return res.status(200).json({ ok: true }); }

    const context = [];
    if (isReplyToBot && msg.reply_to_message.text) context.push({ role: 'assistant', content: String(msg.reply_to_message.text).slice(0, 3000) });
    context.push({ role: 'user', content: q.slice(0, 6000) });

    if (!uname) return res.status(200).json({ ok: true });   /* not a real bot: nothing is spent on it */
    if (tgLimited('c' + chatId, CHAT_PER_HOUR) || tgLimited('b' + String(t).split(':')[0], BOT_PER_HOUR)) {
      /* said once an hour in a chat, then quiet */
      if (!tgLimited('n' + chatId, 1)) await send(t, chatId, 'That is a lot of questions for one hour. I will answer again shortly. A person is at ' + HUMAN_LINK, msg.message_id);
      return res.status(200).json({ ok: true });
    }
    await typing(t, chatId);
    const out = await askDasha(context, { surface: 'telegram', maxTokens: 2400 });
    await send(t, chatId, out.error ? out.error : out.reply, msg.message_id);
  } catch (e) { /* never bounce Telegram */ }
  return res.status(200).json({ ok: true });
};
