/* The tracker workbook -> a snapshot the app can hold and compare.
 *
 * The workbook stays the system of record; Faultline reads it and shows it. So
 * this reads by COLUMN HEADING, never by fixed position —
 * inserting a column in Excel must not silently shift every field by one.
 *
 * Anything it cannot make sense of is reported rather than guessed at: a bad
 * upload should say what was wrong with it, not quietly import half a file. */
import { readXlsx, type CellValue, type SheetData } from './xlsxRead';
import type { PaceAction } from './projectPaceData';

export interface PaceSnapshot {
  id: string;
  takenAt: number;
  fileName: string;
  actions: PaceAction[];
  /** The Lists sheet — the team's own vocabulary. Absent on older snapshots. */
  roster?: PaceRoster;
}

/** The dropdown lists the workbook drives itself from. The owner column is the
 *  roster the meeting is run through, and it INCLUDES people with no actions
 *  this week — "nothing from you" is a real answer at a stand-up, and it can
 *  only be given if the person is on screen to be asked. */
export interface PaceRoster {
  owners: string[];
  statuses: string[];
  categories: string[];
  lines: string[];
  departments: string[];
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
    // An explicit id column is the only thing that makes a row's identity
    // survive being overwritten. Optional — the sheet does not have one yet.
    const uid = txt(at(row, 'id')) || txt(at(row, 'uid')) || txt(at(row, 'actionid')) || undefined;
    out.push({
      uid,
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
      /* People / Process / Plant. Several spellings because the column is new
         and whoever adds it will name it whatever reads best in the sheet. */
      /* "3P" is what the real workbook calls it; the others are spellings a
         different sheet might reasonably use. */
      pillar: txt(at(row, '3p')) || txt(at(row, 'pillar')) || txt(at(row, 'ppp'))
        || txt(at(row, 'peopleplantprocess')) || txt(at(row, 'peopleprocessplant')) || undefined,
    });
  }
  if (!out.length) warnings.push(`"${sheet.name}" had headings but no action rows under them.`);
  return out;
}

/** Read a single labelled column straight down from its heading. */
function columnUnder(sheet: SheetData, heading: string): string[] {
  const hm = headerMap(sheet.rows, [heading]);
  if (!hm) return [];
  const ci = hm.cols.get(heading.toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (ci == null) return [];
  const out: string[] = [];
  for (let r = hm.row + 1; r < sheet.rows.length; r++) {
    const v = txt(sheet.rows[r]?.[ci] ?? null);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function parseRoster(sheet: SheetData): PaceRoster {
  return {
    owners: columnUnder(sheet, 'Owner'),
    statuses: columnUnder(sheet, 'Status'),
    categories: columnUnder(sheet, 'Category'),
    lines: columnUnder(sheet, 'Line'),
    departments: columnUnder(sheet, 'Who'),
  };
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

  // The Lists sheet drives the workbook's own dropdowns, so it is the closest
  // thing to an authoritative roster.
  const listsSheet = sheets.find(s => /^lists?$/i.test(s.name.trim()))
    ?? sheets.find(s => headerMap(s.rows, ['Owner', 'Status']));
  const roster = listsSheet ? parseRoster(listsSheet) : undefined;
  if (!roster?.owners.length) warnings.push('No owner list found on a "Lists" sheet — the roster falls back to whoever appears in the tracker.');

  // The Observations sheets are deliberately NOT read. What people see on the
  // floor belongs in the Snag list — filmed, pinned on the frame — not as notes
  // copied out of a spreadsheet.
  if (!actions.length) {
    throw new Error(
      'That workbook had no actions this app recognises. Expected a "Tracker" '
      + 'sheet with Ref / Line / Status columns.',
    );
  }

  return {
    snapshot: {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      takenAt: Date.now(),
      fileName,
      actions,
      roster,
    },
    sheetsSeen: sheets.map(s => s.name),
    warnings,
  };
}
