#!/usr/bin/env node
// Builds README.md, GRAVEYARD.md, llms.txt, report.json and the SVG assets from data.json.
//
//   GITHUB_TOKEN=... node scripts/build.mjs     refresh GitHub metadata, then build
//   node scripts/build.mjs --offline            build from cached data/meta.json
//   node scripts/build.mjs --check              offline build in memory; exit 1 if data is
//                                               invalid or committed outputs are out of date (PRs)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const OFFLINE = CHECK || process.argv.includes('--offline');
const STALE_DAYS = 365;
const MIN_REFRESH_RATIO = 0.8; // below this the refresh counts as failed and CI fails
const TODAY = new Date().toISOString().slice(0, 10);
const FLAGS = { runs: '▶️', cloud: '☁️', impersonated: '🎭' };

const data = JSON.parse(readFileSync(join(ROOT, 'data.json'), 'utf8'));
const metaPath = join(ROOT, 'data', 'meta.json');
const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};

const ghRepo = url => url.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/)?.[1] ?? null;
const repoOf = e => e.r || ghRepo(e.u);
const fail = msg => { console.error(`error: ${msg}`); process.exitCode = 1; };

// ---------- validation ----------
function validate() {
  const cats = new Set(data.categories.map(c => c.id));
  const names = new Set();
  const urls = new Set();
  let ok = true;
  const bad = m => { fail(m); ok = false; };
  for (const c of data.categories) if (!c.id || !c.title || !c.intro) bad(`category missing id/title/intro: ${JSON.stringify(c)}`);
  for (const e of data.entries) {
    const where = `entry "${e.n}"`;
    for (const k of ['c', 'n', 'u', 'cost', 'd']) if (!e[k]) bad(`${where}: missing ${k}`);
    if (e.c && !cats.has(e.c)) bad(`${where}: unknown category ${e.c}`);
    if (e.u && !/^https:\/\/\S+$/.test(e.u)) bad(`${where}: URL must be https`);
    if (e.r && !/^[\w.-]+\/[\w.-]+$/.test(e.r)) bad(`${where}: r must be owner/repo`);
    for (const f of e.f || []) if (!FLAGS[f]) bad(`${where}: unknown flag ${f}`);
    if (e.d && !/[.)]$/.test(e.d.trim())) bad(`${where}: description must end with a period`);
    if (/[–—]/.test(JSON.stringify(e))) bad(`${where}: no en or em dashes`);
    if (names.has(e.n.toLowerCase())) bad(`${where}: duplicate name`);
    if (urls.has(e.u)) bad(`${where}: duplicate URL`);
    names.add(e.n.toLowerCase()); urls.add(e.u);
  }
  return ok;
}

