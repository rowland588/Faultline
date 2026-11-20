/* Several workbooks at once (docs/CONNECTED-LUNA.md): their first looks are said in the order of their OWN dates — the earliest date on
 * each one's largest sheet — so each says what changed since the one before; those with no dates come after, by name. */
import { describe, expect, it } from 'vitest';
import { earliestOf, inDateOrder } from '../attachWorkbook';
import type { WorkbookProfile } from '../../lib/workbook/read';

const day = (m: number, d = 1) => Date.UTC(2026, m - 1, d);
const book = (name: string, sheets: { rows: number; dates?: number[] }[]) => ({
  name,
  p: { sheets: sheets.map((s, i) => ({ name: `S${i}`, read: true, rows: s.rows, columns: (s.dates ?? []).map((v, k) => ({ name: `D${k}`, type: 'date', min: v })) })) } as unknown as WorkbookProfile,
});

describe('several workbooks, in the order of their own dates', () => {
  it('reads the earliest date of the largest sheet', () => {
    expect(earliestOf(book('a', [{ rows: 5, dates: [day(1)] }, { rows: 300, dates: [day(4, 3), day(4, 1)] }]).p)).toBe(day(4, 1));
    expect(earliestOf(book('b', [{ rows: 30 }]).p)).toBeUndefined();
  });
  it('puts them oldest first whatever order they were chosen in, the undated after by name', () => {
    const got = inDateOrder([book('May.xlsx', [{ rows: 10, dates: [day(5)] }]), book('Notes 2.xlsx', [{ rows: 3 }]), book('March.xlsx', [{ rows: 10, dates: [day(3)] }]), book('Notes 10.xlsx', [{ rows: 3 }]), book('April.xlsx', [{ rows: 10, dates: [day(4)] }])]);
    expect(got.map(x => x.name)).toEqual(['March.xlsx', 'April.xlsx', 'May.xlsx', 'Notes 2.xlsx', 'Notes 10.xlsx']);
  });
});
