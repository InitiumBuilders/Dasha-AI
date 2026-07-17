/* THE PULSE — privacy-preserving analytics.

   The rule, and it is the whole design: we count what FIRES, never what is SAID.
   Not one question, not one answer, not one address, not one IP is ever stored. We keep
   the shape of the work — which skill fired, which tool she reached for, which mind
   answered, a thumb up or down, the day, the cost. Aggregates that let the team SEE the
   system without ever surveilling the person using it. You cannot leak what you never wrote.

   Store, in order of preference:
     1. Supabase  — a real, queryable events table (best for "adapting over time"). Rows carry
                    NO text: surface, model, depth, skills[], tools[], ok, thumb, cost. RLS on;
                    only the service key reads or writes. Set SUPABASE_URL + SUPABASE_SERVICE_KEY.
     2. Upstash / Vercel KV — daily integer counters. Set KV_REST_API_URL + KV_REST_API_TOKEN.
     3. In-memory — a per-instance tally, honestly labelled partial (serverless shares no memory). */

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HAS_SB = !!(SB_URL && SB_KEY);
const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const HAS_KV = !!(KV_URL && KV_TOK);
const STORE = HAS_SB ? 'supabase' : (HAS_KV ? 'kv' : 'memory');
const TABLE = 'dasha_events';
const DAYS_KEPT = 30;

const day = () => new Date().toISOString().slice(0, 10);
const safe = (s) => String(s).replace(/[^a-z0-9._/-]/gi, '').slice(0, 40);

/* ---------- in-memory fallback ---------- */
const mem = new Map();
function memBump(fields) {
  const d = day();
  if (!mem.has(d)) mem.set(d, Object.create(null));
  const b = mem.get(d);
  for (const f of fields) b[f] = (b[f] || 0) + 1;
  if (mem.size > DAYS_KEPT + 5) { const ks = [...mem.keys()].sort(); while (mem.size > DAYS_KEPT) mem.delete(ks.shift()); }
}

/* ---------- Supabase (PostgREST) — plain insert, no text ever ---------- */
async function sbInsert(row) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    await fetch(SB_URL + '/rest/v1/' + TABLE, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
  } catch (e) { /* analytics must never break an answer */ } finally { clearTimeout(t); }
}
async function sbSelectSince(iso) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(SB_URL + '/rest/v1/' + TABLE + '?ts=gte.' + encodeURIComponent(iso)
      + '&select=kind,surface,model,depth,skills,tools,ok,thumb,filed&limit=100000', {
      signal: ctl.signal, headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; } finally { clearTimeout(t); }
}

/* ---------- Upstash / KV ---------- */
async function kvPipeline(cmds) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(KV_URL + '/pipeline', {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: 'Bearer ' + KV_TOK, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; } finally { clearTimeout(t); }
}
async function kvBump(fields) {
  const k = 'pulse:' + day();
  const cmds = fields.map((f) => ['HINCRBY', k, f, 1]);
  cmds.push(['EXPIRE', k, String(60 * 60 * 24 * (DAYS_KEPT + 1))]);
  await kvPipeline(cmds);
}

/* ---------- record ---------- */
let costAccum = { d: day(), micros: 0 };
async function recordTurn(ev) {
  ev = ev || {};
  const skills = (ev.skills || []).slice(0, 3).map(safe);
  const tools = (ev.tools || []).map(safe);
  const d = day();
  if (costAccum.d !== d) costAccum = { d, micros: 0 };
  costAccum.micros += Math.max(0, (ev.costMicros | 0));

  if (STORE === 'supabase') {
    return sbInsert({ kind: 'turn', surface: safe(ev.surface || 'web'),
      model: ev.model ? safe(ev.model.split('/').pop()) : null,
      depth: ev.depth ? safe(String(ev.depth).split(' ')[0]) : 'everyday',
      skills: skills.length ? skills : ['(none)'], tools,
      ok: ev.ok !== false, cost_micros: Math.max(0, ev.costMicros | 0) });
  }
  const fields = ['answers', 'surface:' + safe(ev.surface || 'web'),
    'depth:' + (ev.depth ? safe(String(ev.depth).split(' ')[0]) : 'everyday')];
  if (ev.model) fields.push('model:' + safe(ev.model.split('/').pop()));
  (skills.length ? skills : ['(none)']).forEach((s) => fields.push('skill:' + s));
  tools.forEach((t) => fields.push('tool:' + t));
  if (ev.ok === false) fields.push('errors');
  memBump(fields);
  if (STORE === 'kv') await kvBump(fields);
}
async function recordFeedback(good, filed) {
  if (STORE === 'supabase') return sbInsert({ kind: 'thumb', thumb: good ? 1 : -1, filed: !!(!good && filed) });
  const fields = [good ? 'thumbs_up' : 'thumbs_down'];
  if (!good && filed) fields.push('filed_issue');
  memBump(fields);
  if (STORE === 'kv') await kvBump(fields);
}

