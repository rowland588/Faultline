import { describe, it, expect } from 'vitest';
import { pdfFileName } from '../fileName';

describe('the one PDF file name', () => {
  it('is job, what it is, date — hyphenated, date last', () => {
    expect(pdfFileName('Line 7 pace', 'client report', '2026-10-01'))
      .toBe('Line-7-pace-client-report-2026-10-01.pdf');
  });

  it('drops what a file system or an email client dislikes', () => {
    expect(pdfFileName('Ilapak / Line 2: "new" jaw', 'line standard – Finest Red 2kg', '2026-10-01'))
      .toBe('Ilapak-Line-2-new-jaw-line-standard-finest-red-2kg-2026-10-01.pdf');
  });

  it('never leaves the job blank', () => {
    expect(pdfFileName('  ', 'day', '2026-10-01')).toBe('Faultline-day-2026-10-01.pdf');
  });

  it('keeps one long product from running the name away', () => {
    const n = pdfFileName('Job', 'evidence ' + 'x'.repeat(200), '2026-10-01');
    expect(n.length).toBeLessThan(80);
    expect(n.endsWith('-2026-10-01.pdf')).toBe(true);
  });
});
