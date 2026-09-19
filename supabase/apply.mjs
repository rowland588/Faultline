/* APPLY THE MIGRATIONS TO THE REAL SUPABASE PROJECT, THEN PROVE THEY LANDED.
 *
 *   node supabase/apply.mjs COMMISSIONING.sql          # one file
 *   node supabase/apply.mjs PARETO.sql COMMISSIONING.sql
 *   node supabase/apply.mjs --verify-only              # just the checks
 *
 * CREDENTIALS COME FROM THE ENVIRONMENT, NEVER FROM AN ARGUMENT — an argument
 * lands in shell history and in a transcript; an environment variable set on the
 * environment itself does not.
 *
 *   SUPABASE_ACCESS_TOKEN   sbp_...  personal access token (needed for DDL)
 *   SUPABASE_PROJECT_REF    the ref in the project's URL
 *   SUPABASE_URL            https://<ref>.supabase.co   (optional, for the
 *   SUPABASE_ANON_KEY       PostgREST check — the anon key is already public,
 *                           it ships inside the PWA bundle)
 *
 * WHY curl AND NOT fetch: outbound HTTPS here goes through a proxy that
 * re-terminates TLS, and node's fetch reads neither HTTPS_PROXY nor the proxy's
 * CA bundle. curl reads both, already configured. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? '';
const REF   = process.env.SUPABASE_PROJECT_REF ?? '';
const URL_  = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const ANON  = process.env.SUPABASE_ANON_KEY ?? '';
const HERE  = path.dirname(new URL(import.meta.url).pathname);

const args = process.argv.slice(2);
const verifyOnly = args.includes('--verify-only');
const files = args.filter(a => !a.startsWith('--'));

const mask = (s) => s ? s.slice(0, 7) + '…' + s.slice(-4) : '(unset)';
const die = (msg, code = 1) => { console.error('\n' + msg + '\n'); process.exit(code); };

/* One curl, returning { status, body }. Never throws on an HTTP error — the
 * caller decides, because a 403 from the proxy and a 400 from Supabase need
 * completely different things said about them. */
