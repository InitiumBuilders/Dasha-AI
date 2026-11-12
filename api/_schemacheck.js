/* THE SCHEMA GATE — the hard rules from her own knowledge pack (§1), checked by code.

   A data contract she writes is her most expensive possible mistake: a builder spends credits
   registering it and Platform rejects it. The rules are in her pack, and a model can still skip
   them (measured: an indexed title with maxLength 120, and her own note calling it "fine"). So
   every schema in a reply is parsed as DATA (never evaluated; model output is not code we run)
   and checked here. askDasha gives her one private correction round when a rule breaks. */

const SYS = new Set(['$id', '$ownerId', '$revision', '$dataContractId', '$type', '$createdAt', '$updatedAt', '$transferredAt', '$creatorId', '$entropy',
  '$createdAtBlockHeight', '$updatedAtBlockHeight', '$createdAtCoreBlockHeight', '$updatedAtCoreBlockHeight', '$transferredAtBlockHeight', '$transferredAtCoreBlockHeight']);
const BANNED = ['$ref', 'if', 'then', 'else', 'allOf', 'anyOf', 'oneOf', 'not', 'default', 'propertyNames', 'patternProperties', 'dependencies', 'additionalItems'];

function checkObject(o, path, errs) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return;
  for (const k of BANNED) if (Object.prototype.hasOwnProperty.call(o, k)) errs.push(path + ' uses "' + k + '", which Platform schemas do not allow');
  if ((o.pattern || o.format) && !(o.maxLength <= 50000)) errs.push(path + ' has pattern/format without maxLength (<= 50000)');
  if (o.uniqueItems && !(o.maxItems <= 100000)) errs.push(path + ' has uniqueItems without maxItems');
  if (o.properties && typeof o.properties === 'object') {
    if (o.additionalProperties !== false) errs.push(path + ' is missing "additionalProperties": false');
    const keys = Object.keys(o.properties);
    if (!keys.length) errs.push(path + ' has an empty properties object');
    const pos = keys.map((k) => o.properties[k] && o.properties[k].position);
    const bad = keys.filter((k, i) => !Number.isInteger(pos[i]));
    if (bad.length) errs.push(path + ': ' + bad.join(', ') + ' missing an integer "position"');
    else { const s = pos.slice().sort((a, b) => a - b); if (s.some((p, i) => p !== i)) errs.push(path + ': positions must run 0..' + (keys.length - 1) + ' with no gaps or repeats (found ' + s.join(',') + ')'); }
    /* protocol 14 (Platform 5.0): letters, digits and underscore only; a hyphen is refused */
    const odd = keys.filter((k) => !/^[A-Za-z0-9_]{1,64}$/.test(k));
    if (odd.length) errs.push(path + ': property name' + (odd.length === 1 ? ' ' : 's ') + odd.map((k) => JSON.stringify(k)).join(', ') + ' must be 1 to 64 characters of A-Z, a-z, 0-9 or _ (no hyphen since protocol 14)');
    for (const k of keys) checkObject(o.properties[k], path + '.' + k, errs);
  }
  if (o.items && typeof o.items === 'object') checkObject(o.items, path + '[]', errs);
}

