// Shared read-only model over data.json. Used by the API builder, the MCP server,
// the triage CLI and the tests, so every consumer sees the same names, slugs,
// cost models, flags and maintenance states.
//
// Nothing here writes to data.json: normalisation is derived data. Fields that are
// editorial (description, cost label, flags) are passed through unchanged.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const FLAG_INFO = {
  runs: {
    label: 'Runs code',
    symbol: '\u25b6',
    meaning:
      'Executes or emulates target code, or loads third-party plugins and scripts. Use inside an isolated VM.',
  },
  cloud: {
    label: 'Sends code to a third party',
    symbol: '\u2601',
    meaning:
      'Sends your binary or code to a third party when used as documented (hosted service or remote model).',
  },
  impersonated: {
    label: 'Impersonated',
    symbol: '\u{1F3AD}',
    meaning:
      'Lookalike download sites or trojanised builds have been reported. Use the linked official source only.',
  },
};

export const STALE_INFO = {
  symbol: '\u26a0',
  label: 'Maintenance concern',
  meaning: 'Archived, no push in over a year, or the maintainers declare limited maintenance.',
};

const COST_MODELS = {
  Free: { model: 'free', free: true, freeTier: true },
  'Free \u00b7 Paid': { model: 'mixed', free: false, freeTier: true, note: 'Free and paid editions' },
  Paid: { model: 'paid', free: false, freeTier: false },
  'Paid \u00b7 Free tier': { model: 'freemium', free: false, freeTier: true },
  'Free tier \u00b7 Paid': { model: 'freemium', free: false, freeTier: true },
  'Needs IDA Pro': { model: 'paid', free: false, freeTier: false, note: 'Requires a paid IDA Pro licence' },
  'About $1 (Patreon)': { model: 'paid', free: false, freeTier: false, note: 'About US$1 on Patreon' },
  'Free \u00b7 Premium': { model: 'freemium', free: false, freeTier: true },
};

// Keyword rules are deliberately conservative: a tag is a search aid, not a claim.
const TAG_RULES = [
  [/\bgo\b|golang|gore/i, 'go'],
  [/flutter|\bdart\b/i, 'flutter'],
  [/unity|il2cpp|cpp2il/i, 'unity'],
  [/react native|hermes/i, 'react-native'],
  [/python|pyinstaller|pycdc|\.pyc\b/i, 'python'],
  [/electron|asar/i, 'electron'],
  [/webassembly|\bwasm\b|\bwabt\b/i, 'wasm'],
  [/\.net\b|mscorlib|dnspy|ilspy|managed code/i, 'dotnet'],
  [/android|\bapk\b|\bdex\b|jadx|smali/i, 'android'],
  [/\bios\b|macos|mach-o|ipsw|apple/i, 'apple'],
  [/firmware|embedded|binwalk|unblob|uefi|squashfs/i, 'firmware'],
  [/smart contract|\bevm\b|solidity|ethereum|bytecode/i, 'evm'],
  [/\bmcp\b|ai agent|llm|ai-assisted/i, 'mcp'],
  [/debugger|debug/i, 'debugger'],
  [/decompil/i, 'decompiler'],
  [/disassembl|disasm/i, 'disassembler'],
  [/emulat/i, 'emulation'],
  [/memory|volatility/i, 'memory'],
  [/\bdiff/i, 'binary-diff'],
  [/\bhex\b|file format|parser/i, 'formats'],
  [/frida|hook|instrument|dynamorio/i, 'instrumentation'],
  [/yara|detect|\bcapa\b|triage/i, 'triage'],
  [/\bctf\b|challenge|crackme|wargame/i, 'practice'],
  [/course|book|learn|tutorial|training/i, 'learning'],
];

const CATEGORY_TAGS = {
  triage: ['triage'],
  formats: ['formats'],
  disasm: ['disassembler', 'decompiler'],
  debug: ['debugger'],
  instr: ['instrumentation'],
  memory: ['memory'],
  frameworks: ['framework'],
  diff: ['binary-diff'],
  android: ['android'],
  dotnet: ['dotnet'],
  apple: ['apple'],
  runtimes: ['runtime'],
  web: ['web'],
  firmware: ['firmware'],
  evm: ['evm'],
  ai: ['mcp', 'ai'],
  lab: ['lab'],
  learn: ['learning'],
  practice: ['practice'],
};

export const clean = s => String(s ?? '').trim();

// Data titles carry one leading emoji. README headings rely on this shape.
export const stripEmoji = t => clean(t).replace(/^\S+\s/, '');

