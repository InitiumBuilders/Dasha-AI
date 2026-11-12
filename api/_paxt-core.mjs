/* PAXT 1, the reference implementation.

   A PAXT is an agreement between communities, written as one plain-text document. People with a voice in it say
   so by signing ONE LINE with a wallet they already hold. The line names the document by its hash, so a signature
   can only ever mean the text that was read. Anyone can check every signature with their own wallet and count
   the result again. Nothing here moves funds, holds a key or writes to a chain.

   The names PAXT, PAXT Partners, Dash PAXT and Telepaxt are August's (2026-11-12). The protocol below is a draft
   for him and for the first people who use it.

   This file is pure functions with no dependencies. It runs in a browser and in Node 18 or later. Checking a
   signature needs a Dash message verifier, which the caller passes in (Dash Core's verifymessage, dashcore-lib's
   Message, or dashmsg all do it), so this file never touches key material. */

export const VERSION = 'paxt1';
export const VOICES = ['voting', 'owner', 'collateral'];
export const KINDS = ['paxt', 'poll', 'election'];
export const MAX_DOC_BYTES = 20000;
export const MAX_REVISION = 999;

const ID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const SUB = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/;
const OPTION = SUB;
/* a byte-order mark some editors put at the start of a file; never part of a document */
const BOM = String.fromCharCode(0xFEFF);
const WHEN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}Z)?$/;

