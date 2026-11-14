/* THE UNITS GATE. When a reply gives an amount in credits (or duffs) with its DASH equivalent beside it, the pair is
   checked by arithmetic before anyone sees it. One mistake is corrected here: a DASH figure whose digits are right
   and whose decimal point is in the wrong place. Measured live on 2026-11-12: "2,700,000 credits (0.027 DASH)",
   which is 0.000027 DASH. The conversion is eleven decimal places, and here it is done by division.

   A wrong correction is worse than a missed one, so the gate acts only when the amount stands alone as a result:
   at the start of a line, a list item or a table cell, or after "=", ":", an arrow, a comma, or a word such as
   "costs" or "is". What it leaves alone, on purpose:
   - a pair that is already right;
   - an amount that is one term of a sum ("100 x 27,000 credits = 0.000027 DASH" is right as written), a share of
     an amount ("10% of ..."), or a rate against DASH itself ("100,000,000,000 credits per DASH");
   - a DASH figure with other digits (it may be about something else, so it is hers to state);
   - a DASH figure followed by more words inside the same brackets ("0.1 DASH minimum"), which is a fact of its own;
   - DASH written first with credits after it, unless one of the two figures is known to be right (THE OTHER
     ORDER, below);
   - anything inside a fenced code block.

   It is pure: it reads no network and keeps no state. fix(text, { known }) returns { text, fixed, checked };
   known is a list of texts whose figures are taken as right (the person's message, what calculate returned). */
'use strict';

const PER_DASH = { credit: 1e11, credits: 1e11, duff: 1e8, duffs: 1e8 };
const APPROX = String.fromCharCode(8776);          /* the "about equal" sign, built here so no tool can re-encode it */
const EMDASH = String.fromCharCode(8212), ENDASH = String.fromCharCode(8211), ARROW = String.fromCharCode(8594), BULLET = String.fromCharCode(8226);
const NEAR = '(?:[' + APPROX + '=~]|about|around|roughly|approximately|approx\\.?|or)';

/* 1 amount · 2 gap · 3 unit · 4 what sits between · 5 the DASH figure · 6 the word DASH, then the pair has to end */
const PAIR = new RegExp(
  '((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)' +
  '(\\*{0,2}\\s+)(credits?|duffs?)\\b' +
  '(\\*{0,2}(?:\\s+(?:in\\s+total|total|each|per\\s+[a-z]+|a\\s+[a-z]+))?\\*{0,2}' +
  '\\s*(?:\\(\\s*|(?=[' + APPROX + '=~]))(?:' + NEAR + '\\s*){0,2})' +
  '(\\d+(?:\\.\\d+)?)' +
  '(\\s*\\*{0,2}\\s*DASH\\b\\*{0,2})' +
  '(?=\\s*(?:[),.;:|!?]|$|\\n|' + EMDASH + '|versus\\b|vs\\b))',
  'gi');

/* the words that introduce an amount as a result. A word that is not here leaves the pair alone. */
const RESULT_WORDS = new Set(('is are was were be been costs cost costing pays pay paid paying about roughly around approximately approx nearly ' +
  'almost just only total totals totalling totaling to for at charge charges charged fee takes take needs need requires require holds hold ' +
  'spend spends spent burn burns burned lock locks locked save saves saved another extra additional a an the its their your my with has have ' +
  'get gets minimum maximum least most under over below above than exactly same flat base or thats heres theres whole full exact ' +
  'so thus hence therefore means meaning equals worth').split(' '));
/* "a fee of N" states a result; "10% of N" and "a tenth of N" take a share of one */
const SHARE_WORDS = /^(?:%|percent|half|third|thirds|quarter|quarters|fifth|tenth|tenths|hundredth|hundredths|thousandth|thousandths|part|share|fraction|multiple|portion|\d+)$/;
const CURLY = String.fromCharCode(8217);          /* the curly apostrophe a phone types */
const SAFE_END = '=:|(' + ARROW + ',;.!?' + EMDASH + ENDASH;

