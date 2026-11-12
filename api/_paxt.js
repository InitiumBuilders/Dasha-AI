/* PAXT ON THE SERVER: the open record and its count.

   A PAXT is an agreement between communities, written as one plain-text document. A partner says so by signing one
   line with a wallet they already hold (the protocol is api/_paxt-core.mjs, a byte-for-byte copy of the reference
   implementation). This file keeps the open record and counts it:

     - It holds no key and moves no funds. It reads signatures; it never makes one.
     - Every entry is checked before it is kept: the line belongs to the document, the signature is that address's
       (Dash's own library, the same check as Dash Core's verifymessage), and the address carries a vote on the
       public masternode list. A key with no masternode cannot write here, which is also what keeps strangers out.
     - The record is a public file in the Dasha-AI repo (PAXT/<id>.json). Each entry names the one before it, so a
       removed or reordered entry shows. Anyone can fetch the file, check each signature in their own Dash Core
       (File, Verify message) and count again.
     - Signed lines come in through the web page, never through a Telegram room: a line posted in a room would tie
       a person's Telegram name to their masternode for everyone there.

   The names PAXT, Dash PAXT and Telepaxt are August's (2026-11-12). */
const { Message } = require('@dashevo/dashcore-lib');

const REPO = 'InitiumBuilders/Dasha-AI';
const GH = 'https://api.github.com/repos/' + REPO + '/contents/';
const DIR = 'PAXT/';
const SITE = 'https://www.dashsupport.team';
const RPC = () => process.env.DASH_RPC_URL || 'https://rpc.digitalcash.dev/';
/* the host alone: a node address that carries a user name or a password must never reach a public record */
function hostOf(u) { try { return new URL(u).host; } catch (e) { return 'a Dash Core node'; } }
const LIST_AGE_MS = 10 * 60e3;
const MAX_PER_KEY = 6, MAX_ENTRIES = 6000, MAX_NEW_PER_DAY = 12;

let coreP = null;
const core = () => coreP || (coreP = import('./_paxt-core.mjs'));

/** true when sig is that address's signature of that line, in Dash's signed-message format */
function verify(address, line, sig) {
  try { return new Message(String(line)).verify(String(address), String(sig)) === true; } catch (e) { return false; }
}

const HDRS = () => ({ Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, 'User-Agent': 'dasha-paxt', Accept: 'application/vnd.github+json' });
async function ghGet(path) {
  try {
    const r = await fetch(GH + path + '?t=' + Date.now(), { headers: HDRS() });
    if (r.status === 404) return { text: null, sha: null, missing: true };
    if (!r.ok) return { text: null, sha: null, failed: true };
    const d = await r.json();
    return { text: Buffer.from(d.content || '', 'base64').toString('utf8'), sha: d.sha || null };
  } catch (e) { return { text: null, sha: null, failed: true }; }
}
async function ghPut(path, content, message, sha) {
  try {
    const body = { message, content: Buffer.from(content).toString('base64'), committer: { name: 'Dasha PAXT', email: 'Help@DashSupport.Team' } };
    if (sha) body.sha = sha;
    const r = await fetch(GH + path, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, HDRS()), body: JSON.stringify(body) });
    return r.status;
  } catch (e) { return 0; }
}

/* ---------- the masternode list: who has a voice, read from a public Dash Core node ---------- */
let listCache = null;
async function rpc(method, params) {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(RPC(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, params: params || [] }), signal: ctl.signal });
    const d = await r.json();
    if (!d || d.error) throw new Error(method + ' failed');
    return d.result;
  } finally { clearTimeout(timer); }
}
async function readList() {
  if (listCache && Date.now() - listCache.at < LIST_AGE_MS) return listCache;
  const height = await rpc('getblockcount');
  const list = await rpc('masternodelist', ['json']);
  if (!list || typeof list !== 'object' || Object.keys(list).length < 100) throw new Error('the masternode list came back empty');
  const hash = await rpc('getblockhash', [height]);
  listCache = { at: Date.now(), list, height, hash, source: hostOf(RPC()) };
  return listCache;
}

const fileOf = (id) => DIR + String(id).replace('/', '--') + '.json';
const ADDRESS = /^[X7][1-9A-HJ-NP-Za-km-z]{25,34}$/;
const SIG = /^[A-Za-z0-9+/]{80,96}={0,2}$/;
const fail = (status, error) => ({ status, body: { ok: false, error } });

async function readRecord(id) {
  const g = await ghGet(fileOf(id));
  if (g.failed) return { failed: true };
  if (g.missing || !g.text) return { missing: true };
  try { return { rec: JSON.parse(g.text), sha: g.sha }; } catch (e) { return { failed: true }; }
}

