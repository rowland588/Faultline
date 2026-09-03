/* The tracker workbook -> a snapshot the app can hold and compare.
 *
 * The workbook stays the system of record; Faultline takes a copy each week and
 * reports what moved. So this reads by COLUMN HEADING, never by fixed position —
 * inserting a column in Excel must not silently shift every field by one.
 *
 * Anything it cannot make sense of is reported rather than guessed at: a bad
 * upload should say what was wrong with it, not quietly import half a file. */
import { readXlsx, type CellValue, type SheetData } from './xlsxRead';
import type { PaceAction, PaceObservation } from './projectPaceData';

export interface PaceSnapshot {
  id: string;
  takenAt: number;
  fileName: string;
  actions: PaceAction[];
  observations: PaceObservation[];
}

export interface ParseReport {
  snapshot: PaceSnapshot;
  sheetsSeen: string[];
  warnings: string[];
}

const txt = (v: CellValue): string =>
  v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();

const iso = (v: CellValue): string | undefined => {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
};

/** Find the header row and map heading -> column index. Headings are matched
 *  loosely (case and punctuation insensitive) so "What's happening" survives a
 *  smart-quote change. */
function headerMap(rows: CellValue[][], must: string[]): { row: number; cols: Map<string, number> } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wanted = must.map(norm);
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const row = rows[r] ?? [];
    const cols = new Map<string, number>();
    row.forEach((c, i) => { const s = txt(c); if (s) cols.set(norm(s), i); });
    if (wanted.every(w => cols.has(w))) return { row: r, cols };
  }
  return null;
}

function parseTracker(sheet: SheetData, warnings: string[]): PaceAction[] {
  const hm = headerMap(sheet.rows, ['Ref', 'Line', 'Status']);
  if (!hm) {
    warnings.push(`"${sheet.name}" has no row with Ref / Line / Status headings — no actions read from it.`);
    return [];
  }
  const { row: hr, cols } = hm;
  const at = (r: CellValue[], key: string): CellValue => {
    const i = cols.get(key);
    return i == null ? null : (r[i] ?? null);
  };

  const out: PaceAction[] = [];
  for (let r = hr + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? [];
    const ref = txt(at(row, 'ref'));
    if (!ref) continue;
    const pr = Number(at(row, 'priority'));
    out.push({
      ref,
      priority: Number.isFinite(pr) && pr > 0 ? pr : 3,
      line: txt(at(row, 'line')),
      category: txt(at(row, 'category')),
      problem: txt(at(row, 'whatshappening')) || undefined,
      action: txt(at(row, 'action')) || undefined,
      who: txt(at(row, 'who')) || undefined,
      owner: txt(at(row, 'owner')) || undefined,
      due: iso(at(row, 'due')),
      status: txt(at(row, 'status')) || 'Open',
      flag: txt(at(row, 'flag')),
    });
  }
  if (!out.length) warnings.push(`"${sheet.name}" had headings but no action rows under them.`);
  return out;
}

const LENSES = ['People', 'Plant', 'Process', 'Material'];

function parseObservations(sheet: SheetData): PaceObservation[] {
  const observer = sheet.name.replace(/observations?/i, '').replace(/[’']s\b/i, '').trim() || sheet.name.trim();
  const hm = headerMap(sheet.rows, ['People']);
  if (!hm) return [];
  const { row: hr, cols } = hm;
  const out: PaceObservation[] = [];
  for (const lens of LENSES) {
    const ci = cols.get(lens.toLowerCase());
    if (ci == null) continue;
    for (let r = hr + 1; r < sheet.rows.length; r++) {
      const v = txt(sheet.rows[r]?.[ci] ?? null);
      if (v) out.push({ observer, lens, text: v });
    }
  }
  return out;
}

/** Read an uploaded workbook. Throws only when the file isn't a workbook at
 *  all; a workbook missing a sheet comes back as a warning so the user can see
 *  what was and wasn't picked up. */
export function readPaceWorkbook(buf: ArrayBuffer, fileName: string): ParseReport {
  const sheets = readXlsx(buf);
  const warnings: string[] = [];

  const tracker = sheets.find(s => /tracker/i.test(s.name))
    ?? sheets.find(s => headerMap(s.rows, ['Ref', 'Line', 'Status']));
  const actions = tracker ? parseTracker(tracker, warnings) : [];
  if (!tracker) warnings.push('No Tracker sheet found — actions could not be read.');

  const obsSheets = sheets.filter(s => /observation/i.test(s.name));
  const observations = obsSheets.flatMap(parseObservations);
  if (!obsSheets.length) warnings.push('No Observations sheets found.');

  if (!actions.length && !observations.length) {
    throw new Error(
      'That workbook had nothing this app recognises. Expected a "Tracker" sheet '
      + 'with Ref / Line / Status columns, and/or "… Observations" sheets.',
    );
  }

  return {
    snapshot: {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      takenAt: Date.now(),
      fileName,
      actions,
      observations,
    },
    sheetsSeen: sheets.map(s => s.name),
    warnings,
  };
}
