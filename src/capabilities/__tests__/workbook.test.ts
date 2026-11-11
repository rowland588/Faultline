/* WORKBOOKS IN THE CONVERSATION, AS THE COLLEAGUE ASKS THEM (docs/WORKBOOKS.md) — through the registry, as a call from the gateway runs:
 * workbook_profile says what the workbook holds and what is wrong with it; query_workbook answers over every row with the generator's own
 * totals; workbook_rows gives the cells behind a finding; a bad question is refused in words; a workbook still being read, read on another
 * device, or never attached is said so — never a figure made up. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CapCtx } from '../types';

const dir = mkdtempSync(join(tmpdir(), 'wbc-'));
const file = join(dir, 'Plant 2 downtime.xlsx');
let exp: { rows: number; minutesByReason: Record<string, number>; minutesText: number; bagLine3Minutes: number; firstBagLine3Row: number };
beforeAll(() => { execFileSync('node', ['scripts/workbook/make-workbook.mjs', file, '12000'], { stdio: 'ignore' }); exp = JSON.parse(readFileSync(`${file}.expected.json`, 'utf8')); }, 60_000);
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const NOW = Date.UTC(2026, 10, 10, 12);
async function seed(read = true) {
  const db = await import('../../db'), reg = await import('../registry'), conv = await import('../../colleague/conversation');
  const client = await import('../../lib/workbook/client'), wbc = await import('../workbook');
  await db.putStudy(conv.newConversation({ id: 'conv', at: NOW, name: 'AI' }));
  const backend = await client.directBackend();
  client.setWorkbookBackend(backend);
  const ctx: CapCtx = { now: NOW, conversationId: 'conv', me: 'Rowland' };
  const f = new File([readFileSync(file)], 'Plant 2 downtime.xlsx', { lastModified: 1 });
  const id = client.workbookId(f);
  if (read) {
    const p = await backend.read(id, f.name, f);
    await wbc.noteWorkbook(ctx, { id, name: f.name, bytes: f.size, at: NOW, status: p.status, sheets: p.sheets.map(s => ({ name: s.name, state: s.state, rows: s.rows, columns: s.columns.length })) });
  }
  let n = 0;
  const run = (name: string, input: unknown) => reg.runCall(ctx, { id: `c${n += 1}`, name, input }, { confirmed: true });
  return { run, id, ctx, wbc, client };
}

describe('a workbook asked in the conversation', () => {
  it('workbook_profile: the sheets, the header under the title, what is wrong with the data, what is not read', async () => {
    const { run } = await seed();
    const r = await run('workbook_profile', {});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    /* with no sheet: THE MAP — every sheet in a line, the connections found from the values */
    expect(r.says).toMatch(/THE MAP — 3 sheets/);
    expect(r.says).toMatch(/- “Downtime”: 12,000 rows, header row 3; columns \(9\): Date, Shift, Line, Machine, Reason, Minutes/);
    expect(r.says).toMatch(/- “Products”: 50 rows/);
    expect(r.says).toMatch(/- “Lookups” \(hidden\)/);
    expect(r.says).toMatch(/CONNECTIONS found from the values \(not from formulas\): .*“Downtime”\.Reason ↔ “Lookups”\.Column A/);
    expect(r.says).toMatch(/“Downtime”\.Machine ↔ “Products”\.Machine/);
    expect(r.says).toMatch(/In the file but NOT read: A pivot table’s cache/);
    /* with a sheet: that sheet in full — what is wrong, and how many cells formulas work out, never a formula's text (10 November — "I see
       the actual formulas when I ask a question") */
    const d = await run('workbook_profile', { sheet: 'Downtime' });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.says).toMatch(/“Downtime” — 12,000 rows of data under the header in row 3 \(above it: Line downtime log — Plant 2\)/);
    expect(d.says).toMatch(/F “Minutes” — number, \d+ blank, \d+ not numbers/);
    expect(d.says).toMatch(/C “Line” — text, .*written more than one way: “Line 3” ×[\d,]+ \/ “line 3 ” ×\d+/);
    expect(d.says).toMatch(/worked out by formulas \(\d+ with no saved value\)/);
    expect(d.says).not.toMatch(/=F\d+\*60/);
  }, 60_000);

  it('query_workbook: minutes by reason over every row, as the generator counted them; the words it could not add named with their cells', async () => {
    const { run } = await seed();
    const r = await run('query_workbook', { sheet: 'Downtime', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }, { op: 'count' }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const top = Object.entries(exp.minutesByReason).sort((a, b) => b[1] - a[1])[0];
    const d = r.data as { groups: { key: string[]; values: number[] }[]; rowsScanned: number };
    expect(d.rowsScanned).toBe(exp.rows);
    expect(d.groups[0].key[0]).toBe(top[0]);
    expect(Math.abs(d.groups[0].values[0] - top[1])).toBeLessThan(1e-6);
    expect(r.says).toMatch(/Downtime: 12,000 of 12,000 rows matched, in 8 groups of Reason\. Worked by the app over every row\./);
    expect(r.says).toMatch(new RegExp(`sum of Minutes: ${exp.minutesText} cells not used — not a number \\(e\\.g\\. Downtime!F\\d+`));
    const f = await run('query_workbook', { sheet: 'Downtime', filters: [{ column: 'Reason', op: 'eq', value: 'Bag presentation' }, { column: 'Line', op: 'eq', value: 'line 3' }], measures: [{ op: 'sum', column: 'Minutes' }] });
    if (f.ok) { expect(Math.abs((f.data as { totals: number[] }).totals[0] - exp.bagLine3Minutes)).toBeLessThan(1e-6); expect(f.says).toMatch(/matched 2 spellings, taken together/); }
  }, 60_000);

  it('workbook_rows: the rows behind the finding, each cell with its reference', async () => {
    const { run } = await seed();
    const r = await run('workbook_rows', { sheet: 'Downtime', filters: [{ column: 'Reason', op: 'eq', value: 'Bag presentation' }, { column: 'Line', op: 'eq', value: 'Line 3' }, { column: 'Minutes', op: 'notblank' }], columns: ['Date', 'Line', 'Reason', 'Minutes'], limit: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.says).toMatch(new RegExp(`row ${exp.firstBagLine3Row}: Date 2026-\\d\\d-\\d\\d · Line Line 3 · Reason Bag presentation · Minutes [\\d.]+`));
      expect((r.data as { rows: { cells: Record<string, { ref: string }> }[] }).rows[0].cells.Reason.ref).toBe(`Downtime!E${exp.firstBagLine3Row}`);
    }
  }, 60_000);

  it('refused in words: a bad question, a sheet or column that is not there, words to add up, a malformed call', async () => {
    const { run } = await seed();
    const a = await run('query_workbook', { sheet: 'Downtime', measures: [{ op: 'sum', column: 'Reason' }] });
    expect(a.ok).toBe(false); if (!a.ok) expect(a.why).toMatch(/“Reason” holds text, not numbers — it cannot be added up/);
    const b = await run('query_workbook', { sheet: 'Downtme', measures: [{ op: 'count' }] });
    expect(b.ok).toBe(false); if (!b.ok) expect(b.why).toMatch(/No sheet “Downtme” — the sheets are “Downtime”, “Products”, “Lookups”/);
    const c = await run('query_workbook', { sheet: 'Downtime', measures: [] });
    expect(c.ok).toBe(false);
    const d = await run('query_workbook', { sheet: 'Downtime', filters: [{ column: 'Date', op: 'between', from: '2026-01-01' }], measures: [{ op: 'count' }] });
    expect(d.ok).toBe(false); if (!d.ok) expect(d.why).toMatch(/needs from and to/);
  }, 60_000);

  it('never a figure without the workbook: none attached, still being read, or read on another device', async () => {
    const none = await seed(false);
    const r = await none.run('workbook_profile', {});
    expect(r.ok).toBe(false); if (!r.ok) expect(r.why).toMatch(/No workbook has been attached in this conversation/);
    await none.wbc.noteWorkbook(none.ctx, { id: none.id, name: 'x.xlsx', bytes: 1, at: NOW, status: 'reading' });
    const reading = await none.run('query_workbook', { sheet: 'Downtime', measures: [{ op: 'count' }] });
    expect(reading.ok).toBe(false); if (!reading.ok) expect(reading.why).toMatch(/is still being read/);
    await none.wbc.noteWorkbook(none.ctx, { id: none.id, name: 'x.xlsx', bytes: 1, at: NOW, status: 'ready' });
    const elsewhere = await none.run('query_workbook', { sheet: 'Downtime', measures: [{ op: 'count' }] });
    expect(elsewhere.ok).toBe(false); if (!elsewhere.ok) expect(elsewhere.why).toMatch(/not on this device — it was read on another one.*Attach it again here/);
    await none.wbc.settleWorkbooks(none.ctx, new Set());
  }, 60_000);
});
