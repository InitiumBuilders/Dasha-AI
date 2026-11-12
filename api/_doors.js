/* THE SIX DOORS — one page, six ways in.

   Dash Alive lives at DashSupport.Team/Dash-Alive. It also answers to five other names,
   and they are not aliases for convenience: each one is a different reason to walk in.
   When Dasha ends a post with a door, the door is part of what she said.

       /Dash-Alive             the thing itself — the living database
       /Arise                  beginnings — something starting, someone invited to build
       /Thrive                 growth — funded, climbing, alive and getting stronger
       /Clear-Eyes             sight — the tallies, the ledger, the proof, the record
       /Full-Heart             care — the support, the pool, the people, the help
       /Clear-Eyes-Full-Heart  the whole creed — kept rare so it never goes cheap

   "Clear eyes, full hearts" is a team's promise to itself: see the thing exactly as it
   is, then give it everything. That is the entire job of a support team, so the doors
   named for it are load-bearing, not decorative.

   The rule: the door must fit the post. The variety comes from choosing among the doors
   that ALL fit — never from picking at random, and never the same one twice running. */

const BASE = 'https://DashSupport.Team';

const DOORS = {
  'dash-alive': {
    path: '/Dash-Alive',
    means: 'the living database itself — everything building on Dash, in one place',
    invites: ['Everything alive on Dash', 'The living database', 'See what is alive', 'All of it, in one place'],
  },
  arise: {
    path: '/Arise',
    means: 'a beginning — a project waking up, a builder starting, an invitation to move',
    invites: ['Begin here', 'Bring it to life', 'Start it — I will help', 'Your turn', 'Rise with it'],
  },
  thrive: {
    path: '/Thrive',
    means: 'growth — funded, climbing, gathering strength',
    invites: ['Where builders thrive', 'Watch it grow', 'Grow it in the open', 'This is how it climbs'],
  },
  'clear-eyes': {
    path: '/Clear-Eyes',
    means: 'sight — the tallies, the ledger, the proof, the record as it actually is',
    invites: ['See it for yourself', 'The numbers, in the open', 'Read the record', 'Nothing hidden', 'The record, as it is'],
  },
  'full-heart': {
    path: '/Full-Heart',
    means: 'care — the support, the pool, the people, the help that is always on',
    invites: ['Ask me anything', 'We have got you', 'Support, any hour', 'Bring me your build'],
  },
  'clear-eyes-full-heart': {
    path: '/Clear-Eyes-Full-Heart',
    means: 'the whole creed — see it clearly, then give it everything. Milestones only',
    invites: ['Clear eyes. Full heart.', 'See clearly. Give everything.', 'The whole creed'],
  },
};

/* Which doors truly fit each kind of post — first is the truest, the rest are honest
   alternates. Variety is chosen from inside meaning, never across it. */
const FIT = {
  ballot: ['clear-eyes', 'dash-alive'],
  forecast: ['clear-eyes', 'thrive'],
  treasury: ['clear-eyes', 'full-heart'],
  network: ['clear-eyes', 'dash-alive'],
  accountability: ['clear-eyes', 'clear-eyes-full-heart'],
  correction: ['clear-eyes'],                       /* an admission goes through the honest door, always */
  new: ['arise', 'dash-alive'],
  needs: ['arise', 'full-heart'],
  builderidea: ['arise', 'thrive'],
  buildertip: ['arise', 'full-heart'],
  discussion: ['arise', 'clear-eyes'],
  nextmove: ['thrive', 'arise'],
  weekly: ['thrive', 'clear-eyes'],
  release: ['thrive', 'dash-alive'],
  teaching: ['full-heart', 'arise'],
  translate: ['full-heart', 'dash-alive'],
  flip: ['clear-eyes', 'thrive'],
  cutoff: ['clear-eyes'],
  superblock: ['thrive', 'clear-eyes'],
  evolve: ['clear-eyes-full-heart', 'thrive'],       /* she changed — that is a milestone */
  distinct: ['clear-eyes-full-heart', 'dash-alive'],
  pool: ['full-heart', 'clear-eyes-full-heart'],
  listing: ['arise', 'thrive'],
};
const DEFAULT_FIT = ['dash-alive', 'clear-eyes', 'full-heart', 'arise', 'thrive'];

/* rotation memory for one run; runEditor seeds it from the persisted log and reads it back */
let recent = [];
function seed(log) { recent = Array.isArray(log) ? log.slice(-6) : []; }
function log() { return recent.slice(-6); }

/* deterministic-but-moving: walk the fitting doors, prefer one not used lately.
   The compound creed door is skipped unless it is the truest fit for this kind. */
function pick(kind) {
  const fit = (FIT[kind] || DEFAULT_FIT).filter((k) => DOORS[k]);
  const fresh = fit.filter((k) => recent.indexOf(k) < 0);
  const chosen = fresh.length ? fresh[0] : fit[recent.lastIndexOf(fit[0]) >= 0 && fit.length > 1 ? 1 : 0];
  recent.push(chosen);
  if (recent.length > 6) recent.shift();
  return chosen;
}

/* the invitation line: the phrase and the door are chosen together, so the words and the
   destination mean the same thing. `n` rotates the phrasing so she never sounds canned. */
function invite(kind, n) {
  const key = pick(kind);
  const d = DOORS[key];
  const phrase = d.invites[Math.abs(((n == null ? recent.length : n) | 0)) % d.invites.length];
  return '\n\n' + phrase + ': ' + 'DashSupport.Team' + d.path;
}

/* attach a door to a finished post — never a second one, never over an existing link */
function attach(text, kind, n) {
  const t = String(text || '');
  if (/dashsupport\.team/i.test(t)) return t;      /* it already points somewhere on purpose */
  return t + invite(kind, n);
}

/* the constellation, in her own words — for her mind and for any surface that asks */
function lexicon() {
  return Object.keys(DOORS).map((k) => ({ key: k, url: BASE + DOORS[k].path, means: DOORS[k].means }));
}

module.exports = { DOORS, FIT, BASE, seed, log, pick, invite, attach, lexicon };
