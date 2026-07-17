/* POST /api/telegram?t=<bot_token> — Dasha as a Telegram bot.
   Anyone can mint their own Dasha: create a bot with @BotFather, then point its webhook here
   with their token in the URL. We never store the token — it lives in THEIR webhook URL and
   is used only to reply to the update Telegram just sent us. */
const { askDasha, humanSupport, HUMAN_LINK } = require('./_brain.js');

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

const INTRO = 'Hi, I am Dasha — the Dash support AI, built by the community-led Dash Support Team.\n\nI can search the official Dash docs live, read current DashCentral proposals with real vote counts, check network stats, and look up any transaction or address. Ask me about wallets, masternodes, Platform data contracts, developer code, or governance.\n\nIn groups: mention me, reply to me, or use /ask.\n\nCommands:\n/ask <question> — ask me directly\n/skills — what I can do\n/human-support — reach a real person\n\nMore: https://dashsupport.team/dasha-ai';

const SKILLS_MSG = 'What I can reach, live:\n\n🔎 The official Dash docs (docs.dash.org) — I search them and cite real pages\n🏛 DashCentral governance — every active proposal, votes, passing status, superblock timing\n📊 Network stats — height, difficulty, 24h volume, mempool\n🔗 Any transaction — confirmations + InstantSend/ChainLock status\n💼 Any address — balance and history (public chain data)\n\nWhat I do:\nBuilder help (Platform data contracts, JSON schemas, EvoSDK code, DAPI debugging) · masternode + evonode guidance · governance and proposal analysis · scam checks · wallet safety · merchant integration · learning paths.\n\nWhat I never do:\nAsk for your seed phrase or keys. Give price or investment advice.\n\nStuck? /human-support reaches a real person.';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, hint: 'Telegram webhook endpoint. See https://dashsupport.team/dasha-ai' });
  /* Always 200 fast so Telegram doesn't retry-storm; do the work before responding (Vercel functions
     can't reliably continue after res.end). */
  const t = (req.query && req.query.t) || process.env.TELEGRAM_BOT_TOKEN;
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const msg = body && (body.message || body.channel_post);
  try {
    if (!t || !msg || !msg.chat || !msg.text) return res.status(200).json({ ok: true });
    if (isDupe(body.update_id)) return res.status(200).json({ ok: true, dupe: true });
    const chatId = msg.chat.id, text = msg.text.trim(), isGroup = msg.chat.type !== 'private';
    const uname = await botUsername(t);

    if (/^\/(start|help)\b/i.test(text)) { await send(t, chatId, INTRO); return res.status(200).json({ ok: true }); }
    if (/^\/skills\b/i.test(text)) { await send(t, chatId, SKILLS_MSG); return res.status(200).json({ ok: true }); }

    if (/^\/human[-_ ]?support\b/i.test(text)) {
      const who = msg.from ? ('@' + (msg.from.username || msg.from.first_name || 'someone')) : 'someone';
      const where = msg.chat.title ? ('group "' + msg.chat.title + '"') : 'a direct chat';
      const detail = text.replace(/^\/human[-_ ]?support\b/i, '').trim();
      const reply = await humanSupport(who + ' in ' + where + (detail ? (': ' + detail) : ''), 'telegram');
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

    await typing(t, chatId);
    const out = await askDasha(context, { surface: 'telegram', maxTokens: 2400 });
    await send(t, chatId, out.error ? out.error : out.reply, msg.message_id);
  } catch (e) { /* never bounce Telegram */ }
  return res.status(200).json({ ok: true });
};
