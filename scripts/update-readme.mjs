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

const stats = `| **10 yrs** | **${prs.total_count}** | **${merged.total_count}** | **${new Set(prs.items.map(repoOf)).size}** |
|:---|:---|:---|:---|
| shipping software | open source PRs | PRs merged | repos active in recently |`;

const rows = prs.items.slice(0, 4).map((it) => {
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
console.log('README updated');
