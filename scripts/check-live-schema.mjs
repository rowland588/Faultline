#!/usr/bin/env node
/* LIVE SCHEMA DRIFT — the check the test cannot make.
 *
 * src/cloud/__tests__/sync-schema.test.ts proves the app's mapper and the SQL
 * files describe the same columns. Neither is the live database, and the live
 * database is where drift bites: a column the app writes that the cloud has
 * not got makes the push reject the row, silently, for ever. Five times now.
 *
 * This asks the live API for its own schema (PostgREST publishes an OpenAPI
 * document at /rest/v1/ to anyone with the anon key — no secret beyond what
 * the build already has) and checks every column every mapper writes is in it.
 *
 *   Drift                    → exit 1, naming the table and the columns, and
 *                              the fix (a migration, never an edit here).
 *   No real env (CI, a dev
 *   box without .env)        → "skipped", exit 0.
 *   Network refused          → "could not reach", exit 0: a blocked proxy is
 *                              not drift, and a false red teaches people to
 *                              ignore the gate.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const url = (process.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const key = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const line = '='.repeat(70);
console.log(`\n${line}\nFAULTLINE — live schema check\n${line}`);

if (!url || !key || /example\.supabase\.co|testproj|placeholder/i.test(url + key)) {
  console.log('skipped: no real Supabase env in this shell (fine in CI; run it where .env is).');
  process.exit(0);
}

/* The columns each mapper writes, read from the source the way the test does. */
const src = readFileSync(join(here, '..', 'src', 'cloud', 'mappers.ts'), 'utf8');
const kinds = [...src.matchAll(/^ {2}([a-z_]+):\s*\{\s*\n\s+clock:/gm)].map(m => m[1]);
function writtenColumns(kind) {
  const entry = new RegExp(`^ {2}${kind}:\\s*\\{([\\s\\S]*?)^ {2}\\},`, 'm').exec(src);
  if (!entry) throw new Error(`no mapper entry for ${kind}`);
  const toRow = /toRow:[\s\S]*?(?=\n {4}fromRow:|\n {2}\},)/.exec(entry[1]);
  if (!toRow) throw new Error(`no toRow for ${kind}`);
  const body = toRow[0]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/^\s*(?:const|let)\s+\w+\s*:[^=]*=/gm, '');
  const cols = new Set();
  for (const m of body.matchAll(/(?:^|[{\s,])([a-z_][a-z0-9_]*)\s*:/g)) cols.add(m[1]);
  cols.delete('toRow');
  return cols;
}

let live;
try {
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' } });
  if (!res.ok) { console.log(`could not read the live schema: HTTP ${res.status}. Not failing the gate on a network answer.`); process.exit(0); }
  live = await res.json();
} catch (e) {
  console.log(`could not reach ${url}: ${e instanceof Error ? e.message : e}. Not failing the gate on a network answer.`);
  process.exit(0);
}
const defs = live.definitions ?? {};
const drift = [];
for (const kind of kinds) {
  const have = new Set(Object.keys(defs[kind]?.properties ?? {}));
  if (!defs[kind]) { drift.push(`${kind}: TABLE NOT IN THE LIVE API`); continue; }
  const missing = [...writtenColumns(kind)].filter(c => !have.has(c));
  if (missing.length) drift.push(`${kind}: ${missing.join(', ')}`);
}
if (drift.length) {
  console.log('❌ The app writes columns the live database has not got — every such row is being refused:');
  for (const d of drift) console.log(`   ${d}`);
  console.log('\n   Fix: the migration in supabase/ for it, applied to the live project. Never an edit to the mapper to match.');
  process.exit(1);
}
console.log(`✅ ${kinds.length} tables, every column the app writes is in the live API.`);
