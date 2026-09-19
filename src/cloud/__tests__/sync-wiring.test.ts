/* THE WIRING, AND THE SYMMETRY.
 *
 * Two failure classes that are invisible at the type level and silent at
 * runtime, both of which have actually happened in this codebase.
 *
 * 1. A HALF-WIRED KIND. A table added to SYNC_KINDS but missing from MAPS, or
 *    from the on-device store list, or missing one of the four functions a map
 *    needs. TypeScript accepts a Record whose key list is a superset, and the
 *    symptom is a throw deep inside a sync pass that the caller swallows.
 *
 * 2. AN ASYMMETRIC MAPPER. toRow forgetting a field that fromRow reads. This is
 *    the bug that shipped three times in one evening on commission_items —
 *    photos, snag_ids and findings were all read back but never sent. Nothing
 *    complains: the column simply stays null in the cloud, so the data exists on
 *    the device that typed it and nowhere else, and it looks like sync working.
 *
 * Both are read out of the source rather than by calling anything, because
 * calling a mapper needs a fully-built domain object for all fifteen kinds and
 * a field set only on one branch would be missed. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAPS, SYNC_KINDS } from '../mappers';
import { REQUIRED_STORES } from '../../db';

const src = readFileSync(join(__dirname, '..', 'mappers.ts'), 'utf8');

const entryOf = (kind: string) => {
  const m = new RegExp(`^ {2}${kind}:\\s*\\{([\\s\\S]*?)^ {2}\\},`, 'm').exec(src);
  if (!m) throw new Error(`no mapper entry for ${kind}`);
  return m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
};

/** Columns toRow puts on the wire. */
const written = (kind: string): Set<string> => {
  // A TYPED LOCAL DECLARATION IS NOT A COLUMN. commission_items builds its row
  // in `const row: Record<string, unknown> = {` and fills it per kind, which
  // otherwise reads as a column called `row`.
  const body = /toRow:[\s\S]*?(?=\n {4}fromRow:|\n {2}\},)/.exec(entryOf(kind))![0]
    .replace(/^\s*(?:const|let)\s+\w+\s*:[^=]*=/gm, '');
  const out = new Set<string>();
  for (const m of body.matchAll(/(?:^|[{\s,])([a-z_][a-z0-9_]*)\s*:/g)) out.add(m[1]);
  out.delete('toRow');
  return out;
};

