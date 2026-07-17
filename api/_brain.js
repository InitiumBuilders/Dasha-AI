/* Dasha's brain — the tool loop. Used by /api/chat (web + token API) and /api/telegram.
   She reaches: official docs search, live governance, network stats, tx/address lookups. */
const mindLib = require('./_mind.js');
const { getMind, loadParts, BAKED_VERSION } = mindLib;
const { selectContext, renderContext } = require('./_context.js');
const { DEFS, runTool, bindMind } = require('./_tools.js');
bindMind(mindLib);   // lets load_skill reach the library without a circular import

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.DASHA_MODEL || 'deepseek/deepseek-v3.2';               // everyday mind
const DEEP_MODEL = process.env.DASHA_DEEP_MODEL || 'openai/gpt-5.1-codex';       // engineering mind
const COUNSEL_MODEL = process.env.DASHA_COUNSEL_MODEL || 'anthropic/claude-sonnet-5'; // judgement mind
const HUMAN_LINK = 'https://t.me/TheDashSupportTEAM';

/* Optional deployment-local routing. A deployment may drop in api/_local.js exporting
   { override(lowerText, surface) -> {model, depth, maxTokens?, banner?, sticky?} | null }
   to add its own routing ahead of the tiers below — a fork might send its own team's
   questions somewhere specific, or pin a model for one class of work. Absent the file,
   this is inert and the router has exactly the three tiers documented in the README. */
let local = null;
try { local = require('./_local.js'); } catch (e) { /* none configured */ }

/* ---------------- THE ROUTER ----------------
   Most questions are "what is a masternode" — cheap, fast, done. Engineering work (code,
   stack traces, schemas) wants a coding mind. Judgement work (reviewing a proposal, asking
   for insight, leverage, systems thinking) wants a mind that reasons about people and
   consequences, not syntax. Classification is local: zero added latency, zero added cost,
   and it never spends a model call deciding which model to call. */
const DEEP_SKILLS = /\/(dash-plan|data-contract|state-transition|dash-debug|grove-query|schema-migrate|risk-audit|sub-dao|dash-ai|scale|zero-server|identity-keys|shielded|doc-dive|dash-token|compare-chain|agent-architect)\b/i;
const COUNSEL_SKILLS = /\/(proposal-guide|envision|motus|learn-dash)\b/i;
const DEEP_WORDS = /\b(architect|architecture|design (a|my|the)|refactor|migrat(e|ing|ion)|optimi[sz]e|debug|troubleshoot|diagnos|trade-?offs?|walk me through|why (is|does|would|won'?t|isn'?t)|best (approach|way|practice)|how should i (build|design|structure|model)|scal(e|ing) (up|issue|problem)|schema|data contract|state transition|structure (my|the)|build (me )?a|write (me )?(a|the)|implement)\b/i;
const ERROR_WORDS = /\b(error|exception|traceback|stack ?trace|failed|failing|fails|broken|bug|crash|doesn'?t work|not working|invalid|rejected|refus(ed|ing)|timeout|tim(ing|es) out|timed out|hang(s|ing)?|stuck|won'?t (connect|register|broadcast|build|run)|502|400|403)\b/i;
/* judgement, not syntax */
const COUNSEL_STRONG = /\b(leverage|systems thinking|systemic|second.?order|first principles|brainstorm|innovat|ideate|strateg(y|ic|ise|ize)|tokenomics|roadmap|prioriti[sz]e|project manage|governance design|incentive)\b/i;
const COUNSEL_ANALYSIS = /\b(review|assess|evaluat|critique|feedback on|what do you think|your (read|take|opinion|view)|insight|guidance|advice|advise|tips?|strengthen|improve (my|this|the)|worth (supporting|funding|it)|should (it|this|i|we) (pass|support|fund|vote|back)|pros and cons|analy[sz]e|make (it|this) stronger)\b/i;
const PROPOSAL_WORK = /\bproposals?\b/i;
const SHALLOW = /^\s*(hi|hey|hello|yo|gm|thanks|thank you|ty|ok|okay|cool|nice|lol|\/(start|help|skills|human[-_ ]?support|price))\b/i;

