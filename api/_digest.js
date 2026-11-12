/* The superblock digest — the one thing worth saying unprompted.
   Composed DETERMINISTICALLY from live DashCentral data: no model writes this, so a public
   broadcast can never invent a tally, a name, or a deadline. Every number here is a field
   from the API. Off unless DASHA_X_DIGEST=on. */

const { isOurs, ourTag, DISCLOSE_LIST } = require('./_watch.js');   /* our own proposal is marked and disclosed */

async function govRaw() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('https://www.dashcentral.org/api/v1/budget', {
      signal: ctl.signal, headers: { 'user-agent': 'DashaAI/1.6 (+https://www.dashsupport.team)' },
    });
    if (!r.ok) throw new Error('gov http ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function daysUntil(dateStr) {
  const d = Date.parse(String(dateStr).replace(' ', 'T') + 'Z');
  if (!d) return null;
  return (d - Date.now()) / 86400000;
}

/* Build the digest. Returns null when there is nothing worth saying. */
async function buildDigest(opts) {
  const cfg = opts || {};
  const d = await govRaw();
  const b = (d && d.budget) || {};
  const ps = (d && d.proposals) || [];
  if (!ps.length || !b.superblock) return null;

  const days = daysUntil(b.payment_date);
  const windowDays = cfg.windowDays != null ? cfg.windowDays : 4;
  /* only speak when the cycle is actually closing */
  if (!cfg.force && (days === null || days > windowDays || days < 0)) {
    return { skip: 'superblock is ' + (days === null ? '?' : days.toFixed(1)) + ' days away (window: ' + windowDays + ')' };
  }

  const passing = ps.filter(function (p) { return p.will_be_funded; });
  const close = ps
    .filter(function (p) { return !p.will_be_funded && p.remaining_yes_votes_until_funding != null && p.remaining_yes_votes_until_funding > 0 && p.remaining_yes_votes_until_funding <= 150; })
    .sort(function (a, b2) { return a.remaining_yes_votes_until_funding - b2.remaining_yes_votes_until_funding; });

  const dayWord = days < 1.5 ? 'tomorrow' : ('in ' + Math.round(days) + ' days');
  const head = 'Superblock ' + b.superblock + ' pays out ' + dayWord + '.'
    + '\n\n' + passing.length + ' of ' + ps.length + ' proposals are currently passing. '
    + (b.total_amount ? (b.total_amount + ' DASH in the cycle budget.') : '')
    + '\n\nIf you run a masternode, this is the window where your vote still changes the outcome.';

  const parts = [head];

  if (close.length) {
    const shown = close.slice(0, 4);
    const lines = shown.map(function (p) {
      const raw = String(p.title || p.name).trim();
      const title = raw.length > 58 ? (raw.slice(0, 57).replace(/[\s—·,-]+$/, '') + '…') : raw;
      return '· ' + title + ourTag(p) + ' — needs ' + p.remaining_yes_votes_until_funding + ' more net yes';
    });
    parts.push('Closest to the line — these are decided by turnout, not opinion:\n\n' + lines.join('\n')
      + (shown.some(isOurs) ? '\n\n' + DISCLOSE_LIST : ''));
  }

  parts.push('Every number here is read live from DashCentral, not remembered. Check it yourself before you vote — I am a starting point, never the authority.'
    + '\n\nQuestions about any proposal? Tag me.');

  return {
    superblock: String(b.superblock),
    days: days,
    passing: passing.length,
    total: ps.length,
    close: close.length,
    tweets: parts,
    marker: 'Superblock ' + b.superblock,   // used to detect we already posted this cycle
  };
}

module.exports = { buildDigest };