export function slugify(value) {
  return clean(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const GH_URL = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/;

export const repoOf = e => e.r || e.u?.match(GH_URL)?.[1] || null;

export function costOf(label) {
  const known = COST_MODELS[clean(label)];
  if (known) return { label: clean(label), ...known };
  const lower = clean(label).toLowerCase();
  if (lower.includes('needs')) {
    return { label: clean(label), model: 'paid', free: false, freeTier: false, note: 'Depends on a paid product' };
  }
  if (lower.includes('free') && /(paid|premium|tier)/.test(lower)) {
    return { label: clean(label), model: 'freemium', free: false, freeTier: true };
  }
  if (lower.includes('free')) return { label: clean(label), model: 'free', free: true, freeTier: true };
  if (lower.includes('paid')) return { label: clean(label), model: 'paid', free: false, freeTier: false };
  return { label: clean(label), model: 'unknown', free: false, freeTier: false };
}

export function daysBetween(from, to) {
  if (!from || !to) return null;
  return Math.floor((Date.parse(to) - Date.parse(from)) / 864e5);
}

export function maintenanceOf(e, meta = {}, today = null, staleDays = 365) {
  const repo = repoOf(e);
  const m = repo ? meta[repo] || {} : {};
  const base = { lastPush: m.pushed || null, stars: m.stars ?? null, archived: Boolean(m.archived) };
  if (e.m) return { ...base, status: 'declared', warning: true, note: clean(e.m) };
  if (m.archived) return { ...base, status: 'archived', warning: true, note: 'Archived' };
  if (m.pushed && today) {
    const age = daysBetween(m.pushed, today);
    if (age != null && age > staleDays) {
      return { ...base, status: 'stale', warning: true, note: `No push since ${m.pushed}` };
    }
  }
  if (m.lastError) return { ...base, status: 'unknown', warning: false, note: clean(m.lastError) };
  return { ...base, status: 'ok', warning: false, note: '' };
}

export function tagsFor(e, category) {
  const haystack = `${e.n} ${e.d} ${e.cost}`;
  const tags = new Set(CATEGORY_TAGS[e.c] || [e.c]);
  for (const [re, tag] of TAG_RULES) if (re.test(haystack)) tags.add(tag);
  for (const explicit of e.t || []) tags.add(clean(explicit).toLowerCase());
  return [...tags].filter(Boolean);
}

export function entryView(e, ctx) {
  const category = ctx.categories.get(e.c) || { id: e.c, title: e.c };
  const flags = (e.f || [])
    .filter(f => FLAG_INFO[f])
    .map(f => ({ id: f, ...FLAG_INFO[f] }));
  const maintenance = maintenanceOf(e, ctx.meta, ctx.today);
  return {
    slug: slugify(e.n),
    name: clean(e.n),
    url: e.u,
    description: clean(e.d),
    category: { id: category.id, name: stripEmoji(category.title), title: category.title },
    cost: costOf(e.cost),
    flags,
    maintenance,
    tags: tagsFor(e, category),
    repo: repoOf(e),
    reviewed: ctx.reviewed,
    refreshed: ctx.refreshed,
  };
}

export function loadData(root) {
  const data = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8'));
  const metaPath = join(root, 'data', 'meta.json');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
  return { data, meta };
}

export function createContext(data, meta) {
  const categories = new Map(data.categories.map(c => [c.id, c]));
  return {
    data,
    meta,
    categories,
    today: meta._refreshed || data.reviewed,
    reviewed: data.reviewed,
    refreshed: meta._refreshed || data.reviewed,
  };
}

export function summarize(data, ctx) {
  const views = data.entries.map(e => entryView(e, ctx));
  return {
    entries: views.length,
    categories: data.categories.length,
    graveyard: data.graveyard.length,
    flagged: views.filter(v => v.flags.length > 0).length,
    stale: views.filter(v => v.maintenance.warning).length,
    free: views.filter(v => v.cost.model === 'free').length,
  };
}

export function validateData(data) {
  const errors = [];
  const push = m => errors.push(m);
  if (!data || !Array.isArray(data.categories)) return ['data.categories must be an array'];
  if (!Array.isArray(data.entries)) return ['data.entries must be an array'];

  const ids = new Set();
  for (const c of data.categories) {
    for (const k of ['id', 'title', 'intro']) if (!clean(c[k])) push(`category missing ${k}`);
    if (c.id && ids.has(c.id)) push(`duplicate category id: ${c.id}`);
    if (c.id) ids.add(c.id);
  }
  const names = new Set();
  const urls = new Set();
  const slugs = new Set();
  for (const e of data.entries) {
    const where = `entry "${e.n}"`;
    for (const k of ['c', 'n', 'u', 'cost', 'd']) if (!clean(e[k])) push(`${where}: missing ${k}`);
    if (e.c && !ids.has(e.c)) push(`${where}: unknown category ${e.c}`);
    if (e.u && !/^https:\/\/\S+$/.test(e.u)) push(`${where}: URL must be https`);
    if (e.d && !/[.)]$/.test(clean(e.d))) push(`${where}: description must end with a period`);
    if (/[\u2013\u2014]/.test(JSON.stringify(e))) push(`${where}: no en or em dashes`);
    for (const f of e.f || []) if (!FLAG_INFO[f]) push(`${where}: unknown flag ${f}`);
    if (e.t && !Array.isArray(e.t)) push(`${where}: t must be an array of strings`);
    if (e.p && !Array.isArray(e.p)) push(`${where}: p must be an array of strings`);
    const key = clean(e.n).toLowerCase();
    if (names.has(key)) push(`${where}: duplicate name`);
    if (urls.has(e.u)) push(`${where}: duplicate URL`);
    const slug = slugify(e.n);
    if (slugs.has(slug)) push(`${where}: slug collision ${slug}`);
    names.add(key);
    urls.add(e.u);
    slugs.add(slug);
  }
  return errors;
}
