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
interface Exp { plan: number; actual: number; variance: number; planByLine: Record<string, number>; actualByLine: Record<string, number>; line3PlanByShift: Record<string, number>; line3ActualByShift: Record<string, number>; line3DowntimeByMachine: Record<string, number>; line3DowntimeByArea: Record<string, number>; line3ShortfallContribution: number; stopPacksByLine: Record<string, number>; stopPacks: number; line3Explained: number; downtimeRows: number; downtimeMinutes: number }
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

/* A VALUE BROUGHT FROM ANOTHER SHEET ON SEVERAL KEYS, BROUGHT TOGETHER FIRST (22 November, docs/LUNA-ANALYSIS.md A1). A stop is tied
 * to what was running only by its date, shift and line TOGETHER; a lookup took one key column, so the product (and its rate) could not
 * be brought onto a stop — and "how much of the shortfall do the stops explain?" came back as a range (87–96%, measured 21 November)
 * where the workbook holds one figure. Held to the generator's own totals, kept as it chose each stop. */
describe('a lookup on several keys, the other sheet brought together by its key first', () => {
  const KEYS = ['Date', 'Shift', 'Line'];
  it('how much of Line 3’s shortfall its stops explain — ONE question, one figure, the generator’s own', async () => {
    const { run } = await seed();
    const q = await run('query_workbook', {
      sheet: 'Production',
      lookups: [
        { as: 'Stop minutes', sheet: 'Downtime log', match: KEYS, on: KEYS, take: { op: 'sum', column: 'Minutes' } },
        { as: 'Rate', sheet: 'Products', match: 'Product', on: 'Product', take: 'Rate per min' },
      ],
      calcs: [{ as: 'Packs lost to stops', a: 'Stop minutes', op: '*', b: 'Rate' }, { as: 'Shortfall', a: 'Planned packs', op: '-', b: 'Actual packs' }],
      filters: [{ column: 'Line', op: 'eq', value: 'Line 3' }],
      measures: [{ op: 'sum', column: 'Packs lost to stops' }, { op: 'sum', column: 'Shortfall' }],
      derive: [{ as: 'explained by the stops', op: 'ratio', a: 0, b: 1 }],
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const t = (q.data as { totals: number[] }).totals;
    expect(t[0]).toBeCloseTo(exp.stopPacksByLine['Line 3'], 3);
    expect(t[1]).toBe(exp.planByLine['Line 3'] - exp.actualByLine['Line 3']);
    expect(t[2]).toBeCloseTo(exp.line3Explained, 5);
    /* said with how it was made: the log brought together by its three keys first — so no shift is counted twice */
    expect(q.says).toContain('“Stop minutes” is the sum of “Minutes” on “Downtime log” for each “Date” + “Shift” + “Line”');
    expect(q.says).toContain('brought onto each row by its “Date” + “Shift” + “Line” — that sheet is brought together by its key first, so no row here is counted twice.');
    expect(q.says).toContain(`explained by the stops ${Number(exp.line3Explained.toPrecision(4))}`);
    /* …and her answer's "91%" is the app's own figure, with no work_out */
    const { checkFigures } = await import('../../colleague/figureCheck');
    const pct = `${Math.round(exp.line3Explained * 1000) / 10}%`;
    expect(checkFigures(`The stops explain ${pct} of Line 3's shortfall.`, [{ says: q.says, data: q.data }], [])).toMatchObject({ unsure: [], checked: 1 });
  });

  it('by line, and the other way round — each stop given the product that was running (only), then its rate: the same packs, to the generator’s', async () => {
    const { run } = await seed();
    const a = await run('query_workbook', {
      sheet: 'Downtime log',
      lookups: [{ as: 'Product run', sheet: 'Production', match: KEYS, on: KEYS, take: { op: 'only', column: 'Product' } }, { as: 'Rate', sheet: 'Products', match: 'Product run', on: 'Product', take: 'Rate per min' }],
      calcs: [{ as: 'Packs lost', a: 'Minutes', op: '*', b: 'Rate' }], groupBy: ['Line'], measures: [{ op: 'sum', column: 'Packs lost' }], order: { by: 'group' },
    });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const d = a.data as { groups: { key: string[]; values: number[] }[]; totals: number[] };
    for (const g of d.groups) expect(g.values[0]).toBeCloseTo(exp.stopPacksByLine[g.key[0]], 3);
    expect(d.groups.map(g => g.key[0])).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
    expect(d.totals[0]).toBeCloseTo(exp.stopPacks, 3);
    expect(a.says).not.toMatch(/not found|left blank/);
  });

  it('nothing is doubled and nothing is lost: every stop’s minutes, brought onto the shift it belongs to, add back to the log’s own total — and so do the stops counted', async () => {
    const { run } = await seed();
    const q = await run('query_workbook', {
      sheet: 'Production',
      lookups: [{ as: 'Stop minutes', sheet: 'Downtime log', match: KEYS, on: KEYS, take: { op: 'sum', column: 'Minutes' } }, { as: 'Stops', sheet: 'Downtime log', match: KEYS, on: KEYS, take: { op: 'count', column: 'Minutes' } }, { as: 'Longest', sheet: 'Downtime log', match: KEYS, on: KEYS, take: { op: 'max', column: 'Minutes' } }],
      measures: [{ op: 'sum', column: 'Stop minutes' }, { op: 'sum', column: 'Stops' }, { op: 'max', column: 'Longest' }, { op: 'count' }],
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const t = (q.data as { totals: number[] }).totals;
    expect(t[0]).toBeCloseTo(exp.downtimeMinutes, 4);
    expect(t[1]).toBe(exp.downtimeRows);
    expect(t[2]).toBeLessThanOrEqual(22);          /* the longest stop the generator can write is 8 + 14 minutes */
    expect(t[3]).toBe(176);                        /* one row a day, shift and line — none doubled by the 451 stops */
  });

  it('a key that holds more than one value is never guessed: “only” leaves those rows blank and says how many keys', async () => {
    const { run } = await seed();
    const q = await run('query_workbook', { sheet: 'Downtime log', lookups: [{ as: 'Product run', sheet: 'Production', match: 'Line', on: 'Line', take: { op: 'only', column: 'Product' } }], measures: [{ op: 'count', column: 'Product run' }, { op: 'count' }] });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    /* every line ran two products in the month — its product cannot be told from the line alone */
    expect((q.data as { totals: number[] }).totals).toEqual([0, exp.downtimeRows]);
    expect(q.says).toContain('4 Line on “Production” hold more than one different “Product” — left blank for those rows, never the first taken.');
  });

  it('refused in words: keys that do not pair, words that cannot be added, a way of bringing together that is not one', async () => {
    const { run } = await seed();
    const base = { sheet: 'Production', measures: [{ op: 'count' }] };
    const pair = await run('query_workbook', { ...base, lookups: [{ as: 'x', sheet: 'Downtime log', match: ['Date', 'Shift'], on: ['Date'], take: 'Minutes' }] });
    expect(!pair.ok && pair.why).toMatch(/^match and on name the same columns one for one\./);
    const words = await run('query_workbook', { ...base, lookups: [{ as: 'x', sheet: 'Downtime log', match: KEYS, on: KEYS, take: { op: 'sum', column: 'Reason' } }] });
    expect(!words.ok && words.why).toBe('“Reason” on “Downtime log” holds text, not numbers — it cannot be brought together as a sum; take it as it is, or as “only”.');
    const op = await run('query_workbook', { ...base, lookups: [{ as: 'x', sheet: 'Downtime log', match: KEYS, on: KEYS, take: { op: 'median', column: 'Minutes' } }] });
    expect(!op.ok && op.why).toMatch(/^each lookup needs as, sheet, match/);
    const four = await run('query_workbook', { ...base, lookups: [{ as: 'x', sheet: 'Downtime log', match: [...KEYS, 'Product'], on: [...KEYS, 'Machine'], take: 'Minutes' }] });
    expect(four.ok).toBe(false);
  });
});
