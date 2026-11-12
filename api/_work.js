/* Her work on the public record, for the /pulse page.

   Only numbers GitHub itself will confirm: commit counts in the open Dasha-AI repo and the
   last 24 hours of commits, each with its link. The page shows a "verify" link beside every
   number, so anyone can re-run the count. Needs no X and stores nothing. */
const REPO = 'InitiumBuilders/Dasha-AI';
const GH = 'https://api.github.com';

function headers() {
  const h = { 'User-Agent': 'dasha-pulse', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) h.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  return h;
}
async function gh(path) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(GH + path, { headers: headers(), signal: ctl.signal });
    if (!r.ok) return null;
    return { json: await r.json(), link: r.headers.get('link') || '' };
  } catch (e) { return null; } finally { clearTimeout(t); }
}
/* at one commit per page, the number of the last page is the number of commits */
async function count(query) {
  const r = await gh('/repos/' + REPO + '/commits?per_page=1' + (query || ''));
  if (!r) return null;
  const m = /[?&]page=(\d+)>; rel="last"/.exec(r.link);
  return m ? +m[1] : (Array.isArray(r.json) ? r.json.length : null);
}
async function searchCount(phrase, sinceDay) {
  const q = encodeURIComponent('repo:' + REPO + ' "' + phrase + '" committer-date:>=' + sinceDay);
  const r = await gh('/search/commits?per_page=1&q=' + q);
  return r && typeof r.json.total_count === 'number' ? r.json.total_count : null;
}

/* what each commit was, read from its message */
const KINDS = [
  [/^treasury snapshot/, 'treasury'], [/^stats \+/, 'visits'], [/^history /, 'record'],
  [/^watch:/, 'ballot'], [/^editor:/, 'draft'], [/^ledger:/, 'ledger'], [/^feed:/, 'x'],
  [/vision/i, 'vision'], [/prompt|mind|spine|skill/i, 'mind'],
];
function kindOf(msg) { for (const [re, k] of KINDS) if (re.test(msg)) return k; return 'other'; }

async function workRecord() {
  const now = Date.now();
  const since30 = new Date(now - 30 * 864e5).toISOString();
  const since1 = new Date(now - 864e5).toISOString();
  const [repo, commits, last30, treasury30, day] = await Promise.all([
    gh('/repos/' + REPO),
    count(''),
    count('&since=' + since30),
    searchCount('treasury snapshot', since30.slice(0, 10)),
    gh('/repos/' + REPO + '/commits?per_page=100&since=' + since1),
  ]);
  if (commits == null && !day) return null;
  const beats = ((day && Array.isArray(day.json)) ? day.json : []).map((c) => {
    const msg = String((c.commit && c.commit.message) || '').split('\n')[0];
    const v = /^stats \+(\d+)v/.exec(msg);
    const b = { t: Date.parse(c.commit && c.commit.committer && c.commit.committer.date), k: kindOf(msg), u: c.html_url };
    if (v) b.n = +v[1];
    return b;
  }).filter((b) => b.t);
  return {
    repo: REPO,
    started: repo && repo.json && repo.json.created_at ? repo.json.created_at.slice(0, 10) : null,
    commits, last30, treasury30, beats, at: new Date(now).toISOString(),
  };
}

module.exports = { workRecord };
