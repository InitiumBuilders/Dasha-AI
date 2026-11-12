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
   - DASH written first with credits after it (code cannot tell which of the two she meant);
   - anything inside a fenced code block.

   It is pure: it reads no network and keeps no state. fix(text) returns { text, fixed, checked }. */
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
  'get gets minimum maximum least most under over below above than exactly same flat base or thats heres theres whole full exact').split(' '));
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

function fix(text) {
  const tally = { fixed: 0, checked: 0 };
  if (typeof text !== 'string' || !/dash/i.test(text)) return { text: text, fixed: 0, checked: 0 };
  /* fenced code is kept byte for byte */
  const parts = text.split(/(```[\s\S]*?```)/);
  const out = parts.map(function (p, i) { return i % 2 ? p : fixProse(p, tally); }).join('');
  return { text: tally.fixed ? out : text, fixed: tally.fixed, checked: tally.checked };
}

module.exports = { fix: fix, standsAlone: standsAlone, PER_DASH: PER_DASH };