/* A short follow-up inside a deep thread is still deep work: "why?" after a stack trace
   deserves the same mind that read the stack trace. Without this, turn 2 of every debugging
   session silently drops to the fast model and the answer quality falls off a cliff. */
const FOLLOWUP = /^\s*(why|how|and|but|so|what about|then|ok|okay|yes|no|hmm|wait|really|explain|more|continue|go on|show me|which|can you|could you|thanks)\b/i;

function pickModel(messages, opts) {
  const last = String(messages[messages.length - 1].content || '');
  const t = last.trim();
  const lower = t.toLowerCase();
  const surface = (opts && opts.surface) || 'web';

  /* deployment-local routing wins, when a deployment configured any. Applies to THIS
     message only — every request classifies the current message independently. */
  if (local && local.override) {
    const o = local.override(lower, surface);
    if (o && o.model) return o;
  }

  if (opts && opts.forceLight) return { model: MODEL, depth: null };
  if (SHALLOW.test(t) && t.length < 24) return { model: MODEL, depth: null };  // never burn depth on "gm"
  if (/^\/deep\b/i.test(t)) return { model: DEEP_MODEL, depth: 'requested' };
  if (/\b(think deeply|go deep|deep think|take your time|be thorough|in depth)\b/i.test(t)) return { model: DEEP_MODEL, depth: 'requested' };

  /* engineering first: a pasted stack trace is a code question even if it says "advice" */
  if (/```|^\s{4}[\w{[]/m.test(t)) return { model: DEEP_MODEL, depth: 'code' };
  /* 30, not 60: "my evonode is stuck and dashmate wont start" is 42 chars and is exactly
     the person who most needs the good model. Someone in trouble writes short. */
  if (ERROR_WORDS.test(t) && t.length > 30) return { model: DEEP_MODEL, depth: 'debugging' };

  /* judgement work */
  if (COUNSEL_SKILLS.test(t)) return { model: COUNSEL_MODEL, depth: 'counsel' };
  if (COUNSEL_STRONG.test(t)) return { model: COUNSEL_MODEL, depth: 'counsel' };
  if (COUNSEL_ANALYSIS.test(t) && t.length > 40) return { model: COUNSEL_MODEL, depth: 'counsel' };
  /* a proposal question that asks for a read, not just the tally */
  if (PROPOSAL_WORK.test(t) && (COUNSEL_ANALYSIS.test(t) || /\b(draft|write|help|guide|submit|fund)\b/i.test(t))) {
    return { model: COUNSEL_MODEL, depth: 'counsel' };
  }

  if (DEEP_SKILLS.test(t)) return { model: DEEP_MODEL, depth: 'builder-skill' };
  /* 60, not 80: "Why does my DAPI connection keep timing out when I broadcast?" is 79 chars
     and is unmistakably engineering work. A one-character threshold miss is a wrong answer. */
  if (DEEP_WORDS.test(t) && t.length > 60) return { model: DEEP_MODEL, depth: 'deep-work' };
  if (t.length > 420) return { model: DEEP_MODEL, depth: 'complex' };                   // long ask = real ask
  if ((t.match(/\?/g) || []).length >= 3) return { model: DEEP_MODEL, depth: 'multi-part' };

  /* sticky depth: a brief follow-up inherits the mind the conversation was already using */
  if (t.length < 120 && FOLLOWUP.test(t) && messages.length > 1) {
    const prevUser = messages.slice(0, -1).reverse().find(function (m) { return m.role === 'user'; });
    if (prevUser) {
      const prior = pickModel([prevUser], { surface: surface, noStick: true });
      /* sticky:false routes are per-message by definition and are never inherited */
      if (prior.depth && prior.sticky !== false) {
        return { model: prior.model, depth: prior.depth + ' (continued)', maxTokens: prior.maxTokens };
      }
    }
  }
  return { model: MODEL, depth: null };
}

/* ---- one model call ----
   Her mind is ~29K tokens and is resent on every request and every tool round, so PROMPT
   CACHING is the whole ballgame. Anthropic needs an explicit cache breakpoint (1h TTL so a
   quiet hour doesn't force a re-write); Gemini/OpenAI cache implicitly; Moonshot never
   cached at all — measured 0 cached tokens on every call, which is why it was replaced. */
/* Caching is per-model: Anthropic needs an explicit breakpoint, DeepSeek/OpenAI/Gemini
   cache implicitly. Moonshot cached nothing at all — measured — which is why it's gone. */
/* Anthropic needs explicit breakpoints. Mark the SPINE (identical every request → always a
   hit) and, if present, the loaded-context block (one of a small set of combinations → the
   common paths warm up). Others cache the prefix implicitly and need no marking. */
function cacheable(model, messages) {
  if (!model.startsWith('anthropic/')) return messages;
  let marked = 0;
  return messages.map(function (m, i) {
    if (m.role !== 'system' || typeof m.content !== 'string' || marked >= 2) return m;
    marked++;
    /* 5-minute breakpoint, not 1h. Measured: a 1h write costs 2x base (~$0.21 on the
       judgement tier — over budget for a single cold question), while the 5m write costs
       1.25x (~$0.10) and reads are identical at ~$0.009. The 5m window slides on every
       hit, so an active session stays warm anyway; only a >5min gap re-pays, and at the
       cheaper rate. Cheaper cold, same warm. */
    return { role: 'system', content: [{ type: 'text', text: m.content, cache_control: { type: 'ephemeral' } }] };
  });
}

async function call(key, model, messages, maxTok, useTools) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 115000);
  try {
    const body = {
      model: model,
      max_tokens: maxTok,
      temperature: 0.4,
      usage: { include: true },
      messages: cacheable(model, messages),
    };
    if (/kimi|deepseek-r/.test(model)) body.reasoning = { effort: 'low' };
    /* Pin DeepSeek to DeepSeek's own endpoint: their automatic context cache only exists
       there. Unpinned, OpenRouter may route to a reseller that caches nothing and the
       ~30K prompt is billed in full on every call. Measured: pinned = 27,648 cached. */
    if (model.startsWith('deepseek/')) body.provider = { order: ['DeepSeek'], allow_fallbacks: true };
    if (useTools) { body.tools = DEFS; body.tool_choice = 'auto'; }
    const r = await fetch(OR_URL, {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.dashsupport.team',
        'X-Title': 'Dasha AI - Dash Support Team',
      },
      body: JSON.stringify(body),
    });
    return await r.json();
  } finally { clearTimeout(t); }
}

/* A route may carry a header to prepend to its replies (see the local-routing hook above).
   No route asks for one by default, so this is empty unless a deployment configures it. */
function banner(route) {
  return (route && route.banner) ? (route.banner + '\n\n') : '';
}

/* ---- the ask: reason → reach → answer ---- */
async function askDasha(messages, opts) {
  opts = opts || {};
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { error: 'Dasha is not configured yet (missing model key). A human is at ' + HUMAN_LINK };

  const mind = await getMind(); // live from GitHub, baked fallback

  /* [SPINE] — identical on every request, so it is always a cache hit. */
  const sys = [{ role: 'system', content: mind.spine }];

  /* [LOADED CONTEXT] — only the workflow and reference this question actually touches.
     Selected locally: no extra model call, no embeddings, no latency. Sits AFTER the spine
     so the cached prefix is never disturbed; identical selections share a prefix too, so
     the common paths warm up on their own. */
  let loaded = { skills: [], knowledge: [], reason: 'baked' };
  if (mind.index) {
    const pick = selectContext(messages, mind.index, opts);
    const [skills, knowledge] = await Promise.all([loadParts(pick.skills), loadParts(pick.knowledge)]);
    const block = renderContext({ skills, knowledge });
    if (block) sys.push({ role: 'system', content: block });
    loaded = { skills: skills.map((s) => s.name), knowledge: knowledge.map((k) => k.name), reason: pick.reason };
  }
  if (opts.surface === 'telegram') {
    sys.push({ role: 'system', content: 'SURFACE: Telegram. Keep replies under ~200 words, plain text + code blocks only (no markdown tables or headers), never @-mention users. Tool data still gets cited by URL.' });
  }
  if (opts.surface === 'x') {
    sys.push({ role: 'system', content: 'SURFACE: X reply, PUBLIC and permanent. The runtime threads your answer automatically and NEVER truncates it, so write what the answer actually needs: 700-1000 characters when the question deserves substance, 1500+ when it is genuinely essential (safety, a real fix, someone about to lose money), short when the question is small or bait. Lead with the direct answer on line one, blank line, then short supporting paragraphs — the threader breaks on paragraph and sentence boundaries, so write in complete sentences and real paragraphs and it will split cleanly. Plain text ONLY — X renders markdown as literal characters, so no **bold**, no #headers, no code fences, no tables. Separate ideas with " — " or " · "; number steps 1) 2) 3). NO LINKS (they cost the team 13x) — name things instead of linking them. Never @-mention anyone except the person you are replying to. One light touch of personality maximum.' });
  }
  const convo = sys.concat(messages);

  /* route: everyday questions to the fast mind, real builder work to the deep one */
  const route = pickModel(messages, opts);
  const model = route.model;

  /* Headroom matters more than it looks: measured, sonnet-5 at 3000 tokens couldn't finish
     AND never engaged its cache — $0.196/answer. The same model at 6000 cached 42,418
     tokens and cost $0.032. Starving a big model is the expensive mistake. */
  const base = route.maxTokens ? route.maxTokens
    : (route.depth === 'counsel')
    ? 6000
    : route.depth
      ? Math.max(opts.maxTokens || 3000, 3000)
      : Math.max(opts.maxTokens || 2600, 2200);
  const maxRounds = opts.surface === 'telegram' ? 2 : 3;
  const toolsUsed = [];
  let cost = 0, pTok = 0, cTok = 0;

  for (let round = 0; round <= maxRounds; round++) {
    const lastRound = round === maxRounds;
    let d;
    try {
      d = await call(key, model, convo, base, !lastRound); // final round: force a written answer
    } catch (e) {
      if (toolsUsed.length) break; // fall through to the salvage attempt below
      return { error: 'Dasha timed out thinking. Try again, or reach a human at ' + HUMAN_LINK };
    }
    if (d && d.error) return { error: 'Model error: ' + (d.error.message || 'unknown') + '. A human is at ' + HUMAN_LINK };
    if (d && d.usage) { cost += d.usage.cost || 0; pTok += d.usage.prompt_tokens || 0; cTok += d.usage.completion_tokens || 0; }

    const msg = d && d.choices && d.choices[0] && d.choices[0].message;
    if (!msg) break;

    const calls = msg.tool_calls;
    if (calls && calls.length && !lastRound) {
      convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
      /* run every requested tool in parallel */
      const results = await Promise.all(calls.slice(0, 4).map(function (tc) {
        const name = tc.function && tc.function.name;
        toolsUsed.push(name);
        return runTool(name, tc.function && tc.function.arguments).then(function (out) {
          return { role: 'tool', tool_call_id: tc.id, name: name, content: out };
        });
      }));
      results.forEach(function (r) { convo.push(r); });
      continue;
    }

    if (msg.content) {
      return { reply: banner(route) + msg.content, tools: toolsUsed, model: model, depth: route.depth,
        usage: { p: pTok, c: cTok, cost: Math.round(cost * 1e6) / 1e6 } };
    }
    /* empty content (thinking ate the budget) — salvage with a bigger ceiling, no tools.
       A deep model that burns its budget reasoning falls back to the fast mind rather
       than handing the user nothing (measured: sonnet-5 did exactly this). */
    try {
      const d2 = await call(key, model, convo, Math.min(base * 2 + 1500, 8000), false);
      const m2 = d2 && d2.choices && d2.choices[0] && d2.choices[0].message;
      if (d2 && d2.usage) { cost += d2.usage.cost || 0; pTok += d2.usage.prompt_tokens || 0; cTok += d2.usage.completion_tokens || 0; }
      if (m2 && m2.content) return { reply: banner(route) + m2.content, tools: toolsUsed, model: model, depth: route.depth,
        usage: { p: pTok, c: cTok, cost: Math.round(cost * 1e6) / 1e6 } };
    } catch (e) { /* fall through */ }
    if (model !== MODEL) {
      try {
        const d3 = await call(key, MODEL, convo, 2600, false);
        const m3 = d3 && d3.choices && d3.choices[0] && d3.choices[0].message;
        if (d3 && d3.usage) { cost += d3.usage.cost || 0; }
        if (m3 && m3.content) return { reply: m3.content, tools: toolsUsed, model: MODEL, depth: route.depth ? route.depth + ' (fell back)' : null,
          usage: { p: pTok, c: cTok, cost: Math.round(cost * 1e6) / 1e6 } };
      } catch (e) { /* fall through */ }
    }
    break;
  }
  return { error: 'Dasha came back empty — try rephrasing, or reach a human at ' + HUMAN_LINK };
}

/* ---- /human-support: canned reply + ticket stream to the team channel ---- */
async function humanSupport(detail, surface) {
  const reply = 'A real person from the Dash Support Team is one message away.\n\nJoin the group and ask there: ' + HUMAN_LINK + '\n\nIf you can, include: what you are building, what you tried, and any exact error text — it gets you a faster answer.';
  try {
    const bt = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.SUPPORT_CHAT_ID;
    if (bt && chat) {
      const txt = '🛎 Human support requested (' + (surface || 'web') + ')\n' + (detail ? ('“' + String(detail).slice(0, 800) + '”') : '(no detail given)');
      await fetch('https://api.telegram.org/bot' + bt + '/sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: txt }),
      });
    }
  } catch (e) { /* best-effort */ }
  return reply;
}

/* ---- feedback → the team channel (so bad answers become fixes) ---- */
async function reportFeedback(payload) {
  const bt = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.SUPPORT_CHAT_ID;
  if (!bt || !chat) return false;
  try {
    const txt = (payload.good ? '👍 Helpful answer' : '👎 Bad answer flagged') + ' (' + (payload.surface || 'web') + ')\n\nQ: '
      + String(payload.q || '').slice(0, 500) + '\n\nA: ' + String(payload.a || '').slice(0, 900)
      + (payload.note ? ('\n\nUser note: ' + String(payload.note).slice(0, 400)) : '')
      + (payload.tools ? ('\n\nTools used: ' + payload.tools) : '');
    const r = await fetch('https://api.telegram.org/bot' + bt + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: txt, disable_web_page_preview: true }),
    });
    return r.ok;
  } catch (e) { return false; }
}

/* ---- input validation ---- */
function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const m of raw.slice(-16)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const c = String(m.content || '').slice(0, 8000);
    if (!c.trim()) continue;
    out.push({ role: m.role, content: c });
  }
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

/* which mind is live right now (for the health endpoint — proves github streaming) */
async function mindStatus() {
  const m = await getMind();
  return {
    version: m.version,
    origin: m.origin,
    spineChars: m.spine ? m.spine.length : 0,
    library: m.index ? { skills: m.index.skills.length, knowledge: m.index.knowledge.length } : null,
    loading: m.index ? 'spine always + only the skill/reference the question touches' : 'baked monolith (github unreachable)',
    baked: BAKED_VERSION,
  };
}

module.exports = { askDasha, humanSupport, reportFeedback, cleanMessages, mindStatus, pickModel,
  HUMAN_LINK, MODEL, DEEP_MODEL, COUNSEL_MODEL, VERSION: BAKED_VERSION };
