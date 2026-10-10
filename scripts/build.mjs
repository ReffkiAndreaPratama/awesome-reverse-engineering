#!/usr/bin/env node
// Builds README.md, llms.txt and report.json from data.json.
// Refreshes GitHub metadata (stars, last push, archived) unless --offline.
//
//   GITHUB_TOKEN=... node scripts/build.mjs          # refresh + build
//   node scripts/build.mjs --offline                 # build from cached data/meta.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OFFLINE = process.argv.includes('--offline');
const STALE_DAYS = 365;
const TODAY = new Date().toISOString().slice(0, 10);

const data = JSON.parse(readFileSync(join(ROOT, 'data.json'), 'utf8'));
const metaPath = join(ROOT, 'data', 'meta.json');
const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};

const ghRepo = url => {
  const m = url.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  return m ? `${m[1]}/${m[2]}` : null;
};

async function refresh() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'awesome-reverse-engineering-bot' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repos = [...new Set([...data.entries, ...data.graveyard].map(e => ghRepo(e.u)).filter(Boolean))];
  let ok = 0;
  for (const r of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${r}`, { headers });
      if (!res.ok) { meta[r] = { ...(meta[r] || {}), error: res.status, checked: TODAY }; continue; }
      const j = await res.json();
      meta[r] = { stars: j.stargazers_count, pushed: j.pushed_at?.slice(0, 10), archived: j.archived, full: j.full_name, checked: TODAY };
      ok++;
    } catch (e) {
      meta[r] = { ...(meta[r] || {}), error: String(e), checked: TODAY };
    }
  }
  mkdirSync(join(ROOT, 'data'), { recursive: true });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  console.log(`refreshed ${ok}/${repos.length} repositories`);
}

const fmtStars = n => (n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
const daysSince = d => (d ? Math.floor((Date.parse(TODAY) - Date.parse(d)) / 864e5) : null);
const slug = h => '#' + h.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
const FLAG = { runs: '▶️', cloud: '☁️', impersonated: '🎭' };

function row(e, stale) {
  const r = ghRepo(e.u);
  const m = r ? meta[r] || {} : {};
  const flags = (e.f || []).map(f => FLAG[f]).join(' ');
  const warn = r && (m.archived || (daysSince(m.pushed) ?? 0) > STALE_DAYS);
  if (warn) stale.push({ name: e.n, repo: r, pushed: m.pushed, archived: !!m.archived });
  const updated = r ? (m.pushed ? m.pushed.slice(0, 7) : '') : 'site';
  return `| [${e.n}](${e.u}) | ${fmtStars(m.stars)} | ${updated} | ${e.cost} | ${[flags, warn ? '⚠️' : ''].filter(Boolean).join(' ')} | ${e.d} |`;
}


function statsSvg(stale) {
  const rows = data.categories.map(c => ({ t: c.title.replace(/^\S+\s/, ''), n: data.entries.filter(e => e.c === c.id).length }));
  const max = Math.max(...rows.map(r => r.n));
  const H = 44 + rows.length * 26 + 16, W = 880, X = 250, BW = 520;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const bars = rows.map((r, i) => {
    const y = 44 + i * 26, w = Math.max(6, Math.round((r.n / max) * BW));
    return `<text x="${X - 12}" y="${y + 14}" text-anchor="end" class="l">${esc(r.t)}</text><rect x="${X}" y="${y + 2}" width="${w}" height="16" rx="4" fill="url(#g)"/><text x="${X + w + 8}" y="${y + 15}" class="n">${r.n}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Entries per category"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#4338ca"/><stop offset="1" stop-color="#7c3aed"/></linearGradient><style>.l{font:13px Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;fill:#374151}.n{font:600 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#4338ca}.h{font:700 14px Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;fill:#111827}.s{font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#6b7280}</style></defs><rect width="${W}" height="${H}" rx="14" fill="#fbfbff" stroke="#e0e7ff"/><text x="24" y="28" class="h">${data.entries.length} entries across ${rows.length} categories</text><text x="${W - 24}" y="28" text-anchor="end" class="s">refreshed ${TODAY} · ${stale.length} flagged ⚠</text>${bars}</svg>\n`;
}

async function main() {
  if (!OFFLINE) await refresh();
  const stale = [];
  const sections = data.categories.map(c => {
    const rows = data.entries.filter(e => e.c === c.id).map(e => row(e, stale));
    return `## ${c.title}\n\n${c.intro}\n\n| Tool | Stars | Updated | Cost | Flags | When to use it |\n|------|-------|---------|------|-------|----------------|\n${rows.join('\n')}\n\n<p align="right">(<a href="#readme">back to top</a>)</p>\n`;
  });
  const grave = `## 🪦 Graveyard\n\n| Tool | Why | Use instead |\n|------|-----|-------------|\n${data.graveyard.map(g => `| [${g.n}](${g.u}) | ${g.why} | ${g.instead} |`).join('\n')}\n`;
  const titles = ['🛡️ Safety First', '⚡ Triage by Runtime', ...data.categories.map(c => c.title), '🪦 Graveyard', '🗺️ A 12-Week Path', '💡 Craft', '🧰 Recipes'];
  const toc = titles.map(t => `- [${t}](${slug(t)})`).join('\n');

  const header = readFileSync(join(ROOT, 'content', 'header.md'), 'utf8')
    .replace('{{COUNT}}', String(data.entries.length))
    .replace('{{DATE}}', TODAY)
    .replace('{{STALE}}', String(stale.length))
    .replace('{{TOC}}', toc);
  const footer = readFileSync(join(ROOT, 'content', 'footer.md'), 'utf8');
  writeFileSync(join(ROOT, 'README.md'), [header.trimEnd(), '', ...sections, grave, footer].join('\n'));

  const llms = [
    '# Awesome Reverse Engineering',
    '',
    `> Curated reverse engineering tools and learning resources with safety flags and live maintenance data. ${data.entries.length} entries, refreshed ${TODAY}.`,
    '',
    'Flags: runs = runs target or third-party code (use an isolated VM); cloud = sends code to a third party; impersonated = use the official link only.',
    '',
    ...data.categories.flatMap(c => [`## ${c.title.replace(/^\S+\s/, '')}`, '', ...data.entries.filter(e => e.c === c.id).map(e => `- [${e.n}](${e.u}): ${e.d}${e.f ? ` Flags: ${e.f.join(', ')}.` : ''}`), '']),
  ].join('\n');
  writeFileSync(join(ROOT, 'llms.txt'), llms);
  mkdirSync(join(ROOT, 'assets'), { recursive: true });
  writeFileSync(join(ROOT, 'assets', 'stats.svg'), statsSvg(stale));
  writeFileSync(join(ROOT, 'report.json'), JSON.stringify({ date: TODAY, entries: data.entries.length, stale }, null, 2) + '\n');
  console.log(`README: ${data.entries.length} entries, ${stale.length} flagged`);
}

main();
