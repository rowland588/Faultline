/* THE GATE CHECK AS THE SERVER RUNS IT (lib/flow/serverCheck, bundled into
 * supabase/functions/gatecheck/check.js) — on rows as the database holds them:
 * an honest pass borne out, a forged one not, nothing written when nothing
 * moved, a reopened pass's reading taken off; the bundle in the repo the one
 * this source makes, and giving the same readings. */
import { describe, it, expect } from 'vitest';
import { checkProjects, toSweep, type Fetch, type Row } from '../serverCheck';
import { MAPS } from '../../../cloud/mappers';
import { validateDefinition } from '../validate';
import { FLOW_SCHEMA } from '../definition';
import type { FlowRecord, Method } from '../records';
// @ts-expect-error — a plain ESM bundle with no types, built by scripts/build-gatecheck.mjs
import { bundle, OUT } from '../../../../scripts/build-gatecheck.mjs';
import { readFileSync } from 'node:fs';

const def = validateDefinition({
  schema: FLOW_SCHEMA, name: 'Fit the wrapper', purpose: 'p', kind: 'stagegate',
  stages: [
    { key: 'fit', name: 'Fitted', steps: [{ key: 'placed', title: 'Placed and levelled', per: 'machine', answer: 'done' }], gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }] } },
    { key: 'run', name: 'Run', steps: [{ key: 'signed', title: 'Quality signs it off', per: 'line', answer: 'signoff' }], gate: { conditions: [{ id: 'sig', type: 'signedOff', step: 'signed', policy: 'block' }] } },
  ],
}).def!;

const T = Date.parse('2026-10-10T12:00:00Z');
const method: Method = { id: 'mth', familyId: 'mth', version: 1, status: 'active', definition: def, createdAt: T - 99e6, updatedAt: T - 99e6 };
const project = { id: 'p1', name: 'Line 3 wrapper', color: '#0c7489', createdAt: T - 99e6, updatedAt: T - 99e6, flow: { methodId: 'mth', familyId: 'mth', version: 1, startedOn: '2026-10-01' } };
const asset = { id: 'm1', projectId: 'p1', name: 'Film wrapper', state: 'onSite', sort: 0, updatedAt: T - 50e6 };
let n = 0;
const fr = (o: Partial<FlowRecord> & Pick<FlowRecord, 'stageKey'>): FlowRecord =>
  ({ id: `f${++n}`, projectId: 'p1', kind: 'step', version: 1, outcome: 'planned', sort: n, createdAt: T - 9e6, updatedAt: T - 9e6, ...o });

/** The database: rows by table, read as `.in(column, values)` reads them. */
function cloud(tables: Record<string, Row[]>): Fetch {
  return async (table, column, values) => (tables[table] ?? []).filter(r => values.includes(String(r[column])));
}
const rows = (kind: keyof typeof MAPS, xs: unknown[]) => xs.map(x => MAPS[kind].toRow(x, 'owner'));

const honest = () => {
  const placed = fr({ stageKey: 'fit', stepKey: 'placed', assetId: 'm1', outcome: 'done', doneOn: '2026-10-09' });
  const pass = fr({ stageKey: 'fit', kind: 'gate', outcome: 'done', doneOn: '2026-10-10', who: 'Rowland', createdAt: T, updatedAt: T });
  return { placed, pass };
};
const tablesOf = (records: FlowRecord[], checks: Row[] = []) => ({
  projects: rows('projects', [project]), methods: rows('methods', [method]), commission_assets: rows('commission_assets', [asset]),
  flow_records: rows('flow_records', records), snags: [], gate_checks: checks,
});

describe('on the rows the database holds', () => {
  it('an honest pass is borne out, a forged one is not — and said in the words of lib/flow/gateCheck', async () => {
    const { placed, pass } = honest();
    const forged = fr({ stageKey: 'run', kind: 'gate', outcome: 'done', doneOn: '2026-10-10', createdAt: T + 1000, updatedAt: T + 1000 });
    const r = await checkProjects(['p1'], cloud(tablesOf([placed, pass, forged])), T + 5000);
    expect(r).toMatchObject({ read: 2, disagrees: 1 });
    const byId = Object.fromEntries(r.write.map(w => [w.id, w]));
    expect(byId[pass.id]).toMatchObject({ project_id: 'p1', stage: 'fit', verdict: 'agrees', read_at: T + 5000, deleted_at: null });
    expect(byId[forged.id]).toMatchObject({ stage: 'run', verdict: 'disagrees', unmet: ['the sign-off “Quality signs it off” — not signed yet'] });
    expect(String(byId[forged.id].says)).toBe('Checked on the server, as the records stood on 10 Oct: they do not bear this pass out — the sign-off “Quality signs it off” — not signed yet — and no reason to pass over it was given.');
  });

  it('writes nothing when nothing moved; takes a reopened pass’s reading off', async () => {
    const { placed, pass } = honest();
    const first = await checkProjects(['p1'], cloud(tablesOf([placed, pass])), T + 5000);
    expect(first.write).toHaveLength(1);
    const again = await checkProjects(['p1'], cloud(tablesOf([placed, pass], first.write)), T + 9000);
    expect(again.write).toEqual([]);
    const reopened = await checkProjects(['p1'], cloud(tablesOf([placed, { ...pass, deletedAt: T + 7000, updatedAt: T + 7000 }], first.write)), T + 9000);
    expect(reopened.write).toHaveLength(1);
    expect(reopened.write[0]).toMatchObject({ id: pass.id, deleted_at: T + 9000, verdict: 'agrees' });
  });

  it('a project with no rows, or no method, reads nothing', async () => {
    expect(await checkProjects([], cloud({}), T)).toEqual({ write: [], read: 0, disagrees: 0 });
    expect(await checkProjects(['nope'], cloud(tablesOf([])), T)).toEqual({ write: [], read: 0, disagrees: 0 });
  });

  it('the hourly round reads a pass with no reading, or one not borne out', () => {
    const passes = [{ id: 'a', project_id: 'p1' }, { id: 'b', project_id: 'p2' }, { id: 'c', project_id: 'p3' }, { id: 'd', project_id: 'p4' }];
    const checks = [{ id: 'a', verdict: 'agrees' }, { id: 'b', verdict: 'disagrees' }, { id: 'd', verdict: 'agrees', deleted_at: 5 }];
    expect(toSweep(passes, checks)).toEqual(['p2', 'p3', 'p4']);
  });
});

describe('the bundle the server runs', () => {
  it('is what scripts/build-gatecheck.mjs makes from this source — run it after changing anything it imports', async () => {
    expect(readFileSync(OUT, 'utf8') === await bundle()).toBe(true);
  });

  it('gives the same readings as the source', async () => {
    const built = await import('../../../../supabase/functions/gatecheck/check.js' as string) as { checkProjects: typeof checkProjects };
    const { placed, pass } = honest();
    const forged = fr({ stageKey: 'run', kind: 'gate', outcome: 'done', doneOn: '2026-10-10', createdAt: T + 1000, updatedAt: T + 1000 });
    const tables = tablesOf([placed, pass, forged]);
    expect(await built.checkProjects(['p1'], cloud(tables), T + 5000)).toEqual(await checkProjects(['p1'], cloud(tables), T + 5000));
  });
});
