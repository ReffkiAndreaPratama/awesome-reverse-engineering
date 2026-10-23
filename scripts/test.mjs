import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import {
  loadData,
  createContext,
  entryView,
  summarize,
  validateData,
  costOf,
  slugify,
} from '../lib/normalize.mjs';
import { validateSchema } from '../lib/schema-validate.mjs';
import { searchViews, filterViews } from '../lib/search.mjs';
import { detect, recommend } from '../lib/triage.mjs';
import { healthReport } from '../lib/health.mjs';
import { siteConfig } from '../lib/site-config.mjs';
import { buildApi } from '../scripts/api.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { data, meta } = loadData(ROOT);
const ctx = createContext(data, meta);
const views = data.entries.map(e => entryView(e, ctx));

const pe = (() => {
  const b = Buffer.alloc(256);
  b.write('MZ', 0, 'latin1');
  b.writeUInt32LE(0x40, 0x3c);
  b.write('PE\0\0', 0x40, 'latin1');
  return b;
})();
const elf = Buffer.concat([
  Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]),
  Buffer.alloc(56),
  Buffer.from('Go build ID: "test" runtime.gopanic runtime.main go1.24'),
]);

test('dataset satisfies the published schema and editorial rules', () => {
  const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'data.schema.json'), 'utf8'));
  assert.deepEqual(validateSchema(data, schema), []);
  assert.deepEqual(validateData(data), []);
});

test('schema validation rejects bad entries', () => {
  const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'data.schema.json'), 'utf8'));
  const bad = {
    categories: [{ id: 'triage', title: 'Triage', intro: 'x' }],
    entries: [{ c: 'triage', n: 'x', u: 'http://example.test', cost: 'Free', d: 'no period' }],
  };
  const errors = validateSchema(bad, schema);
  assert.ok(errors.some(e => e.includes('does not match ^https://')));
  assert.ok(errors.some(e => e.includes('does not match [.)]$')));
});