function http(method, url, { token, headers = {}, body } = {}) {
  const a = ['-sS', '-m', '45', '-X', method, '-w', '\n__STATUS__%{http_code}'];
  if (token) a.push('-H', `Authorization: Bearer ${token}`);
  for (const [k, v] of Object.entries(headers)) a.push('-H', `${k}: ${v}`);
  if (body != null) { a.push('-H', 'Content-Type: application/json', '--data-binary', '@-'); }
  a.push(url);
  let out;
  try {
    out = execFileSync('curl', a, { encoding: 'utf8', input: body ?? undefined, maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    /* curl itself failed to connect. Exit 56 / 35 / 7 here is the proxy
     * refusing the CONNECT, which is an organisation policy denial, not
     * something a retry or a different credential fixes. */
    return { status: 0, body: String(e.stderr ?? e.message ?? '') };
  }
  const i = out.lastIndexOf('\n__STATUS__');
  return { status: Number(out.slice(i + 11).trim()), body: out.slice(0, i) };
}

/** Run SQL on the project. Returns the rows the statement produced, so a
 *  migration's own "ready ✓" CHECK is printed rather than assumed. */
function sql(query) {
  const r = http('POST', `https://api.supabase.com/v1/projects/${REF}/database/query`,
    { token: TOKEN, body: JSON.stringify({ query }) });
  if (r.status === 0) die(
    `Could not reach api.supabase.com at all.\n\n` +
    `  ${r.body.trim().split('\n').slice(-2).join('\n  ')}\n\n` +
    `If that says 403, this environment's egress policy does not allow Supabase.\n` +
    `No credential fixes a 403 — the connection is refused before the token is sent.\n` +
    `Allow these two hosts on the environment, then re-run:\n` +
    `  api.supabase.com          (running SQL)\n` +
    `  ${REF || '<ref>'}.supabase.co   (the app's own data + storage)\n` +
    `See https://code.claude.com/docs/en/claude-code-on-the-web`, 2);
  if (r.status === 401) die(`401 from Supabase — SUPABASE_ACCESS_TOKEN (${mask(TOKEN)}) is not valid. A personal access token starts sbp_ and is made at https://supabase.com/dashboard/account/tokens`, 2);
  if (r.status === 404) die(`404 from Supabase — no project with ref "${REF}". The ref is the subdomain of the project URL.`, 2);
  if (r.status >= 300) die(`Supabase answered ${r.status}:\n\n${r.body}`, 1);
  try { return JSON.parse(r.body); } catch { return r.body; }
}

// ---------- preflight ----------
console.log('project ref            ', REF || '(unset)');
console.log('access token           ', mask(TOKEN));
console.log('anon key               ', mask(ANON));
if (!TOKEN || !REF) die(
  'Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF on the environment\n' +
  '(not on the command line — an argument ends up in the transcript).', 2);

const who = sql('select current_database() as db, current_user as who, version() as v;');
console.log('connected              ', `${who[0]?.db} as ${who[0]?.who}`);
console.log('                       ', String(who[0]?.v).split(' ').slice(0, 2).join(' '));

// ---------- apply ----------
if (!verifyOnly) {
  if (!files.length) die('Name the SQL files to apply, e.g.\n  node supabase/apply.mjs PARETO.sql COMMISSIONING.sql', 2);
  for (const f of files) {
    const p = path.join(HERE, f);
    if (!fs.existsSync(p)) die(`No such migration: supabase/${f}`, 2);
    console.log(`\n--- applying supabase/${f} ---`);
    const rows = sql(fs.readFileSync(p, 'utf8'));
    // A migration ending in a CHECK select prints it; that is the file's own
    // verdict on itself and is worth more than "no error was thrown".
    if (Array.isArray(rows) && rows.length) for (const r of rows) console.log('   ', Object.values(r).join(' | '));
    else console.log('    applied (no rows returned)');
  }
}

// ---------- verify: the three things that decide whether it travels ----------
console.log('\n=== does commissioning actually sync ===');
const fails = [];
const check = (what, ok, detail) => {
  console.log('  ' + what.padEnd(48), ok ? 'yes' : `*** NO ***  ${detail ?? ''}`);
  if (!ok) fails.push(what);
};

const one = (q) => { const r = sql(q); return Array.isArray(r) ? r[0] : r; };

check('table exists',
  one(`select count(*) n from information_schema.tables where table_schema='public' and table_name='commission_items';`)?.n == 1);

/* Every column the mapper writes, READ OUT OF THE MAPPER rather than typed
 * here. A single missing column makes the push fail and the item never leaves
 * the phone — which is exactly how photos, snag_ids and findings were lost.
 *
 * This list used to be hardcoded, and by the time commissioning was rebuilt it
 * was describing a table shape the app had stopped using: it still asked for
 * stream, target, stage, due_in and findings, and asked for none of the thirteen
 * columns the five kinds actually write. It passed, cheerfully, while checking
 * nothing that mattered. A check that can silently start describing the wrong
 * thing is worse than no check, so it now reads the same file the app ships.
 *
 * (src/cloud/__tests__/sync-schema.test.ts does this properly, against every
 * migration, and runs on every commit. This is the same question asked of the
 * LIVE database, which the test cannot reach.) */
const mapper = fs.readFileSync(new URL('../src/cloud/mappers.ts', import.meta.url), 'utf8');
const entry = /^ {2}commission_items:\s*\{([\s\S]*?)^ {2}\},/m.exec(mapper)?.[1] ?? '';
const toRow = /toRow:[\s\S]*?(?=\n {4}fromRow:|\n {2}\},)/.exec(entry)?.[0] ?? '';
const need = [...new Set(
  [...toRow
      // A LOCAL DECLARATION IS NOT A COLUMN. The row is built in
      // `const row: Record<string, unknown> = {` and the item is read out of
      // `const i = l as CommissionItem`, so both forms have to go — leaving the
      // second in produced a column called `i`, which no table has.
      .replace(/^\s*(?:const|let)\s+\w+\s*(?::[^=]*)?=/gm, '')
      .matchAll(/(?:^|[{\s,.])([a-z_][a-z0-9_]*)\s*[:=][^=]/g)]
    .map(m => m[1])
    .filter(c => c !== 'toRow'),
)].concat('rev');
const have = sql(`select column_name from information_schema.columns where table_schema='public' and table_name='commission_items';`)
  .map(r => r.column_name);
const missing = need.filter(c => !have.includes(c));
check(`all ${need.length} columns the app writes are present`, missing.length === 0, `missing: ${missing.join(', ')}`);

check('rev trigger is attached',
  one(`select count(*) n from pg_trigger where tgname='faultline_rev' and tgrelid='public.commission_items'::regclass and not tgisinternal;`)?.n == 1);

check('row level security is ON',
  one(`select relrowsecurity r from pg_class where oid='public.commission_items'::regclass;`)?.r === true);

const pol = sql(`select policyname, qual from pg_policies where schemaname='public' and tablename='commission_items';`);
check('a policy scopes rows to auth.uid()', pol.length > 0 && /auth\.uid\(\)/.test(pol.map(p => p.qual).join(' ')),
  pol.length ? JSON.stringify(pol.map(p => p.policyname)) : 'no policy at all — the table is open to every signed-in user');

check('no rows left with a null rev (invisible to every pull)',
  one(`select count(*) n from public.commission_items where rev is null;`)?.n == 0);

/* The trigger, proven rather than assumed: write a probe, edit it, watch the rev
 * move, remove it. A trigger that exists but does not fire looks identical from
 * the catalogue and syncs nothing. */
const PROBE = '__faultline_sync_probe__';
try {
  sql(`delete from public.commission_items where id='${PROBE}';`);
  const a = one(`insert into public.commission_items (id, owner_id, project_id, stream, kind, title, sort, created_at, updated_at)
                 values ('${PROBE}', '00000000-0000-0000-0000-000000000000', '${PROBE}', 'probe', 'task', 'probe', 0, 0, 0) returning rev;`);
  check('an inserted row is stamped with a rev', a?.rev != null && Number(a.rev) > 0, `rev came back ${JSON.stringify(a?.rev)}`);
  const bRev = one(`update public.commission_items set note='probe2', updated_at=1 where id='${PROBE}' returning rev;`);
  check('an edit moves the rev forward', Number(bRev?.rev) > Number(a?.rev), `${a?.rev} -> ${bRev?.rev}`);
  check('"rev > last seen" returns the edited row',
    one(`select count(*) n from public.commission_items where rev > ${a?.rev} and id='${PROBE}';`)?.n == 1);
} finally {
  sql(`delete from public.commission_items where id='${PROBE}';`);
  console.log('  (probe row removed)');
}

/* THE QUERY THE APP ACTUALLY SENDS, through PostgREST rather than through SQL.
 * This is the one that was failing: PostgREST validates the column before RLS
 * filters anything, so a missing rev answers 400 even with no signed-in user,
 * while a present one answers 200 with an empty list. No user password needed to
 * tell those two apart. */
if (URL_ && ANON) {
  const r = http('GET', `${URL_}/rest/v1/commission_items?select=id,rev&rev=gt.0&order=rev.asc&limit=1`,
    { token: ANON, headers: { apikey: ANON } });
  if (r.status === 0) check("the app's own pull query is accepted", false, `${URL_} unreachable — allow ${REF}.supabase.co on this environment`);
  else check("the app's own pull query is accepted (PostgREST)", r.status === 200, `HTTP ${r.status} ${r.body.slice(0, 200)}`);
} else {
  console.log('  (skipped the PostgREST check — set SUPABASE_URL and SUPABASE_ANON_KEY for it)');
}

console.log('\n' + (fails.length === 0
  ? 'READY — commissioning will sync across devices.'
  : `NOT READY — ${fails.length} check(s) failed:\n  - ${fails.join('\n  - ')}`));
process.exit(fails.length ? 1 : 0);
