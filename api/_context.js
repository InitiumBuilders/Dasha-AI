/* THE CONTEXT SELECTOR — the thing that decides what she needs to know right now.

   The old mind was one 30K-token block sent on every request: 35 skills to answer with one,
   ten reference sections to use none. Caching hid the cost but not the dilution — a model
   reading 30K tokens to answer "what is a masternode" is a model paying attention to 29K
   tokens of nothing.

   Now: a stable ~10K SPINE (identity, safety, tools, answer shape, and the INDEX of what
   exists) plus only the skill and reference sections this question actually touches.

   Selection is local and deterministic — no embeddings, no vector store, no classifier call.
   With 35 skills that each declare their own triggers, a scored keyword match is more
   accurate than a similarity search, costs nothing, adds no latency, and can be read and
   argued with by a human. Prefer the boring machine that can be audited.

   CACHING IS WHY THE ORDER IS FIXED: [SPINE][loaded context][conversation]. The spine is
   byte-identical on every request, so it is always a cache hit. The loaded block is one of
   a small set of combinations, so popular paths (/data-contract, /dash-gov) warm up too.
   Assembling the prompt in a different order per request would break the prefix and cost
   ~10x more — which is exactly the trap this design avoids. */

const MAX_SKILLS = 2;        // more than two workflows in one answer is a confused answer
const MAX_KNOWLEDGE = 3;
const PHRASE_HIT = 6;        // a phrase the skill named for itself
const WORD_HIT = 1;          // a content word from its trigger line
const SLASH_HIT = 100;       // an explicit invocation is not a guess
const FLOOR = 5;             // below this it's noise, and noise costs tokens

function scoreOne(text, entry) {
  let s = 0;
  if (entry.name && new RegExp('(^|\\s)' + entry.name.replace(/[/-]/g, '\\$&') + '\\b', 'i').test(text)) s += SLASH_HIT;
  for (const p of (entry.phrases || [])) if (p.length > 2 && text.includes(p)) s += PHRASE_HIT + Math.min(p.split(' ').length, 4);
  for (const w of (entry.words || [])) if (new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text)) s += WORD_HIT;
  return s;
}

/* Pick the context for THIS question. `index` is the manifest from the mind repo. */
function selectContext(messages, index, opts) {
  if (!index || !index.skills) return { skills: [], knowledge: [], reason: 'no index' };
  const recent = messages.slice(-3).filter((m) => m.role === 'user').map((m) => m.content).join('\n');
  const text = String(recent || '').toLowerCase().slice(0, 6000);
  if (!text.trim()) return { skills: [], knowledge: [], reason: 'empty' };

  const sk = index.skills.map((e) => ({ e, s: scoreOne(text, e) }))
    .filter((x) => x.s >= FLOOR)
    .sort((a, b) => b.s - a.s);

  /* An explicit /slash invocation wins outright — never dilute it with a runner-up. */
  const explicit = sk.filter((x) => x.s >= SLASH_HIT);
  const chosen = (explicit.length ? explicit : sk).slice(0, MAX_SKILLS);

  const kn = index.knowledge.map((e) => ({ e, s: scoreOne(text, e) }))
    .filter((x) => x.s >= FLOOR)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_KNOWLEDGE);

  return {
    skills: chosen.map((x) => x.e),
    knowledge: kn.map((x) => x.e),
    reason: chosen.length ? (explicit.length ? 'explicit' : 'matched') : 'none',
    scores: chosen.map((x) => x.e.name + ':' + x.s),
  };
}

/* Render the loaded parts as one system block placed after the spine. */
function renderContext(parts) {
  const out = [];
  if (parts.knowledge && parts.knowledge.length) {
    out.push('REFERENCE LOADED FOR THIS QUESTION — from your verified knowledge pack. These are facts, not suggestions; prefer them over memory, and prefer a retrieved doc over both.\n\n'
      + parts.knowledge.map((k) => k.text).join('\n\n'));
  }
  if (parts.skills && parts.skills.length) {
    out.push('SKILL WORKFLOW LOADED FOR THIS QUESTION — the runtime matched this to what was asked. Run its diagnostic silently and answer in its output shape. Announce it once with its [/name] tag.\n\n'
      + parts.skills.map((s) => s.text).join('\n\n'));
  }
  return out.join('\n\n' + '─'.repeat(8) + '\n\n');
}

module.exports = { selectContext, renderContext, MAX_SKILLS, MAX_KNOWLEDGE };