test('normalised entries have unique slugs, cost models and flags', () => {
  assert.equal(views.length, data.entries.length);
  assert.equal(new Set(views.map(v => v.slug)).size, views.length);
  for (const v of views) {
    assert.match(v.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(['free', 'freemium', 'paid', 'mixed', 'unknown'].includes(v.cost.model));
    assert.ok(v.description.endsWith('.'));
    for (const f of v.flags) assert.ok(['runs', 'cloud', 'impersonated'].includes(f.id));
  }
  assert.equal(slugify('@electron/asar'), 'electron-asar');
  assert.equal(slugify('The Ghidra Book, 2nd ed'), 'the-ghidra-book-2nd-ed');
  assert.equal(summarize(data, ctx).entries, data.entries.length);
});

test('cost labels map to a stable model', () => {
  assert.equal(costOf('Free').model, 'free');
  assert.equal(costOf('Needs IDA Pro').model, 'paid');
  assert.equal(costOf('Free \u00b7 Paid').model, 'mixed');
  assert.equal(costOf('Free tier \u00b7 Paid').model, 'freemium');
  assert.equal(costOf('Free tier \u00b7 Paid').freeTier, true);
});

test('search and filters return relevant entries', () => {
  const hits = searchViews(views, 'android decompiler', { limit: 5 });
  assert.ok(hits.length > 0);
  assert.ok(hits.some(v => v.category.id === 'android'));

  const runs = filterViews(views, { flag: 'runs' });
  assert.ok(runs.length > 0);
  assert.ok(runs.every(v => v.flags.some(f => f.id === 'runs')));

  const free = filterViews(views, { free: true });
  assert.ok(free.length > 0);
  assert.ok(free.every(v => v.cost.freeTier));

  assert.equal(filterViews(views, { category: 'nope' }).length, 0);
});

test('static API carries every entry and category', () => {
  const api = buildApi({
    data,
    meta,
    base: 'https://example.test',
    reviewed: data.reviewed,
    refreshed: meta._refreshed || data.reviewed,
  });
  for (const path of ['api/index.json', 'api/entries.json', 'api/search-index.json', 'api/schema.json']) {
    assert.ok(api.has(path), `${path} missing`);
  }
  const index = api.get('api/index.json');
  assert.equal(index.counts.entries, data.entries.length);
  assert.equal(index.counts.categories, data.categories.length);
  assert.equal(
    index.categories.reduce((n, c) => n + c.count, 0),
    data.entries.length,
  );

  const entries = api.get('api/entries.json');
  assert.equal(entries.entries.length, data.entries.length);
  assert.ok(entries.entries.every(e => e.links.page.startsWith('https://example.test/t/')));

  const ghidra = api.get('api/tools/ghidra.json');
  assert.equal(ghidra.name, 'Ghidra');
  assert.equal(ghidra.category.id, 'disasm');
  assert.ok(Array.isArray(ghidra.related));

  const search = api.get('api/search-index.json');
  assert.equal(search.entries.length, data.entries.length);
  assert.ok(search.entries.every(e => e.n && e.s && e.f && Array.isArray(e.t)));

  // The published API schema must accept the API's own tool payload.
  assert.deepEqual(validateSchema(ghidra, api.get('api/schema.json')), []);
  assert.equal(api.get('api/schema.json').$id, 'https://example.test/api/schema.json');
});

test('triage detects the runtime before the container', () => {
  assert.equal(detect(elf, { name: 'sample' }).primary.id, 'go');
  assert.equal(detect(pe, { name: 'sample.exe' }).primary.id, 'pe');
  assert.equal(
    detect(Buffer.concat([pe, Buffer.from(' mscorlib System.Private.CoreLib')]), { name: 'sample.exe' }).primary.id,
    'dotnet',
  );
  assert.equal(
    detect(Buffer.concat([pe, Buffer.from(' PyInstaller _MEIPASS')]), { name: 'sample.exe' }).primary.id,
    'pyinstaller',
  );
  assert.equal(
    detect(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('AndroidManifest.xml classes.dex')]), {
      name: 'sample.apk',
    }).primary.id,
    'android',
  );
  assert.equal(detect(Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])).primary.id, 'wasm');
  assert.equal(detect(Buffer.from('dex\n035\0abc')).primary.id, 'dex');
  assert.equal(detect(Buffer.from([0xc6, 0x1f, 0xbc, 0x03, 0x00])).primary.id, 'hermes');
  assert.equal(detect(Buffer.from('#!/usr/bin/env python\nprint(1)\n')).primary.id, 'text');
  assert.equal(detect(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04])).primary.id, 'unknown');
});

test('triage recommends the runtime-specific tool first', () => {
  const plan = recommend(data, detect(elf, { name: 'sample' }));
  assert.equal(plan.runtime, 'go');
  assert.equal(plan.tools[0].name, 'GoReSym');
  assert.ok(plan.tools.some(t => t.name === 'Ghidra'));
  assert.ok(plan.steps.length >= 3);
  // FLOSS is always suggested and carries the runs flag, so the VM warning must be on.
  assert.equal(plan.needsVm, true);

  const packed = recommend(data, detect(pe, { name: 'x.exe' }));
  assert.equal(packed.runtime, 'pe');
  assert.equal(packed.tools[0].name, 'Detect It Easy');
});

function startMcp() {
  const child = spawn(process.execPath, [join(ROOT, 'scripts', 'mcp.mjs')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const pending = new Map();
  let seq = 0;
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on('line', line => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    const waiter = pending.get(msg.id);
    if (waiter) {
      pending.delete(msg.id);
      waiter.resolve(msg);
    }
  });
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      setTimeout(() => {
        if (pending.delete(id)) reject(new Error(`timeout waiting for ${method}`));
      }, 5000);
    });
  return { child, request, stop: () => child.kill() };
}