/** who may speak in this document, and how much: the list by the document's voice, or the partners of its PAXT */
async function electorate(P, terms, L) {
  const E = P.electorateOf(L.list, terms.voice);
  if (terms.electorate !== 'partners') return { weightOf: (a) => E.weights.get(a) || 0, total: E.total, nodes: E.nodes, hash: await P.electorateHash(E.weights) };
  const parent = await readRecord(terms.parent);
  if (!parent.rec) return { error: 'The PAXT this sits inside (' + terms.parent + ') has no record yet.' };
  const pr = P.parseDoc(parent.rec.doc);
  if (!pr.ok) return { error: 'The PAXT this sits inside could not be read.' };
  if (pr.terms.voice !== terms.voice) return { error: 'A poll among partners must use the voice of its PAXT (' + pr.terms.voice + ').' };
  const pd = await P.digestOf(parent.rec.doc);
  const partners = await P.partnersOf({ terms: pr.terms, digestShort: pd.short, ballots: parent.rec.ballots || [], weightOf: (a) => E.weights.get(a) || 0 });
  const w = new Map([...E.weights].filter(([a]) => partners.has(a)));
  let total = 0; for (const x of w.values()) total += x;
  return { weightOf: (a) => w.get(a) || 0, total, nodes: partners.size, hash: await P.electorateHash(w) };
}

const stateOf = (terms, now) => (now < terms.opens ? 'not open yet' : now >= terms.closes ? 'closed' : 'open');
const day = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

/** GET: one record, counted. After the closing time the count is taken once against the list as it stands and kept. */
async function view(id) {
  const P = await core();
  if (!/^[a-z0-9-]{3,40}(\/[a-z0-9-]{1,24})?$/.test(String(id || ''))) return fail(400, 'That is not a PAXT id.');
  const got = await readRecord(id);
  if (got.failed) return fail(502, 'The record could not be read just now.');
  if (got.missing) return fail(404, 'There is no record with that id.');
  const rec = got.rec;
  const pr = P.parseDoc(rec.doc);
  if (!pr.ok) return fail(500, 'The record holds a document that no longer reads.');
  const terms = pr.terms, d = await P.digestOf(rec.doc), now = Date.now(), state = stateOf(terms, now);
  const ballots = rec.ballots || [];
  let count = null, list = null, note = null;
  if (rec.closed) { count = rec.closed.count; list = rec.closed.list; }
  else {
    try {
      const L = await readList(); const E = await electorate(P, terms, L);
      if (E.error) note = E.error;
      else {
        count = await P.count({ terms, digestShort: d.short, ballots, weightOf: E.weightOf, total: E.total });
        list = { height: L.height, hash: L.hash, at: new Date(L.at).toISOString(), total: E.total, keys: E.nodes, fingerprint: E.hash.slice(0, 32), source: L.source };
        if (state === 'closed') {
          /* the closing count, taken once and kept with the list it was counted against */
          rec.closed = { at: new Date(now).toISOString(), list, count };
          await ghPut(fileOf(id), JSON.stringify(rec, null, 1) + '\n', 'paxt: ' + id + ' closed', got.sha);
        }
      }
    } catch (e) { note = 'The masternode list could not be read just now, so nothing is counted here. The record below is complete.'; }
  }
  return { status: 200, body: { ok: true, id: terms.id, title: terms.title, kind: terms.kind, voice: terms.voice, options: terms.options, pick: terms.pick,
    threshold: terms.threshold || null, rule: terms.rule || null, seats: terms.seats || null, electorate: terms.electorate || 'list',
    opens: new Date(terms.opens).toISOString(), closes: new Date(terms.closes).toISOString(), state,
    doc: rec.doc, digest: d.full, short: d.short, head: ballots.length ? ballots[ballots.length - 1].hash : d.full, entries: ballots.length,
    count, list, final: !!rec.closed, note, ballots: ballots.slice(-400),
    file: 'https://github.com/' + REPO + '/blob/main/' + fileOf(id) } };
}

/** GET with no id: the records there are */
async function index() {
  const g = await ghGet(DIR + 'index.json');
  if (g.failed) return fail(502, 'The list of records could not be read just now.');
  let rows = []; try { rows = JSON.parse(g.text || '[]'); } catch (e) { rows = []; }
  return { status: 200, body: { ok: true, records: rows } };
}

