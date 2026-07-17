/* THE PULSE — privacy-preserving analytics.

   The rule, and it is the whole design: we count what FIRES, never what is SAID.
   Not one question, not one answer, not one address, not one IP is ever stored. We keep
   tallies — which skill fired, which tool she reached for, which mind answered, a thumb up
   or down, the day, the cost. Aggregates that let the team SEE the system without ever
   surveilling the person using it. You cannot leak what you never wrote down.

   That is not a limitation we apologise for. It is the same ethic as the rest of her: an
   agent for a network whose creed is "verify, don't trust" measures itself and forgets you.

   Storage: a shared counter store (Upstash/Vercel KV REST) when configured — then the numbers
   are fleet-wide and survive restarts. Absent that, an in-memory tally per instance, honestly
   labelled as partial. Either way, only integers ever touch the store. */

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const HAS_KV = !!(KV_URL && KV_TOK);
const DAYS_KEPT = 30;

/* ---- in-memory fallback: { 'YYYY-MM-DD': { field: count } } ---- */
const mem = new Map();
function day() { return new Date().toISOString().slice(0, 10); }
function memBucket(d) { if (!mem.has(d)) mem.set(d, Object.create(null)); return mem.get(d); }
function memBump(fields) {
  const b = memBucket(day());
  for (const f of fields) b[f] = (b[f] || 0) + 1;
  if (mem.size > DAYS_KEPT + 5) { const ks = [...mem.keys()].sort(); while (mem.size > DAYS_KEPT) mem.delete(ks.shift()); }
}

/* ---- KV via REST pipeline (HINCRBY per field, one round trip) ---- */
async function kvPipeline(commands) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(KV_URL.replace(/\/$/, '') + '/pipeline', {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: 'Bearer ' + KV_TOK, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; } finally { clearTimeout(t); }
}

function keyFor(d) { return 'pulse:' + d; }

/* Record one answered turn. Fields only — no text ever passes this boundary. */
async function recordTurn(ev) {
  ev = ev || {};
  const fields = ['answers'];
  if (ev.surface) fields.push('surface:' + safe(ev.surface));
  if (ev.model) fields.push('model:' + safe(ev.model.split('/').pop()));
  fields.push('depth:' + (ev.depth ? safe(String(ev.depth).split(' ')[0]) : 'everyday'));
  (ev.skills || []).slice(0, 3).forEach((s) => fields.push('skill:' + safe(s)));
  if (!(ev.skills || []).length) fields.push('skill:(none)');
  (ev.tools || []).forEach((t) => fields.push('tool:' + safe(t)));
  if (ev.ok === false) fields.push('errors');
  /* cost is bucketed into tenths of a cent so even spend is coarse, not a fingerprint */
  if (typeof ev.costMicros === 'number') incrCost(ev.costMicros);
  await bump(fields);
}
let costAccum = { d: day(), micros: 0 };
function incrCost(micros) {
  const d = day();
  if (costAccum.d !== d) costAccum = { d: d, micros: 0 };
  costAccum.micros += Math.max(0, micros | 0);
}
async function recordFeedback(good, filed) {
  const fields = [good ? 'thumbs_up' : 'thumbs_down'];
  if (!good && filed) fields.push('filed_issue');
  await bump(fields);
}
function safe(s) { return String(s).replace(/[^a-z0-9._/-]/gi, '').slice(0, 40); }

async function bump(fields) {
  memBump(fields);                        // always, so the endpoint has something even without KV
  if (!HAS_KV) return;
  const d = day(), k = keyFor(d);
  const cmds = fields.map((f) => ['HINCRBY', k, f, 1]);
  cmds.push(['EXPIRE', k, String(60 * 60 * 24 * (DAYS_KEPT + 1))]);
  await kvPipeline(cmds);
}

/* Read the tallies back. Prefers KV (fleet-wide); falls back to this instance's memory. */
async function snapshot(days) {
  const n = Math.min(days || 7, DAYS_KEPT);
  const dates = [];
  for (let i = 0; i < n; i++) { const dt = new Date(Date.now() - i * 864e5); dates.push(dt.toISOString().slice(0, 10)); }

  if (HAS_KV) {
    const res = await kvPipeline(dates.map((d) => ['HGETALL', keyFor(d)]));
    if (res) {
      const out = {};
      res.forEach((row, i) => {
        const arr = (row && row.result) || [];
        const obj = {};
        for (let j = 0; j < arr.length; j += 2) obj[arr[j]] = parseInt(arr[j + 1], 10) || 0;
        out[dates[i]] = obj;
      });
      return { store: 'kv', scope: 'fleet-wide', days: out };
    }
  }
  const out = {};
  dates.forEach((d) => { if (mem.has(d)) out[d] = Object.assign({}, mem.get(d)); });
  return { store: 'memory', scope: 'this instance since cold start (add Upstash/Vercel KV for fleet-wide)', days: out };
}

/* A compact, human-readable pulse — for the health endpoint and the daily team digest. */
function rollup(snap) {
  const totals = Object.create(null);
  let answers = 0, up = 0, down = 0;
  for (const d of Object.keys(snap.days || {})) {
    const b = snap.days[d];
    for (const f of Object.keys(b)) {
      totals[f] = (totals[f] || 0) + b[f];
      if (f === 'answers') answers += b[f];
      if (f === 'thumbs_up') up += b[f];
      if (f === 'thumbs_down') down += b[f];
    }
  }
  const top = (prefix, k) => Object.keys(totals).filter((f) => f.indexOf(prefix) === 0)
    .map((f) => [f.slice(prefix.length), totals[f]]).sort((a, b) => b[1] - a[1]).slice(0, k || 8);
  return {
    store: snap.store, scope: snap.scope,
    answers, thumbs_up: up, thumbs_down: down,
    satisfaction: (up + down) ? Math.round((up / (up + down)) * 100) + '%' : 'no ratings yet',
    topSkills: top('skill:', 10),
    tools: top('tool:'),
    minds: top('model:'),
    depth: top('depth:'),
    surfaces: top('surface:'),
    note: 'aggregate only — no question, answer, address, or user is ever stored',
  };
}

module.exports = { recordTurn, recordFeedback, snapshot, rollup, HAS_KV };
