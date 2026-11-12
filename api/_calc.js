/* THE SUMS. Exact arithmetic for her `calculate` tool: + - * / ^ and brackets over numbers, done with whole-number
   fractions so nothing is rounded along the way. A language model sets up a sum well and carries it badly; measured
   live on 2026-11-12, an answer scaled a cost to 50 MB and wrote 1.35 DASH where the sum gives 13.5. Here the
   carrying is done by code, and she copies the result.

   It holds no price and no protocol constant: every number is supplied by the caller. It evaluates nothing but the
   grammar below (there is no eval), reads no network and keeps no state.

   run({ lines, unit }) returns one text block: each line with its exact result, and for an amount in credits or
   duffs the DASH figure beside it, in the shape the units gate checks. */
'use strict';

const MAX_LINES = 8, MAX_LEN = 200, MAX_DIGITS = 60;
const TIMES = String.fromCharCode(215), DIVIDE = String.fromCharCode(247), MINUS = String.fromCharCode(8722);
const UNITS = { credit: 'credits', credits: 'credits', duff: 'duffs', duffs: 'duffs', dash: 'DASH', byte: 'bytes', bytes: 'bytes' };
const PER_DASH = { credits: 100000000000n, duffs: 100000000n };

/* ---- whole-number fractions ---- */
const abs = (a) => (a < 0n ? -a : a);
function gcd(a, b) { a = abs(a); b = abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
function frac(n, d) {
  if (d === 0n) throw new Error('a division by zero');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n;
  n /= g; d /= g;
  if (String(abs(n)).length > MAX_DIGITS || String(d).length > MAX_DIGITS) throw new Error('a number too large to carry exactly');
  return { n: n, d: d };
}
const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
const div = (a, b) => frac(a.n * b.d, a.d * b.n);
function pow(a, b) {
  if (b.d !== 1n || b.n < 0n || b.n > 40n) throw new Error('a power that is not a whole number from 0 to 40');
  let r = frac(1n, 1n);
  for (let i = 0n; i < b.n; i++) r = mul(r, a);
  return r;
}

/* ---- the grammar: sum := term (('+'|'-') term)*   term := factor (('*'|'/') factor)*
        factor := unary ('^' factor)?   unary := '-' unary | number '%'? | '(' sum ')' ---- */
function tokens(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c >= '0' && c <= '9' || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
      /* the whole part may carry commas or underscores inside it, and ends on a digit: 1,200,000 */
      const m = /^(\d[\d,_]*\d|\d)?(?:\.(\d+))?(?:[eE]([+-]?\d{1,3}))?/.exec(src.slice(i));
      if (!m || !m[0]) throw new Error('a number that cannot be read');
      const whole = (m[1] || '0').replace(/[,_]/g, ''), dec = m[2] || '';
      if (whole.length + dec.length > MAX_DIGITS) throw new Error('a number too long to carry exactly');
      let v = frac(BigInt(whole + dec), 10n ** BigInt(dec.length));
      if (m[3] !== undefined) { const e = parseInt(m[3], 10); if (Math.abs(e) > 40) throw new Error('an exponent past 40'); v = e >= 0 ? mul(v, frac(10n ** BigInt(e), 1n)) : div(v, frac(10n ** BigInt(-e), 1n)); }
      out.push({ t: 'num', v: v });
      i += m[0].length;
      continue;
    }
    if ('+-*/^()%'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
    if (c === TIMES) { out.push({ t: '*' }); i++; continue; }
    if (c === DIVIDE) { out.push({ t: '/' }); i++; continue; }
    if (c === MINUS) { out.push({ t: '-' }); i++; continue; }
    /* an x between two numbers is "times": 27,000 x 100 */
    if ((c === 'x' || c === 'X') && out.length && /[\d) ]/.test(src[i - 1] || '') && /[\d(. ]/.test(src[i + 1] || '')) { out.push({ t: '*' }); i++; continue; }
    throw new Error('something that is not a number or a sign: "' + src.slice(i, i + 12).trim() + '"');
  }
  return out;
}
function evaluate(src) {
  const tk = tokens(src);
  let p = 0, depth = 0;
  const peek = () => (tk[p] ? tk[p].t : null);
  function unary() {
    if (peek() === '-') { p++; const v = unary(); return frac(-v.n, v.d); }
    if (peek() === '+') { p++; return unary(); }
    if (peek() === '(') {
      if (++depth > 20) throw new Error('brackets nested too deep');
      p++; const v = sum();
      if (peek() !== ')') throw new Error('a bracket that is not closed');
      p++; depth--; return v;
    }
    if (peek() === 'num') { let v = tk[p++].v; if (peek() === '%') { p++; v = div(v, frac(100n, 1n)); } return v; }
    throw new Error(peek() ? 'a sign where a number should be' : 'a sum that ends early');
  }
  function factor() { const a = unary(); if (peek() === '^') { p++; return pow(a, factor()); } return a; }
  function term() {
    let a = factor();
    for (;;) {
      if (peek() === '*') { p++; a = mul(a, factor()); }
      else if (peek() === '/') { p++; a = div(a, factor()); }
      else if (peek() === 'num' || peek() === '(') throw new Error('two numbers with no sign between them');
      else return a;
    }
  }
  function sum() {
    let a = term();
    for (;;) {
      if (peek() === '+') { p++; a = add(a, term()); }
      else if (peek() === '-') { p++; a = sub(a, term()); }
      else return a;
    }
  }
  if (!tk.length) throw new Error('an empty line');
  const v = sum();
  if (p < tk.length) throw new Error(tk[p].t === ')' ? 'a closing bracket with no opening one' : 'something left over after the sum');
  return v;
}