/** POST: one signed line. With `doc`, and no record under that id yet, the line opens the record. */
async function submit(input) {
  const P = await core();
  const address = String((input && input.address) || '').trim(), line = String((input && input.line) || '').trim(), sig = String((input && input.sig) || '').trim();
  if (!ADDRESS.test(address)) return fail(400, 'That is not a Dash address.');
  if (!SIG.test(sig)) return fail(400, 'That is not a signature as Dash wallets write them.');
  const parsed = P.parseLine(line);
  if (!parsed) return fail(400, 'That is not a PAXT line. It should read: paxt1 <id> <choice> <hash>.');
  if (!process.env.GITHUB_TOKEN) return fail(503, 'The open record is not connected on this server.');

  for (let attempt = 0; attempt < 3; attempt++) {
    const got = await readRecord(parsed.id);
    if (got.failed) return fail(502, 'The record could not be read just now. Nothing was recorded.');
    let rec = got.rec, opening = false;
    if (!rec) {
      if (!input.doc) return fail(404, 'There is no record with that id yet. Send the document with the first signed line to open one.');
      rec = { v: 1, doc: P.canon(String(input.doc)), opened: new Date().toISOString(), ballots: [] };
      opening = true;
    }
    const pr = P.parseDoc(rec.doc);
    if (!pr.ok) return fail(400, 'The document does not read as a PAXT document: ' + pr.errors.slice(0, 3).join(' '));
    const terms = pr.terms, d = await P.digestOf(rec.doc);
    if (opening && terms.id !== parsed.id) return fail(400, 'The line is for ' + parsed.id + ' and the document is ' + terms.id + '.');
    const problem = P.lineProblem(terms, d.short, parsed);
    if (problem) return fail(400, problem);
    const now = Date.now(), state = stateOf(terms, now);
    if (opening ? now >= terms.closes : state !== 'open') return fail(409, state === 'closed' ? 'This closed on ' + day(terms.closes) + '.' : 'This opens on ' + day(terms.opens) + '.');
    if (!verify(address, line, sig)) return fail(400, 'The signature does not match that address and that line. Sign the line exactly as shown, with the address you entered.');
    let L; try { L = await readList(); } catch (e) { return fail(503, 'The masternode list could not be read just now. Nothing was recorded; try again in a minute.'); }
    const E = await electorate(P, terms, L);
    if (E.error) return fail(409, E.error);
    const weight = E.weightOf(address);
    if (!(weight > 0)) return fail(403, 'That address carries no vote here. This document counts the ' + terms.voice + ' key of an enabled masternode' + (terms.electorate === 'partners' ? ' that has joined its PAXT.' : '.'));

    const mine = rec.ballots.filter((b) => b.address === address);
    if (mine.some((b) => b.line === line)) return { status: 200, body: { ok: true, already: true, id: terms.id, entries: rec.ballots.length, weight } };
    if (mine.length >= MAX_PER_KEY) return fail(429, 'This key has changed its line ' + MAX_PER_KEY + ' times already. The record keeps the highest revision.');
    if (rec.ballots.length >= MAX_ENTRIES) return fail(429, 'This record is full.');
    if (opening) {
      const ix = await ghGet(DIR + 'index.json'); let rows = []; try { rows = JSON.parse(ix.text || '[]'); } catch (e) { rows = []; }
      const today = new Date().toISOString().slice(0, 10);
      if (rows.filter((r) => String(r.opened || '').slice(0, 10) === today).length >= MAX_NEW_PER_DAY) return fail(429, 'Enough new records were opened today. Try again tomorrow.');
    }
    const prev = rec.ballots.length ? rec.ballots[rec.ballots.length - 1].hash : d.full;
    const entry = { at: new Date().toISOString(), address, line, sig };
    entry.hash = await P.entryHash(prev, entry);
    rec.ballots.push(entry);
    const status = await ghPut(fileOf(terms.id), JSON.stringify(rec, null, 1) + '\n', 'paxt: ' + terms.id + (opening ? ' opened' : ' entry ' + rec.ballots.length), got.sha);
    if (status === 200 || status === 201) {
      if (opening) await addToIndex({ id: terms.id, title: terms.title, kind: terms.kind, voice: terms.voice, short: d.short, opened: rec.opened, closes: new Date(terms.closes).toISOString() });
      return { status: 200, body: { ok: true, id: terms.id, opened: opening, entries: rec.ballots.length, head: entry.hash, weight } };
    }
    /* someone else's entry landed first: read again and place this one after it */
    if (status !== 409 && status !== 422) return fail(502, 'The record could not be written just now. Nothing was recorded.');
  }
  return fail(503, 'The record is busy. Nothing was recorded; send the line again.');
}

async function addToIndex(row) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const g = await ghGet(DIR + 'index.json');
    if (g.failed) return;
    let rows = []; try { rows = JSON.parse(g.text || '[]'); } catch (e) { rows = []; }
    if (rows.some((r) => r.id === row.id)) return;
    rows.push(row);
    const s = await ghPut(DIR + 'index.json', JSON.stringify(rows, null, 1) + '\n', 'paxt: index ' + row.id, g.sha);
    if (s === 200 || s === 201) return;
  }
}

