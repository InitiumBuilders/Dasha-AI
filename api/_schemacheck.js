/* THE SCHEMA GATE — the hard rules from her own knowledge pack (§1), checked by code.

   A data contract she writes is her most expensive possible mistake: a builder spends credits
   registering it and Platform rejects it. The rules are in her pack, and a model can still skip
   them (measured: an indexed title with maxLength 120, and her own note calling it "fine"). So
   every schema in a reply is parsed as DATA (never evaluated; model output is not code we run)
   and checked here. askDasha gives her one private correction round when a rule breaks.

   Every rule here is one registration refuses, with its source: the data contract reference on
   docs.dash.org for the first set, and the platform book's contract keyword chapters for the
   Platform 5.0 set (moderator abilities, ttl, contested indexes, immutable, system properties).
   A rule that is only a convention, or that the next protocol version lifts, is left to her notes. */

/* the times and heights a type records only when "required" lists them */
const TIMES = ['$createdAt', '$updatedAt', '$transferredAt'];
const SYS = new Set(['$id', '$ownerId', '$revision', '$dataContractId', '$type', '$createdAt', '$updatedAt', '$transferredAt', '$creatorId', '$entropy',
  '$createdAtBlockHeight', '$updatedAtBlockHeight', '$createdAtCoreBlockHeight', '$updatedAtCoreBlockHeight', '$transferredAtBlockHeight', '$transferredAtCoreBlockHeight',
  '$moderatedAt', '$moderatedBy']);
const BANNED = ['$ref', 'if', 'then', 'else', 'allOf', 'anyOf', 'oneOf', 'not', 'default', 'propertyNames', 'patternProperties', 'dependencies', 'additionalItems'];
/* a key that only a document type carries: beside "properties", it marks an example as a document type even when "type" was left out */
const TYPE_KEYS = ['indices', 'required', 'additionalProperties', 'documentsMutable', 'canBeDeleted', 'transferable', 'tradeMode', 'creationRestrictionMode',
  'documentsKeepHistory', 'moderatorAbilities', 'ttl', 'tokenCost', 'actionFees', 'immutable', 'transient', 'indexOnly'];
const MOD_KEYS = ['delete', 'deleteWithin', 'deleteKeepsRecord', 'deleteRefundsOwner', 'deleteKeepsFields', 'deleteSettled', 'changeFields'];

const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

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

/* a property by its path: "title", or "records.identity" for one inside an object (mainnet's DPNS indexes that one) */
function propAt(d, path) {
  let cur = d;
  for (const part of String(path).split('.')) { cur = cur && plain(cur.properties) ? cur.properties[part] : null; if (!cur) return null; }
  return cur;
}

/* the names an "immutable" list freezes: an entry is a name, or { property, when } */
function frozen(d) {
  return (Array.isArray(d.immutable) ? d.immutable : []).map((e) => (typeof e === 'string' ? e : (plain(e) ? e.property : null))).filter((x) => typeof x === 'string');
}

/* PLATFORM 5.0 (protocol 14): what a document type may say about its moderators, its lifetime, its contested value and
   its frozen properties. Source: the platform book's contract keyword chapters, "Rules at registration". */