/* ---- writing a fraction down: exactly when it ends, to twelve digits and marked "about" when it does not ---- */
const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function show(v) {
  const neg = v.n < 0n, n = abs(v.n), d = v.d;
  let rest = d, k = 0;
  while (rest % 2n === 0n) rest /= 2n;
  while (rest % 5n === 0n) rest /= 5n;
  const whole = n / d;
  let text, exact = true;
  if (d === 1n) text = group(String(whole));
  else if (rest === 1n) {
    let scale = 1n;
    while (scale % d !== 0n) { scale *= 10n; k++; }
    const all = String(n * (scale / d)).padStart(k + 1, '0');
    text = group(all.slice(0, all.length - k)) + '.' + all.slice(all.length - k).replace(/0+$/, '');
  } else {
    exact = false;
    /* twelve digits that count: long division, then rounded on the thirteenth */
    const lead = String(whole) === '0' ? 0 : String(whole).length;
    let places = Math.max(0, 12 - lead);
    if (lead === 0) { let t = n * 10n; while (t < d && places < 40) { t *= 10n; places++; } }
    const scaled = (n * 10n ** BigInt(places + 1)) / d;
    const rounded = String((scaled + 5n) / 10n).padStart(places + 1, '0');
    text = group(rounded.slice(0, rounded.length - places)) + (places ? '.' + rounded.slice(rounded.length - places).replace(/0+$/, '') : '');
    text = text.replace(/\.$/, '');
  }
  return { text: (neg ? '-' : '') + text, exact: exact };
}

function one(raw, fallbackUnit) {
  let src = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  if (!src) throw new Error('an empty line');
  if (src.length > MAX_LEN) throw new Error('a line longer than ' + MAX_LEN + ' characters');
  /* an optional name before a colon, an optional "= ?" after, an optional unit as the last word */
  let label = '';
  const lm = /^([A-Za-z][A-Za-z0-9 _-]{0,40}):\s*(.+)$/.exec(src);
  if (lm) { label = lm[1].trim(); src = lm[2]; }
  src = src.replace(/\s*=\s*\??\s*$/, '').trim();
  let unit = fallbackUnit || '';
  const um = /^(.*?)[\s]*\b(credits?|duffs?|dash|bytes?)\s*$/i.exec(src);
  if (um && um[1].trim()) { unit = UNITS[um[2].toLowerCase()]; src = um[1].trim(); }
  const v = evaluate(src);
  const s = show(v), about = s.exact ? '' : 'about ';
  let line = (label ? label + ': ' : '') + src + ' = ' + about + s.text + (unit ? ' ' + unit : '');
  if (PER_DASH[unit]) { const dsh = show(div(v, frac(PER_DASH[unit], 1n))); line += ' (' + (dsh.exact ? '' : 'about ') + dsh.text + ' DASH)'; }
  else if (unit === 'DASH') { const cr = show(mul(v, frac(PER_DASH.credits, 1n))); line += ' (' + (cr.exact ? '' : 'about ') + cr.text + ' credits)'; }
  return line;
}

function run(a) {
  const given = (Array.isArray(a && a.lines) ? a.lines : (a && typeof a.lines === 'string' ? a.lines.split('\n') : []))
    .map((x) => String(x == null ? '' : x)).filter((x) => x.trim().length);
  const lines = given.slice(0, MAX_LINES);
  if (!lines.length) return 'ERROR: give one to ' + MAX_LINES + ' lines, each a sum of numbers, for example "50000000 * 27000 credits".';
  const fallback = UNITS[String((a && a.unit) || '').toLowerCase()] || '';
  let failed = 0;
  const out = lines.map(function (raw, i) {
    try { return (i + 1) + '. ' + one(raw, fallback); }
    catch (e) { failed++; return (i + 1) + '. NOT WORKED: ' + String(raw).slice(0, 80) + ' has ' + ((e && e.message) || 'a mistake') + '. Write it with numbers and + - * / only.'; }
  });
  return 'WORKED BY CODE, exactly (whole-number fractions, nothing rounded on the way). Copy each result as it stands, and show the sum beside it.'
    + '\n' + out.join('\n')
    + (failed ? '\n' + failed + ' line' + (failed === 1 ? ' was' : 's were') + ' not worked: fix and send again, and give no figure for a line that was not worked.' : '')
    + (given.length > lines.length ? '\nOnly the first ' + MAX_LINES + ' lines were worked; ' + (given.length - lines.length) + ' more came after them. Send those in another call.' : '')
    + '\nThe numbers going in are yours: a wrong rate or a wrong count gives an exact wrong answer. 1 DASH is 100,000,000,000 credits and 100,000,000 duffs.';
}

module.exports = { run: run, evaluate: evaluate, show: show, one: one };
