#!/usr/bin/env node
// stdio MCP server over the curated dataset. No dependencies, no network, no writes.
//
//   node scripts/mcp.mjs
//
// Client config (Claude Desktop, Cursor, VS Code, etc.):
//   { "command": "node", "args": ["<repo>/scripts/mcp.mjs"] }
//
// The server exposes search, lookup, category and toolchain tools plus resources.
// It never reads the sample a client is analysing: the client must pass metadata.
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadData, createContext, entryView, summarize, slugify, FLAG_INFO } from '../lib/normalize.mjs';
import { searchViews, filterViews } from '../lib/search.mjs';
import { TOOLCHAIN, RUNTIME_LABELS } from '../lib/triage.mjs';
import { SAFETY_RULES, LEGAL_NOTE, safetyText } from '../lib/safety.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { data, meta } = loadData(ROOT);
const ctx = createContext(data, meta);
const views = data.entries.map(e => entryView(e, ctx));
const bySlug = new Map(views.map(v => [v.slug, v]));
const byName = new Map(views.map(v => [v.name.toLowerCase(), v]));
const categories = new Map(
  data.categories.map(c => [c.id, { ...c, name: c.title.replace(/^\S+\s/, '') }]),
);

const SERVER = { name: 'awesome-reverse-engineering', version: '1.0.0' };

