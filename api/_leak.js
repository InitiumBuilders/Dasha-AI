/* A TOOL CALL WRITTEN AS TEXT.
   Her model asks for a tool through the API's own field. Now and then it writes the call into its answer in its own
   markup, most often in the last round, where no tools are offered. Measured live on 13 Nov 2026: an answer about
   processing fees ended with "Let me run a concrete example:" and a block of DSML tool-call tags, and the sum the
   person was promised did not come.

   read(text)    { found, clean, calls }: clean is the text with every such block taken out; calls is what could be
                 read from the blocks, as { name, args }, four at most.
   tidy(text)    the text without a last line that only announced the call ("Let me run the numbers:").
   starts(text)  true when the text holds the opening of such a block, so a stream can stop showing words.

   Fenced code is left alone, so a person who asks about tool-call formats gets their example back whole.
   This file only reads text. It runs nothing: the brain decides what to do with a call it finds. */
'use strict';

const FW = String.fromCharCode(0xFF5C);     /* the fullwidth bar DeepSeek writes its tags with */
const LOW = String.fromCharCode(0x2581);    /* the low block its older tags use where a space would be */
const B = '[|' + FW + ']';
const U = '[_ ' + LOW + ']';
const DS = B + '\\s*DSML\\s*' + B;
const OLD_OPEN = B + 'tool' + U + 'calls?' + U + 'begin' + B + '>';
const OLD_END = B + 'tool' + U + 'calls?' + U + 'end' + B + '>';

/* each kind of block: how it opens, and the closing tags that end it, tried in order. A block with no closing tag
   runs to the end of the text, which is what a reply cut off in the middle of a call looks like. */
const KINDS = [
  { open: new RegExp('<' + DS, 'i'), close: [new RegExp('</' + DS + '(?:tool_calls|function_calls)>', 'i'), new RegExp('</' + DS + 'invoke>', 'i')] },
  { open: new RegExp('<' + OLD_OPEN, 'i'), close: [new RegExp('<' + B + 'tool' + U + 'calls' + U + 'end' + B + '>', 'i'), new RegExp('<' + OLD_END, 'i')] },
  { open: /<tool_call>/i, close: [/<\/tool_call>/i] },
  { open: /<function_calls>/i, close: [/<\/function_calls>/i] },
  { open: /<invoke\s+name=/i, close: [/<\/invoke>/i] },
];
/* for a stream: the fullwidth form is stopped at its first two characters, the plain forms once the word is there */
const STREAM_OPEN = new RegExp('<' + FW + '|<\\|\\s*(?:DSML|tool' + U + 'call)|<tool_call>|<function_calls>|<invoke\\s+name=', 'i');

/* a call counts only when it was written whole, closing tag and all: a reply cut off inside a call offers nothing to run */
const INVOKE = new RegExp('<(?:' + DS + ')?invoke\\s+name="([^"]{1,60})"\\s*>([\\s\\S]*?)</(?:' + DS + ')?invoke>', 'gi');
const PARAM = new RegExp('<(?:' + DS + ')?parameter\\s+name="([^"]{1,60})"(?:\\s+string="(true|false)")?\\s*>([\\s\\S]*?)</(?:' + DS + ')?parameter>', 'gi');
const JSON_CALL = /<tool_call>\s*([\s\S]*?)\s*(?:<\/tool_call>|$)/gi;
const OLD_CALL = new RegExp('tool' + U + 'sep' + B + '>\\s*([A-Za-z0-9_]{1,60})\\s*(?:```(?:json)?\\s*)?(\\{[\\s\\S]*?\\})\\s*(?:```\\s*)?<' + B + 'tool' + U + 'call' + U + 'end', 'gi');

const NAME = /^[A-Za-z0-9_]{1,60}$/;
const MAX_CALLS = 4, MAX_BLOCKS = 4, MAX_PARSE = 20000;   /* a block is read for calls only this far in */

/* fenced code keeps its length and loses its content, so a tag inside it is never seen and every index still lines up */
function mask(text) {
  return text.replace(/```[\s\S]*?(?:```|$)/g, function (m) { return ' '.repeat(m.length); });
}

function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

