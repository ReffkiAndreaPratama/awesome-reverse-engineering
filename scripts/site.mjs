#!/usr/bin/env node
// Builds the static website into _site/ from data.json and data/meta.json.
//   node scripts/site.mjs            (CI deploys _site/ to GitHub Pages)
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON } from './icons.mjs';
import { FAQ, COMPARE } from './site-content.mjs';
import { buildApi } from './api.mjs';
import { siteConfig } from '../lib/site-config.mjs';
import { slugify, entryView, createContext, STALE_INFO } from '../lib/normalize.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '_site');
const SITE = siteConfig();
const BASE = SITE.base;
const REPO = SITE.repoUrl;
const AUTHOR = SITE.author;
const AUTHOR_URL = SITE.authorUrl;
const data = JSON.parse(readFileSync(join(ROOT, 'data.json'), 'utf8'));
const meta = existsSync(join(ROOT, 'data', 'meta.json')) ? JSON.parse(readFileSync(join(ROOT, 'data', 'meta.json'), 'utf8')) : {};
const REVIEWED = data.reviewed;
const REFRESHED = meta._refreshed || REVIEWED;
const YEAR = REVIEWED.slice(0, 4);

const h = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = s => h(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
const strip = t => t.replace(/^\S+\s/, '');
const ghRepo = u => u.match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)\/?$/)?.[1] ?? null;
const repoOf = e => e.r || ghRepo(e.u);
const stars = n => (n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));
const FLAG = { runs: ['▶', 'Runs code: use an isolated VM'], cloud: ['☁', 'Sends code to a third party'], impersonated: ['🎭', 'Impersonated: official link only'] };
function maint(e) {
  const m = meta[repoOf(e)] || {};
  if (e.m) return e.m;
  if (m.archived) return 'Archived';
  if (m.pushed && (Date.parse(REFRESHED) - Date.parse(m.pushed)) / 864e5 > 365) return `No push since ${m.pushed}`;
  return '';
}
const icon = (id, size = 28, color = '#4338ca') =>
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ICON[id] || ''}</svg>`;

const CSS = `
:root{--bg:#fbfbff;--card:#fff;--ink:#111827;--dim:#4b5563;--soft:#6b7280;--line:#e5e7eb;--tint:#eef2ff;--brand:#4338ca;--brand2:#7c3aed;--warn:#b45309;--warnbg:#fffbeb}
*{box-sizing:border-box}html{overflow-x:clip}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Inter,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;overflow-x:clip}
a{color:var(--brand)}a:hover{text-decoration:underline}code{font:.9em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--tint);padding:0 4px;border-radius:4px}
header.top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line)}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.top .wrap{display:flex;align-items:center;gap:16px;height:56px}.top .brand{font-weight:800;color:var(--ink);text-decoration:none;display:flex;gap:8px;align-items:center}
.top nav{margin-left:auto;display:flex;gap:16px;font-size:14px}.top nav a{color:var(--dim);text-decoration:none;white-space:nowrap}.top .short{display:none}
.hero{padding:40px 0 8px}.hero img{width:100%;height:auto;border-radius:16px;border:1px solid var(--line)}
h1{font-size:clamp(28px,4.4vw,44px);line-height:1.1;letter-spacing:-.02em;margin:28px 0 12px}h2{font-size:26px;letter-spacing:-.01em;margin:44px 0 12px}
.lede{color:var(--dim);font-size:18px}.meta{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--soft)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}.stat b{display:block;font:600 24px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--brand)}.stat span{font-size:13px;color:var(--soft)}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.cat{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;text-decoration:none;color:var(--ink);min-width:0}
.cat:hover{border-color:#c7d2fe;box-shadow:0 6px 18px -10px rgba(49,46,129,.35);text-decoration:none}.cat .ic{flex:none;width:52px;height:52px;border-radius:12px;background:var(--tint);display:grid;place-items:center}
.cat b{display:block}.cat small{color:var(--soft);display:block;overflow-wrap:break-word}
.search{width:100%;font-size:17px;padding:14px 16px;border:2px solid #c7d2fe;border-radius:12px;background:#fff;color:var(--ink);outline:none}.search:focus{border-color:var(--brand)}
#results{margin-top:12px;display:grid;gap:8px}#results .r{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;overflow-wrap:break-word}#results .r small{color:var(--soft)}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
table{border-collapse:separate;border-spacing:0;width:100%;min-width:760px;font-size:15px}
.facts{min-width:0}.facts th{position:static;width:170px;background:transparent;border-bottom:1px solid #f3f4f6;color:var(--soft);font-size:13px;text-transform:none;letter-spacing:0;white-space:normal;vertical-align:top}
.facts td{background:var(--card)}
.facts tr:hover td{background:var(--card)}
.facts th:first-child,.facts td:first-child{position:static;box-shadow:none}
.tools{columns:2;column-gap:32px;padding-left:20px}.tools li{margin:0 0 8px;break-inside:avoid}
@media(max-width:700px){.tools{columns:1}}
th{position:sticky;top:0;background:#f9fafb;color:var(--soft);font-size:12px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);word-break:keep-all;white-space:nowrap;z-index:2}
td{padding:10px 12px;border-top:1px solid #f3f4f6;vertical-align:top;overflow-wrap:break-word;background:var(--card)}
tr:hover td{background:#f5f7ff}
th:first-child,td:first-child{position:sticky;left:0;z-index:1;box-shadow:1px 0 0 var(--line),6px 0 10px -8px rgba(17,24,39,.3)}th:first-child{z-index:3;background:#f9fafb}
td.n{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--soft);white-space:nowrap}td:first-child a{font-weight:600}td:first-child a.src{font-weight:400;font-size:12px;color:var(--soft)}
.flag{display:inline-block;font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;border:1px solid #c7d2fe;color:var(--brand);background:#fff;border-radius:999px;padding:1px 8px;margin:2px 4px 2px 0;white-space:nowrap}
.flag.w{border-color:#fde68a;color:var(--warn);background:var(--warnbg)}
.strip{width:100%;height:auto;margin:8px 0 4px}
details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:10px 0}summary{font-weight:700;cursor:pointer}details p{color:var(--dim);margin:10px 0 0}
.crumbs{font-size:14px;color:var(--soft);margin-top:24px}.crumbs a{color:var(--soft)}
.note{background:var(--warnbg);border:1px solid #fde68a;border-radius:12px;padding:12px 16px;color:#78350f}
footer{margin:56px 0 0;padding:28px 0;border-top:1px solid var(--line);color:var(--soft);font-size:14px}
@media(max-width:860px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.wrap{padding:0 16px}.grid{grid-template-columns:minmax(0,1fr)}.top nav a.hide{display:none}.top .full{display:none}.top .short{display:inline}h2{font-size:22px}.lede{font-size:16px}}
`;

function page({ path, title, description, body, jsonld = [], ogType = 'website' }) {
  const url = `${BASE}/${path}`;
  const parts = path.split('/').filter(Boolean);
  const depth = path.endsWith('/') ? parts.length : Math.max(0, parts.length - 1);
  const rel = depth ? '../'.repeat(depth) : './';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(title)}</title>
<meta name="description" content="${h(description)}">
<link rel="canonical" href="${url}">
<meta name="author" content="${h(AUTHOR)}">
<meta property="og:type" content="${ogType}"><meta property="og:title" content="${h(title)}"><meta property="og:description" content="${h(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${BASE}/assets/social-preview.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${BASE}/assets/social-preview.jpg">
<link rel="alternate" type="text/plain" title="llms.txt" href="${rel}llms.txt">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#4338ca"/><path d="M16 14l-7 10 7 10M32 14l7 10-7 10M27 12l-6 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>`)}">
<style>${CSS}</style>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="${rel}">${icon('disasm', 22)} <span class="full">Awesome Reverse Engineering</span><span class="short">Awesome RE</span></a><nav><a href="${rel}#categories">Categories</a><a class="hide" href="${rel}compare/${COMPARE.slug}/">Compare</a><a class="hide" href="${rel}#faq">FAQ</a><a href="${REPO}">GitHub</a></nav></div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">Entries reviewed ${REVIEWED}; GitHub data refreshed ${REFRESHED}. Released under CC0. Source: <a href="${REPO}">GitHub</a> · <a href="${rel}data.json">data.json</a> · <a href="${rel}llms.txt">llms.txt</a> · <a href="${rel}api/index.json">API</a></div></footer>
</body>
</html>
`;
}

function entryRow(e, prefix = '../../') {
  const m = meta[repoOf(e)] || {};
  const mt = maint(e);
  const flags = (e.f || []).map(f => `<span class="flag" title="${h(FLAG[f][1])}">${FLAG[f][0]} ${f}</span>`).join('') + (mt ? `<span class="flag w" title="${h(mt)}">⚠ ${h(mt)}</span>` : '');
  return `<tr><td><a href="${prefix}t/${slugify(e.n)}/">${h(e.n)}</a><br><a class="src" href="${h(e.u)}" rel="noopener">source</a></td><td>${md(e.d)}${flags ? `<div>${flags}</div>` : ''}</td><td>${h(e.cost)}</td><td class="n">${repoOf(e) ? `${m.pushed ? m.pushed.slice(0, 7) : ''}${m.stars != null ? ` · ★ ${stars(m.stars)}` : ''}` : 'website'}</td></tr>`;
}

function build() {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const write = (p, s) => { mkdirSync(dirname(join(OUT, p)), { recursive: true }); writeFileSync(join(OUT, p), s); };
  const urls = [];
  const cats = data.categories.map(c => ({ ...c, name: strip(c.title), entries: data.entries.filter(e => e.c === c.id) }));
  const flagged = data.entries.filter(e => e.f?.length).length;
  const ctx = createContext(data, meta);
  const views = data.entries.map(e => entryView(e, ctx));

  // ---------- home ----------
  const faqHtml = FAQ.map(f => `<details><summary>${h(f.q)}</summary><p>${h(f.a)}</p></details>`).join('\n');
  const home = page({
    path: '',
    title: `Awesome Reverse Engineering: ${data.entries.length} tools with safety flags (${YEAR})`,
    description: `A curated, weekly-refreshed list of ${data.entries.length} reverse engineering tools for binaries, Android, .NET, firmware and smart contracts, with a safety flag on every entry and MCP servers for AI agents.`,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Awesome Reverse Engineering', url: `${BASE}/`, inLanguage: 'en', author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL }, dateModified: REFRESHED },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Reverse engineering tool categories', itemListElement: cats.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: `${BASE}/c/${c.id}/` })) },
    ],
    body: `
<section class="hero"><img src="assets/banner.webp" alt="Awesome Reverse Engineering: binaries, Android, .NET, firmware and smart contracts" width="1600" height="560"></section>
<h1>Reverse engineering tools, reviewed for safety</h1>
<p class="lede">${data.entries.length} tools and resources for understanding software you did not write: native binaries, Android and .NET apps, language runtimes, web apps, firmware and smart contracts. Every entry is flagged for execution and disclosure risk, and maintenance data refreshes weekly.</p>
<div class="stats"><div class="stat"><b>${data.entries.length}</b><span>entries</span></div><div class="stat"><b>${cats.length}</b><span>categories</span></div><div class="stat"><b>${flagged}</b><span>with a safety flag</span></div><div class="stat"><b>${REFRESHED}</b><span>last GitHub refresh</span></div></div>
<input class="search" id="q" type="search" placeholder="Search ${data.entries.length} tools: ghidra, android, firmware, mcp..." aria-label="Search tools">
<div id="results"></div>
<p class="meta"><a href="all/">Browse all ${views.length} tools</a> · <a href="api/index.json">JSON API</a></p>
<h2 id="categories">Categories</h2>
<div class="grid">${cats.map(c => `<a class="cat" href="c/${c.id}/"><span class="ic">${icon(c.id)}</span><span><b>${h(c.name)}</b><small>${c.entries.length} entries · ${h(c.entries.slice(0, 3).map(e => e.n).join(', '))}</small></span></a>`).join('')}</div>
<h2>Compare</h2>
<p><a href="compare/${COMPARE.slug}/">${h(COMPARE.title)}</a>: price, decompilation, scripting, AI integration and security notes side by side.</p>
<h2 id="safety-first">Safety first</h2>
<p class="note">Analyse in a full VM with no route out, download tools only from the official source (lookalike sites for Ghidra, dnSpy and ILSpy have pushed malware), treat project files and proof-of-concept repos as code, look up hashes instead of uploading, and keep approvals on when an AI agent reads a hostile binary.</p>
<h2 id="faq">Frequently asked questions</h2>
${faqHtml}
<script>
const D=${JSON.stringify(views.map(v => ({ n: v.name, s: v.slug, u: v.url, d: v.description, c: v.category.name, id: v.category.id, f: v.flags.map(f => f.id), t: v.tags })))};
const q=document.getElementById('q'),r=document.getElementById('results');
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
q.addEventListener('input',()=>{const t=norm(q.value.trim());if(!t){r.innerHTML='';return}
const toks=t.split(/\s+/).filter(Boolean);
const hits=D.map(e=>{const name=norm(e.n),desc=norm(e.d),cat=norm(e.c),tags=norm(e.t.join(' '));let score=0;
for(const x of toks){const p=name===x?100:name.startsWith(x)?70:name.includes(x)?45:tags.includes(x)?25:desc.includes(x)?12:cat.includes(x)?8:0;if(!p)return null;score+=p}
return {e,score}}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,30).map(x=>x.e);
r.innerHTML=hits.length?hits.map(e=>'<div class="r"><a href="t/'+esc(e.s)+'/"><b>'+esc(e.n)+'</b></a> <small>· <a href="c/'+e.id+'/">'+esc(e.c)+'</a>'+(e.f.length?' · '+e.f.join(', '):'')+' · <a href="'+esc(e.u)+'" rel="noopener">source</a></small><br>'+esc(e.d)+'</div>').join(''):'<div class="r">No match. Try a broader word.</div>'});
</script>`,
  });
  write('index.html', home); urls.push('');

  // ---------- category pages ----------
  cats.forEach((c, i) => {
    const prev = cats[i - 1], next = cats[i + 1];
    write(`c/${c.id}/index.html`, page({
      path: `c/${c.id}/`,
      title: `${c.name}: ${c.entries.length} reverse engineering tools compared (${YEAR})`,
      description: `${c.intro} ${c.entries.slice(0, 4).map(e => e.n).join(', ')} and more, with cost, safety flags and maintenance status.`,
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Awesome Reverse Engineering', item: `${BASE}/` }, { '@type': 'ListItem', position: 2, name: c.name, item: `${BASE}/c/${c.id}/` }] },
        { '@context': 'https://schema.org', '@type': 'ItemList', name: `${c.name} tools`, numberOfItems: c.entries.length, dateModified: REFRESHED, itemListElement: c.entries.map((e, k) => ({ '@type': 'ListItem', position: k + 1, name: e.n, url: e.u })) },
      ],
      body: `
<p class="crumbs"><a href="../../">Awesome Reverse Engineering</a> / ${h(c.name)}</p>
<img class="strip" src="../../assets/sections/${c.id}.svg" alt="${h(c.name)}: ${c.entries.length} entries" width="1280" height="200">
<p class="meta">REVERSE ENGINEERING TOOLS</p>
<h1 style="margin-top:4px">${h(c.name)}</h1>
<p class="lede">${md(c.intro)}</p>
<p class="meta">${c.entries.length} entries · reviewed ${REVIEWED} · GitHub data ${REFRESHED}</p>
<div class="tbl"><table><thead><tr><th>Tool</th><th>Use it when</th><th>Cost</th><th>Last push · Stars</th></tr></thead><tbody>${c.entries.map(e => entryRow(e)).join('')}</tbody></table></div>
${c.id === 'disasm' ? `<p>Choosing between the big three? Read <a href="../../compare/${COMPARE.slug}/">${h(COMPARE.title)}</a>.</p>` : ''}
<p class="meta">Flags: ▶ runs code (use an isolated VM) · ☁ sends code to a third party · ◆ commonly impersonated (official link only) · ⚠ maintenance concern</p>
<p>${prev ? `← <a href="../${prev.id}/">${h(prev.name)}</a>` : ''}${prev && next ? ' · ' : ''}${next ? `<a href="../${next.id}/">${h(next.name)}</a> →` : ''}</p>`,
    }));
    urls.push(`c/${c.id}/`);
  });

  // ---------- comparison ----------
  const cmpRows = COMPARE.rows.map(r => `<tr><td>${h(r[0])}</td>${r.slice(1).map(x => `<td>${h(x)}</td>`).join('')}</tr>`).join('');
  write(`compare/${COMPARE.slug}/index.html`, page({
    path: `compare/${COMPARE.slug}/`,
    title: `${COMPARE.title} (${YEAR}): price, decompiler, AI and security compared`,
    description: COMPARE.lede.replace('{{REVIEWED}}', REVIEWED),
    ogType: 'article',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: COMPARE.title, dateModified: REVIEWED, author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL }, mainEntityOfPage: `${BASE}/compare/${COMPARE.slug}/` },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Awesome Reverse Engineering', item: `${BASE}/` }, { '@type': 'ListItem', position: 2, name: COMPARE.title, item: `${BASE}/compare/${COMPARE.slug}/` }] },
    ],
    body: `
<p class="crumbs"><a href="../../">Awesome Reverse Engineering</a> / Compare</p>
<h1>${h(COMPARE.title)}</h1>
<p class="lede">${h(COMPARE.lede.replace('{{REVIEWED}}', REVIEWED))}</p>
<div class="tbl"><table><thead><tr><th>&nbsp;</th>${COMPARE.cols.map(c => `<th>${h(c)}</th>`).join('')}</tr></thead><tbody>${cmpRows}</tbody></table></div>
<h2>Verdict</h2>
<p>${h(COMPARE.verdict)}</p>
<p>See every option in <a href="../../c/disasm/">Disassemblers &amp; Decompilers</a> and the agent integrations in <a href="../../c/ai/">AI-Assisted RE &amp; MCP Servers</a>.</p>`,
  }));
  urls.push(`compare/${COMPARE.slug}/`);

  // ---------- per-tool pages ----------
  const sorted = [...views].sort((a, b) => a.name.localeCompare(b.name));
  views.forEach(v => {
    const alts = views
      .filter(x => x.category.id === v.category.id && x.slug !== v.slug)
      .sort((a, b) => (b.maintenance.stars ?? 0) - (a.maintenance.stars ?? 0) || a.name.localeCompare(b.name))
      .slice(0, 5);
    const badges = v.flags.map(f => `<span class="flag" title="${h(FLAG[f.id][1])}">${FLAG[f.id][0]} ${f.id}</span>`).join('') +
      (v.maintenance.warning ? `<span class="flag w" title="${h(v.maintenance.note)}">${STALE_INFO.symbol} ${h(v.maintenance.note)}</span>` : '');
    const facts = [
      ['Official source', `<a href="${h(v.url)}" rel="noopener">${h(v.url)}</a>`],
      ['Category', `<a href="../../c/${v.category.id}/">${h(v.category.name)}</a>`],
      ['Cost', `${h(v.cost.label)}${v.cost.note ? ` <small>(${h(v.cost.note)})</small>` : ''}`],
      ['Safety flags', badges || 'None known at review'],
      ['Maintenance', v.maintenance.note ? h(v.maintenance.note) : 'No known concern'],
      ['Last push', v.maintenance.lastPush ? h(v.maintenance.lastPush) : 'not tracked'],
      ['Stars', v.maintenance.stars != null ? `${stars(v.maintenance.stars)} on GitHub` : 'not tracked'],
      ['Reviewed', h(v.reviewed)],
      ['Machine-readable', `<a href="../../api/tools/${v.slug}.json">JSON</a>`],
    ].map(([k, val]) => `<tr><th>${k}</th><td>${val}</td></tr>`).join('');

    write(`t/${v.slug}/index.html`, page({
      path: `t/${v.slug}/`,
      title: `${v.name}: ${v.category.name} tool with safety notes (${YEAR})`,
      description: `${v.description} Cost: ${v.cost.label}. Reviewed for execution and disclosure risk on ${v.reviewed}.`,
      ogType: 'article',
      jsonld: [
        { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: v.name, description: v.description, url: v.url, applicationCategory: 'DeveloperApplication', ...(v.cost.free ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } } : {}) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Awesome Reverse Engineering', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: v.category.name, item: `${BASE}/c/${v.category.id}/` },
          { '@type': 'ListItem', position: 3, name: v.name, item: `${BASE}/t/${v.slug}/` },
        ] },
      ],
      body: `
<p class="crumbs"><a href="../../">Awesome Reverse Engineering</a> / <a href="../../c/${v.category.id}/">${h(v.category.name)}</a> / ${h(v.name)}</p>
<p class="meta">${h(v.category.name.toUpperCase())} · REVIEWED ${h(v.reviewed)}</p>
<h1>${h(v.name)}</h1>
<p class="lede">${md(v.description)}</p>
${badges ? `<p>${badges}</p>` : ''}
<div class="tbl"><table class="facts"><tbody>${facts}</tbody></table></div>
<h2>Safety notes</h2>
${v.flags.length ? `<ul>${v.flags.map(f => `<li><b>${h(f.label)}</b>: ${h(f.meaning)}</li>`).join('')}</ul>` : '<p>No execution, disclosure or impersonation flag was known at review. Any parser of hostile input can have bugs, so the VM rule still applies.</p>'}
<p class="meta"><a href="../../#safety-first">Read the safety rules</a> · ${h(v.maintenance.warning ? 'This entry carries a maintenance warning.' : 'Maintenance looked healthy at the last refresh.')}</p>
${alts.length ? `<h2>Alternatives in ${h(v.category.name)}</h2><ul class="tools">${alts.map(a => `<li><a href="../${a.slug}/">${h(a.name)}</a>: ${h(a.description)}</li>`).join('')}</ul>` : ''}
<p><a href="${h(v.url)}" rel="noopener">Official source</a> · <a href="../../c/${v.category.id}/">All ${h(v.category.name)} tools</a> · <a href="../../api/tools/${v.slug}.json">JSON</a></p>`,
    }));
    urls.push(`t/${v.slug}/`);
  });

  // ---------- all tools ----------
  const groups = new Map();
  for (const v of sorted) {
    const key = /[a-z]/i.test(v.name[0]) ? v.name[0].toUpperCase() : '#';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }
  write('all/index.html', page({
    path: 'all/',
    title: `All ${views.length} reverse engineering tools, A to Z (${YEAR})`,
    description: `Every entry in the list, grouped alphabetically, with category, cost and safety flags. ${views.length} tools reviewed for execution and disclosure risk.`,
    body: `
<p class="crumbs"><a href="../">Awesome Reverse Engineering</a> / All tools</p>
<h1>All ${views.length} tools</h1>
<p class="lede">Every entry, grouped alphabetically. Each tool page carries the description, cost, safety flags, maintenance state and alternatives.</p>
${[...groups].map(([letter, list]) => `<h2 id="${letter.toLowerCase()}">${letter}</h2><ul class="tools">${list.map(v => `<li><a href="../t/${v.slug}/">${h(v.name)}</a> <small>· ${h(v.category.name)}${v.flags.length ? ` · ${v.flags.map(f => f.id).join(', ')}` : ''}</small></li>`).join('')}</ul>`).join('')}`,
  }));
  urls.push('all/');

  // ---------- machine layer ----------
  const api = buildApi({ data, meta, base: BASE, reviewed: REVIEWED, refreshed: REFRESHED });
  for (const [path, payload] of api) write(path, JSON.stringify(payload, null, 2) + '\n');
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${BASE}/${u}</loc><lastmod>${REFRESHED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
  write('404.html', page({ path: '404.html', title: 'Not found · Awesome Reverse Engineering', description: 'Page not found.', body: '<h1>Page not found</h1><p><a href="./">Back to the list</a></p>' }));
  for (const f of ['llms.txt', 'data.json', 'report.json']) cpSync(join(ROOT, f), join(OUT, f));
  cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
  writeFileSync(join(OUT, '.nojekyll'), '');
  console.log(`site: ${urls.length} pages in _site/`);
}

build();
