/* The GitHub database job's checks (scripts/db-apply.mjs, .github/workflows/apply-database-change.yml): a change file in the house
 * shape passes and says what it would send; a name that is not one, a file that is not there, one of the four that move the database
 * backwards, and a file that does not say it is safe to re-run are each refused in words — nothing sent (--check needs no token). */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const run = (...a: string[]) => { const r = spawnSync('node', ['scripts/db-apply.mjs', ...a], { encoding: 'utf8', env: { ...process.env, SUPABASE_ACCESS_TOKEN: '' } }); return { code: r.status, out: `${r.stdout}${r.stderr}` }; };

describe('the database job', () => {
  it('passes a change in the house shape and says what it would send', () => {
    const r = run('--check', 'supabase/APP_SETTINGS.sql');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/Would apply supabase\/APP_SETTINGS\.sql .* as one query, then record it as APP_SETTINGS \(version \d{14}\)/);
  });
  it('refuses what it must never run, in words', () => {
    expect(run('--check', 'supabase/FRESH_START.sql').out).toMatch(/moves the live database backwards/);
    expect(run('--check', 'supabase/TEAM_UPGRADE.sql').out).toMatch(/moves the live database backwards/);
    expect(run('--check', 'supabase/NOT_A_FILE.sql').out).toMatch(/there is no supabase\/NOT_A_FILE\.sql/);
    expect(run('--check', '../etc/passwd').out).toMatch(/is not a change file/);
    expect(run('--check', 'supabase/app_settings.sql').code).toBe(1);
  });
  it('without the token it applies nothing', () => {
    const r = run('supabase/APP_SETTINGS.sql');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/SUPABASE_ACCESS_TOKEN is not set/);
  });
});