function standsAlone(str, offset) {
  const lineStart = str.lastIndexOf('\n', offset - 1) + 1;
  const b = str.slice(Math.max(lineStart, offset - 60), offset).replace(/\*\*/g, '').replace(new RegExp('[\\s~' + APPROX + ']+$'), '');
  if (!b.trim()) return true;                                                       /* the line starts with it */
  if (new RegExp('^\\s*(?:[-*+' + BULLET + '>]|\\d{1,2}[.)])$').test(b)) return true;   /* only a list marker before it */
  if (SAFE_END.indexOf(b.slice(-1)) >= 0) return true;
  const m = /([A-Za-z%']+)$/.exec(b.split(CURLY).join("'"));
  if (!m) return false;                                                             /* a sign or a digit before it: a term of a sum */
  const w = m[1].toLowerCase().replace(/'/g, '');
  if (w === 'of') {
    const prev = /([A-Za-z%]+|\d+)\s+of$/i.exec(b);
    return !!prev && !SHARE_WORDS.test(prev[1].toLowerCase());
  }
  return RESULT_WORDS.has(w);
}

/* how many digits she stated: "0.027" is 2, "0.0124" is 3, "0.10" is 2, "17" is 2, "100" is 1 */
function sig(str) {
  const s = String(str);
  if (s.indexOf('.') >= 0) return Math.max(1, s.replace('.', '').replace(/^0+/, '').length);
  return Math.max(1, s.replace(/^0+/, '').replace(/0+$/, '').length);
}
function roundSig(v, s) { return Number(v.toPrecision(s)); }
function truncSig(v, s) {
  const unit = Math.pow(10, Math.floor(Math.log10(v)) - s + 1);
  return Number((Math.floor(v / unit + 1e-9) * unit).toPrecision(s));
}
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
/* a number in plain decimals with s digits kept: 0.000027 in place of 2.7e-5 */
function plain(v, s) {
  const r = roundSig(v, s);
  const decimals = Math.max(0, s - 1 - Math.floor(Math.log10(r)));
  return decimals > 20 ? null : r.toFixed(decimals);
}

function fixProse(text, tally) {
  return text.replace(PAIR, function (whole, amount, gap, unit, mid, dash, tail, offset, str) {
    const per = PER_DASH[unit.toLowerCase()];
    const n = parseFloat(amount.replace(/,/g, '')), x = parseFloat(dash);
    if (!per || !(n > 0) || !(x > 0)) return whole;
    if (/\b(?:per|a|each)\s+(?:dash|duffs?|credits?)\b/i.test(mid)) return whole;   /* a rate against the unit itself */
    if (!standsAlone(str, offset)) return whole;                                    /* a term of a sum, or a share */
    tally.checked++;
    const expected = n / per;
    const k = Math.round(Math.log10(x / expected));
    if (k === 0 || Math.abs(k) > 8) return whole;                    /* the right size, or not a slipped point */
    const s = sig(dash), moved = x / Math.pow(10, k);
    const same = close(moved, roundSig(expected, s)) || (s >= 2 && close(moved, truncSig(expected, s)));
    if (!same) return whole;                                         /* other digits: not ours to touch */
    const right = plain(expected, s);
    if (!right) return whole;
    tally.fixed++;
    return amount + gap + unit + mid + right + tail;
  });
}

/* THE OTHER ORDER (13 Nov 2026). Measured live: "that's 0.25 DASH, or about 25,000 duffs", which is 25,000,000.
   With DASH written first, the pair alone does not say which figure she meant. So one is corrected only when the
   other is known to be right: it stands in the person's own message, or in a result `calculate` returned this turn.
   Known on both sides, or on neither, and the pair stays as she wrote it. The pair also has to be one amount said
   twice: joined by a bracket, "=", "is", "that's", or a word such as "about", and ending its clause. "0.5 DASH or
   5,000 credits, whichever is lower" names two amounts and is left alone. */
const NUM = '((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)';
const REV = new RegExp(
  NUM + '(\\s*\\*{0,2}\\s*DASH\\b\\*{0,2})' +
  '(\\)?\\s*[,:;' + EMDASH + ENDASH + ']?\\s*(?:\\(|[=~' + APPROX + ']|is|equals|or|that[\'' + CURLY + ']?s|that\\s+is|which\\s+is|i\\.e\\.,?)?\\s*(?:or\\s+)?(?:(?:about|around|roughly|approximately|approx\\.?|exactly|[~' + APPROX + '])\\s*)?\\*{0,2})' +
  NUM + '(\\*{0,2}\\s+)(credits?|duffs?)\\b' +
  '(?=\\*{0,2}\\s*(?:[),.;:|!?]|$|\\n|' + EMDASH + '|versus\\b|vs\\b|[\'' + CURLY + ']s?\\s+worth\\b|worth\\b))',
  'gi');
const SAID_TWICE = new RegExp('[(=~' + APPROX + ']|\\b(?:is|equals|thats|about|around|roughly|approximately|approx|exactly)\\b|i\\.e\\.', 'i');
const commas = function (digits) { return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','); };

/* the figures in these texts, each with its unit: "dash:0.25", "credits:25000000000" */
function known(texts) {
  const set = new Set();
  const re = new RegExp(NUM + '\\*{0,2}\\s*\\*{0,2}(dash|credits?|duffs?)\\b', 'gi');
  (Array.isArray(texts) ? texts : []).forEach(function (t) {
    const s = String(t == null ? '' : t).slice(0, 20000);
    let m; re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const v = parseFloat(m[1].replace(/,/g, '')), w = m[2].toLowerCase();
      if (v > 0) set.add((w === 'dash' ? 'dash' : w.charAt(0) === 'c' ? 'credits' : 'duffs') + ':' + v);
    }
  });
  return set;
}

function fixReverse(text, tally, set) {
  if (!set || !set.size) return text;
  return text.replace(REV, function (whole, dash, dtail, mid, amount, gap, unit, offset, str) {
    const per = PER_DASH[unit.toLowerCase()], key = per === 1e11 ? 'credits' : 'duffs';
    const x = parseFloat(dash.replace(/,/g, '')), n = parseFloat(amount.replace(/,/g, ''));
    if (!per || !(x > 0) || !(n > 0)) return whole;
    if (!SAID_TWICE.test(mid.split(CURLY).join('').replace(/'/g, ''))) return whole;   /* two amounts side by side */
    if (!standsAlone(str, offset)) return whole;                                        /* a term of a sum, or a share */
    tally.checked++;
    const k = Math.round(Math.log10(n / (x * per)));
    if (k === 0 || Math.abs(k) > 8) return whole;                    /* the right size, or not a slipped point */
    const kx = set.has('dash:' + x), kn = set.has(key + ':' + n);
    if (kx === kn) return whole;                                     /* known on both sides, or on neither */
    if (kx) {
      /* the DASH figure is known: the other has the right digits and the wrong size */
      const want = x * per, s = sig(amount.replace(/,/g, '')), moved = n / Math.pow(10, k);
      if (!(close(moved, roundSig(want, s)) || (s >= 2 && close(moved, truncSig(want, s))))) return whole;
      const kept = close(moved, roundSig(want, s)) ? roundSig(want, s) : truncSig(want, s), round = Math.round(kept);
      if (!(round > 0) || !close(kept, round)) return whole;          /* not a whole number of credits or duffs */
      tally.fixed++;
      /* her own way with commas: a figure of four digits or more written without them stays without them */
      const bare = amount.indexOf(',') < 0 && amount.split('.')[0].length >= 4;
      return dash + dtail + mid + (bare ? String(round) : commas(String(round))) + gap + unit;
    }
    /* the credits or duffs figure is known: the DASH figure is moved, as in the first order */
    const want = n / per, s = sig(dash.replace(/,/g, '')), moved = x * Math.pow(10, k);
    if (!(close(moved, roundSig(want, s)) || (s >= 2 && close(moved, truncSig(want, s))))) return whole;
    const right = plain(want, s);
    if (!right) return whole;
    tally.fixed++;
    return right + dtail + mid + amount + gap + unit;
  });
}

function fix(text, opts) {
  const tally = { fixed: 0, checked: 0 };
  if (typeof text !== 'string' || !/dash/i.test(text)) return { text: text, fixed: 0, checked: 0 };
  const set = known(opts && opts.known);
  /* fenced code is kept byte for byte */
  const parts = text.split(/(```[\s\S]*?```)/);
  const out = parts.map(function (p, i) { return i % 2 ? p : fixReverse(fixProse(p, tally), tally, set); }).join('');
  return { text: tally.fixed ? out : text, fixed: tally.fixed, checked: tally.checked };
}

module.exports = { fix: fix, standsAlone: standsAlone, PER_DASH: PER_DASH, known: known };
