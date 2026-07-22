import { readFileSync, writeFileSync } from 'node:fs';

const USER = 'nikhiln64';
const token = process.env.GITHUB_TOKEN;
const headers = { Accept: 'application/vnd.github+json', ...(token && { Authorization: `Bearer ${token}` }) };
const gh = async (url) => {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const ago = (t) => {
  const h = (Date.now() - new Date(t)) / 36e5;
  return h < 24 ? `${Math.max(1, Math.round(h))}h` : `${Math.round(h / 24)}d`;
};
const repoOf = (it) => it.repository_url.replace('https://api.github.com/repos/', '');
const esc = (s) => s.replace(/\|/g, '\\|').replace(/([[\]])/g, '\\$1').split('\n')[0].slice(0, 90);

const prs = await gh(`https://api.github.com/search/issues?q=author:${USER}+type:pr&sort=updated&order=desc&per_page=10`);
const merged = await gh(`https://api.github.com/search/issues?q=author:${USER}+type:pr+is:merged&per_page=1`);

const stats = [
  ['10', 'years shipping software'],
  [prs.total_count, 'open source PRs'],
  [merged.total_count, 'PRs merged'],
  [new Set(prs.items.map(repoOf)).size, 'recently active repos'],
];
const cols = [2, 260, 520, 740];
const statsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 92" role="img" aria-label="${stats.map(([n, l]) => `${n} ${l}`).join(', ')}">
  <style>
    :root { --muted: #57606a; }
    @media (prefers-color-scheme: dark) { :root { --muted: #8b949e; } }
    .n { font: 800 40px -apple-system, 'Segoe UI', Ubuntu, Helvetica, Arial, sans-serif; letter-spacing: -1px; fill: url(#g); }
    .l { font: 13px ui-monospace, SFMono-Regular, Consolas, Menlo, monospace; fill: var(--muted); }
    g { animation: rise 0.5s ease-out both; }
    g:nth-of-type(2) { animation-delay: 0.15s; }
    g:nth-of-type(3) { animation-delay: 0.3s; }
    g:nth-of-type(4) { animation-delay: 0.45s; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { g { animation: none !important; } }
  </style>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e3b341"/><stop offset="1" stop-color="#f78166"/></linearGradient></defs>
${stats.map(([n, l], i) => `  <g><text class="n" x="${cols[i]}" y="46">${n}</text><text class="l" x="${cols[i]}" y="76">${l}</text></g>`).join('\n')}
</svg>
`;
writeFileSync('assets/stats.svg', statsSvg);

const dot = { open: '🟢', closed: '🔴', merged: '🟣' };
const yearAgo = Date.now() - 365 * 864e5;
const rows = prs.items.filter((it) => new Date(it.updated_at) >= yearAgo).slice(0, 4).map((it) => {
  const state = it.pull_request?.merged_at ? 'merged' : it.state;
  return `| \`${repoOf(it)}\` | [${esc(it.title)}](${it.pull_request?.html_url ?? it.html_url}) | ${dot[state]} \`${state} · ${ago(it.updated_at)}\` |`;
}).join('\n');
const activity = `| repo | contribution | status |
|:---|:---|---:|
${rows}`;

let md = readFileSync('README.md', 'utf8');
md = md.replace(/<!--ACTIVITY:START-->[\s\S]*?<!--ACTIVITY:END-->/, `<!--ACTIVITY:START-->\n${activity}\n<!--ACTIVITY:END-->`);
writeFileSync('README.md', md);
console.log('README + stats.svg updated');
