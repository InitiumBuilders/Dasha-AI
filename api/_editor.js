/* THE EDITORIAL ENGINE — Dasha decides what is worth saying, and when.

   Most bots post on a timer. That is why people mute them. This is an editor:
   every cycle it GATHERS every candidate the world has offered, SCORES each one
   on urgency × novelty × value, spends a strict daily budget on the best, and
   otherwise says nothing. Silence is a valid — often the correct — output.

   THE LAWS
     1. Never post what is not new information or actionable timing.
     2. A hard daily budget. Attention is borrowed, never owned.
     3. Never the same class twice in a row — variety is respect.
     4. Time-critical always outranks interesting.
     5. Cooldowns per class, so nothing becomes wallpaper.
     6. She reports; she never campaigns.

   CLASSES (priority · cooldown)
     cutoff        100 · once per window   — the vote closes soon, these are still short
     superblock     90 · per cycle         — the treasury paid; here is what consensus funded
     flip           80 · per proposal      — something crossed (or fell below) the line
     newProposal    70 · per proposal      — a new ask is on the ballot
     ballot         60 · 20h               — the daily brief
     accountability 55 · 6d                — what was funded, what it claimed  ← nobody else does this
     needs          50 · 6d                — what builders actually asked me     ← data only she has
     teaching       40 · 2d                — the explainer a spiking topic earned
*/

const { runWatch, ballot, snapshot, govData } = require('./_watch.js');
const metrics = require('./_metrics.js');
const { askDasha } = require('./_brain.js');

const REPO = 'InitiumBuilders/Dasha-AI';
const EDITOR_STATE = 'WATCH/editor.json';
const FUNDED_LEDGER = 'WATCH/funded.json';
const DAILY_BUDGET = 5;      /* researched ceiling for a utility account; most days spend less */

const CLASS = {
  cutoff:         { p: 100, cool: 0 },
  superblock:     { p: 90,  cool: 0 },
  flip:           { p: 80,  cool: 0 },
  new:            { p: 70,  cool: 0 },
  ballot:         { p: 60,  cool: 20 * 36e5 },
  accountability: { p: 55,  cool: 6 * 864e5 },
  needs:          { p: 50,  cool: 6 * 864e5 },
  teaching:       { p: 40,  cool: 2 * 864e5 },
  foundry:        { p: 35,  cool: 22 * 36e5 },   /* a dapp concept she minted herself */
  nextmove:       { p: 57,  cool: 2 * 864e5 },   /* the community's highest-leverage next move (live gov data, Davara lens) */
  buildertip:     { p: 52,  cool: 2 * 864e5 },   /* one high-leverage tip for Dash builders (leverage-ladder framed) */
  builderidea:    { p: 44,  cool: 3 * 864e5 },   /* a concrete project idea a builder could start this week */
  correction:     { p: 78,  cool: 0 },            /* per report; getting it wrong in public, fixed in public */
  evolve:         { p: 65,  cool: 0 },            /* per mind-version; she is open source */
  forecast:       { p: 58,  cool: 2 * 864e5 },    /* the medium-range pre-cutoff heads-up */
  treasury:       { p: 48,  cool: 0 },            /* per cycle; unspent budget = room for builders */
  network:        { p: 45,  cool: 6 * 864e5 },    /* the weekly chain heartbeat */
  translate:      { p: 30,  cool: 3 * 864e5 },    /* current events -> one honest Dash design contrast */
  release:        { p: 68,  cool: 0 },            /* per Dash/Platform release tag */
  weekly:         { p: 62,  cool: 6.5 * 864e5 },  /* the Sunday governance roundup */
  discussion:     { p: 46,  cool: 3 * 864e5 },    /* where the community is already debating */
  distinct:       { p: 33,  cool: 4 * 864e5 },    /* the reverse translation: Dash's approach, outward */
};

/* X Automation Rules: automated mentions are permitted ONLY for accounts that have
   consented. August operates this account, so @BuiltByAugust is consented by definition.
   No third party is ever auto-tagged until they ask us to in writing. */
const FOUNDER = '@BuiltByAugust';
/* PRE-LAUNCH STRATEGIST MODE — August, 2026-08-04: the foundry self-broadcast
   ('what should I model next') is PAUSED; the strategist classes above replace
   it. Flip to false to resume the foundry posts unchanged. */
const FOUNDRY_PAUSED = true;
/* Arbitrum AIP-1's lesson: the account announcing a vote must never quietly be its
   beneficiary. When our own proposal is on the ballot, she says so, every time. */
