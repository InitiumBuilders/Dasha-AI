/* The Dash DAO calendar, as a feed a calendar app can subscribe to (GET /api/x?ics=1): when each vote closes and
   when each superblock pays, for the round on the ballot and the five after it. Built from the same ballot object
   the pages read (/api/x?gov=1), so it follows the chain: a subscribed calendar corrects itself as the estimates
   move, because every event keeps the same UID for its superblock.
   cutoffTs and payTs describe the next vote a proposal can still win; while `closed` is true the superblock named
   in `superblock` has stopped taking votes and pays at sbPayTs, so the feed carries that payment too. */
const CYCLE = 16616 * 157.5 * 1000, ROUNDS = 6;
const z = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/* a content line is at most 75 octets; a longer one continues on the next line after one space (RFC 5545) */
const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };

function icsFeed(g, now) {
  now = now || Date.now();
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DashSupport.Team//Dash DAO votes//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Dash DAO votes',
    'X-WR-CALDESC:' + esc('When each Dash DAO vote closes and each superblock pays. Estimated from the Dash block schedule, so a time can move by a few hours.'),
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H'];
  const ev = (uid, t, summary, text, alarm) => {
    L.push('BEGIN:VEVENT', 'UID:' + uid + '@dashsupport.team', 'DTSTAMP:' + z(now), 'DTSTART:' + z(t), 'DTEND:' + z(t + 15 * 6e4),
      'SUMMARY:' + esc(summary), 'DESCRIPTION:' + esc(text + ' Estimated from the Dash block schedule. https://www.dashsupport.team/tools'),
      'URL:https://www.dashsupport.team/tools', 'TRANSP:TRANSPARENT');
    if (alarm) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(alarm), 'TRIGGER:-P1D', 'END:VALARM');
    L.push('END:VEVENT');
  };
  if (g && g.cutoffTs && g.payTs) {
    const sb = +g.superblock || 0, closed = g.closed != null ? !!g.closed : (g.payTs - now > CYCLE * 1.01), first = closed ? sb + 16616 : sb;
    if (closed) ev('dash-pay-' + sb, g.sbPayTs || g.payTs - CYCLE, 'Dash superblock ' + sb + ' pays', 'Voting for this superblock has closed. The proposals that passed are paid in this block.');
    for (let k = 0; k < ROUNDS; k++) {
      const n = first + k * 16616;
      ev('dash-vote-' + n, g.cutoffTs + k * CYCLE, 'Dash DAO vote closes (superblock ' + n + ')', 'Votes cast after this moment count toward the next superblock.', 'The Dash DAO vote closes in a day');
      ev('dash-pay-' + n, g.payTs + k * CYCLE, 'Dash superblock ' + n + ' pays', 'The proposals that passed the vote are paid in this block.');
    }
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
module.exports = { icsFeed };