/* ---------- the Telepaxt: what Dasha says in a room ---------- */
const HELP = 'A Telepaxt is a room for one PAXT: an agreement that masternode owners join by signing one line with a wallet they already hold.\n\n'
  + '/paxt <id>: where a PAXT stands (its text hash, the count, the record)\n'
  + '/signal Question? | choice | choice: a quick poll in this room (admins). It shows where people stand and binds no one.\n\n'
  + 'Signed lines go through the page, never through this room: ' + SITE + '/paxt\n'
  + 'A line posted here would tie your Telegram name to your masternode for everyone in the group.\n\n'
  + 'I hold no keys and move no funds. Every signature can be checked in Dash Core: File, Verify message.';
const IN_ROOM = 'Please keep signed lines out of the room. A line posted here ties your Telegram name to your masternode for everyone in this group. Send it through the page instead: ' + SITE + '/paxt';

function countLine(b) {
  const c = b.count;
  if (!c) return b.note || 'Not counted yet.';
  if (b.kind === 'paxt') return 'Joined: ' + c.joined + ' of ' + b.threshold + ' votes needed, from ' + c.keys + (c.keys === 1 ? ' key. ' : ' keys. ') + (c.inForce ? 'In force.' : 'Not in force yet.');
  if (b.kind === 'poll' && b.rule && b.rule.type === 'net') return 'Yes ' + c.by.yes + ', no ' + c.by.no + '. Net ' + c.net + ' of ' + c.needed + ' needed. ' + (c.passes ? 'Passes.' : 'Does not pass yet.');
  if (b.kind === 'poll') return Object.keys(c.by).map((k) => k + ' ' + c.by[k]).join(', ') + '. ' + (c.quorate ? (c.leader ? 'Leading: ' + c.leader + '.' : 'Tied.') : 'Below its quorum of ' + b.rule.quorum + '.');
  return 'Votes: ' + Object.keys(c.by).sort((x, y) => c.by[y] - c.by[x]).map((k) => k + ' ' + c.by[k]).join(', ') + '. ' + (c.tieAtLastSeat ? 'Tied at the last seat.' : 'Seated: ' + c.elected.join(', ') + '.');
}

/** the reply to /paxt and /tally in a room: where one PAXT stands, in words anyone can check */
async function telegram(text) {
  const m = String(text || '').match(/^\/(?:paxt|tally)(?:@\w+)?\s*([a-z0-9-]{3,40}(?:\/[a-z0-9-]{1,24})?)?\s*$/i);
  if (!m) return /paxt1 |[A-Za-z0-9+/]{80,}={0,2}/.test(String(text || '')) ? IN_ROOM : HELP;
  if (!m[1]) return HELP;
  const r = await view(m[1].toLowerCase());
  if (!r.body.ok) return r.body.error + '\n\n' + SITE + '/paxt';
  const b = r.body;
  const kind = b.kind === 'paxt' ? 'A Dash PAXT' : b.kind === 'poll' ? 'A poll' : 'An election';
  return b.title + ' (' + b.id + ')\n'
    + kind + ', spoken by ' + b.voice + ' keys' + (b.electorate === 'partners' ? ' of its partners' : '') + '. '
    + (b.state === 'open' ? 'Open until ' + day(Date.parse(b.closes)) + '.' : b.state === 'closed' ? 'Closed ' + day(Date.parse(b.closes)) + (b.final ? '. This count is final.' : '.') : 'Opens ' + day(Date.parse(b.opens)) + '.') + '\n\n'
    + countLine(b) + '\n'
    + (b.list ? 'Counted against the masternode list at height ' + b.list.height + ': ' + b.list.total + ' votes.\n' : '')
    + '\nText hash: ' + b.short + '\nRecord head: ' + String(b.head).slice(0, 16) + ' (' + b.entries + (b.entries === 1 ? ' entry' : ' entries') + ')\n\n'
    + 'Read it, sign one line, and check every signature:\n' + SITE + '/paxt?id=' + b.id;
}

/** /signal Question? | choice | choice : a quick anonymous poll in the room, for admins. Telegram keeps it; we keep nothing. */
function parseSignal(text) {
  const m = String(text || '').match(/^\/signal(?:@\w+)?\s+([\s\S]+)$/i);
  if (!m) return null;
  const parts = m[1].split('|').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (parts.length < 3 || parts.length > 11) return null;
  if (parts[0].length > 280 || parts.slice(1).some((o) => o.length > 90)) return null;
  return { question: parts[0], options: parts.slice(1) };
}
const SIGNAL_USAGE = 'A Signal poll needs a question and two to ten choices:\n/signal Should we draft a Keys Apart PAXT? | Yes | No | Not yet';

module.exports = { verify, view, index, submit, telegram, parseSignal, HELP, IN_ROOM, SIGNAL_USAGE, fileOf, _reset: () => { listCache = null; } };
