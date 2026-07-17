/* Dasha's mind, streamed live from GitHub.
   github.com/InitiumBuilders/Dasha-AI/PROMPT/*.md is the SINGLE SOURCE OF TRUTH for every
   instance — web chat, Telegram bots, the X agent, MCP. Push to the repo and every surface
   picks it up within the cache window. No redeploy, no drift.
   The baked prompt (_prompt.js, generated at build) is the fallback if GitHub is unreachable. */
const baked = require('./_prompt.js');

const RAW = 'https://raw.githubusercontent.com/InitiumBuilders/Dasha-AI/main/PROMPT/';
const FILES = ['PROMPT-CORE.md', 'SKILLS.md', 'KNOWLEDGE.md'];
const TTL = 10 * 60 * 1000;

let cache = { at: 0, prompt: null, version: null, origin: 'baked' };
let inflight = null;

async function grab(file) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(RAW + file + '?t=' + Math.floor(Date.now() / TTL), {
      signal: ctl.signal,
      headers: { 'user-agent': 'DashaAI/1.3 (+https://www.dashsupport.team)' },
    });
    if (!r.ok) throw new Error(file + ' http ' + r.status);
    const s = await r.text();
    if (!s || s.length < 400) throw new Error(file + ' too short');
    return s.trim();
  } finally { clearTimeout(t); }
}

async function refresh() {
  const [core, skills, know, ver] = await Promise.all([
    grab(FILES[0]), grab(FILES[1]), grab(FILES[2]),
    grab('VERSION').catch(() => null),
  ]);
  const prompt = core + '\n\n' + '='.repeat(8) + ' SKILLS REGISTRY ' + '='.repeat(8) + '\n\n' + skills
    + '\n\n' + '='.repeat(8) + ' DASH KNOWLEDGE PACK ' + '='.repeat(8) + '\n\n' + know;
  cache = {
    at: Date.now(),
    prompt: prompt,
    version: (ver ? ver.split('\n')[0].trim() : baked.VERSION) + ' (live)',
    origin: 'github',
  };
  return cache;
}

/* Always resolves. Never throws. Never blocks a user answer on GitHub being up. */
async function getMind() {
  if (cache.prompt && Date.now() - cache.at < TTL) return cache;
  if (!inflight) {
    inflight = refresh()
      .catch(function () {
        cache = { at: Date.now(), prompt: baked.SYSTEM_PROMPT, version: baked.VERSION + ' (baked)', origin: 'baked' };
        return cache;
      })
      .then(function (c) { inflight = null; return c; });
  }
  return inflight;
}

module.exports = { getMind, BAKED_VERSION: baked.VERSION };
