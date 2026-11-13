/* THE FIRST LOOK KEPT, READ THE WAY THE PERSON SAYS, AND MADE A PACK — through the registry, as a call from the gateway or the app's own
 * code runs (13 November, docs/WORKBOOKS.md). On scripts/workbook/make-marked-workbook.mjs (every name and figure made up). */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CapCtx } from '../types';

const dir = mkdtempSync(join(tmpdir(), 'wbl-'));
const files = { sep: join(dir, 'Shift report September.xlsx'), oct: join(dir, 'Shift report October.xlsx'), strip: join(dir, 'Shift report with strip.xlsx') };
type Exp = { rows: number; variance: number; byMonth: Record<string, number>; byLine: Record<string, number>; red: number };
const exp = {} as Record<keyof typeof files, Exp>;
beforeAll(() => {
  execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', files.sep], { stdio: 'ignore' });
  execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', files.oct, '--later'], { stdio: 'ignore' });
  execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', files.strip, '--strip'], { stdio: 'ignore' });
  for (const k of Object.keys(files) as (keyof typeof files)[]) exp[k] = JSON.parse(readFileSync(`${files[k]}.expected.json`, 'utf8'));
}, 60_000);
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const NOW = Date.UTC(2026, 10, 13, 9);
async function seed() {
  const db = await import('../../db'), reg = await import('../registry'), conv = await import('../../colleague/conversation');
  const client = await import('../../lib/workbook/client'), wbc = await import('../workbook'), data = await import('../data'), look = await import('../look');
  const backend = await client.directBackend();
  client.setWorkbookBackend(backend);
  let n = 0;
  /** A conversation with one workbook read into it and registered, as AI Mode does on attach. */
  const attach = async (cid: string, which: keyof typeof files, at: number, clientName = '') => {
    await db.putStudy(conv.newConversation({ id: cid, at, name: 'AI' }));
    const ctx: CapCtx = { now: at, conversationId: cid, me: 'Rowland' };
    const f = new File([readFileSync(files[which])], files[which].split('/').pop() as string, { lastModified: at });
    const id = client.workbookId(f);
    const p = await backend.read(id, f.name, f);
    await wbc.noteWorkbook(ctx, { id, name: f.name, bytes: f.size, at, status: p.status, sheets: p.sheets.map(s => ({ name: s.name, state: s.state, rows: s.rows, columns: s.columns.length })) });
    await data.registerFile(ctx, { fileId: id, fileName: f.name, kind: 'workbook', bytes: f.size, status: p.status, sheets: p.sheets.map(s => ({ name: s.name, rows: s.rows, columns: s.columns.map(c => ({ name: c.name, type: c.type })) })) });
    const run = (name: string, input: unknown) => reg.runCall(ctx, { id: `c${n += 1}`, name, input }, { confirmed: false });
    return { ctx, id, p, run, first: () => look.workLook(ctx, { id, name: f.name }, p, { client: clientName }) };
  };
  return { attach, db, data, look };
}
const money = (v: number) => `${v < 0 ? '−' : ''}£${Math.abs(Math.round(v)).toLocaleString('en-GB')}`;

