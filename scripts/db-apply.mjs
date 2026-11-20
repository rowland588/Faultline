/* APPLY A DATABASE CHANGE FROM THE REPOSITORY (21 November 2026 — Rowland: "set up the GitHub database job too").
 *
 * The Supabase connector asks the person before every change, and that question cannot reach the Claude app (APP_SETTINGS, 20 November:
 * three tries, each timed out). So a change ships from here through GitHub Actions (.github/workflows/apply-database-change.yml), with
 * the Supabase access token the repository already keeps for deploying Luna's functions — never printed, never in a file:
 *   1  the file is checked: supabase/<NAME>.sql in the house shape (CLAUDE.md, "Database changes ship from here") — it says "Safe to
 *      re-run" — and is NOT one of the four that move the database backwards (FRESH_START, WORKSPACE_TEAMS, PROJECT_TEAMS, TEAM_UPGRADE);
 *   2  it is run as ONE query (one transaction: all of it or none) through the Management API's database/query, and what its closing
 *      select prints back is shown — the read-back;
 *   3  it is added to Supabase's own record of changes (supabase_migrations.schema_migrations) under its name, unless a change of that
 *      name is already there, so the record and the files move together.
 *
 *   node scripts/db-apply.mjs supabase/NAME.sql           (SUPABASE_ACCESS_TOKEN, PROJECT_REF)
 *   node scripts/db-apply.mjs --check supabase/NAME.sql   the checks and what would be sent, nothing sent (no token needed) */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const check = args.includes('--check');
const file = args.find(a => !a.startsWith('--')) ?? '';
const fail = why => { console.error(`Not applied: ${why}`); process.exit(1); };

/* ---- 1 · the file */
const name = basename(file).replace(/\.sql$/i, '');
if (!/^supabase\/[A-Z0-9_]+\.sql$/.test(file)) fail(`"${file}" is not a change file — it must be supabase/NAME.sql, the name in capitals.`);
if (!existsSync(file)) fail(`there is no ${file} on this branch.`);
const BACKWARDS = ['FRESH_START', 'WORKSPACE_TEAMS', 'PROJECT_TEAMS', 'TEAM_UPGRADE'];
if (BACKWARDS.includes(name)) fail(`${name} moves the live database backwards (CLAUDE.md: "the files in supabase/ are a history, not a playbook"). It is never replayed.`);
const sql = readFileSync(file, 'utf8');
if (!/safe to re-run/i.test(sql)) fail(`${file} does not say it is safe to re-run — the house shape (create-if-missing, create-or-replace) is what lets a change be applied from here.`);
if (sql.includes('$fl_change$')) fail(`${file} holds the quoting mark this job uses; rename it in the file.`);

/* ---- 2 · the change, then 3 · the record — each one query */
const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const record = `insert into supabase_migrations.schema_migrations (version, name, statements, created_by)
  select '${version}', '${name}', array[$fl_change$${sql}$fl_change$], 'github-actions:apply-database-change'
  where not exists (select 1 from supabase_migrations.schema_migrations where name = '${name}')
  returning version, name;`;

if (check) {
  console.log(`Would apply ${file} (${sql.length.toLocaleString('en-GB')} characters) as one query, then record it as ${name} (version ${version}) unless a change of that name is recorded.`);
  console.log(record.split('\n')[0]);
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN ?? '';
const ref = process.env.PROJECT_REF ?? '';
if (!token) fail('SUPABASE_ACCESS_TOKEN is not set — it is the repository secret the function deploys use.');
if (!/^[a-z0-9]{20}$/.test(ref)) fail('PROJECT_REF is not a Supabase project ref.');

async function query(q) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }),
  });
  const text = await r.text();
  if (!r.ok) fail(`the database answered ${r.status}: ${text.slice(0, 600)}`);
  try { return JSON.parse(text); } catch { return text; }
}
const table = rows => (Array.isArray(rows) && rows.length ? [Object.keys(rows[0]).join(' | '), ...rows.map(o => Object.values(o).map(v => String(v ?? '')).join(' | '))].join('\n') : '(no rows)');

const back = await query(sql);
console.log(`Applied ${file}. What it printed back:\n${table(back)}`);
const kept = await query(record);
const said = Array.isArray(kept) && kept.length ? `Recorded in Supabase's record of changes as ${name} (version ${version}).` : `${name} was already in Supabase's record of changes — not recorded twice.`;
console.log(said);

const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `## ${name} applied\n\n${said}\n\nWhat it printed back:\n\n\`\`\`\n${table(back)}\n\`\`\`\n`);
