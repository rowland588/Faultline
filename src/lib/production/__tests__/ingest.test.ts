/* THE INGEST CORE (docs/DATA-CONNECTIONS.md §1): mapping by JSON path and by CSV header, the refusals with why, the id that makes a
 * row sent twice replace itself, the limits — and the function's copy the app's own file, word for word. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dayOf, getPath, ingestBody, INGEST_LIMITS, mapRows, outcomeSaid, parseCsv, recordId, rowsOfBody } from '../ingestCore';

const NOW = Date.parse('2026-11-11T07:00:00Z');
const conn = { id: 'c1', workspaceId: 'L7', lineMap: { 'PK-2': 'L2' } };

describe('a path into a row', () => {
  it('reads dots, brackets and $., and a key in another case', () => {
    const o = { data: { items: [{ qty: 5, Result: { 'Good Units': 4 } }] } };
    expect(getPath(o, '$.data.items[0].qty')).toBe(5);
    expect(getPath(o, 'data.items.0.result.good_units')).toBe(4);
    expect(getPath(o, 'data.nothing.here')).toBeUndefined();
  });
});

describe('CSV', () => {
  it('reads quotes, doubled quotes, commas and newlines inside them, and a ; file', () => {
    expect(parseCsv('a,b\n"x, y","he said ""no"""\n')).toEqual([['a', 'b'], ['x, y', 'he said "no"']]);
    expect(parseCsv('a;b\r\n1;"2\n3"')).toEqual([['a', 'b'], ['1', '2\n3']]);
  });
  it('turns a sheet into rows by its header', () => {
    const r = rowsOfBody('id,day,output\nA1,2026-11-10,"1,200"\n', 'text/csv');
    expect(r).toEqual({ rows: [{ id: 'A1', day: '2026-11-10', output: '1,200' }] });
  });
});

describe('a day', () => {
  it('ISO, a date-time as written, dd/mm/yyyy; nonsense none', () => {
    expect(dayOf('2026-11-10')).toBe('2026-11-10');
    expect(dayOf('2026-11-10T23:30:00+01:00')).toBe('2026-11-10');
    expect(dayOf('10/11/2026')).toBe('2026-11-10');
    expect(dayOf('31/02/2026')).toBeUndefined();
    expect(dayOf('yesterday')).toBeUndefined();
  });
});

describe('mapping a system’s rows', () => {
  const mapping = { rows: 'data.items', fields: { id: 'orderNo', line: 'lineCode', day: 'shiftDate', shift: 'crew', product: 'sku', planned: 'plan.min', run: 'plan.ran', output: 'qty.made', target: 'qty.target', rejects: 'qty.scrap', downtime: 'down.min', reason: 'down.why' } };
  const body = JSON.stringify({ data: { items: [
    { orderNo: 'WO-1', lineCode: 'PK-2', shiftDate: '2026-11-10', crew: 'Days', sku: 'Crisps 6x25g', plan: { min: 450, ran: 400 }, qty: { made: 38000, target: 45000, scrap: 400 }, down: { min: 50, why: 'Film break' } },
    { orderNo: 'WO-2', shiftDate: '2026-11-10', crew: 'Nights', qty: { made: '41,000', target: 45000 } },
    { orderNo: 'WO-3', lineCode: 'PK-9', shiftDate: '2026-11-10' },
    { lineCode: 'PK-2', shiftDate: '2026-11-10' },
    { orderNo: 'WO-5', lineCode: 'PK-2', shiftDate: 'Tuesday' },
    { orderNo: 'WO-6', lineCode: 'PK-2', shiftDate: '2026-11-10', qty: { made: 'lots' } },
    { orderNo: 'WO-7', lineCode: 'PK-2', shiftDate: '2026-11-10', qty: { made: 100, scrap: 120 } },
    { orderNo: 'WO-8', lineCode: 'PK-2', shiftDate: '2026-11-10', down: { min: -5 } },
  ] } });
  const out = ingestBody(body, 'application/json', { ...conn, mapping }, NOW);
  it('keeps what can be kept, each as system data, with the system’s id', () => {
    if ('why' in out) throw new Error(out.why);
    expect(out.received).toBe(8);
    expect(out.records.map(r => r.sourceId)).toEqual(['WO-1', 'WO-2']);
    expect(out.records[0]).toEqual({
      id: 'c1:WO-1', workspaceId: 'L2', connectionId: 'c1', sourceId: 'WO-1', day: '2026-11-10', shift: 'Days', product: 'Crisps 6x25g',
      plannedMinutes: 450, runMinutes: 400, output: 38000, target: 45000, rejects: 400, downtimeMinutes: 50, downtimeReason: 'Film break',
      howKnown: 'system', importedAt: NOW, updatedAt: NOW,
    });
  });
  it('a row naming no line lands on the connection’s; a thousands comma is a number; a blank is not recorded, never zero', () => {
    if ('why' in out) throw new Error(out.why);
    const r = out.records[1];
    expect(r.workspaceId).toBe('L7');
    expect(r.output).toBe(41000);
    expect(r.rejects).toBeUndefined();
    expect(r.good).toBeUndefined();
  });
  it('refuses each other row with why', () => {
    if ('why' in out) throw new Error(out.why);
    expect(out.refused).toEqual([
      { row: 3, why: 'line “PK-9” is not mapped to a line' },
      { row: 4, why: 'no id — the system’s own id for the row is needed (looked for “orderNo”)' },
      { row: 5, why: 'the day “Tuesday” is not a date' },
      { row: 6, why: 'units made is “lots”, not a number' },
      { row: 7, why: 'rejects (120) are more than units made (100)' },
      { row: 8, why: 'downtime minutes is negative (-5)' },
    ]);
    expect(outcomeSaid(out)).toMatch(/^2 of 8 rows kept, 6 refused \(row 3: line “PK-9” is not mapped to a line;/);
  });
});

describe('the same row twice replaces itself', () => {
  it('one id a connection and a system id, and the last of a repeat kept once', () => {
    const rows = [{ id: 'S-1', day: '2026-11-10', output: 10 }, { id: 'S-1', day: '2026-11-10', output: 12 }];
    const o = mapRows(rows, conn, NOW);
    expect(o.records).toHaveLength(1);
    expect(o.records[0]).toMatchObject({ id: recordId('c1', 'S-1'), output: 12 });
    /* sent again later: the same id, so the store's put (and the cloud's upsert on id) replaces it */
    expect(mapRows([rows[1]], conn, NOW + 1000).records[0].id).toBe(o.records[0].id);
    expect(mapRows([rows[1]], { ...conn, id: 'c2' }, NOW).records[0].id).not.toBe(o.records[0].id);
  });
  it('a line by Luna’s own name when the system uses it', () => {
    const o = mapRows([{ id: 'x', day: '2026-11-10', line: 'packing line 3' }], { id: 'c1' }, NOW, [{ id: 'L3', name: 'Packing Line 3' }]);
    expect(o.records[0].workspaceId).toBe('L3');
  });
});

describe('limits', () => {
  it('too many rows or bytes refused whole, with the limit said', () => {
    const many = JSON.stringify(Array.from({ length: INGEST_LIMITS.rows + 1 }, (_, i) => ({ id: String(i), day: '2026-11-10' })));
    expect(ingestBody(many, 'application/json', conn, NOW)).toMatchObject({ status: 413, why: expect.stringMatching(/at most 5,000/) });
    expect(ingestBody('x'.repeat(INGEST_LIMITS.bytes + 1), 'text/csv', conn, NOW)).toMatchObject({ status: 413 });
    expect(ingestBody('{"nope":1}', 'application/json', conn, NOW)).toMatchObject({ status: 400, why: expect.stringMatching(/No list of rows/) });
  });
});

describe('the ingest function’s copy', () => {
  it('is the app’s own file, word for word', () => {
    const root = process.cwd();
    const src = readFileSync(join(root, 'src/lib/production/ingestCore.ts'), 'utf8');
    const copy = readFileSync(join(root, 'supabase/functions/ingest/core.ts'), 'utf8');
    expect(copy.split('\n').slice(1).join('\n'), 'run node scripts/sync-assist.mjs').toBe(src);
  });
});