// ---------- refresh ----------
async function refresh() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'awesome-reverse-engineering-bot' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repos = [...new Set([...data.entries, ...data.graveyard].map(repoOf).filter(Boolean))];
  let ok = 0;
  const errors = [];
  for (const r of repos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${r}`, { headers, signal: AbortSignal.timeout(15000) });
      if (res.status === 403 || res.status === 429) {
        const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
        errors.push(`${r}: rate limited (${res.status})`);
        if (reset > 0 && reset < 90000) await new Promise(s => setTimeout(s, reset + 1000));
        continue;
      }
      if (!res.ok) { errors.push(`${r}: HTTP ${res.status}`); meta[r] = { ...(meta[r] || {}), lastError: `HTTP ${res.status}`, lastErrorAt: TODAY }; continue; }
      const j = await res.json();
      meta[r] = { stars: j.stargazers_count, pushed: j.pushed_at?.slice(0, 10), archived: j.archived, full: j.full_name, verified: TODAY };
      ok++;
    } catch (err) {
      errors.push(`${r}: ${err.name}`);
    }
  }
  const ratio = repos.length ? ok / repos.length : 1;
  console.log(`refreshed ${ok}/${repos.length} repositories`);
  for (const e of errors) console.log(`  ${e}`);
  if (ratio < MIN_REFRESH_RATIO) {
    fail(`refresh failed for ${repos.length - ok} of ${repos.length} repositories; keeping previous data`);
    return false;
  }
  meta._refreshed = TODAY;
  mkdirSync(join(ROOT, 'data'), { recursive: true });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  return true;
}

// ---------- helpers ----------
const esc = s => String(s).replace(/\|/g, '\\|');
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmtStars = n => (n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
const daysSince = d => (d ? Math.floor((Date.parse(TODAY) - Date.parse(d)) / 864e5) : null);
// GitHub and awesome-lint anchors: lowercase, drop punctuation and symbols (including U+FE0F), spaces to hyphens
const slug = h => '#' + h.toLowerCase().replace(/️/g, '').replace(/[^\p{L}\p{N}\p{Mc}\p{Mn}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
const stripEmoji = t => t.replace(/^\S+\s/, '');

function maintenance(e) {
  const r = repoOf(e);
  const m = r ? meta[r] || {} : {};
  if (e.m) return { warn: true, note: e.m };
  if (m.archived) return { warn: true, note: 'Archived' };
  const age = daysSince(m.pushed);
  if (age != null && age > STALE_DAYS) return { warn: true, note: `No push since ${m.pushed}` };
  return { warn: false, note: '' };
}

function row(e) {
  const r = repoOf(e);
  const m = r ? meta[r] || {} : {};
  const mt = maintenance(e);
  const flags = [...(e.f || []).map(f => FLAGS[f]), mt.warn ? '⚠️' : ''].filter(Boolean).join(' ');
  const activity = r ? [m.pushed ? m.pushed.slice(0, 7) : '', m.stars != null ? `★ ${fmtStars(m.stars)}` : ''].filter(Boolean).join(' · ') : 'website';
  const desc = esc(e.d) + (mt.note && e.m ? ` ⚠️ ${esc(mt.note)}.` : '');
  return `| [${esc(e.n)}](${e.u}) | ${activity} | ${esc(e.cost)} | ${flags} | ${desc} |`;
}

// ---------- SVG assets ----------
const ICON = {
  triage: '<path d="M10 6h18l8 8v28H10z"/><path d="M28 6v8h8"/><circle cx="26" cy="30" r="7"/><path d="M31 35l6 6"/>',
  formats: '<rect x="6" y="8" width="36" height="32" rx="3"/><path d="M12 16h6M22 16h6M32 16h4M12 24h6M22 24h6M32 24h4M12 32h6M22 32h6"/>',
  disasm: '<path d="M16 10l-9 14 9 14M32 10l9 14-9 14"/><path d="M27 8l-6 32"/>',
  debug: '<ellipse cx="24" cy="27" rx="9" ry="12"/><path d="M24 15v24M15 22H7M15 30H7M33 22h8M33 30h8M17 18l-5-6M31 18l5-6"/><circle cx="24" cy="12" r="4"/>',
  instr: '<path d="M30 6v16a9 9 0 0 1-18 0v-4"/><path d="M8 20l4-4 4 4"/><circle cx="30" cy="6" r="2"/><path d="M18 40h20M28 34v12"/>',
  memory: '<rect x="8" y="10" width="32" height="28" rx="3"/><path d="M8 18h32M14 24h4M14 30h4M22 24h12M22 30h8"/><path d="M14 6v4M24 6v4M34 6v4M14 38v4M24 38v4M34 38v4"/>',
  frameworks: '<circle cx="12" cy="12" r="5"/><circle cx="36" cy="12" r="5"/><circle cx="24" cy="36" r="5"/><circle cx="24" cy="22" r="3"/><path d="M16 15l6 5M32 15l-6 5M24 25v6"/>',
  diff: '<rect x="6" y="8" width="14" height="32" rx="2"/><rect x="28" y="8" width="14" height="32" rx="2"/><path d="M10 16h6M10 22h6M32 16h6M32 28h6M20 22h8M25 19l3 3-3 3"/>',
  android: '<rect x="12" y="20" width="24" height="18" rx="3"/><path d="M12 18a12 10 0 0 1 24 0z"/><circle cx="19" cy="13" r="1.5"/><circle cx="29" cy="13" r="1.5"/><path d="M16 6l3 4M32 6l-3 4M18 38v5M30 38v5"/>',
  dotnet: '<rect x="6" y="10" width="36" height="28" rx="4"/><path d="M13 30V18l8 12V18"/><circle cx="27" cy="29" r="1.5"/><path d="M33 18h6M36 18v12"/>',
  apple: '<rect x="8" y="10" width="22" height="16" rx="2"/><path d="M4 30h30"/><rect x="32" y="16" width="12" height="24" rx="3"/><path d="M36 36h4"/>',
  runtimes: '<path d="M24 6l16 8v20l-16 8-16-8V14z"/><path d="M8 14l16 8 16-8M24 22v20"/>',
  web: '<circle cx="24" cy="24" r="17"/><path d="M7 24h34M24 7c-6 6-6 28 0 34M24 7c6 6 6 28 0 34"/>',
  firmware: '<rect x="13" y="13" width="22" height="22" rx="3"/><rect x="19" y="19" width="10" height="10"/><path d="M18 6v7M24 6v7M30 6v7M18 35v7M24 35v7M30 35v7M6 18h7M6 24h7M6 30h7M35 18h7M35 24h7M35 30h7"/>',
  evm: '<rect x="6" y="18" width="13" height="13" rx="2"/><rect x="29" y="18" width="13" height="13" rx="2"/><path d="M19 24h10"/><path d="M12 18v-6h24v6M12 31v6h24v-6"/>',
  ai: '<rect x="12" y="12" width="24" height="24" rx="4"/><path d="M19 6v6M29 6v6M19 36v6M29 36v6M6 19h6M6 29h6M36 19h6M36 29h6"/><path d="M24 17l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
  lab: '<path d="M18 6h12M20 6v12L9 38a3 3 0 0 0 3 4h24a3 3 0 0 0 3-4L28 18V6"/><path d="M13 30h22"/>',
  learn: '<path d="M24 12c-5-4-12-4-18-2v28c6-2 13-2 18 2 5-4 12-4 18-2V10c-6-2-13-2-18 2z"/><path d="M24 12v28"/>',
  practice: '<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="3"/><path d="M33 15l8-8M36 7h5v5"/>',
};
const HUES = ['#4338ca', '#0e7490', '#6d28d9', '#7c3aed', '#9333ea', '#be185d', '#2563eb', '#0e7490', '#047857', '#4f46e5', '#4338ca', '#6d28d9', '#2563eb', '#0f766e', '#7c3aed', '#9333ea', '#047857', '#4338ca', '#b45309'];

function sectionSvg(c, i, entries) {
  const hue = HUES[i % HUES.length];
  const title = xml(stripEmoji(c.title));
  const seen = new Set();
  const top = entries.filter(e => { const k = e.n.split(/[\s.-]/)[0].toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 3).map(e => xml(e.n)).join('  ·  ');
  const hex = Array.from({ length: 5 }, (_, r) => Array.from({ length: 6 }, (_, k) => ((i * 37 + r * 11 + k * 23) % 256).toString(16).padStart(2, '0')).join(' '));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 200" width="1280" height="200" role="img" aria-label="${title}: ${entries.length} entries">
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef2ff"/></linearGradient>
<pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#e0e7ff"/></pattern><clipPath id="c"><rect width="1280" height="200" rx="18"/></clipPath></defs>
<rect width="1280" height="200" rx="18" fill="url(#b)"/><rect width="1280" height="200" rx="18" fill="url(#g)" opacity=".6"/>
<rect x="0.5" y="0.5" width="1279" height="199" rx="18" fill="none" stroke="#e0e7ff"/>
<rect x="0" y="0" width="12" height="200" fill="${hue}" clip-path="url(#c)"/>
<rect x="44" y="30" width="140" height="140" rx="32" fill="#ffffff" stroke="#e0e7ff"/>
<g transform="translate(74 60) scale(1.67)" fill="none" stroke="${hue}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON[c.id] || ''}</g>
<text x="218" y="66" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="22" font-weight="700" fill="${hue}" letter-spacing="2">${String(i + 1).padStart(2, '0')} · ${entries.length} ${entries.length === 1 ? 'ENTRY' : 'ENTRIES'}</text>
<text x="216" y="122" font-family="Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="56" font-weight="800" fill="#111827" letter-spacing="-1">${title}</text>
<text x="218" y="164" font-family="Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="26" fill="#374151">${top}</text>
<g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="16" fill="${hue}" opacity=".22" text-anchor="end">${hex.map((h, r) => `<text x="1236" y="${58 + r * 26}">${h}</text>`).join('')}</g>
</svg>
`;
}

