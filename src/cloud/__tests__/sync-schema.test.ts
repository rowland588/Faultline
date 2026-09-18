/* THE TEST THAT WOULD HAVE CAUGHT ALL FOUR OF THEM.
 *
 * The app's sync mapper and the SQL migrations are two descriptions of the same
 * columns, kept in step by hand. They drifted four times, and every time the
 * symptom was the same and silent: the push is rejected, the cursor never
 * advances, the row never leaves the device, and nothing on screen says so.
 *
 *   projects.lever_tree          the live table had ZERO rows
 *   tree_nodes.bind              the lever tree had never synced at all
 *   snags.target_category/…      snags frozen at six rows
 *   commission_items.rev         and photos, snag_ids, findings before it
 *
 * So this reads both sides and compares them. It needs no database and no
 * network: the migrations are the source of truth for what exists in the cloud,
 * the mapper is the source of truth for what the app sends.
 *
 * WHEN THIS FAILS, the fix is a migration, not a change to the test. Deleting a
 * column from the expected set to get green re-creates the exact bug this
 * exists to prevent. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SYNC_KINDS } from '../mappers';

const ROOT = join(__dirname, '..', '..', '..');
const SQL_DIR = join(ROOT, 'supabase');
const sql = readdirSync(SQL_DIR)
  .filter(f => f.endsWith('.sql'))
  .map((f: string) => readFileSync(join(SQL_DIR, f), 'utf8'))
  .join('\n');

/** Every column name the migrations ever give a table, from CREATE TABLE bodies
 *  and from ALTER TABLE ... ADD COLUMN alike. Deliberately generous: a false
 *  "column exists" makes this test quieter, never wrong in the dangerous
 *  direction, and a column added by any file counts because the app cannot
 *  tell which file created it. */
function columnsFor(table: string): Set<string> {
  const cols = new Set<string>();

  for (const m of sql.matchAll(
    new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${table}\\s*\\(([\\s\\S]*?)\\)\\s*;`, 'gi'),
  )) {
    // Split on the commas that separate COLUMNS, not the ones inside
    // numeric(10,2) or check (state in ('todo','done')) — and not on newlines,
    // because public.projects is declared with its whole body on one line.
    const body = m[1].replace(/--.*$/gm, '');
    const parts: string[] = [];
    let depth = 0, cur = '';
    for (const ch of body) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);
    for (const part of parts) {
      const name = /^\s*"?([a-z_][a-z0-9_]*)"?\s+[a-z"]/i.exec(part);
      if (name && !/^(primary|foreign|unique|check|constraint|references|like|exclude)$/i.test(name[1])) cols.add(name[1]);
    }
  }

  for (const m of sql.matchAll(
    new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${table}\\s+add\\s+column\\s+(?:if\\s+not\\s+exists\\s+)?"?([a-z_][a-z0-9_]*)"?`, 'gi'),
  )) cols.add(m[1]);

  // Tables the rev loop stamps by name inside a do-block get rev that way.
  if (new RegExp(`'${table}'`).test(sql) && /add column if not exists rev/i.test(sql)) cols.add('rev');

  return cols;
}

/** The columns a mapper's toRow puts on the wire, read from the source rather
 *  than by calling it — calling it needs a fully-built domain object per kind,
 *  and a key that is only set on some branches would be missed. */
function writtenColumns(kind: string): Set<string> {
  const src = readFileSync(join(__dirname, '..', 'mappers.ts'), 'utf8');
  const entry = new RegExp(`^  ${kind}:\\s*\\{([\\s\\S]*?)^  \\},`, 'm').exec(src);
  if (!entry) throw new Error(`no mapper entry for ${kind}`);
  const toRow = /toRow:[\s\S]*?(?=\n    fromRow:|\n  \},)/.exec(entry[1]);
  if (!toRow) throw new Error(`no toRow for ${kind}`);

  // Strip comments first: the word "undefined:" appears in a comment in
  // tree_nodes and would otherwise read as a column called undefined.
  const body = toRow[0].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const cols = new Set<string>();
  for (const m of body.matchAll(/(?:^|[{\s,])([a-z_][a-z0-9_]*)\s*:/g)) cols.add(m[1]);
  cols.delete('toRow');
  return cols;
}

describe('every column the app writes exists in the migrations', () => {
  for (const kind of SYNC_KINDS) {
    it(kind, () => {
      const have = columnsFor(kind);
      expect(have.size, `no CREATE TABLE for ${kind} in supabase/*.sql — the app syncs a table that no migration creates`).toBeGreaterThan(0);

      const missing = [...writtenColumns(kind)].filter(c => !have.has(c)).sort();
      expect(missing, `${kind}: the app pushes these columns but no migration creates them, so every push is rejected and the rows never leave the device`).toEqual([]);
    });
  }
});

describe('every synced table can carry the pull cursor', () => {
  for (const kind of SYNC_KINDS) {
    it(`${kind} has a rev column`, () => {
      // One table without rev answers the pull with 42703, and the app reads a
      // single 42703 as "this cloud is too old for rev cursors at all" — so
      // EVERY table drops to the clock cursor for the rest of the session.
      expect(columnsFor(kind).has('rev'), `${kind} has no rev column in any migration`).toBe(true);
    });
  }
});