/* ---------- read back → a { field: count } tally, whichever store ---------- */
async function snapshot(days) {
  const n = Math.min(days || 7, DAYS_KEPT);

  if (STORE === 'supabase') {
    const since = new Date(Date.now() - n * 864e5).toISOString();
    const rows = await sbSelectSince(since);
    if (rows) {
      const t = Object.create(null);
      const bump = (f) => { t[f] = (t[f] || 0) + 1; };
      for (const r of rows) {
        if (r.kind === 'thumb') { bump(r.thumb > 0 ? 'thumbs_up' : 'thumbs_down'); if (r.filed) bump('filed_issue'); continue; }
        bump('answers');
        if (r.surface) bump('surface:' + r.surface);
        if (r.model) bump('model:' + r.model);
        if (r.depth) bump('depth:' + r.depth);
        (r.skills || []).forEach((s) => bump('skill:' + s));
        (r.tools || []).forEach((x) => bump('tool:' + x));
        if (r.ok === false) bump('errors');
      }
      return { store: 'supabase', scope: 'fleet-wide, ' + n + 'd', total: { all: t } };
    }
  }
  if (STORE === 'kv') {
    const dates = []; for (let i = 0; i < n; i++) dates.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    const res = await kvPipeline(dates.map((d) => ['HGETALL', 'pulse:' + d]));
    if (res) {
      const t = Object.create(null);
      res.forEach((row) => { const arr = (row && row.result) || []; for (let j = 0; j < arr.length; j += 2) t[arr[j]] = (t[arr[j]] || 0) + (parseInt(arr[j + 1], 10) || 0); });
      return { store: 'kv', scope: 'fleet-wide, ' + n + 'd', total: { all: t } };
    }
  }
  const t = Object.create(null);
  for (const [dt, b] of mem) { if (dt >= new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)) for (const f of Object.keys(b)) t[f] = (t[f] || 0) + b[f]; }
  return { store: 'memory', scope: 'this instance since cold start — add Supabase or KV for fleet-wide', total: { all: t } };
}

function top(totals, prefix, k) {
  return Object.keys(totals).filter((f) => f.indexOf(prefix) === 0)
    .map((f) => [f.slice(prefix.length), totals[f]]).sort((a, b) => b[1] - a[1]).slice(0, k || 8);
}

/* full rollup — team-facing (includes minds; the public one below omits nothing sensitive but is warmer) */
function rollup(snap) {
  const t = (snap.total && snap.total.all) || {};
  const up = t.thumbs_up || 0, down = t.thumbs_down || 0, answers = t.answers || 0;
  return {
    store: snap.store, scope: snap.scope,
    answers, thumbs_up: up, thumbs_down: down,
    satisfaction: (up + down) ? Math.round((up / (up + down)) * 100) + '%' : 'no ratings yet',
    topSkills: top(t, 'skill:', 12), tools: top(t, 'tool:'), minds: top(t, 'model:'),
    depth: top(t, 'depth:'), surfaces: top(t, 'surface:'),
    note: 'aggregate only — no question, answer, address, or user is ever stored',
  };
}

/* public rollup — the transparency page. Same anonymous aggregates, framed for a human,
   with nothing operationally sensitive (no cost, no error rate). Radical transparency: the
   proof that we store nothing about you is that this is ALL we have. */
function publicRollup(snap) {
  const t = (snap.total && snap.total.all) || {};
  const up = t.thumbs_up || 0, down = t.thumbs_down || 0;
  return {
    answers: t.answers || 0,
    peopleFindingItHelpful: (up + down) ? Math.round((up / (up + down)) * 100) + '%' : null,
    topTopics: top(t, 'skill:', 8).filter((s) => s[0] !== '(none)'),
    reached: top(t, 'tool:', 6).map((x) => x[0]),
    where: top(t, 'surface:', 5),
    scope: snap.scope, store: snap.store,
    promise: 'We count what fires, never what is said. No question, answer, address, or person is ever stored. This page is everything we have.',
  };
}

module.exports = { recordTurn, recordFeedback, snapshot, rollup, publicRollup, STORE, HAS_SB, HAS_KV };