function checkFive(name, d, req, idx, errs) {
  const props = plain(d.properties) ? d.properties : {};
  const mutable = d.documentsMutable !== false;                 /* absent means the contract default, which is true unless the contract says otherwise */
  const contested = idx.filter((i) => i && i.contested);
  const transient = Array.isArray(d.transient) ? d.transient : [];
  const MA = d.moderatorAbilities;

  if (has(d, 'moderatorAbilities')) {
    if (!plain(MA) || !MOD_KEYS.some((k) => has(MA, k))) errs.push(name + ': "moderatorAbilities" must be an object that gives at least one of ' + MOD_KEYS.join(', '));
    else {
      for (const k of ['deleteWithin', 'deleteKeepsRecord', 'deleteRefundsOwner', 'deleteKeepsFields']) if (has(MA, k) && MA.delete !== true) errs.push(name + ': moderatorAbilities.' + k + ' is only accepted beside "delete": true');
      if (has(MA, 'deleteSettled') && !has(MA, 'deleteWithin')) errs.push(name + ': moderatorAbilities.deleteSettled needs deleteWithin (without a window nothing is ever settled)');
      if (has(MA, 'deleteWithin')) {
        if (!(Number.isInteger(MA.deleteWithin) && MA.deleteWithin >= 1 && MA.deleteWithin <= 4294967295)) errs.push(name + ': moderatorAbilities.deleteWithin must be a whole number of seconds, 1 to 4294967295');
        if (mutable && !req.includes('$updatedAt')) errs.push(name + ': moderatorAbilities.deleteWithin on a type whose documents can be replaced needs "$updatedAt" in "required" (the window is counted from it)');
        if (!mutable && !req.includes('$updatedAt') && !req.includes('$createdAt')) errs.push(name + ': moderatorAbilities.deleteWithin needs "$updatedAt" or "$createdAt" in "required" (the window is counted from it)');
      }
      if (MA.delete === true) {
        if (d.documentsKeepHistory === true) errs.push(name + ': moderatorAbilities.delete is refused on a type that keeps history');
        if (d.indexOnly === true) errs.push(name + ': moderatorAbilities.delete is refused on an indexOnly type');
        if (d.creationRestrictionMode === 1 || d.creationRestrictionMode === 2) errs.push(name + ': moderatorAbilities.delete is refused with creationRestrictionMode ' + d.creationRestrictionMode + ' (those documents are the contract owner\'s or the platform\'s)');
        if (contested.length) errs.push(name + ': moderatorAbilities.delete is refused on a type with a contested index');
      }
      if (has(MA, 'changeFields')) {
        const cf = MA.changeFields;
        if (!Array.isArray(cf) || !cf.length || cf.some((f) => typeof f !== 'string') || new Set(cf).size !== cf.length) errs.push(name + ': moderatorAbilities.changeFields must list at least one top-level property name, none twice');
        else {
          if (d.indexOnly === true) errs.push(name + ': moderatorAbilities.changeFields is refused on an indexOnly type');
          const lost = req.filter((r) => transient.includes(r));
          if (lost.length) errs.push(name + ': a type with moderatorAbilities.changeFields may not require a transient property (' + lost.join(', ') + ')');
          const ice = frozen(d);
          for (const f of cf) {
            const where = name + ': moderatorAbilities.changeFields lists "' + f + '"';
            if (!has(props, f)) { errs.push(where + ', which is not a top-level property of the type'); continue; }
            if (req.includes(f)) errs.push(where + ', which is also in "required"; a field only moderators write must be optional (nobody else can set it, so it starts absent)');
            if (transient.includes(f)) errs.push(where + ', which is transient (it is never stored)');
            if (ice.includes(f)) errs.push(where + ', which is also listed under "immutable"');
            if (plain(props[f]) && has(props[f], 'refersTo')) errs.push(where + ', which holds a refersTo reference');
            for (const i of contested) if ((Array.isArray(i.properties) ? i.properties : []).some((p) => plain(p) && has(p, f))) errs.push(where + ', which is in the contested index "' + (i.name || '(unnamed)') + '"');
          }
        }
      }
    }
  }

  if (has(d, 'ttl')) {
    if (!(Number.isInteger(d.ttl) && d.ttl >= 3600 && d.ttl <= 31536000)) errs.push(name + ': "ttl" must be a whole number of seconds from 3600 (one hour) to 31536000 (one year)');
    if (!req.includes('$createdAt')) errs.push(name + ': a type with "ttl" needs "$createdAt" in "required" (the expiry is counted from it)');
    if (d.documentsKeepHistory === true) errs.push(name + ': "ttl" is refused together with documentsKeepHistory: true');
    if (d.indexOnly === true) errs.push(name + ': "ttl" is refused on an indexOnly type');
    if (contested.length) errs.push(name + ': "ttl" is refused on a type with a contested index');
  }

  if (contested.length) {
    if (mutable) errs.push(name + ': a contested index needs "documentsMutable": false on its document type');
    if (contested.length > 1 || idx.some((i) => i && i.unique && !i.contested)) errs.push(name + ': a type has at most one contested index, and no other unique index beside it');
    for (const i of contested) {
      const iname = name + '.' + ((i && i.name) || '(unnamed)');
      const c = i.contested;
      if (i.unique !== true) errs.push(iname + ': a contested index must be "unique": true');
      if (!plain(c) || [0, 1, 2].indexOf(c.resolution) < 0) errs.push(iname + ': "contested" needs "resolution" 0, 1 or 2');
      if (plain(c) && has(c, 'fieldMatches') && !(Array.isArray(c.fieldMatches) && c.fieldMatches.length && c.fieldMatches.every((m) => plain(m) && typeof m.field === 'string' && m.field && typeof m.regexPattern === 'string' && m.regexPattern)))
        errs.push(iname + ': "fieldMatches", when given, holds at least one { "field", "regexPattern" } entry');
    }
  }

  if (has(d, 'immutableAllowSetting')) errs.push(name + ': "immutableAllowSetting" is refused; freeze a property once it is filled with { "property": "p", "when": { "present": "$old.p" } } under "immutable"');
  if (has(d, 'immutable')) {
    const list = d.immutable;
    if (!mutable) errs.push(name + ': "immutable" is only accepted on a type whose documents are mutable (with documentsMutable: false every property is already frozen)');
    if (!Array.isArray(list) || list.some((e) => !(typeof e === 'string' || (plain(e) && typeof e.property === 'string' && has(e, 'when') && Object.keys(e).length === 2)))) errs.push(name + ': every "immutable" entry is a property name, or an object with exactly "property" and "when"');
    else {
      const names = frozen(d);
      if (new Set(names).size !== names.length) errs.push(name + ': "immutable" lists a property twice');
      for (const f of names) {
        if (f.charAt(0) === '$') errs.push(name + ': "immutable" lists the system property ' + f + ', which the platform manages');
        else if (f.indexOf('.') >= 0) errs.push(name + ': "immutable" lists the nested path "' + f + '"; list the object that contains it');
        else if (!has(props, f)) errs.push(name + ': "immutable" lists "' + f + '", which is not a top-level property of the type');
        else if (transient.includes(f)) errs.push(name + ': "immutable" lists "' + f + '", which is transient');
      }
    }
  }
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
  const moderated = plain(d.moderatorAbilities) && Array.isArray(d.moderatorAbilities.changeFields) && d.moderatorAbilities.changeFields.length > 0;
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
      if (f.charAt(0) === '$') {
        if (TIMES.includes(f) && !req.includes(f)) errs.push(name + '.' + iname + ': indexes ' + f + ', which must be listed in "required" to be stored');
        if (f === '$revision') errs.push(name + '.' + iname + ': $revision cannot be indexed');
        /* the moderators' stamp: recorded by the platform, never listed in "required" */
        if (f === '$moderatedAt' || f === '$moderatedBy') {
          if (!moderated) errs.push(name + '.' + iname + ': indexes ' + f + ', which only a type that lists moderatorAbilities.changeFields records');
          else if (i.unique) errs.push(name + '.' + iname + ': a unique index may not name ' + f);
        }
        if (f === '$creatorId' && d.transferable !== 1 && d.tradeMode !== 1) errs.push(name + '.' + iname + ': indexes $creatorId, which only a type with "transferable": 1 or "tradeMode": 1 records');
        continue;
      }
      const prop = propAt(d, f);
      if (!prop) { errs.push(name + '.' + iname + ': indexes "' + f + '", which is not a property'); continue; }
      if (prop.type === 'string' && !(prop.maxLength <= 63)) errs.push(name + '.' + iname + ': indexed string "' + f + '" needs maxLength <= 63 (it has ' + (prop.maxLength == null ? 'none' : prop.maxLength) + ')');
      if (prop.type === 'array' && prop.byteArray && !(prop.maxItems <= 255)) errs.push(name + '.' + iname + ': indexed byteArray "' + f + '" must be 255 bytes or less');
    }
  }
  try { checkFive(name, d, req, idx, errs); } catch (e) { /* a shape these rules did not expect is left to the older rules */ }
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

/* Is this object a document type? It holds "properties", each one an object, and says so with "type": "object" or with a
   key only a document type carries. Measured live 2026-11-14: an example with "moderatorAbilities", "properties" and
   "required" left out "type", so it was never read, and it had put a field only moderators write in "required". */
function isDocType(d) {
  if (!plain(d) || !plain(d.properties)) return false;
  if (d.type === 'object' || d.indices) return true;
  const vals = Object.keys(d.properties).map((k) => d.properties[k]);
  return vals.length > 0 && vals.every(plain) && TYPE_KEYS.some((k) => has(d, k));
}

function docTypesIn(v) {
  const found = {};
  if (!v || typeof v !== 'object') return found;
  if (isDocType(v)) { found.schema = v; return found; }
  const m = v.documentSchemas || v.documents || v;
  for (const [k, d] of Object.entries(m)) if (isDocType(d)) found[k] = d;
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

module.exports = { violations, checkDocType, asData, isDocType };
