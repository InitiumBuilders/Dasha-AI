/* EXAMPLE. Every deployment keeps its own api/_ours.js. The Dash Support Team's own copy is not in this
   repository, and this one matches nothing until OURS is set to a pattern that matches the name or title of
   your own team's proposals.

   Arbitrum AIP-1's lesson: the account announcing a vote must never quietly be its beneficiary.
   Every automated post that names a proposal of ours (the watch, the editor, the digest) marks it
   and carries the disclosure, no opinion post is ever fed it, and her governance tool marks it in
   the data she reads. This is the one definition. It is wider than the site's `ours` in x.js,
   which means this month's proposal only. No requires here, so anything can load it. */
const OURS = /(?!)/;   /* matches nothing. For a team called Example Builders: /example[\s_-]*builders/i */
function isOurs(p) { return !!p && OURS.test(String(p.name || '') + ' ' + String(p.title || '')); }
function ourTag(p) { return isOurs(p) ? ' (ours)' : ''; }
const DISCLOSURE = 'Disclosure: this is our own team\'s proposal. I report it exactly as I report any other and take no position on it.';
const DISCLOSE_LIST = 'Disclosure: the one marked (ours) is our own team\'s proposal. I report it exactly as I report any other and take no position on it.';

module.exports = { OURS, isOurs, ourTag, DISCLOSURE, DISCLOSE_LIST };