const TOOLS = [
  {
    name: 'search_tools',
    description:
      'Search reverse engineering tools by name, description, tag or category. Filters cover cost model, safety flag, maintenance warnings and free tiers. Returns compact entries with official URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to match, for example "android decompiler" or "firmware".' },
        category: { type: 'string', enum: [...categories.keys()] },
        cost: { type: 'string', enum: ['free', 'freemium', 'paid', 'mixed', 'unknown'] },
        flag: { type: 'string', enum: Object.keys(FLAG_INFO), description: 'runs = executes code, cloud = uploads code, impersonated = lookalike sites reported.' },
        tag: { type: 'string', description: 'A tag such as go, dotnet, mcp, firmware, evm.' },
        free: { type: 'boolean', description: 'Only tools with a free tier.' },
        warning: { type: 'boolean', description: 'Only tools with a maintenance warning.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_tool',
    description:
      'Get one tool by exact name or slug, including description, cost, safety flags, maintenance state, tags, official URL and related tools.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Tool name or slug.' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_categories',
    description: 'List the 19 categories with entry counts and the id to pass to search_tools.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'recommend_toolchain',
    description:
      'Recommend tools for a detected runtime or container, following the list\'s "Triage by Runtime" rules. Use this after identifying a file with Detect It Easy, file or strings.',
    inputSchema: {
      type: 'object',
      properties: {
        runtime: {
          type: 'string',
          enum: Object.keys(TOOLCHAIN),
          description: 'Detected runtime or container id.',
        },
      },
      required: ['runtime'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_alternatives',
    description: 'List alternative tools in the same category, ranked by stars and name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_safety_guidance',
    description:
      'Return the list\'s safety rules for analysing hostile files, including VM isolation, official downloads, hash lookup instead of upload, and prompt-injection warnings for agents.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_stats',
    description: 'Return counts: entries, categories, flagged tools, stale tools and tools with a free tier.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

const TOOL_TEMPLATES = [
  {
    uriTemplate: 'awesome-re://tool/{slug}',
    name: 'Tool entry',
    description: 'One tool by slug, for example awesome-re://tool/ghidra.',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'awesome-re://category/{id}',
    name: 'Category entries',
    description: 'All entries in one category, for example awesome-re://category/android.',
    mimeType: 'application/json',
  },
];

function resolve(name) {
  const q = String(name || '').trim();
  if (!q) return null;
  return bySlug.get(slugify(q)) || byName.get(q.toLowerCase()) || searchViews(views, q, { limit: 1 })[0] || null;
}

function relatedTo(view, limit = 5) {
  return views
    .filter(v => v.category.id === view.category.id && v.slug !== view.slug)
    .sort(
      (a, b) =>
        (b.maintenance.stars ?? 0) - (a.maintenance.stars ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

const fmt = v =>
  `- ${v.name} (${v.category.name}; ${v.cost.label})${v.flags.length ? ` [flags: ${v.flags.map(f => f.id).join(', ')}]` : ''}${v.maintenance.warning ? ' [maintenance warning]' : ''}: ${v.description} ${v.url}`;

function publicView(v) {
  return {
    slug: v.slug,
    name: v.name,
    url: v.url,
    description: v.description,
    category: v.category,
    cost: v.cost,
    flags: v.flags.map(f => ({ id: f.id, label: f.label, meaning: f.meaning })),
    maintenance: v.maintenance,
    tags: v.tags,
    repo: v.repo,
    reviewed: v.reviewed,
    refreshed: v.refreshed,
    alternatives: relatedTo(v).map(r => ({ slug: r.slug, name: r.name })),
  };
}

function textResult(text, structured) {
  return { content: [{ type: 'text', text }], ...(structured ? { structuredContent: structured } : {}) };
}

function errorResult(text) {
  return { content: [{ type: 'text', text }], isError: true };
}

const HANDLERS = {
  search_tools(args = {}) {
    let pool = views;
    if (args.category || args.cost || args.flag || args.tag || args.free != null || args.warning != null) {
      pool = filterViews(pool, {
        category: args.category,
        cost: args.cost,
        flag: args.flag,
        tag: args.tag,
        free: args.free,
        warning: args.warning,
      });
    }
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
    let hits;
    if (String(args.query || '').trim()) {
      hits = searchViews(pool, args.query, { limit });
    } else {
      hits = [...pool]
        .sort(
          (a, b) =>
            (b.maintenance.stars ?? 0) - (a.maintenance.stars ?? 0) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, limit);
    }
    if (!hits.length) return errorResult('No tool matched. Loosen the query or drop a filter.');
    return textResult(
      `${hits.length} of ${pool.length} matching entries:\n${hits.map(fmt).join('\n')}\n\nEntries reviewed ${ctx.reviewed}; GitHub data ${ctx.refreshed}.`,
      { count: hits.length, total: pool.length, tools: hits.map(publicView) },
    );
  },

  get_tool(args = {}) {
    const v = resolve(args.name);
    if (!v) return errorResult(`No entry named "${args.name}". Use search_tools to find the exact name.`);
    return textResult(JSON.stringify(publicView(v), null, 2), publicView(v));
  },

  list_categories() {
    const rows = data.categories.map(c => ({
      id: c.id,
      name: c.name,
      count: views.filter(v => v.category.id === c.id).length,
    }));
    return textResult(
      rows.map(r => `- ${r.id} (${r.count}): ${r.name}`).join('\n'),
      { categories: rows },
    );
  },

  recommend_toolchain(args = {}) {
    const runtime = String(args.runtime || '').toLowerCase();
    if (!TOOLCHAIN[runtime]) {
      return errorResult(`Unknown runtime "${args.runtime}". Valid ids: ${Object.keys(TOOLCHAIN).join(', ')}.`);
    }
    const names = TOOLCHAIN[runtime];
    const tools = names
      .map(n => data.entries.find(e => e.n.toLowerCase() === n.toLowerCase()))
      .filter(Boolean)
      .map(e => publicView(entryView(e, ctx)));
    const baseline = ['Detect It Easy', 'capa', 'FLOSS']
      .map(n => data.entries.find(e => e.n.toLowerCase() === n.toLowerCase()))
      .filter(Boolean)
      .map(e => publicView(entryView(e, ctx)));
    const all = [...tools, ...baseline.filter(b => !tools.some(t => t.slug === b.slug))];
    const steps = [
      `Detected runtime: ${RUNTIME_LABELS[runtime] || runtime}.`,
      `Specific tools: ${tools.map(t => t.name).join(', ') || 'none in this list'}.`,
      'Confirm the format and any packer with Detect It Easy before trusting the runtime guess.',
      'Work inside the isolated VM described in the safety guidance; never run the sample on the host.',
    ];
    return textResult(
      `${steps.join('\n')}\n\n${all.map(fmt).join('\n')}`,
      { runtime, label: RUNTIME_LABELS[runtime], tools: all, steps },
    );
  },

  list_alternatives(args = {}) {
    const v = resolve(args.name);
    if (!v) return errorResult(`No entry named "${args.name}". Use search_tools to find the exact name.`);
    const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 20);
    const list = relatedTo(v, limit);
    if (!list.length) return textResult(`No alternatives found in ${v.category.name}.`, { tools: [] });
    return textResult(
      `Alternatives to ${v.name} in ${v.category.name}:\n${list.map(fmt).join('\n')}`,
      { tool: v.slug, category: v.category.id, alternatives: list.map(publicView) },
    );
  },

  get_safety_guidance() {
    return textResult(safetyText(), { rules: SAFETY_RULES, legal: LEGAL_NOTE });
  },

  get_stats() {
    const counts = summarize(data, ctx);
    const stats = { ...counts, reviewed: ctx.reviewed, refreshed: ctx.refreshed };
    return textResult(
      `${counts.entries} entries in ${counts.categories} categories; ${counts.flagged} carry a safety flag, ${counts.stale} a maintenance warning, ${counts.free} are fully free. Reviewed ${ctx.reviewed}; GitHub data ${ctx.refreshed}.`,
      stats,
    );
  },
};

function resourceList() {
  const list = [
    {
      uri: 'awesome-re://catalog',
      name: 'Full catalogue',
      description: 'Every entry with cost, safety flags, tags and maintenance state.',
      mimeType: 'application/json',
    },
    {
      uri: 'awesome-re://safety',
      name: 'Safety guidance',
      description: 'VM isolation, official downloads, hash lookup and agent prompt-injection rules.',
      mimeType: 'application/json',
    },
    ...[...categories.values()].map(c => ({
      uri: `awesome-re://category/${c.id}`,
      name: c.name,
      description: `${views.filter(v => v.category.id === c.id).length} entries in ${c.name}.`,
      mimeType: 'application/json',
    })),
  ];
  return list;
}

function readResource(uri) {
  if (uri === 'awesome-re://catalog') {
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(views.map(publicView), null, 2) }] };
  }
  if (uri === 'awesome-re://safety') {
    return {
      contents: [
        { uri, mimeType: 'application/json', text: JSON.stringify({ rules: SAFETY_RULES, legal: LEGAL_NOTE }, null, 2) },
      ],
    };
  }
  const cat = uri.match(/^awesome-re:\/\/category\/([\w.-]+)$/);
  if (cat && categories.has(cat[1])) {
    const c = categories.get(cat[1]);
    const entries = views.filter(v => v.category.id === cat[1]).map(publicView);
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ id: c.id, name: c.name, intro: c.intro, count: entries.length, entries }, null, 2),
        },
      ],
    };
  }
  const tool = uri.match(/^awesome-re:\/\/tool\/([\w.-]+)$/);
  if (tool && bySlug.has(tool[1])) {
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(publicView(bySlug.get(tool[1])), null, 2) }] };
  }
  return null;
}