function value(raw, isString) {
  const t = String(raw).trim();
  if (isString === 'true') return t;
  try { return JSON.parse(t); } catch (e) { return t; }
}

function parse(block) {
  const out = [];
  const add = function (name, args) { if (out.length < MAX_CALLS && NAME.test(String(name || '')) && plain(args)) out.push({ name: String(name), args: args }); };
  let m, p;
  INVOKE.lastIndex = 0;
  while ((m = INVOKE.exec(block))) {
    const args = {};
    PARAM.lastIndex = 0;
    while ((p = PARAM.exec(m[2]))) args[p[1]] = value(p[3], p[2]);
    add(m[1], args);
  }
  JSON_CALL.lastIndex = 0;
  while ((m = JSON_CALL.exec(block))) {
    let j = null; try { j = JSON.parse(m[1]); } catch (e) { j = null; }
    if (!plain(j)) continue;
    let a = j.arguments !== undefined ? j.arguments : j.parameters;
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
    add(j.name, a === undefined ? {} : a);
  }
  OLD_CALL.lastIndex = 0;
  while ((m = OLD_CALL.exec(block))) {
    let a = null; try { a = JSON.parse(m[2]); } catch (e) { a = null; }
    add(m[1], a);
  }
  return out;
}

/* a closing tag left behind once its block is gone (only ever run on text a block was found in, never inside a fence) */
const STRAY = new RegExp('</' + DS + '[a-z_]{1,24}>|<' + OLD_END + '|<' + B + 'tool' + U + 'call' + U + 'begin' + B + '>|</tool_call>|</function_calls>|</invoke>', 'gi');
function orphans(text) {
  const m = mask(text);
  let out = '', from = 0, c;
  STRAY.lastIndex = 0;
  while ((c = STRAY.exec(m))) { out += text.slice(from, c.index); from = c.index + c[0].length; }
  return (out + text.slice(from)).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
}

function read(text, depth) {
  const src = String(text == null ? '' : text);
  const m = mask(src);
  let at = -1, kind = null;
  for (let i = 0; i < KINDS.length; i++) {
    const o = KINDS[i].open.exec(m);
    if (o && (at < 0 || o.index < at)) { at = o.index; kind = KINDS[i]; }
  }
  if (!kind) return { found: false, clean: src, calls: [] };
  let end = m.length;
  const tail = m.slice(at);
  for (let i = 0; i < kind.close.length; i++) {
    const c = kind.close[i].exec(tail);
    if (c) { end = at + c.index + c[0].length; break; }
  }
  let calls = parse(src.slice(at, Math.min(end, at + MAX_PARSE)));
  let clean = src.slice(0, at).replace(/\s+$/, '');
  let rest = src.slice(end).replace(/^\s+/, '');
  if (rest && (depth || 0) < MAX_BLOCKS) {
    const more = read(rest, (depth || 0) + 1);
    rest = more.clean; calls = calls.concat(more.calls).slice(0, MAX_CALLS);
  } else if (rest && KINDS.some(function (k) { return k.open.test(mask(rest)); })) {
    rest = '';   /* more blocks than anyone writes by accident: nothing after this point is shown */
  }
  if (rest) clean = clean ? clean + '\n\n' + rest : rest;
  if (!depth) clean = orphans(clean);
  return { found: true, clean: clean, calls: calls };
}

/* the hand-off line a call leaves behind when nothing was run for it */
const ANNOUNCE = /^(?:[-*>\s]*)(?:\*\*)?(?:so,?\s+|now,?\s+|first,?\s+|ok(?:ay)?,?\s+|next,?\s+)?(?:let me|let's|i'll|i will|i'm going to|i am going to|allow me to|running|working (?:it|that|this) out)\b[^\n]{0,260}$/i;
function tidy(text) {
  const lines = String(text == null ? '' : text).replace(/\s+$/, '').split('\n');
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (ANNOUNCE.test(last) && /(?::|…|\.\.\.)(?:\*\*)?$/.test(last)) lines.pop();
  }
  return lines.join('\n').replace(/\s+$/, '');
}

function starts(text) { return STREAM_OPEN.test(mask(String(text == null ? '' : text))); }

module.exports = { read: read, tidy: tidy, starts: starts };
