/* @vitest-environment jsdom
 *
 * THE REPORT, DRAWN FOR REAL.
 *
 * The pagination tests above check the arithmetic. This checks that the whole
 * drawing path actually runs and produces a PDF — the thing Rowland emails out.
 * Every string on every page goes through san(), so a change there can break all
 * of it at once, and a geometry helper that disagrees with the drawing shows up
 * here as a page count rather than as a silently short report.
 *
 * TYPED ON PURPOSE. The first attempt at this built the report data inside a
 * browser evaluate, which nothing typechecks, and it was simply the wrong shape —
 * the same mistake that made the smoke-test seed manufacture two fake "bugs".
 * Here tsc rejects it before the test runs.
 */
import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { drawCommissionReport, commissionSheets, type CommissionReportData, type CommissionReportRow } from '../commissionPdf';

/* No `as unknown as` here. The cast is what let the first version through with
   the wrong shape entirely — asset/who/pics instead of kind/line/stateLabel — and
   the test then failed at runtime on a field the drawing uppercases. A fixture
   that lies to the compiler is the harness manufacturing bugs again. */
const rowsOf = (stream: string, n: number, state: CommissionReportRow['state'] = 'w'): CommissionReportRow[] =>
  Array.from({ length: n }, (_, i): CommissionReportRow => ({
    stream,
    kind: 'check',
    title: `${stream} check ${i + 1}`,
    line: '4 of 12, 8 on order for 2026-09-24',
    target: '75 ppm @ 98% OEE',
    result: '',
    owner: 'OEM',
    due: '2026-10-02',
    state,
    stateLabel: 'Testing',
    next: 'run it again on Friday',
    nextBy: 'Rowland',
    nextAt: Date.parse('2026-09-18T14:00:00Z'),
    passes: i % 3 === 0 ? 2 : 1,
  }));

const data = (rows: CommissionReportRow[]): CommissionReportData => {
  const streams = [...new Set(rows.map(r => r.stream))];
  return {
    title: 'Line 2 commissioning',
    lead: 'Rowland',
    now: Date.parse('2026-09-19T09:00:00Z'),
    pct: 0.42,
    done: Math.round(rows.length * 0.42),
    total: rows.length,
    headline: 'Two assets on Line 2, both mid-commissioning — film is the constraint.',
    checks: { total: rows.length, passed: 10, failed: 2, untested: rows.length - 12 },
    streams: streams.map(name => ({ name, done: 2, total: 6, pct: 0.33, risk: 1 })),
    assets: [
      { name: 'Brillopack bagger', done: 8, total: 20, pct: 0.4, risk: 2, isLine: false },
      { name: 'Ishida multihead', done: 3, total: 14, pct: 0.21, risk: 1, isLine: false },
      { name: 'The line itself', done: 1, total: 4, pct: 0.25, risk: 0, isLine: true },
    ],
    attention: rows.slice(0, 3).map((r): CommissionReportRow => ({ ...r, state: 'r', stateLabel: 'Blocked' })),
    rows,
  };
};

const render = (rows: CommissionReportRow[]) => {
  const d = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  drawCommissionReport(d, data(rows));
  const buf = d.output('arraybuffer');
  return { pages: d.getNumberOfPages(), bytes: buf.byteLength, head: new TextDecoder().decode(new Uint8Array(buf).slice(0, 5)) };
};

describe('the commissioning report renders', () => {
  it('produces a real PDF for an ordinary job', () => {
    const { pages, bytes, head } = render([...rowsOf('Programs', 6), ...rowsOf('Film & materials', 4)]);
    expect(head).toBe('%PDF-');
    expect(pages).toBe(1);
    expect(bytes).toBeGreaterThan(2000);
  });

  it('runs with no rows at all rather than throwing', () => {
    // A commissioning job on its first day has nothing in it, and the report is
    // the thing you send to say so.
    const { pages, head } = render([]);
    expect(head).toBe('%PDF-');
    expect(pages).toBe(1);
  });

  it('grows to more pages as the job grows, rather than silently truncating', () => {
    const small = render(['Programs', 'Film'].flatMap(s => rowsOf(s, 4))).pages;
    const big = render(
      ['Programs', 'Film', 'SAT', 'Utilities', 'Training', 'Spares', 'Handover']
        .flatMap(s => rowsOf(s, 14)),
    ).pages;
    expect(big).toBeGreaterThan(small);
  });

  it('every row is allotted a sheet, however lopsided the job', () => {
    // A single oversized workstream used to be handed whole to one sheet, which
    // drew what fitted and dropped the rest without a word.
    const rows = rowsOf('Programs', 60);
    const total = commissionSheets(rows, 200, 300).reduce((n, s) => n + s.length, 0);
    expect(total).toBe(60);
  });

  it('survives text no PDF font can render', () => {
    // Straight out of an Excel cell: arrows, emoji, a NUL, and a multi-line log.
    const rows = rowsOf('Programs', 3).map((r, i) => ({
      ...r,
      title: ['44 → 49 ppm ✓', 'rate 😀 ok', 'NUL\u0000inside'][i]!,
      result: '12/08 chased OEM\n19/08 parts fitted',
    }));
    const { pages, head } = render(rows);
    expect(head).toBe('%PDF-');
    expect(pages).toBeGreaterThanOrEqual(1);
  });
});
