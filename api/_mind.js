/* Dasha's mind, streamed live from GitHub — now as a spine plus a library.

   github.com/InitiumBuilders/Dasha-AI/PROMPT/ is the SINGLE SOURCE OF TRUTH for every
   instance — web chat, Telegram bots, the X agent, MCP. Push to the repo and every surface
   picks it up within the cache window. No redeploy, no drift.

     PROMPT/SPINE.md        who she is — always sent, byte-identical, always cache-hit
     PROMPT/INDEX.json      the routing manifest: what exists and what it answers
     PROMPT/skills/*.md     one workflow each — fetched only when the question needs it
     PROMPT/knowledge/*.md  one reference section each — same

   Library files are fetched once per instance and held for the life of the container, so a
   given skill costs one 30ms fetch on first use and nothing thereafter. The baked prompt
   (_prompt.js) remains the fallback if GitHub is unreachable: she answers anyway, from the
   copy compiled at build time, and says which mind she is running. */
const baked = require('./_prompt.js');

const RAW = 'https://raw.githubusercontent.com/InitiumBuilders/Dasha-AI/main/PROMPT/';
const TTL = 10 * 60 * 1000;

let cache = { at: 0, spine: null, index: null, version: null, origin: 'baked' };
let inflight = null;
const parts = new Map();          // file -> text, immutable for a container's lifetime

async function grab(file, minLen) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(RAW + file + '?t=' + Math.floor(Date.now() / TTL), {
      signal: ctl.signal, headers: { 'user-agent': 'DashaAI/2.0 (+https://www.dashsupport.team)' },
    });
    if (!r.ok) throw new Error(file + ' http ' + r.status);
    const s = await r.text();
    if (!s || s.length < (minLen || 200)) throw new Error(file + ' too short');
    return s.trim();
  } finally { clearTimeout(t); }
}

async function refresh() {
  const [spine, indexRaw, ver] = await Promise.all([
    grab('SPINE.md', 4000),
    grab('INDEX.json', 200),
    grab('VERSION', 2).catch(() => null),
  ]);
  let index = null;
  try { index = JSON.parse(indexRaw); } catch (e) { throw new Error('INDEX.json unparseable'); }
  if (!index.skills || !index.skills.length) throw new Error('INDEX.json has no skills');
  cache = {
    at: Date.now(),
    spine: spine,
    index: index,
    version: (ver ? ver.split('\n')[0].trim() : baked.VERSION) + ' (live)',
    origin: 'github',
  };
  parts.clear();                  // a new mind version invalidates the library
  return cache;
}

/* Always resolves. Never throws. Never blocks an answer on GitHub being up. */
async function getMind() {
  if (cache.spine && Date.now() - cache.at < TTL) return cache;
  if (!inflight) {
    inflight = refresh()
      .catch(function () {
        /* fallback: the whole baked monolith, no library. She is complete, just not lean. */
        cache = { at: Date.now(), spine: baked.SYSTEM_PROMPT, index: null,
          version: baked.VERSION + ' (baked)', origin: 'baked' };
        return cache;
      })
      .then(function (c) { inflight = null; return c; });
  }
  return inflight;
}

/* Fetch one library file; cached for the container's life. Never throws — a missing part
   means she answers from the spine, which still holds every rule that matters. */
async function loadPart(file) {
  if (parts.has(file)) return parts.get(file);
  try {
    const text = await grab(file, 80);
    parts.set(file, text);
    return text;
  } catch (e) { return null; }
}

/* Resolve a selection into text, in parallel. */
async function loadParts(entries) {
  const out = await Promise.all((entries || []).map(async function (e) {
    const text = await loadPart(e.file);
    return text ? { name: e.name || e.title, file: e.file, text: text } : null;
  }));
  return out.filter(Boolean);
}

/* Find one skill by name — the load_skill tool's backing, for when routing missed. */
function findSkill(index, name) {
  if (!index || !index.skills) return null;
  const want = String(name || '').toLowerCase().replace(/^\/?/, '/');
  return index.skills.find((s) => s.name.toLowerCase() === want)
    || index.skills.find((s) => s.name.toLowerCase().includes(want.replace(/^\//, '')));
}

module.exports = { getMind, loadParts, loadPart, findSkill, BAKED_VERSION: baked.VERSION };