function statsSvg(stale, refreshed) {
  const rows = data.categories.map(c => ({ t: stripEmoji(c.title), n: data.entries.filter(e => e.c === c.id).length }));
  const max = Math.max(...rows.map(r => r.n));
  const H = 44 + rows.length * 26 + 16, W = 880, X = 250, BW = 520;
  const bars = rows.map((r, i) => {
    const y = 44 + i * 26, w = Math.max(6, Math.round((r.n / max) * BW));
    return `<text x="${X - 12}" y="${y + 14}" text-anchor="end" class="l">${xml(r.t)}</text><rect x="${X}" y="${y + 2}" width="${w}" height="16" rx="4" fill="url(#g)"/><text x="${X + w + 8}" y="${y + 15}" class="n">${r.n}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Entries per category"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#4338ca"/><stop offset="1" stop-color="#7c3aed"/></linearGradient><style>.l{font:13px Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;fill:#374151}.n{font:600 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#4338ca}.h{font:700 14px Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;fill:#111827}.s{font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#6b7280}</style></defs><rect width="${W}" height="${H}" rx="14" fill="#fbfbff" stroke="#e0e7ff"/><text x="24" y="28" class="h">${data.entries.length} entries across ${rows.length} categories</text><text x="${W - 24}" y="28" text-anchor="end" class="s">GitHub data ${refreshed} · ${stale.length} flagged</text>${bars}</svg>\n`;
}


// Align markdown table pipes (awesome-lint table-pipe-alignment). Width counts emoji as 2 columns.
const width = s => [...s.replace(/️/g, '')].reduce((w, ch) => w + (/\p{Extended_Pictographic}/u.test(ch) && ch.codePointAt(0) > 0xff ? 2 : 1), 0);
function alignTables(md) {
  const lines = md.split('\n');
  const split = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) inCode = !inCode;
    if (inCode || !lines[i].startsWith('|')) continue;
    let j = i;
    while (j < lines.length && lines[j].startsWith('|')) j++;
    const rows = lines.slice(i, j).map(split);
    const n = Math.max(...rows.map(r => r.length));
    const w = Array.from({ length: n }, (_, k) => Math.max(3, ...rows.map((r, ri) => (ri === 1 ? 3 : width(r[k] || '')))));
    for (let r = 0; r < rows.length; r++) {
      lines[i + r] = '| ' + w.map((cw, k) => (r === 1 ? '-'.repeat(cw) : (rows[r][k] || '') + ' '.repeat(cw - width(rows[r][k] || '')))).join(' | ') + ' |';
    }
    i = j - 1;
  }
  return lines.join('\n');
}