describe('the first look, kept and used again', () => {
  it('workbook_pack: nothing to make one from is said; then the look as a report of the conversation, with its charts and results kept', async () => {
    const { attach, data, db } = await seed();
    const a = await attach('conv', 'sep', NOW);
    const none = await a.run('workbook_pack', {});
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.why).toContain('No first look has been worked in this conversation');
    expect(await a.first()).toBeTruthy();
    const r = await a.run('workbook_pack', {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toContain('Made the pack “Shift report September — first look”');
    expect(r.show?.kind).toBe('convreport');
    const o = data.outputsOfConversation((await db.getStudy('conv')) as never);
    expect(o.reports).toHaveLength(1);
    expect(o.reports[0].sections.map(s => s.heading)).toEqual(expect.arrayContaining(['What this workbook holds', 'Month by month', 'By Line', 'Colours', 'To know before trusting it']));
    expect(o.charts.length).toBeGreaterThanOrEqual(2);
    const byLine = o.results.find(x => x.title === 'Variance £ by Line');
    for (const g of byLine?.result.groups ?? []) expect(g.values[0]).toBeCloseTo(exp.sep.byLine[g.key[0]], 1);
    /* it is a report like any other: build_report adds to it */
    const more = await a.run('build_report', { reportId: o.reports[0].id, op: 'add', section: { kind: 'recommendation', heading: 'Where to start', text: 'Start with Line 3 on nights.', by: 'person' } });
    expect(more.ok).toBe(true);
  }, 60_000);
  it('the same report read again for the same customer says what changed — and another customer’s reading is never used', async () => {
    const { attach } = await seed();
    await (await attach('c1', 'sep', NOW - 30 * 86_400_000, 'Northfield')).first();
    const other = await (await attach('c2', 'oct', NOW, 'Brook Dairy')).first();
    expect(other?.comparedWith).toBeUndefined();
    expect(other?.says.join('\n')).not.toContain('Since “');
    const again = await (await attach('c3', 'oct', NOW + 1000, 'Northfield')).first();
    expect(again?.comparedWith?.name).toBe('Shift report September.xlsx');
    const said = again?.says.join('\n') ?? '';
    expect(said).toContain(`${exp.oct.rows - exp.sep.rows} rows more on “Shift report”`);
    expect(said).toContain(`New: October ${money(exp.oct.byMonth['2026-10'])}.`);
    expect(said).toContain(`Figures already read have CHANGED: August was ${money(exp.sep.byMonth['2026-08'])} and is ${money(exp.oct.byMonth['2026-08'])} now (−£500)`);
  }, 60_000);
  it('read_workbook_as: the heading row and the result as the person says them, then the look by that — kept for the pack', async () => {
    const { attach, look } = await seed();
    const c = await attach('conv', 'strip', NOW);
    await c.first();
    const r = await c.run('read_workbook_as', { sheet: 'Shift report', headerRow: 3, result: 'Variance £' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.says).toContain('The headings of “Shift report” are taken from row 3');
    expect(r.says).toContain('“Variance £” is the figure that matters, as you said.');
    expect(r.says).toContain('August 2026 to September 2026');
    expect(r.says).toContain('“Colour of Packs” — 20 green');
    expect(r.says).not.toContain('“Draft”');
    expect(r.says).toContain(money(exp.strip.byMonth['2026-08']));
    const kept = await look.keptLook(c.ctx);
    expect(kept).toMatchObject({ sheet: 'Shift report', headline: { column: 'Variance £' }, asked: { sheet: 'Shift report', result: 'Variance £' } });
    /* a column named by its letter; then the pack is of the look as now read */
    const r2 = await c.run('read_workbook_as', { rename: { E: 'Plan' } });
    expect(r2.ok && r2.says).toContain('Column E of “Shift report” (it was “Target”) is now called “Plan”.');
    const pack = await c.run('workbook_pack', {});
    expect(pack.ok && pack.says).toContain('each drawn from a result asked of “Shift report”');
  }, 60_000);
  it('what cannot be done is said in words: a sheet that is not there, a heading row above the one read, no column to take as a figure', async () => {
    const { attach } = await seed();
    const c = await attach('conv', 'strip', NOW);
    const r1 = await c.run('read_workbook_as', { sheet: 'Nope' });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.why).toContain('No sheet “Nope” — the sheets are “Shift report”, “Lines”.');
    await c.run('read_workbook_as', { sheet: 'Shift report', headerRow: 3 });
    const r2 = await c.run('read_workbook_as', { sheet: 'Shift report', headerRow: 1 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.why).toContain('above the row I read as its headings (row 3)');
    /* a result that is no column of the sheet is refused with the columns it does have — never read as if it were one */
    const r3 = await c.run('read_workbook_as', { result: 'Line 3' });
    expect(r3.ok).toBe(false);
    if (!r3.ok) expect(r3.why).toContain('“Line 3” is not a column of “Shift report” to take as the result — its columns are “Date” (A), “Shift” (B), “Line” (C)');
  }, 60_000);
});
