#!/usr/bin/env node
// Reports maintenance and graveyard health without editing anything.
//
//   node scripts/health.mjs            human-readable report
//   node scripts/health.mjs --json     machine-readable report
//   node scripts/health.mjs --strict   exit 1 when there are candidates or clashes
import { fileURLToPath } from 'node:url';
import { loadData } from '../lib/normalize.mjs';
import { healthReport } from '../lib/health.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');

const { data, meta } = loadData(ROOT);
const report = healthReport(data, meta);

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const row = (k, v) => console.log(`  ${k.padEnd(14)} ${v}`);
  console.log(`\nHealth: ${report.counts.entries} entries, ${report.counts.graveyard} in the graveyard`);
  row('Reviewed', report.reviewed);
  row('Refreshed', report.refreshed);
  row('Candidates', report.counts.candidates);
  row('Archived', report.counts.archived);
  row('Stale', report.counts.stale);
  row('Declared', report.counts.declared);
  row('Website-only', report.counts.websiteOnly);
  console.log('');

  if (report.candidates.length) {
    console.log('Graveyard candidates (move only after a human review):');
    for (const c of report.candidates) {
      const stars = c.stars != null ? `, ${c.stars} stars` : '';
      console.log(`  - ${c.name} [${c.status}] ${c.note}${stars}`);
      console.log(`    ${c.url}`);
    }
    console.log('');
  }

  if (report.stillListed.length) {
    console.log('Listed but already in the graveyard (remove the entry or the graveyard row):');
    for (const e of report.stillListed) console.log(`  - ${e.name}: ${e.url}`);
    console.log('');
  }

  if (!report.candidates.length && !report.stillListed.length) console.log('No action needed.\n');
}

if (strict && (report.candidates.length || report.stillListed.length)) process.exit(1);