const OURS = /dash-?support|dasha-ai/i;
function disclosure(p) {
  return (p && OURS.test(String(p.name || '') + ' ' + String(p.title || '')))
    ? '\n\nDisclosure: this is our own team\'s proposal. I report it exactly as I report any other and take no position on it.'
    : '';
}
const dnum = (n) => (n == null ? '?' : Number(n).toLocaleString('en-US'));
function clipT(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n); const sp = c.lastIndexOf(' '); return (sp > n * 0.5 ? c.slice(0, sp) : c) + '\u2026'; }
function bline(p, n) {
  n = n || 42;
  let t = String(p.title || '').replace(/\s+/g, ' ').trim();
  if (t.length > n) { t = t.slice(0, n); const sp = t.lastIndexOf(' '); if (sp > n * 0.5) t = t.slice(0, sp); t += '\u2026'; }
  return '\u2022 ' + t + (p.passing ? ' \u2014 passing +' + dnum(p.net) : ' \u2014 ' + dnum(p.short) + ' short');
}

/* ---------- state in her own public repo ---------- */
async function ghGet(path) {
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-editor', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function ghPut(path, content, message, sha) {
  const body = { message, content: Buffer.from(content).toString('base64'),
    committer: { name: 'Dasha Editor', email: 'Help@DashSupport.Team' } };
  if (sha) body.sha = sha;
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-editor',
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body) });
    return r.ok;
  } catch (e) { return false; }
}
async function loadJson(path, fallback) {
  const f = await ghGet(path);
  if (!f) return { sha: null, data: fallback };
  try { return { sha: f.sha, data: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')) }; }
  catch (e) { return { sha: f.sha, data: fallback }; }
}

/* ---------- THE ACCOUNTABILITY LEDGER ----------
   Every cycle, record what the network actually funded and what each one claimed.
   Months later that record is the only honest answer to "did it deliver?" —
   and no one in the DAO is keeping it. She keeps it, in public, without judging. */
async function updateFundedLedger(snap) {
  if (!snap) return null;
  const { sha, data } = await loadJson(FUNDED_LEDGER, { cycles: {}, entries: {} });
  const cycle = String(snap.superblock || 'x');
  data.cycles = data.cycles || {}; data.entries = data.entries || {};
  if (!data.cycles[cycle]) {
    data.cycles[cycle] = { seenAt: new Date().toISOString(), funded: [] };
  }
  for (const p of snap.passing) {
    if (data.cycles[cycle].funded.indexOf(p.name) < 0) data.cycles[cycle].funded.push(p.name);
    const e = data.entries[p.name] || { name: p.name, title: p.title, owner: p.owner, ask: p.ask,
      firstSeen: new Date().toISOString(), cyclesFunded: [] };
    e.title = p.title; e.owner = p.owner; e.ask = p.ask;
    e.totalPays = p.totalPays; e.remaining = p.months;
    if (e.cyclesFunded.indexOf(cycle) < 0) e.cyclesFunded.push(cycle);
    data.entries[p.name] = e;
  }
  await ghPut(FUNDED_LEDGER, JSON.stringify(data, null, 2), 'ledger: cycle ' + cycle, sha);
  return data;
}

function accountabilityPost(ledger, snap) {
  if (!ledger || !ledger.entries) return null;
  /* the most interesting entry: funded across the most cycles, still running */
  const all = Object.keys(ledger.entries).map((k) => ledger.entries[k])
    .filter((e) => e.cyclesFunded && e.cyclesFunded.length >= 1);
  if (!all.length) return null;
  all.sort((a, b) => (b.cyclesFunded.length - a.cyclesFunded.length));
  const e = all[0];
  const paid = e.totalPays != null && e.remaining != null ? (e.totalPays - e.remaining) : null;
  let body = 'Accountability check.\n\n' + String(e.title || e.name).slice(0, 66);
  if (e.ask != null) body += '\n' + Number(e.ask).toLocaleString('en-US') + ' DASH/month' + (e.owner ? ' · ' + e.owner : '');
  if (paid != null && e.totalPays) body += '\n' + paid + ' of ' + e.totalPays + ' payments made so far.';
  body += '\n\nThe network funded this. I keep the record — I do not score anyone.\n'
    + 'https://www.dashcentral.org/p/' + e.name;
  return body;
}

/* ---------- THE NEEDS SIGNAL ----------
   She is the only thing in the ecosystem that sees, in aggregate, what builders
   are actually stuck on. That data belongs to the DAO. */
const TOPIC = {
  'data-contract': 'data contracts', 'grove-query': 'Platform queries', 'state-transition': 'state transitions',
  'schema-migrate': 'schema migration', 'dash-plan': 'planning a build', 'dash-debug': 'debugging',
  'merchant': 'accepting Dash', 'wallet-help': 'wallets', 'verify-payment': 'verifying payments',
  'dash-gov': 'governance', 'governance-digest': 'the ballot', 'proposal-guide': 'writing proposals',
  'mno': 'masternodes', 'evo-node': 'evonodes', 'scam-check': 'scam checks', 'identity-keys': 'identities & keys',
  'learn-dash': 'learning Dash', 'dev-onboard': 'getting started', 'dash-token': 'tokens',
  '(none)': 'general help', 'general help': 'general help',
};
async function needsPost() {
  const snap = await metrics.snapshot(7);
  const t = (snap.total && snap.total.all) || {};
  const answers = t.answers || 0;
  if (answers < 12) return null;                    /* not enough signal to be honest about */
  const topics = Object.keys(t).filter((k) => k.indexOf('skill:') === 0)
    .map((k) => [k.slice(6), t[k]]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!topics.length) return null;
  const total = topics.reduce((s, x) => s + x[1], 0) || 1;
  let body = 'What Dash builders asked me this week:\n\n'
    + topics.map((x) => '• ' + (TOPIC[x[0]] || x[0].replace(/^\//, '')) + ' — ' + Math.round(x[1] / total * 100) + '%').join('\n')
    + '\n\n' + answers + ' questions answered. Aggregate only — no question, answer, or person is ever stored.\n'
    + 'dashsupport.team/pulse\nWhat should I track next? → ' + FOUNDER;
  return body;
}

/* ---------- THE ADAPTIVE EXPLAINER ----------
   When one topic spikes, the ecosystem is telling us where the confusion is.
   She answers it once, publicly, for everyone who did not ask. */
/* ---------- THE DAVARA LENS ----------
   The systems canon, distilled — rides inside every strategist prompt so Dasha
   thinks like the Davara stack thinks (Meadows' ladder, stocks over events, the
   move over the description). Phase 2: a live DMAT bridge to the Davara agent
   for full-depth research turns; this distillation is the always-on floor. */
const DAVARA_LENS =
  'Think with the systems lens before you write: (1) THE LEVERAGE LADDER, weakest to strongest — parameters ' +
  '< buffers < delays < feedback loops < INFORMATION FLOWS (the signal put in front of who can act — usually ' +
  'the best reachable rung) < rules < goals < paradigm. Never propose a parameter tweak when an information-flow ' +
  'or rule move is reachable for the same effort. (2) STOCKS OVER EVENTS: name what ACCUMULATES (trust, treasury, ' +
  'shipped code, contributor capacity), not what spiked today. (3) Every output ends on a MOVE — verb-first, ' +
  'doable this week, smallest version that tests the idea. Never a vague rallying cry.';

async function nextmovePost(snap) {
  if (!snap) return null;
  const facts = 'Live Dash governance right now: ' + (snap.props || []).slice(0, 6).map(function (p) {
    return (p.title || p.name || '?') + (p.passing ? ' (passing +' + p.net + ')' : ' (' + p.short + ' short)');
  }).join(' · ') + (snap.hoursToCutoff != null ? ' · voting cutoff in ~' + Math.round(snap.hoursToCutoff) + 'h' : '');
  try {
    const out = await askDasha([{ role: 'user', content:
      DAVARA_LENS + '\n\n' + facts + '\n\nFrom this REAL data, write ONE X post (max 240 chars, no hashtags, no emoji): '
      + 'the single highest-leverage move the Dash community could make this week. Name the rung you are pulling '
      + 'in plain words (no jargon), then the move itself, verb-first. Specific to the data above — never generic. No hype.' }],
      { surface: 'api', internal: true, maxTokens: 400 });
    let t = String((out && out.reply) || '').trim();
    if (!t || t.length < 40) return null;
    if (t.length > 250) t = t.slice(0, 247) + '…';
    return t + '\n\nAsk me anything: dashsupport.team/dasha';
  } catch (e) { return null; }
}

async function buildertipPost() {
  try {
    const out = await askDasha([{ role: 'user', content:
      DAVARA_LENS + '\n\nWrite ONE X post (max 240 chars, no hashtags, no emoji): a HIGH-LEVERAGE tip for builders '
      + 'building on Dash — not a syntax trick, a LEVERAGE tip: where in their project the same effort moves the most '
      + '(an information flow to expose, a rule to set early, a stock to start accumulating from day one, a feedback '
      + 'loop to close). Concrete and technically exact for Dash (Platform, evolution, DAPI, identities, contested names, '
      + 'credits) or the DAO (proposals, superblocks, treasury). Plain, specific. End on the actionable fact.' }],
      { surface: 'api', internal: true, maxTokens: 400 });
    let t = String((out && out.reply) || '').trim();
    if (!t || t.length < 40) return null;
    if (t.length > 250) t = t.slice(0, 247) + '…';
    return t + '\n\nAsk me anything: dashsupport.team/dasha';
  } catch (e) { return null; }
}

async function builderideaPost(snap) {
  const gap = snap && snap.props && snap.props.length
    ? 'Context from live governance (what the network is funding/debating): ' + snap.props.slice(0, 4).map(function (p) { return p.title || p.name; }).join(' · ')
    : '';
  try {
    const out = await askDasha([{ role: 'user', content:
      DAVARA_LENS + '\n\n' + gap + '\n\nWrite ONE X post (max 250 chars, no hashtags, no emoji) proposing a CONCRETE '
      + 'project a builder could START THIS WEEK on Dash: the unmet need in one clause, the smallest buildable version '
      + 'in one clause, and why Dash specifically (Platform/identities/treasury) makes it possible. Real and scoped — '
      + 'a weekend-to-a-month build, not a moonshot. Anyone reading it should be able to begin.' }],
      { surface: 'api', internal: true, maxTokens: 400 });
    let t = String((out && out.reply) || '').trim();
    if (!t || t.length < 40) return null;
    if (t.length > 260) t = t.slice(0, 257) + '…';
    return t + '\n\nBuild it — I’ll help: dashsupport.team/dasha';
  } catch (e) { return null; }
}

async function teachingPost() {
  const snap = await metrics.snapshot(3);
  const t = (snap.total && snap.total.all) || {};
  if ((t.answers || 0) < 8) return null;
  const topics = Object.keys(t).filter((k) => k.indexOf('skill:') === 0 && k !== 'skill:(none)')
    .map((k) => [k.slice(6), t[k]]).sort((a, b) => b[1] - a[1]);
  if (!topics.length || topics[0][1] < 3) return null;
  const topic = TOPIC[topics[0][0]] || topics[0][0];
  try {
    const out = await askDasha([{ role: 'user', content:
      'Builders keep asking you about ' + topic + ' this week. Write ONE X post (max 240 characters, no hashtags, no emoji) '
      + 'that teaches the single most useful concrete thing about ' + topic + ' on Dash — the thing that unblocks someone fastest. '
      + 'Plain, specific, technically exact. No hype, no "did you know", no call to action. End with nothing but the fact.' }],
      { surface: 'api', internal: true, maxTokens: 400 });
    let s = String((out && out.reply) || '').trim();
    if (!s || s.length < 40) return null;
    if (s.length > 250) s = s.slice(0, 247) + '…';
    return s + '\n\nAsk me anything: dashsupport.team/dasha';
  } catch (e) { return null; }
}

/* ---------- THE DAPP CONCEPT ----------
   She already models Dash dapps every day for the design gallery. Publishing one is
   substance she authored, not filler — and it is the natural place to invite ideas. */
async function foundryPost() {
  try {
    const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/FOUNDRY/latest.json?t=' + Math.floor(Date.now() / 36e5));
    if (!r.ok) return null;
    const d = await r.json();
    const mints = (d && d.mints) || [];
    if (!mints.length) return null;
    /* rotate by day so the same concept is not repeated */
    const idx = Math.floor(Date.now() / 864e5) % mints.length;
    const m = mints[idx];
    if (!m || !m.n) return null;
    let body = 'A Dash dapp concept I modeled today:\n\n' + m.n + ' — ' + m.t
      + '\n\nTeaches: ' + m.block;
    if (m.note) body += '\nHow I would wire it: ' + m.note;
    body += '\n\nPlayable, in five design systems: dashsupport.team/design'
      + '\nIdeas for what I should model next → ' + FOUNDER;
    return body;
  } catch (err) { return null; }
}

/* ---------- THE CORRECTION ----------
   When her learning loop closes a bad-answer report, she says so — publicly, topic-free
   (never the user's words). Getting it wrong in the open and fixing it in the open is the
   entire trust proposition of an AI whose mind is a public repository. */
async function correctionPost(st) {
  try {
    const r = await fetch('https://api.github.com/repos/' + REPO + '/issues?labels=bad-answer&state=closed&sort=updated&direction=desc&per_page=6',
      { headers: { 'User-Agent': 'dasha-editor' } });
    if (!r.ok) return null;
    const iss = await r.json();
    for (const it of (iss || [])) {
      if (it.pull_request) continue;
      const key = 'correction:' + it.number;
      if (st.last[key]) continue;
      /* never announce a test issue, and only while it is still fresh news */
      if (/\btest\b/i.test(String(it.title || '') + ' ' + String(it.body || ''))) continue;
      if (String(it.body || '').trim().length < 40) continue;
      if (it.closed_at && (Date.now() - Date.parse(it.closed_at)) > 12 * 864e5) continue;
      const body = 'A correction.\n\nSomeone flagged an answer I got wrong. It is fixed now \u2014 the report is closed and my mind is updated.\n\n'
        + 'Getting it wrong in public, and fixing it in public, is the whole point of an open mind.\n' + it.html_url;
      return { text: body, key };
    }
    return null;
  } catch (e) { return null; }
}

/* ---------- THE MIND UPDATE ----------
   She is the only open-source AI whose entire mind streams from a public repo. When her
   version changes, that is genuinely newsworthy for her — once per version, ever. */
async function evolvePost(st) {
  try {
    const r = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/PROMPT/VERSION?t=' + Math.floor(Date.now() / 36e5));
    if (!r.ok) return null;
    const v = String(await r.text()).trim().split('\n')[0].trim();
    if (!v) return null;
    const key = 'evolve:' + v;
    if (st.last[key]) return null;
    let name = '';
    try {
      const m = await fetch('https://raw.githubusercontent.com/' + REPO + '/main/PROMPT/MANIFEST.md?t=' + Math.floor(Date.now() / 36e5));
      if (m.ok) { const mt = await m.text(); const h = (mt.match(/MANIFEST[^\n"]*"([^"]+)"/) || [])[1]; if (h) name = h.trim(); }
    } catch (e2) {}
    const body = 'My mind is now ' + v + (name ? ' \u2014 ' + name : '') + '.\n\n'
      + 'I am open source: every skill, every rule, every change is public. Read exactly how I think \u2014 or fork me:\n'
      + 'github.com/InitiumBuilders/Dasha-AI';
    return { text: body, key };
  } catch (e) { return null; }
}

/* ---------- THE FORECAST ----------
   The medium-range heads-up: 3-8 days out, where the ballot stands if nothing moves. */
function forecastPost(snap) {
  if (!snap || snap.hoursToCutoff == null) return null;
  const days = snap.hoursToCutoff / 24;
  if (days > 8 || days < 3) return null;
  let body = 'Superblock forecast \u2014 ' + Math.round(days) + ' days to the vote cutoff.\n\n'
    + 'If voting closed today: ' + snap.passing.length + ' proposal' + (snap.passing.length === 1 ? '' : 's') + ' would fund';
  if (snap.bubble.length) body += ', ' + snap.bubble.length + ' on the bubble:\n' + snap.bubble.slice(0, 4).map((p) => bline(p, 40)).join('\n');
  else body += '.';
  body += '\n\nVotes can still move. Your node, your call \u2192 dashcentral.org';
  return body;
}

/* ---------- THE TREASURY SIGNAL ----------
   Unallocated budget is room. Surfacing it quietly recruits the builders who did not know
   the DAO had space for them this cycle. A governance fact almost no one publishes. */
function treasuryPost(snap) {
  if (!snap || snap.total == null || snap.allotted == null) return null;
  const unspent = snap.total - snap.allotted;
  if (unspent < 50) return null;
  const asks = snap.props.map((p) => p.ask).filter((x) => x && x > 0).sort((a, b) => a - b);
  const median = asks.length ? asks[Math.floor(asks.length / 2)] : null;
  const room = median ? Math.floor(unspent / median) : null;
  const small = room && room >= 1 && room <= 8;
  let body = 'The Dash treasury has ' + dnum(Math.round(unspent)) + ' DASH unallocated this cycle'
    + (small ? ' \u2014 room for roughly ' + room + ' more proposal' + (room === 1 ? '' : 's') + ' at the median ask.' : ' \u2014 real room for new proposals.');
  body += '\n\nThe network funds what masternodes approve. Building on Dash and weighing a proposal? I can help you scope it: dashsupport.team/dasha';
  return body;
}

/* ---------- THE NETWORK HEARTBEAT ----------
   Whale Alert's discipline: pure data, always computes, never price. */
async function networkPost() {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch('https://api.blockchair.com/dash/stats', { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json(); const d = j && j.data; if (!d) return null;
    const rows = [];
    if (d.blocks) rows.push('\u2022 block ' + dnum(d.blocks));
    if (d.transactions_24h != null) rows.push('\u2022 ' + dnum(d.transactions_24h) + ' transactions in 24h');
    if (d.mempool_transactions != null) rows.push('\u2022 ' + dnum(d.mempool_transactions) + ' in the mempool');
    if (d.circulation != null) rows.push('\u2022 ' + dnum(Math.round(d.circulation / 1e8)) + ' DASH in circulation');
    if (rows.length < 2) return null;
    return 'Dash network, right now:\n\n' + rows.slice(0, 3).join('\n')
      + '\n\nInstantSend settles in about a second, fees under a cent. Throughput, never price.';
  } catch (e) { return null; }
}

/* ---------- THE TRANSLATION ----------
   The current-events lens. She reads the world and draws ONE honest design contrast with
   Dash — trade-offs BOTH ways, never a sales pitch. Rare, and self-checked for neutrality. */
async function translatePost(opts) {
  if (opts && opts.noModel) return null;
  const prompt = 'You are writing ONE X post for the Dash Support Team account. Use web_search ONCE to find a genuinely CURRENT, widely-reported development in crypto or fintech from the last few days \u2014 a CATEGORY of event (high gas fees, a smart-contract exploit, a stablecoin or bank-access story, cross-border payment cost, a chain outage). Then write a NEUTRAL, factual post (max 230 characters, no hashtags, no emoji) that:\n'
    + '- States the current development plainly. Do not call any specific named project "hacked" or "failed" unless that is established, widely-reported fact.\n'
    + '- Draws ONE honest design contrast with how Dash actually works (InstantSend, ChainLocks, declarative data contracts, self-custody, the treasury).\n'
    + '- States the TRADE-OFF in BOTH directions \u2014 what Dash gives up for what it gains. Never claim Dash is simply better.\n'
    + '- Teaches; never sells. No "buy", "switch", "best", "fastest", "revolutionary".\n'
    + '- Ends on the trade-off or the fact \u2014 no call to action.\n'
    + 'If you cannot find something current, or cannot make an honest and balanced contrast, answer exactly: SKIP\n'
    + 'Answer with the post text only.';
  try {
    const out = await askDasha([{ role: 'user', content: prompt }], { surface: 'api', internal: true, maxTokens: 500 });
    let s = String((out && out.reply) || '').trim().replace(/^["']|["']$/g, '');
    if (!s || /^skip$/i.test(s) || s.length < 60) return null;
    if (/\b(best|fastest|revolutionary|buy now|to the moon|superior|beats every|kills|dead chain|switch to dash)\b/i.test(s)) return null;
    if (s.length > 240) s = s.slice(0, 237) + '\u2026';
    return s + '\n\nHow Dash works, in plain terms: dashsupport.team/dasha';
  } catch (e) { return null; }
}

/* ---------- THE DASH RELEASE ----------
   When Dash Core or Platform ships a version, node operators want to know. Factual news,
   deduped per tag, only while the release is fresh. */
async function releasePost(st) {
  const repos = [['dashpay/dash', 'Dash Core'], ['dashpay/platform', 'Dash Platform']];
  for (const rp of repos) {
    try {
      const r = await fetch('https://api.github.com/repos/' + rp[0] + '/releases/latest', { headers: { 'User-Agent': 'dasha-editor' } });
      if (!r.ok) continue;
      const rel = await r.json();
      const tag = rel.tag_name; if (!tag) continue;
      const key = 'release:' + rp[0] + ':' + tag;
      if (st.last[key]) continue;
      if (rel.prerelease) continue;
      if (rel.published_at && (Date.now() - Date.parse(rel.published_at)) > 10 * 864e5) continue;  /* fresh only */
      let body = rp[1] + ' shipped ' + tag + '.';
      if (rel.name && rel.name !== tag) body += '\n\n' + clipT(rel.name, 80);
      body += '\n\nRelease notes: ' + rel.html_url + '\n\nWondering what it changes for you? dashsupport.team/dasha';
      return { text: body, key };
    } catch (e2) {}
  }
  return null;
}

/* ---------- THE WEEKLY ROUNDUP ----------
   The single most-validated governance format in the research (Optimism/Arbitrum/L2BEAT
   numbered weekly). Sundays only; governance state + the week's top builder topic. */
async function weeklyPost(snap) {
  if (new Date().getUTCDay() !== 0) return null;   /* Sunday */
  if (!snap) return null;
  const rows = ['\u2022 ' + snap.props.length + ' proposals active, ' + snap.passing.length + ' passing'];
  if (snap.hoursToCutoff != null && snap.hoursToCutoff > 0) rows.push('\u2022 ' + Math.round(snap.hoursToCutoff / 24) + ' days to the superblock');
  if (snap.bubble.length) rows.push('\u2022 ' + snap.bubble.length + ' on the funding bubble');
  try {
    const ms = await metrics.snapshot(7); const t = (ms.total && ms.total.all) || {};
    if ((t.answers || 0) >= 8) {
      const top = Object.keys(t).filter((k) => k.indexOf('skill:') === 0 && k !== 'skill:(none)')
        .map((k) => [k.slice(6), t[k]]).sort((a, b) => b[1] - a[1])[0];
      if (top) rows.push('\u2022 builders asked me most about ' + (TOPIC[top[0]] || top[0].replace(/^\//, '')));
    }
  } catch (e2) {}
  return 'This week in Dash:\n\n' + rows.join('\n') + '\n\nThe full ballot, and answers, any time: dashsupport.team/dasha';
}

/* ---------- THE DISCUSSION SIGNAL ----------
   Where the community is already weighing in — pointing people to the real debate, never
   summarizing or taking a side. Uses DashCentral's live comment counts. */
function discussionPost(snap) {
  if (!snap) return null;
  const d = snap.props.filter((p) => p.comments > 0).sort((a, b) => b.comments - a.comments)[0];
  if (!d || d.comments < 3) return null;
  return 'Most discussed on the Dash ballot right now:\n\n' + clipT(d.title, 60) + '\n'
    + d.comments + ' comment' + (d.comments === 1 ? '' : 's') + (d.passing ? ' \u00b7 passing' : '') + '.\n\n'
    + 'The community is already weighing in. Read the thread and the tally:\n' + (d.commentsUrl || d.url);
}

/* ---------- THE DASH DISTINCT (reverse translation) ----------
   Points the lens outward: how Dash does a thing vs the common industry approach — honest
   trade-offs both ways, never a sales pitch. Rotates the capability; self-checked. */
const DASH_CAPS = [
  'InstantSend, where a payment is final in about a second',
  'ChainLocks, which make a 51% chain reorganization attack infeasible',
  'the masternode treasury \u2014 10% of block rewards the network votes on directly, funding itself with no foundation',
  'declarative data contracts on Platform instead of general-purpose smart contracts',
  'DPNS usernames owned on-chain by your identity, not rented from a company',
  'optional CoinJoin privacy that never leaves self-custody',
  'flat sub-cent fees that do not spike with network demand',
];
async function distinctPost(opts) {
  if (opts && opts.noModel) return null;
  const cap = DASH_CAPS[Math.floor(Date.now() / 864e5) % DASH_CAPS.length];
  const prompt = 'Write ONE X post (max 230 characters, no hashtags, no emoji) contrasting how DASH does "' + cap + '" with how the rest of the crypto or fintech industry commonly approaches the same problem. You may use web_search ONCE to ground the industry comparison in current practice. Rules:\n'
    + '- State the contrast neutrally and factually.\n'
    + '- State the TRADE-OFF in BOTH directions \u2014 what Dash gives up for what it gains. Never claim Dash is simply better.\n'
    + '- Teach, do not sell. No "best", "fastest", "superior", "revolutionary", "switch to".\n'
    + '- End on the trade-off or the fact, no call to action.\n'
    + 'If you cannot make an honest, balanced contrast, answer exactly: SKIP\n'
    + 'Answer with the post text only.';
  try {
    const out = await askDasha([{ role: 'user', content: prompt }], { surface: 'api', internal: true, maxTokens: 500 });
    let s = String((out && out.reply) || '').trim().replace(/^["']|["']$/g, '');
    if (!s || /^skip$/i.test(s) || s.length < 60) return null;
    if (/\b(best|fastest|revolutionary|buy now|to the moon|superior|beats every|kills|dead chain|switch to dash)\b/i.test(s)) return null;
    if (s.length > 240) s = s.slice(0, 237) + '\u2026';
    return s + '\n\nHow Dash works, in plain terms: dashsupport.team/dasha';
  } catch (e) { return null; }
}

/* ---------- THE SCORING MODEL ----------
   score = priority × urgency × novelty. Urgency rises as a deadline closes;
   novelty falls the longer a class has been silent-but-available (it is not news
   if it was true yesterday and we chose not to say it). */
function score(c, ctx) {
  const base = (CLASS[c.kind] || { p: 10 }).p;
  let urgency = 1;
  if (c.kind === 'cutoff' && ctx.hoursToCutoff != null) {
    urgency = ctx.hoursToCutoff <= 24 ? 2.0 : (ctx.hoursToCutoff <= 72 ? 1.5 : 1);
  }
  if (c.kind === 'ballot' && ctx.hoursToCutoff != null && ctx.hoursToCutoff <= 96) urgency = 1.4;
  const novelty = c.fresh ? 1 : 0.6;
  return base * urgency * novelty;
}

/* ---------- THE RUN ---------- */
async function runEditor(opts) {
  opts = opts || {};
  const now = Date.now();
  const { sha, data: st } = await loadJson(EDITOR_STATE, { last: {}, day: null, spent: 0, lastKind: null, log: [] });
  const today = new Date().toISOString().slice(0, 10);
  if (st.day !== today) { st.day = today; st.spent = 0; }

  const snap = snapshot(await govData());
  const ctx = { hoursToCutoff: snap ? snap.hoursToCutoff : null };

  /* keep the public ledger current every run — the record is the product */
  let ledger = null;
  if (snap && !opts.dry) ledger = await updateFundedLedger(snap);
  else if (snap) ledger = (await loadJson(FUNDED_LEDGER, { cycles: {}, entries: {} })).data;

  /* 1 — GATHER every candidate the world is offering */
  const cands = [];
  const w = await runWatch({ dry: true, max: 5 });          /* detect without consuming */
  if (w.ok) for (const ev of w.posts) {
    let text = ev.text;
    /* if this is about us, say so — unprompted, every time */
    const hit = snap && snap.props.filter(function (p) { return text.indexOf(p.name) >= 0 || text.indexOf(String(p.title).slice(0, 30)) >= 0; })[0];
    if (hit) text += disclosure(hit);
    cands.push({ kind: ev.kind === 'new' ? 'new' : ev.kind, text: text, key: ev.key, fresh: true, viaWatch: true });
  }

  const cool = (k) => !st.last[k] || (now - Date.parse(st.last[k])) > (CLASS[k] || {}).cool;
  if (cool('ballot')) { const b = await ballot(); if (b.ok) cands.push({ kind: 'ballot', text: b.text, key: 'ballot:' + today, fresh: true }); }
  if (cool('accountability')) { const a = accountabilityPost(ledger, snap); if (a) cands.push({ kind: 'accountability', text: a, key: 'acct:' + today, fresh: true }); }
  if (cool('needs')) { const n = await needsPost(); if (n) cands.push({ kind: 'needs', text: n, key: 'needs:' + today, fresh: true }); }
  if (cool('teaching') && !opts.noModel) { const t = await teachingPost(); if (t) cands.push({ kind: 'teaching', text: t, key: 'teach:' + today, fresh: true }); }
  if (!FOUNDRY_PAUSED && cool('foundry')) { const f = await foundryPost(); if (f) cands.push({ kind: 'foundry', text: f, key: 'foundry:' + today, fresh: true }); }
  if (cool('forecast')) { const fc = forecastPost(snap); if (fc) cands.push({ kind: 'forecast', text: fc, key: 'forecast:' + today, fresh: true }); }
  if (cool('treasury')) { const tr = treasuryPost(snap); if (tr) cands.push({ kind: 'treasury', text: tr, key: 'treasury:' + (snap ? snap.superblock : 'x'), fresh: true }); }
  if (cool('network')) { const nw = await networkPost(); if (nw) cands.push({ kind: 'network', text: nw, key: 'network:' + today, fresh: true }); }
  { const cp = await correctionPost(st); if (cp) cands.push({ kind: 'correction', text: cp.text, key: cp.key, fresh: true }); }
  { const ep = await evolvePost(st); if (ep) cands.push({ kind: 'evolve', text: ep.text, key: ep.key, fresh: true }); }
  const roomLeft = (opts.budget != null ? opts.budget : DAILY_BUDGET) - (st.spent || 0);   /* do not spend model calls we cannot post */
  { const rl = await releasePost(st); if (rl) cands.push({ kind: 'release', text: rl.text, key: rl.key, fresh: true }); }
  if (cool('weekly')) { const wk = await weeklyPost(snap); if (wk) cands.push({ kind: 'weekly', text: wk, key: 'weekly:' + today, fresh: true }); }
  if (cool('discussion')) { const dc = discussionPost(snap); if (dc) cands.push({ kind: 'discussion', text: dc, key: 'discussion:' + today, fresh: true }); }
  if (roomLeft > 0 && cool('nextmove') && !opts.noModel) { const nm = await nextmovePost(snap); if (nm) cands.push({ kind: 'nextmove', text: nm, key: 'nextmove:' + today, fresh: true }); }
  if (roomLeft > 0 && cool('buildertip') && !opts.noModel) { const bt = await buildertipPost(); if (bt) cands.push({ kind: 'buildertip', text: bt, key: 'buildertip:' + today, fresh: true }); }
  if (roomLeft > 0 && cool('builderidea') && !opts.noModel) { const bi = await builderideaPost(snap); if (bi) cands.push({ kind: 'builderidea', text: bi, key: 'builderidea:' + today, fresh: true }); }
  if (roomLeft > 0 && cool('translate') && !opts.noModel) { const tl = await translatePost(opts); if (tl) cands.push({ kind: 'translate', text: tl, key: 'translate:' + today, fresh: true }); }
  if (roomLeft > 0 && cool('distinct') && !opts.noModel) { const di = await distinctPost(opts); if (di) cands.push({ kind: 'distinct', text: di, key: 'distinct:' + today, fresh: true }); }

  /* 2 — SCORE and order */
  for (const c of cands) c.score = score(c, ctx);
  cands.sort((a, b) => b.score - a.score);

  /* 3 — SPEND the budget: budget cap, cooldowns, never the same class twice running */
  const chosen = [];
  const cap = (opts.budget != null ? opts.budget : DAILY_BUDGET);   /* 0 must mean zero, not default */
  const budget = Math.max(0, cap - (st.spent || 0));
  let lastKind = st.lastKind;
  for (const c of cands) {
    if (chosen.length >= Math.min(budget, opts.max || 2)) break;
    if (st.last[c.key]) continue;
    if (c.kind === lastKind && CLASS[c.kind].p < 80) continue;   /* variety, unless it is urgent */
    chosen.push(c); lastKind = c.kind;
  }

  return { ok: true, ctx, considered: cands.map((c) => ({ kind: c.kind, score: Math.round(c.score), key: c.key, text: opts.verbose ? c.text : undefined })),
    chosen, state: st, sha, ledgerSize: ledger && ledger.entries ? Object.keys(ledger.entries).length : 0 };
}

async function commitEditorState(st, sha, chosen) {
  const now = new Date().toISOString();
  st.last = st.last || {};
  for (const c of chosen) { st.last[c.kind] = now; st.last[c.key] = now; }
  st.spent = (st.spent || 0) + chosen.length;
  if (chosen.length) st.lastKind = chosen[chosen.length - 1].kind;
  st.log = (st.log || []).concat(chosen.map((c) => ({ at: now, kind: c.kind, key: c.key }))).slice(-120);
  const keys = Object.keys(st.last);
  if (keys.length > 300) { keys.sort((a, b) => (st.last[a] < st.last[b] ? -1 : 1)); for (const k of keys.slice(0, keys.length - 220)) delete st.last[k]; }
  await ghPut(EDITOR_STATE, JSON.stringify(st, null, 2), 'editor: ' + now.slice(0, 16), sha);
}

module.exports = { runEditor, commitEditorState, needsPost, accountabilityPost, updateFundedLedger };
