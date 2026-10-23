#!/usr/bin/env node
// Triage an unknown file without running it.
//
//   node scripts/triage.mjs sample.bin
//   node scripts/triage.mjs sample.apk --json
//   node scripts/triage.mjs --stdin < sample.bin
//
// Reads at most --max bytes (default 8 MiB) for detection, hashes the whole file,
// and never executes or uploads the sample.
import { createHash } from 'node:crypto';
import { createReadStream, openSync, readSync, closeSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../lib/normalize.mjs';
import { detect, recommend } from '../lib/triage.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || !args.length) {
  console.log(`Usage: node scripts/triage.mjs <file> [--json] [--max=N]

Identifies the runtime or container from magic bytes and strings, then prints the
toolchain this list recommends. Static only: the file is never executed or uploaded.

Options:
  --json        machine-readable output
  --max=N       bytes to read for detection (default 8388608)
  --stdin       read the sample from standard input (no hash streaming)
  --help        show this message`);
  process.exit(args.length ? 0 : 2);
}

const asJson = args.includes('--json');
const useStdin = args.includes('--stdin');
const maxArg = args.find(a => a.startsWith('--max='));
const MAX = maxArg ? Math.max(4096, Number(maxArg.slice(6)) || 8388608) : 8388608;
const file = args.find(a => !a.startsWith('-'));

if (!file && !useStdin) {
  console.error('error: no file given. Use --stdin to read from standard input.');
  process.exit(2);
}

function readHead(path) {
  const size = statSync(path).size;
  const take = Math.min(size, MAX);
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(take);
  try {
    const read = readSync(fd, buf, 0, take, 0);
    return { buf: buf.subarray(0, read), size, truncated: size > take };
  } finally {
    closeSync(fd);
  }
}

function hashFile(path) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(path)
      .on('data', c => h.update(c))
      .on('error', reject)
      .on('end', () => resolve(h.digest('hex')));
  });
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  return { buf: buf.subarray(0, MAX), size: buf.length, truncated: buf.length > MAX };
}

const { data } = loadData(ROOT);

let head;
let hash = null;
try {
  if (useStdin) {
    head = await readStdin();
    hash = createHash('sha256').update(head.buf).digest('hex');
  } else {
    head = readHead(file);
    hash = await hashFile(file);
  }
} catch (err) {
  console.error(`error: cannot read ${file || 'stdin'}: ${err.message}`);
  process.exit(2);
}

const detection = detect(head.buf, { name: file ? basename(file) : '', truncated: head.truncated });
const plan = recommend(data, detection);
const report = {
  file: file ? basename(file) : '<stdin>',
  size: head.size,
  sha256: hash,
  truncated: head.truncated,
  ...plan,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(plan.runtime === 'unknown' ? 1 : 0);
}

const paint = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const row = (k, v) => console.log(`  ${k.padEnd(10)} ${v}`);

console.log('');
console.log(paint('1', `Triage: ${report.file}`));
row('Size', `${report.size.toLocaleString('en-US')} bytes${report.truncated ? ` (read first ${MAX.toLocaleString('en-US')})` : ''}`);
row('SHA-256', report.sha256);
row('Detected', `${paint('36', report.label)}  ${paint('2', `(${report.confidence} confidence)`)}`);
row('Evidence', report.evidence.join('; ') || 'none');
console.log('');

if (report.matches.length > 1) {
  console.log(paint('1', 'Other matches'));
  for (const m of report.matches.slice(1)) {
    console.log(`  - ${m.label} (${m.confidence}): ${m.evidence.join('; ')}`);
  }
  console.log('');
}

console.log(paint('1', 'Recommended toolchain'));
if (!report.tools.length) {
  console.log('  No entry in this list matches. Treat the sample as hostile and start with Detect It Easy in the VM.');
}
for (const t of report.tools) {
  const flags = t.flags.length ? ` [${t.flags.join(', ')}]` : '';
  console.log(`  - ${paint('36', t.name)} (${t.cost})${flags}`);
  console.log(`    ${t.description}`);
  console.log(`    ${t.url}`);
}
console.log('');

console.log(paint('1', 'Steps'));
for (const [i, s] of report.steps.entries()) console.log(`  ${i + 1}. ${s}`);
console.log('');

if (report.needsVm || report.sendsCode) {
  const notes = [];
  if (report.needsVm) notes.push('some tools execute or emulate code: use an isolated VM');
  if (report.sendsCode) notes.push('some tools send code to a third party when used as documented');
  console.log(paint('33', `Safety: ${notes.join('; ')}.`));
}
console.log(paint('2', 'Static triage only. Nothing was executed or uploaded. Verify every claim in a debugger.'));
