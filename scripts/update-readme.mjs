import { readFileSync, writeFileSync } from 'node:fs';

const USER = 'nikhiln64';
const token = process.env.GITHUB_TOKEN;
const gh = async (url) => {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const ago = (t) => {
  const h = (Date.now() - new Date(t)) / 36e5;
  return h < 24 ? `${Math.max(1, Math.round(h))}h ago` : `${Math.round(h / 24)}d ago`;
};
const repoOf = (it) => it.repository_url.replace('https://api.github.com/repos/', '');
const esc = (s) => s.replace(/\|/g, '\\|').split('\n')[0].slice(0, 90);

const prs = await gh(`https://api.github.com/search/issues?q=author:${USER}+type:pr&sort=updated&order=desc&per_page=10`);
const merged = await gh(`https://api.github.com/search/issues?q=author:${USER}+type:pr+is:merged&per_page=1`);
const issues = await gh(`https://api.github.com/search/issues?q=author:${USER}+type:issue&per_page=1`);
const commits = await gh(`https://api.github.com/search/commits?q=author:${USER}&per_page=1`);

const stats = `| **10 yrs** | **${prs.total_count}** | **${merged.total_count}** | **${new Set(prs.items.map(repoOf)).size}** |
|:---|:---|:---|:---|
| shipping software | open source PRs | PRs merged | repos active in recently |`;

const yearAgo = Date.now() - 365 * 864e5;
const rows = prs.items.filter((it) => new Date(it.updated_at) >= yearAgo).slice(0, 4).map((it) => {
  const state = it.pull_request?.merged_at ? 'merged' : it.state;
  return `| \`${repoOf(it)}\` | ${esc(it.title)} | \`PR ${state} · ${ago(it.updated_at)}\` |`;
}).join('\n');
const activity = `| repo | | |
|:---|:---|---:|
${rows}`;

let md = readFileSync('README.md', 'utf8');
md = md.replace(/<!--STATS:START-->[\s\S]*?<!--STATS:END-->/, `<!--STATS:START-->\n${stats}\n<!--STATS:END-->`);
md = md.replace(/<!--ACTIVITY:START-->[\s\S]*?<!--ACTIVITY:END-->/, `<!--ACTIVITY:START-->\n${activity}\n<!--ACTIVITY:END-->`);
writeFileSync('README.md', md);

// Radar SVG: commits (N), PRs (E), issues (S), contributed-to (W)
const nCommits = commits.total_count, nPRs = prs.total_count, nIssues = issues.total_count;
const nContrib = new Set(prs.items.map(repoOf)).size;
const f = (v, cap) => Math.max(0.08, Math.min(1, v / cap));
const r = 95, cx = 212, cy = 150;
const pts = `${cx},${cy - r * f(nCommits, 2500)} ${cx + r * f(nPRs, 25)},${cy} ${cx},${cy + r * f(nIssues, 25)} ${cx - r * f(nContrib, 12)},${cy}`;
const kfmt = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v));
const ring = (k) => `<polygon points="${cx},${cy - r * k} ${cx + r * k},${cy} ${cx},${cy + r * k} ${cx - r * k},${cy}" fill="none" stroke="#21262d"/>`;
const fontsCss = readFileSync('assets/fonts.css', 'utf8');
const svg = `<svg width="480" height="340" viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg" font-family="'IBM Plex Sans', Helvetica, Arial, sans-serif">
<defs><style>${fontsCss}</style></defs>
<rect width="480" height="340" rx="10" fill="#161b22"/>
<rect x="0.5" y="0.5" width="479" height="339" rx="9.5" fill="none" stroke="#21262d"/>
<text x="28" y="36" font-size="14" font-weight="600" fill="#e8a33d">Nikhil's GitHub Stats</text>
<g transform="translate(28,40)">
${[1, 0.75, 0.5, 0.25].map(ring).join('\n')}
<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#21262d"/>
<line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#21262d"/>
<polygon points="${pts}" fill="#e8a33d38" stroke="#e8a33d" stroke-width="1.5"/>
<text x="${cx}" y="${cy - r - 21}" text-anchor="middle" font-size="13" font-weight="700" fill="#e8e6e1" font-family="'JetBrains Mono', ui-monospace, Menlo, monospace">${kfmt(nCommits)}</text>
<text x="${cx}" y="${cy - r - 7}" text-anchor="middle" font-size="11" fill="#6b7280">commits</text>
<text x="${cx + r + 8}" y="${cy - 4}" font-size="13" font-weight="700" fill="#e8e6e1" font-family="'JetBrains Mono', ui-monospace, Menlo, monospace">${nPRs}</text>
<text x="${cx + r + 8}" y="${cy + 10}" font-size="11" fill="#6b7280">PRs</text>
<text x="${cx}" y="${cy + r + 16}" text-anchor="middle" font-size="13" font-weight="700" fill="#e8e6e1" font-family="'JetBrains Mono', ui-monospace, Menlo, monospace">${nIssues}</text>
<text x="${cx}" y="${cy + r + 30}" text-anchor="middle" font-size="11" fill="#6b7280">issues</text>
<text x="${cx - r - 8}" y="${cy - 4}" text-anchor="end" font-size="13" font-weight="700" fill="#e8e6e1" font-family="'JetBrains Mono', ui-monospace, Menlo, monospace">${nContrib}</text>
<text x="${cx - r - 8}" y="${cy + 10}" text-anchor="end" font-size="11" fill="#6b7280">contributed to</text>
</g>
</svg>`;
writeFileSync('assets/stats-radar.svg', svg);
console.log('README and radar updated');