/** Columns fromRow reads back off the wire — every r.<name> and r['<name>']. */
const read = (kind: string): Set<string> => {
  // fromRow is the last member of every entry, so it runs to the end of the
  // body entryOf already isolated — no closing-brace lookahead to get wrong.
  const body = /fromRow:[\s\S]*/.exec(entryOf(kind))![0];
  const out = new Set<string>();
  for (const m of body.matchAll(/\br\.([a-z_][a-z0-9_]*)/g)) out.add(m[1]);
  for (const m of body.matchAll(/\br\[['"]([a-z_][a-z0-9_]*)['"]\]/g)) out.add(m[1]);
  return out;
};

/** Which local field this kind's clock reads — 'updatedAt' for almost every
 *  kind, 'takenAt' for pace_snapshots, which is never edited. */
const clockField = (kind: string): string => {
  const body = entryOf(kind);
  const clock = /clock:[\s\S]*?(?=\n {4}mediaKeys:)/.exec(body);
  if (!clock) throw new Error(`no clock for ${kind}`);
  const field = /\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:;|$|\n|,)/.exec(clock[0].split('as ').pop() ?? '');
  if (!field) throw new Error(`could not read which field ${kind}'s clock uses`);
  return field[1];
};

describe('every synced kind is fully wired', () => {
  it('SYNC_KINDS and MAPS describe the same set of tables', () => {
    expect([...SYNC_KINDS].sort()).toEqual(Object.keys(MAPS).sort());
  });

  it('no kind appears twice in SYNC_KINDS', () => {
    expect(SYNC_KINDS.length).toBe(new Set(SYNC_KINDS).size);
  });

  for (const kind of SYNC_KINDS) {
    it(`${kind} has all four map functions`, () => {
      const map = MAPS[kind] as unknown as Record<string, unknown>;
      for (const fn of ['clock', 'mediaKeys', 'toRow', 'fromRow']) {
        expect(typeof map[fn], `MAPS.${kind}.${fn} is not a function`).toBe('function');
      }
    });

    it(`${kind} has a local store to sync into`, () => {
      // A kind with no on-device store throws inside rawAll() on the first pass.
      //
      // Asserted against the app's OWN store list, not by grepping a file for the
      // name. The grep version passed for months and then broke the day db.ts
      // became a barrel — it was testing where the code lived rather than what it
      // declared, which is the weakest possible version of this check.
      expect(
        (REQUIRED_STORES as readonly string[]).includes(kind),
        `${kind} is in SYNC_KINDS but not in REQUIRED_STORES, so it has no local store`,
      ).toBe(true);
    });
  }
});

describe('toRow and fromRow agree on every column', () => {
  for (const kind of SYNC_KINDS) {
    it(kind, () => {
      const w = written(kind);
      const r = read(kind);

      // Read back but never sent: the field lives only on the device that typed
      // it. This is exactly how photos, snag_ids and findings were lost.
      const neverSent = [...r].filter(c => !w.has(c)).sort();

      // Sent but never read back: not data loss, but it means the other device
      // ignores a column this one writes — usually a rename finished on one side.
      // TRANSPORT COLUMNS are sent and deliberately not read back, so they are
      // exempt from the other direction:
      //   owner_id    belongs to the cloud's row-level security, never to the
      //               local record — the device has no use for it
      //   deleted_at  the engine acts on it directly (applyRemoteDelete) before
      //               fromRow is ever called, so reading it would be dead code
      //   rev         the server assigns it; the device keeps its cursor in meta
      // updated_at is NOT exempt here — see the clock test below, which is the
      // check that actually matters for it.
      const TRANSPORT = new Set(['owner_id', 'deleted_at', 'rev']);
      // updated_at is exempt ONLY for a kind whose clock is some other field.
      // pace_snapshots sends updated_at mirroring taken_at purely so the
      // engine's generic LWW has something to read; its local record has no
      // updatedAt to put it in. Derived from the kind's own clock rather than
      // hardcoded, so this stays true if another kind ever does the same — and
      // stays STRICT for every kind whose clock really is updatedAt.
      if (clockField(kind) !== 'updatedAt') TRANSPORT.add('updated_at');
      const neverRead = [...w].filter(c => !r.has(c) && !TRANSPORT.has(c)).sort();

      expect(neverSent, `${kind}: fromRow reads these columns but toRow never sends them — the value stays on the device that typed it`).toEqual([]);
      expect(neverRead, `${kind}: toRow sends these columns but fromRow never reads them — the receiving device drops them`).toEqual([]);
    });
  }
});

describe('every kind can still be compared after a pull', () => {
  /* The engine decides last-writer-wins by calling clock() on the local record.
   * If fromRow does not populate the very field clock reads, an incoming row
   * arrives with an undefined clock: every comparison against it is false, so
   * the row either never wins or never loses, and which one depends on the
   * operator. pace_snapshots is why this is a separate test rather than a
   * blanket rule about updated_at — its clock is takenAt, quite deliberately,
   * because a snapshot is never edited. */
  for (const kind of SYNC_KINDS) {
    it(`${kind}: fromRow sets the field clock reads`, () => {
      const field = clockField(kind);
      const fromRow = /fromRow:[\s\S]*/.exec(entryOf(kind))![0];
      expect(
        new RegExp(`\\b${field}\\s*:`).test(fromRow),
        `${kind}: clock reads .${field} but fromRow never sets it, so a pulled row has no clock and last-writer-wins cannot compare it`,
      ).toBe(true);
    });
  }
});