// ---------- build ----------
async function main() {
  if (!validate()) return;
  if (!OFFLINE) await refresh();
  const refreshed = meta._refreshed || 'never';
  const stale = data.entries.filter(e => maintenance(e).warn).map(e => ({ name: e.n, repo: repoOf(e), note: maintenance(e).note }));
  const flagged = data.entries.filter(e => e.f?.length).length;
  const out = {};

  const sections = data.categories.map((c, i) => {
    const ents = data.entries.filter(e => e.c === c.id);
    out[`assets/sections/${c.id}.svg`] = sectionSvg(c, i, ents);
    return [
      `## ${c.title}`, '',
      `<img src="assets/sections/${c.id}.svg" alt="${stripEmoji(c.title)}: ${ents.length} entries" width="100%">`, '',
      c.intro, '',
      '| Tool | Last push · Stars | Cost | Flags | Use it when |',
      '|---|---|---|---|---|',
      ...ents.map(row), '',
      c.extra ? c.extra.replaceAll('{{REVIEWED}}', data.reviewed || '') + '\n' : '',
      '<p align="right">(<a href="#contents">back to top</a>)</p>', '',
    ].join('\n');
  });

  const fill = s => s
    .replaceAll('{{COUNT}}', String(data.entries.length))
    .replaceAll('{{CATS}}', String(data.categories.length))
    .replaceAll('{{REFRESHED}}', refreshed)
    .replaceAll('{{REVIEWED}}', data.reviewed || refreshed)
    .replaceAll('{{STALE}}', String(stale.length))
    .replaceAll('{{FLAGGED}}', String(flagged));
  const header = fill(readFileSync(join(ROOT, 'content', 'header.md'), 'utf8'));
  const intro = fill(readFileSync(join(ROOT, 'content', 'intro.md'), 'utf8'));
  const footer = fill(readFileSync(join(ROOT, 'content', 'footer.md'), 'utf8'));
  const body = [intro.trimEnd(), '', ...sections, footer.trimEnd(), ''].join('\n');
  const toc = [...body.matchAll(/^## (.+)$/gm)].filter(m => !/Contributing/.test(m[1])).map(m => `- [${m[1]}](${slug(m[1])})`).join('\n');
  out['README.md'] = alignTables(header.replace('{{TOC}}', toc).trimEnd() + '\n\n' + body);

  out['GRAVEYARD.md'] = [
    '# Graveyard', '',
    'Tools that were once standard but are archived or unmaintained, with what to use instead. Back to the [list](README.md).', '',
    '| Tool | Why | Use instead |', '|---|---|---|',
    ...data.graveyard.map(g => `| [${esc(g.n)}](${g.u}) | ${esc(g.why)} | ${esc(g.instead)} |`), '',
  ].join('\n');

  out['llms.txt'] = [
    '# Awesome Reverse Engineering', '',
    `> Curated reverse engineering tools and learning resources with safety flags and maintenance data. ${data.entries.length} entries. Entries reviewed ${data.reviewed}; GitHub data refreshed ${refreshed}.`, '',
    'Flags: runs = executes or emulates target code, or loads third-party plugins and scripts (use an isolated VM); cloud = sends code to a third party when used as documented; impersonated = lookalike download sites reported, use the official link only. No flag = reviewed, none of these known.', '',
    ...data.categories.flatMap(c => [`## ${stripEmoji(c.title)}`, '', ...data.entries.filter(e => e.c === c.id).map(e => {
      const r = repoOf(e); const m = r ? meta[r] || {} : {}; const mt = maintenance(e);
      const bits = [e.f?.length ? `flags: ${e.f.join(', ')}` : '', mt.warn ? `maintenance: ${mt.note}` : '', m.pushed ? `last push ${m.pushed}` : '', `cost: ${e.cost}`].filter(Boolean).join('; ');
      return `- [${e.n}](${e.u}): ${e.d} (${bits})`;
    }), '']),
    '## Graveyard', '', ...data.graveyard.map(g => `- [${g.n}](${g.u}): ${g.why}. Use instead: ${g.instead}`), '',
  ].join('\n');

  out['report.json'] = JSON.stringify({ reviewed: data.reviewed, refreshed, entries: data.entries.length, flaggedForSafety: flagged, maintenance: stale }, null, 2) + '\n';
  out['assets/stats.svg'] = statsSvg(stale, refreshed);

  if (CHECK) {
    const drift = Object.entries(out).filter(([f, s]) => !existsSync(join(ROOT, f)) || readFileSync(join(ROOT, f), 'utf8') !== s).map(([f]) => f);
    if (drift.length) fail(`generated files out of date, run node scripts/build.mjs --offline: ${drift.join(', ')}`);
    else console.log('check: data valid, generated files up to date');
    return;
  }
  for (const [f, s] of Object.entries(out)) { mkdirSync(dirname(join(ROOT, f)), { recursive: true }); writeFileSync(join(ROOT, f), s); }
  console.log(`built: ${data.entries.length} entries, ${flagged} with safety flags, ${stale.length} maintenance warnings, GitHub data ${refreshed}`);
}

main();
