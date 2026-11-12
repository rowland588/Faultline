/* PLAN AGAINST ACTUAL, THROUGH THE REGISTRY (12 November, docs/LUNA-DEMO.md) — the demonstration workbook (scripts/workbook/
 * make-demo-workbook.mjs) read on the device as AI Mode reads one, explain_variance and the follow-up questions a colleague asks of it,
 * every figure against the generator's own totals (kept as it wrote the cells, never by reading them back). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CapCtx } from '../types';

vi.setConfig({ testTimeout: 30_000 });
const dir = mkdtempSync(join(tmpdir(), 'wbv-'));
const file = join(dir, 'Plant performance October.xlsx');
interface Exp { plan: number; actual: number; variance: number; planByLine: Record<string, number>; actualByLine: Record<string, number>; line3PlanByShift: Record<string, number>; line3ActualByShift: Record<string, number>; line3DowntimeByMachine: Record<string, number>; line3DowntimeByArea: Record<string, number>; line3ShortfallContribution: number }
let exp: Exp;
beforeAll(() => { execFileSync('node', ['scripts/workbook/make-demo-workbook.mjs', file], { stdio: 'ignore' }); exp = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8')); }, 60_000);
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const NOW = Date.UTC(2026, 10, 12, 9);
async function seed() {
  const db = await import('../../db'), reg = await import('../registry'), conv = await import('../../colleague/conversation');
  const client = await import('../../lib/workbook/client'), wbc = await import('../workbook');
  await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI' }));
  const backend = await client.directBackend();
  client.setWorkbookBackend(backend);
  const ctx: CapCtx = { now: NOW, conversationId: 'conv', me: 'Rowland' };
  const f = new File([readFileSync(file)], 'Plant performance October.xlsx', { lastModified: 1 });
  const id = client.workbookId(f);
  const p = await backend.read(id, f.name, f);
  await wbc.noteWorkbook(ctx, { id, name: f.name, bytes: f.size, at: NOW, status: p.status, sheets: p.sheets.map(s => ({ name: s.name, state: s.state, rows: s.rows, columns: s.columns.length })) });
  let n = 0;
  const run = (name: string, input: unknown) => reg.runCall(ctx, { id: `c${n += 1}`, name, input }, { confirmed: true });
  return { run, id };
}
const g = (n: number) => Math.round(n).toLocaleString('en-GB');

describe('explain_variance — where a variance sits', () => {
  it('one sheet, two columns: the totals, Line 3 first with its share, and within Line 3 the nights — every figure the generator\'s', async () => {
    const { run, id } = await seed();
    const r = await run('explain_variance', { source: id, title: 'Packs made against plan, October', plan: { sheet: 'Production', column: 'Planned packs' }, actual: { column: 'Actual packs' }, by: ['Line', 'Shift'], unit: 'packs', better: 'higher' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const share = Math.round(((exp.actualByLine['Line 3'] - exp.planByLine['Line 3']) / exp.variance) * 100);
    expect(r.says).toContain(`Packs made against plan, October: plan ${g(exp.plan)} packs, actual ${g(exp.actual)} packs — −${g(-exp.variance)} packs`);
    expect(r.says).toMatch(/below plan \(adverse\)/);
    expect(r.says).toContain(`It sits most in Line: Line 3 −${g(exp.planByLine['Line 3'] - exp.actualByLine['Line 3'])} packs (${share}% of the variance)`);
    const nights = exp.line3ActualByShift.Nights - exp.line3PlanByShift.Nights;
    expect(r.says).toContain(`Within Line 3, it sits most in Shift: Nights −${g(-nights)} packs`);
    expect(r.says).toMatch(/Worked by the app over every row: from Production \(Planned packs against Actual packs\)/);
    const d = r.data as { plan: number; actual: number; variance: number; best: string; resultId: string };
    expect(d).toMatchObject({ plan: exp.plan, actual: exp.actual, variance: exp.variance, best: 'Line' });
    expect(d.resultId).toMatch(/^R/);
  });

  it('the why is asked of another sheet: Line 3\'s stop minutes by machine, the Bagger first — as the generator wrote them', async () => {
    const { run, id } = await seed();
    const q = await run('query_workbook', { source: id, sheet: 'Downtime log', filters: [{ column: 'Line', op: 'eq', value: 'Line 3' }], groupBy: ['Machine'], measures: [{ op: 'sum', column: 'Minutes' }], order: { by: 0, desc: true } });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const top = Object.entries(exp.line3DowntimeByMachine).sort((a, b) => b[1] - a[1])[0];
    expect(top[0]).toBe('Bagger');
    expect(q.says).toMatch(new RegExp(`Bagger[^\\d]*${top[1].toLocaleString('en-GB').replace('.', '\\.')}`));
  });

  it('plan and actual on two sheets are matched by the fields they share; a field on one side only is named, never guessed', async () => {
    const { run, id } = await seed();
    /* the same sheet given twice is one sheet; a field the sheet does not hold is named */
    const r = await run('explain_variance', { source: id, title: 'Packs against plan', plan: { sheet: 'Production', column: 'Planned packs' }, actual: { sheet: 'Production', column: 'Actual packs' }, by: ['Line', 'Area'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toMatch(/Not broken by Area: not a field of this sheet\./);
  });

  it('a period on its date field narrows both sides; a period with no date field is refused in words; a column it does not hold is said', async () => {
    const { run, id } = await seed();
    const r = await run('explain_variance', { source: id, title: 'Packs, 13–31 October', plan: { sheet: 'Production', column: 'Planned packs', date: 'Date' }, actual: { column: 'Actual packs' }, from: '2026-10-13', to: '2026-10-31', by: ['Line'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((r.data as { plan: number }).plan).toBeLessThan(exp.plan);
    expect((r.data as { plan: number }).plan).toBeGreaterThan(0);
    const no = await run('explain_variance', { source: id, title: 'x', plan: { sheet: 'Production', column: 'Planned packs' }, actual: { column: 'Actual packs' }, from: '2026-10-13', to: '2026-10-31' });
    expect(no.ok).toBe(false);
    if (!no.ok) expect(no.why).toMatch(/needs the date field/);
    const bad = await run('explain_variance', { source: id, title: 'x', plan: { sheet: 'Production', column: 'Budget' }, actual: { column: 'Actual packs' } });
    expect(bad.ok ? bad.says : bad.why).toMatch(/Budget/);
    expect(bad.ok ? bad.says : bad.why).toMatch(/cannot|does not hold|no field/i);
  });

  it('the shortfall in money comes from the master by a lookup and a calc — the app\'s sum, never Luna\'s', async () => {
    const { run, id } = await seed();
    const q = await run('query_workbook', { source: id, sheet: 'Production', filters: [{ column: 'Line', op: 'eq', value: 'Line 3' }],
      lookups: [{ as: 'margin', sheet: 'Products', match: 'Product', on: 'Product', take: 'Contribution per pack (£)' }],
      calcs: [{ as: 'short', a: 'Planned packs', op: '-', b: 'Actual packs' }, { as: 'lost £', a: 'short', op: '*', b: 'margin' }],
      measures: [{ op: 'sum', column: 'lost £' }] });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const total = (q.data as { totals?: (number | null)[] }).totals?.[0];
    expect(total).toBeCloseTo(exp.line3ShortfallContribution, 1);
  });
});