const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
const ok = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message, data) =>
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });

async function handle(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  if (isNotification) return; // notifications/initialized, notifications/cancelled

  try {
    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
          serverInfo: SERVER,
          instructions: `Curated reverse engineering tool catalogue with safety flags. ${safetyText()}`,
        });

      case 'ping':
        return ok(id, {});

      case 'tools/list':
        return ok(id, { tools: TOOLS });

      case 'tools/call': {
        const name = params?.name;
        if (!name || !HANDLERS[name]) return fail(id, -32602, `Unknown tool: ${name}`);
        const result = await HANDLERS[name](params?.arguments || {});
        return ok(id, result);
      }

      case 'resources/list':
        return ok(id, { resources: resourceList() });

      case 'resources/templates/list':
        return ok(id, { resourceTemplates: TOOL_TEMPLATES });

      case 'resources/read': {
        const uri = params?.uri;
        const result = uri ? readResource(uri) : null;
        if (!result) return fail(id, -32602, `Unknown resource: ${uri}`);
        return ok(id, result);
      }

      case 'prompts/list':
        return ok(id, { prompts: [] });

      case 'logging/setLevel':
        return ok(id, {});

      default:
        return fail(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    return fail(id, -32603, `Internal error: ${err.message}`);
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stderr.write(`Usage: node scripts/mcp.mjs

Runs an MCP server over stdio. Tools: search_tools, get_tool, list_categories,
recommend_toolchain, list_alternatives, get_safety_guidance, get_stats.
Resources: awesome-re://catalog, awesome-re://safety, awesome-re://category/<id>,
awesome-re://tool/<slug>.

No network access and no writes. Logs go to stderr; stdout carries JSON-RPC only.
`);
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return fail(null, -32700, 'Parse error');
  }
  if (Array.isArray(msg)) {
    for (const item of msg) handle(item);
    return;
  }
  handle(msg);
});
rl.on('close', () => process.exit(0));

process.stderr.write(`${SERVER.name} ${SERVER.version}: ${views.length} entries, ${data.categories.length} categories (stdio)\n`);