/** the one line a wallet signs: paxt1 <id> <choice[+choice]> <32 hex of the document's hash> [#revision] */
export const LINE = /^paxt1 ([a-z0-9-]+(?:\/[a-z0-9-]+)?) ([a-z0-9-]+(?:\+[a-z0-9-]+)*) ([0-9a-f]{32})(?: #([1-9][0-9]{0,2}))?$/;

/* ------------------------------------------------------------------ the document */

/** The document in its one true form: LF line ends, no trailing spaces, no blank lines at either end, one final LF.
    The hash is taken over exactly these bytes, and this is the file a person downloads and reads. */
export function canon(doc) {
  const lines = String(doc ?? '').split(BOM).join('').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.join('\n') + '\n';
}

export async function sha256hex(text) {
  const bytes = new TextEncoder().encode(text);
  const out = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  return [...out].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** { full, short }: the document's sha256, and the 32 hex characters (128 bits) a ballot line carries */
export async function digestOf(doc) {
  const full = await sha256hex(canon(doc));
  return { full, short: full.slice(0, 32) };
}

function instant(s) {
  if (!WHEN.test(s)) return NaN;
  return Date.parse(s.length === 10 ? s + 'T00:00:00Z' : s.replace('Z', ':00Z'));
}

/** Read a document. The header is the only source of the terms: what a person reads is what the count obeys.
    Returns { ok: true, terms } or { ok: false, errors }. */
export function parseDoc(doc) {
  const text = canon(doc);
  const errors = [];
  if (new TextEncoder().encode(text).length > MAX_DOC_BYTES) errors.push('The document is longer than ' + MAX_DOC_BYTES + ' bytes.');
  const cut = text.indexOf('\n---\n');
  if (cut < 0) return { ok: false, errors: ['The header must end with a line holding only three dashes.'] };
  const head = text.slice(0, cut).split('\n');
  const body = text.slice(cut + 5).replace(/\n$/, '');
  if (head[0] !== VERSION) errors.push('The first line must be ' + VERSION + '.');
  const f = {};
  for (const line of head.slice(1)) {
    const m = /^([a-z]+): (.+)$/.exec(line);
    if (!m) { errors.push('Not a header line: ' + JSON.stringify(line.slice(0, 60))); continue; }
    if (m[1] in f) errors.push('The header names ' + m[1] + ' twice.');
    f[m[1]] = m[2];
  }
  const need = (k) => { if (!(k in f)) { errors.push('The header needs ' + k + '.'); return ''; } return f[k]; };
  const idRaw = need('id');
  const [id, sub, extra] = idRaw.split('/');
  if (!ID.test(id || '') || extra !== undefined || (sub !== undefined && !SUB.test(sub))) errors.push('id must be 3 to 40 lower-case letters, digits or dashes, with at most one /part for a poll inside a PAXT.');
  const kind = need('kind');
  if (kind && !KINDS.includes(kind)) errors.push('kind must be one of: ' + KINDS.join(', ') + '.');
  const voice = need('voice');
  if (voice && !VOICES.includes(voice)) errors.push('voice must be one of: ' + VOICES.join(', ') + '.');
  const title = need('title');
  if (title.length > 80) errors.push('title must be 80 characters or fewer.');
  const opens = instant(need('opens')), closes = instant(need('closes'));
  if (Number.isNaN(opens) || Number.isNaN(closes)) errors.push('opens and closes must be dates like 2026-12-01 or 2026-12-01T18:00Z (UTC).');
  else if (closes <= opens) errors.push('closes must come after opens.');
  if (!body.trim()) errors.push('The document needs a body below the dashes.');

  const terms = { id: idRaw, parent: sub !== undefined ? id : null, title, kind, voice, opens, closes, body };
  const known = new Set(['id', 'title', 'kind', 'voice', 'opens', 'closes']);
  const int = (k, lo, hi) => { known.add(k); const v = need(k); const n = /^\d{1,6}$/.test(v) ? Number(v) : NaN; if (!(n >= lo && n <= hi)) errors.push(k + ' must be a whole number from ' + lo + ' to ' + hi + '.'); return n; };
  const list = (k) => { known.add(k); const xs = need(k).split(',').map((x) => x.trim()).filter(Boolean); if (xs.length < 2 || xs.length > 40 || xs.some((x) => !OPTION.test(x)) || new Set(xs).size !== xs.length) errors.push(k + ' must be 2 to 40 different names of lower-case letters, digits or dashes, separated by commas.'); return xs; };

  if (kind === 'paxt') {
    if (sub !== undefined) errors.push('A PAXT has a plain id; only a poll or an election sits inside one.');
    terms.threshold = int('threshold', 1, 100000);
    terms.options = ['join', 'leave'];
    terms.pick = 1;
  } else if (kind === 'poll') {
    terms.options = list('options');
    terms.pick = 1;
    known.add('rule');
    const rule = need('rule');
    const net = /^net (\d{1,2})$/.exec(rule), maj = /^majority (\d{1,6})$/.exec(rule);
    if (net) {
      terms.rule = { type: 'net', percent: Number(net[1]) };
      if (!(terms.rule.percent >= 1 && terms.rule.percent <= 99)) errors.push('rule net takes a percent from 1 to 99.');
      if (!terms.options.includes('yes') || !terms.options.includes('no')) errors.push('rule net needs the options yes and no.');
    } else if (maj) terms.rule = { type: 'majority', quorum: Number(maj[1]) };
    else errors.push('rule must be "net <percent>" or "majority <quorum>".');
  } else if (kind === 'election') {
    terms.options = list('options');
    terms.seats = int('seats', 1, 39);
    terms.pick = int('pick', 1, 40);
    if (terms.options.length && terms.seats >= terms.options.length) errors.push('seats must be fewer than the candidates.');
    if (terms.options.length && terms.pick > terms.options.length) errors.push('pick cannot be more than the candidates.');
  }
  if (kind === 'poll' || kind === 'election') {
    known.add('electorate');
    terms.electorate = f.electorate || 'list';
    if (!['list', 'partners'].includes(terms.electorate)) errors.push('electorate must be list (every masternode) or partners (the keys that joined the PAXT this sits inside).');
    if (terms.electorate === 'partners' && sub === undefined) errors.push('electorate partners needs an id of the form <paxt>/<name>.');
  }
  for (const k of Object.keys(f)) if (!known.has(k)) errors.push('The header has a line this version does not know: ' + k + '.');
  return errors.length ? { ok: false, errors } : { ok: true, terms };
}

/* ------------------------------------------------------------------ the line */

export function ballotLine({ id, choices, digest, rev = 1 }) {
  const cs = [...new Set(choices)].sort();
  return VERSION + ' ' + id + ' ' + cs.join('+') + ' ' + digest + (rev > 1 ? ' #' + rev : '');
}

export function parseLine(line) {
  const m = LINE.exec(String(line ?? ''));
  if (!m) return null;
  const choices = m[2].split('+');
  if (new Set(choices).size !== choices.length) return null;
  if ([...choices].sort().join('+') !== m[2]) return null;
  return { id: m[1], choices, digest: m[3], rev: m[4] ? Number(m[4]) : 1 };
}

/** why this line does not belong to this document, or null when it does */
export function lineProblem(terms, digestShort, parsed) {
  if (!parsed) return 'This is not a PAXT line.';
  if (parsed.id !== terms.id) return 'This line is for another document (' + parsed.id + ').';
  if (parsed.digest !== digestShort) return 'This line names another text. The document has changed or was copied wrongly.';
  if (parsed.choices.length > terms.pick) return 'This ballot names more choices than the document allows (' + terms.pick + ').';
  for (const c of parsed.choices) if (!terms.options.includes(c)) return 'The document has no choice named ' + c + '.';
  return null;
}

/* ------------------------------------------------------------------ who may speak */

/** From Dash Core's `masternodelist json`: each ENABLED masternode gives its weight (1, or 4 for an Evo node, as in
    Dash's own governance) to the address of the chosen voice. One address can carry many masternodes. */
export function electorateOf(list, voice) {
  if (!VOICES.includes(voice)) throw new Error('unknown voice');
  const field = voice + 'address';
  const weights = new Map();
  let total = 0, nodes = 0;
  for (const e of Object.values(list || {})) {
    if (!e || e.status !== 'ENABLED') continue;
    const a = e[field];
    if (typeof a !== 'string' || !a) continue;
    const w = e.type === 'Evo' ? 4 : 1;
    weights.set(a, (weights.get(a) || 0) + w);
    total += w; nodes++;
  }
  return { weights, total, nodes };
}

/** a short fingerprint of a whole electorate, so two people can tell whether they counted against the same list */
export async function electorateHash(weights) {
  const rows = [...weights.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([a, w]) => a + ' ' + w).join('\n');
  return sha256hex(rows + '\n');
}

/* ------------------------------------------------------------------ the record */

/** each entry in the open record names the one before it, so a removed or reordered entry shows */
export async function entryHash(prev, e) {
  return sha256hex(prev + '\n' + e.address + '\n' + e.line + '\n' + e.sig);
}

export async function chainOf(digestFull, ballots) {
  let prev = digestFull;
  const hashes = [];
  for (const b of ballots) { prev = await entryHash(prev, b); hashes.push(prev); }
  return { hashes, head: prev };
}

/* ------------------------------------------------------------------ the count */

/** Count a record.
      terms, digestShort   from parseDoc and digestOf
      ballots              [{ address, line, sig }] in the order they were received
      weightOf(address)    the weight that address carries in the electorate (0: no voice)
      total                the electorate's whole weight
      verify(address, line, sig)   true when the signature is that address's signature of that line. Optional:
                           leave it out only when every ballot was already checked.
    Returns the totals, the outcome by the document's own rule, and what was set aside and why. */
export async function count({ terms, digestShort, ballots, weightOf, total, verify }) {
  const aside = { malformed: 0, wrongDocument: 0, badSignature: 0, noVoice: 0, replaced: 0, conflicting: 0 };
  const best = new Map();
  for (const b of ballots) {
    const parsed = parseLine(b.line);
    if (!parsed) { aside.malformed++; continue; }
    if (lineProblem(terms, digestShort, parsed)) { aside.wrongDocument++; continue; }
    if (verify && !(await verify(b.address, b.line, b.sig))) { aside.badSignature++; continue; }
    const w = weightOf(b.address) || 0;
    if (w <= 0) { aside.noVoice++; continue; }
    const key = parsed.choices.join('+');
    const cur = best.get(b.address);
    if (!cur) { best.set(b.address, { rev: parsed.rev, key, choices: parsed.choices, w, void: false }); continue; }
    if (parsed.rev > cur.rev) { aside.replaced++; best.set(b.address, { rev: parsed.rev, key, choices: parsed.choices, w, void: false }); continue; }
    if (parsed.rev < cur.rev) { aside.replaced++; continue; }
    /* the same revision signed twice: once with the same choice is a repeat, with another choice it is a conflict */
    if (key !== cur.key) cur.void = true;
  }
  const by = Object.fromEntries(terms.options.map((o) => [o, 0]));
  let spoke = 0, keys = 0;
  for (const v of best.values()) {
    if (v.void) { aside.conflicting++; continue; }
    keys++; spoke += v.w;
    for (const c of v.choices) by[c] += v.w;
  }
  const out = { by, keys, spoke, total, turnout: total ? spoke / total : 0, aside };
  if (terms.kind === 'paxt') {
    out.joined = by.join;
    out.inForce = by.join >= terms.threshold;
    out.outcome = out.inForce ? 'in force' : 'below its threshold';
  } else if (terms.kind === 'poll' && terms.rule.type === 'net') {
    /* Dash's own rule, as Dash Core counts it: yes minus no must reach the whole-number part of that share of the list */
    const needed = Math.max(1, Math.floor((terms.rule.percent / 100) * total));
    out.net = by.yes - by.no; out.needed = needed;
    out.passes = total > 0 && out.net >= needed;
    out.outcome = out.passes ? 'passes' : 'does not pass';
  } else if (terms.kind === 'poll') {
    const ranked = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const quorate = spoke >= terms.rule.quorum;
    const clear = ranked.length > 1 && ranked[0][1] > ranked[1][1];
    out.quorate = quorate; out.leader = clear ? ranked[0][0] : null;
    out.outcome = !quorate ? 'below its quorum' : clear ? ranked[0][0] : 'tied';
  } else {
    const ranked = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const last = ranked[terms.seats - 1][1], next = ranked[terms.seats][1];
    /* a tie across the last seat is reported, never broken silently */
    out.tieAtLastSeat = last === next;
    out.elected = ranked.filter((r) => r[1] > next).slice(0, terms.seats).map((r) => r[0]);
    out.tied = out.tieAtLastSeat ? ranked.filter((r) => r[1] === last).map((r) => r[0]) : [];
    out.outcome = out.tieAtLastSeat ? 'tied at the last seat' : 'elected';
  }
  return out;
}

/** the addresses whose counted choice in a PAXT record is join: the partners, for a poll held among them */
export async function partnersOf({ terms, digestShort, ballots, weightOf, verify }) {
  const best = new Map();
  for (const b of ballots) {
    const parsed = parseLine(b.line);
    if (!parsed || lineProblem(terms, digestShort, parsed)) continue;
    if (verify && !(await verify(b.address, b.line, b.sig))) continue;
    if ((weightOf(b.address) || 0) <= 0) continue;
    const cur = best.get(b.address);
    if (!cur || parsed.rev > cur.rev) best.set(b.address, { rev: parsed.rev, c: parsed.choices[0], void: false });
    else if (parsed.rev === cur.rev && parsed.choices[0] !== cur.c) cur.void = true;
  }
  return new Set([...best.entries()].filter(([, v]) => !v.void && v.c === 'join').map(([a]) => a));
}