test('MCP server exposes tools and resources over stdio', async t => {
  const mcp = startMcp();
  t.after(() => mcp.stop());

  const init = await mcp.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.0.0' },
  });
  assert.equal(init.result.serverInfo.name, 'awesome-reverse-engineering');

  const listed = await mcp.request('tools/list', {});
  const names = listed.result.tools.map(tool => tool.name);
  for (const name of ['search_tools', 'get_tool', 'list_categories', 'recommend_toolchain', 'get_safety_guidance']) {
    assert.ok(names.includes(name), `${name} missing`);
  }

  const search = await mcp.request('tools/call', {
    name: 'search_tools',
    arguments: { query: 'android decompiler', limit: 3 },
  });
  assert.ok(!search.result.isError);
  assert.ok(search.result.structuredContent.tools.length > 0);

  const guidance = await mcp.request('tools/call', { name: 'get_safety_guidance', arguments: {} });
  assert.match(guidance.result.content[0].text, /full VM/);

  const resource = await mcp.request('resources/read', { uri: 'awesome-re://tool/ghidra' });
  assert.equal(JSON.parse(resource.result.contents[0].text).name, 'Ghidra');
});

test('health report finds graveyard candidates without editing data', () => {
  const report = healthReport(data, meta);
  assert.equal(report.counts.entries, data.entries.length);
  assert.ok(report.counts.candidates >= 5);
  assert.ok(report.candidates.every(c => c.status && c.note));
  assert.equal(report.counts.stillListed, 0);
});

test('site identity defaults to upstream and follows a fork', () => {
  const upstream = siteConfig({}, { autoRepo: false });
  assert.equal(upstream.base, 'https://edwardtay.github.io/awesome-reverse-engineering');

  const fork = siteConfig({ GITHUB_REPOSITORY: 'alice/awesome-reverse-engineering' });
  assert.equal(fork.base, 'https://alice.github.io/awesome-reverse-engineering');
  assert.equal(fork.repoUrl, 'https://github.com/alice/awesome-reverse-engineering');

  const userSite = siteConfig({ GITHUB_REPOSITORY: 'alice/alice.github.io' });
  assert.equal(userSite.base, 'https://alice.github.io');

  const custom = siteConfig({ SITE_BASE: 'https://re.example.org/', SITE_AUTHOR: 'Alice' });
  assert.equal(custom.base, 'https://re.example.org');
  assert.equal(custom.author, 'Alice');
  assert.throws(() => siteConfig({ SITE_REPO: 'nope' }), /owner\/repo/);
});

test('site build links category rows to real tool pages and API files', async () => {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'scripts', 'site.mjs')], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`site build exited ${code}`))));
  });

  const category = readFileSync(join(ROOT, '_site', 'c', 'android', 'index.html'), 'utf8');
  assert.ok(category.includes('href="../../t/jadx/"'), 'category row should link to the tool page');
  assert.ok(!/href="\d+t\//.test(category), 'category row must not use the map index as a prefix');
  assert.equal(readdirSync(join(ROOT, '_site', 't')).length, data.entries.length);
  assert.ok(existsSync(join(ROOT, '_site', 't', 'jadx', 'index.html')));
  assert.ok(existsSync(join(ROOT, '_site', 'api', 'tools', 'jadx.json')));
  assert.ok(existsSync(join(ROOT, '_site', 'all', 'index.html')));
});

test('triage CLI reads a file, hashes it and prints JSON', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'awesome-re-'));
  const file = join(dir, 'sample.elf');
  writeFileSync(file, elf);
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'scripts', 'triage.mjs'), file, '--json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d));
    child.stderr.on('data', d => (err += d));
    child.on('error', reject);
    child.on('close', code => resolve({ code, out, err }));
  });
  rmSync(dir, { recursive: true, force: true });

  assert.equal(result.err, '');
  const report = JSON.parse(result.out);
  assert.equal(report.runtime, 'go');
  assert.equal(report.tools[0].name, 'GoReSym');
  assert.match(report.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.code, 0);
});