function checkDocType(name, d) {
  const errs = [];
  if (d.type !== 'object') errs.push(name + ': "type" must be "object"');
  if (name !== 'schema' && /-/.test(name)) errs.push(name + ': a document type name cannot contain a hyphen since protocol 14 (use camelCase or _)');
  const n = d.properties ? Object.keys(d.properties).length : 0;
  if (!(n >= 1 && n <= 100)) errs.push(name + ': needs 1 to 100 properties');
  checkObject(d, name, errs);
  const req = Array.isArray(d.required) ? d.required : [];
  for (const r of req) if (!SYS.has(r) && !(d.properties && Object.prototype.hasOwnProperty.call(d.properties, r))) errs.push(name + ': required "' + r + '" is not one of its properties');
  const idx = Array.isArray(d.indices) ? d.indices : [];
  if (idx.length > 10) errs.push(name + ': more than 10 indices');
  const seen = new Set();
  for (const i of idx) {
    const iname = (i && i.name) || '(unnamed)';
    if (!i || !i.name || i.name.length > 32) errs.push(name + ': every index needs a name of 1 to 32 characters');
    if (seen.has(iname)) errs.push(name + ': duplicate index name "' + iname + '"'); seen.add(iname);
    const ps = Array.isArray(i && i.properties) ? i.properties : [];
    if (ps.length > 10) errs.push(name + '.' + iname + ': more than 10 properties in one index');
    for (const p of ps) {
      const ent = p && typeof p === 'object' ? Object.entries(p)[0] : null;
      if (!ent) continue;
      const [f, dir] = ent;
      if (dir === 'desc') errs.push(name + '.' + iname + ': "desc" is not allowed in an index (index "asc" and order the query)');
      if (f === '$id') errs.push(name + '.' + iname + ': $id cannot be indexed');
      if (f.charAt(0) === '$') { if (/At$/.test(f) && !req.includes(f)) errs.push(name + '.' + iname + ': indexes ' + f + ', which must be listed in "required" to be stored'); continue; }
      const prop = d.properties && d.properties[f];
      if (!prop) { errs.push(name + '.' + iname + ': indexes "' + f + '", which is not a property'); continue; }
      if (prop.type === 'string' && !(prop.maxLength <= 63)) errs.push(name + '.' + iname + ': indexed string "' + f + '" needs maxLength <= 63 (it has ' + (prop.maxLength == null ? 'none' : prop.maxLength) + ')');
      if (prop.type === 'array' && prop.byteArray && !(prop.maxItems <= 255)) errs.push(name + '.' + iname + ': indexed byteArray "' + f + '" must be 255 bytes or less');
    }
  }
  return errs;
}

/* a JS object literal or JSON, read as data: comments, trailing commas, single quotes and bare
   keys are normalised, then JSON.parse. Nothing is ever executed. */
function asData(txt) {
  let t = String(txt).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'])\/\/[^\n]*/g, '$1');
  try { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
  t = t.replace(/'((?:[^'\\\n]|\\.)*)'/g, (m, s) => JSON.stringify(s.replace(/\\'/g, "'")))
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(t); } catch (e) { return null; }
}

/* every balanced {...} at the top level of a code block, parsed as data */
function objectsIn(block) {
  const out = [];
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== '{') continue;
    let depth = 0, end = -1, q = null;
    for (let j = i; j < block.length; j++) {
      const c = block[j];
      if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) { end = j; break; } }
    }
    if (end < 0) break;
    const v = asData(block.slice(i, end + 1));
    if (v && typeof v === 'object') { out.push(v); i = end; }
  }
  return out;
}

function docTypesIn(v) {
  const found = {};
  if (!v || typeof v !== 'object') return found;
  if (v.properties && v.type === 'object') { found.schema = v; return found; }
  const m = v.documentSchemas || v.documents || v;
  for (const [k, d] of Object.entries(m)) if (d && typeof d === 'object' && d.properties && (d.type === 'object' || d.indices)) found[k] = d;
  return found;
}

/* the rule breaks in every schema a reply offers as usable; a block the reply itself labels as
   wrong (a teaching example of a mistake) is left alone */
function violations(reply) {
  const text = String(reply || '');
  const errs = [];
  /* asked for "JSON only", she may answer with bare JSON and no fence; read that too */
  const blocks = [...text.matchAll(/```(?:json|jsonc|javascript|js|ts|typescript)?[^\n]*\n([\s\S]*?)```/g)];
  if (!blocks.length && /^\s*\{/.test(text)) {
    for (const obj of objectsIn(text)) for (const [name, d] of Object.entries(docTypesIn(obj))) errs.push(...checkDocType(name, d));
  }
  for (const m of blocks) {
    const before = text.slice(Math.max(0, m.index - 220), m.index).toLowerCase();
    if (/\b(wrong|invalid|broken|fails?|don't|do not|incorrect|bad|before)\b[^\n]*$/.test(before.split('\n').slice(-2).join(' '))) continue;
    for (const obj of objectsIn(m[1])) {
      const dts = docTypesIn(obj);
      for (const [name, d] of Object.entries(dts)) errs.push(...checkDocType(name, d));
    }
  }
  return Array.from(new Set(errs)).slice(0, 12);
}

module.exports = { violations, checkDocType, asData };
