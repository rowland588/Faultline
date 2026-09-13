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
  /** The Pareto sheet, read from THIS upload. Absent when the workbook has no
   *  Pareto sheet, and absent on snapshots taken before the app read one. */
  pareto?: PaceParetoSheet;
}

/** The Pareto sheet as this week's file has it.
 *
 *  READ FROM EVERY UPLOAD, ON PURPOSE. A Pareto is not only the thing you do
 *  at the start to decide where to aim — it is also evidence taken during the
 *  work, and evidence needs two readings to say anything. Keeping one per
 *  upload means the app can put this week's beside an earlier one and show
 *  which categories actually moved, which is the whole reason for re-running
 *  the analysis halfway through a project.
 *
 *  The period is carried because it is what makes two of these comparable —
 *  two Paretos over the same weeks are the same measurement twice, and the
 *  app must not present them as movement. */
export interface PaceParetoRow {
  category: string;
  mins: number;
  events: number;
  minPerEvent: number;
  /** Long-stop, Frequency or Mixed — the sheet's own call, not the app's. */
  profile: string;
  /** Minutes per measured line, keyed as the sheet heads them (L2, L7, L10). */
  byLine: Record<string, number>;
}

export interface PaceParetoSheet {
  rows: PaceParetoRow[];
  totalMins: number;
  totalStops: number;
  /** "14 Jul – 6 Aug 2026", straight off the sheet's own subtitle. */
  period?: string;
  /** The sheet's own headline sentence, kept verbatim rather than rewritten. */
  headline?: string;
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

/** The Pareto sheet. Read by heading like everything else, and forgiving about
 *  what is NOT there: a workbook with no Pareto sheet is normal, not an error.
 *
 *  The per-line columns are taken as they come — L2, L7, L10 today, whatever
 *  the lines are tomorrow — rather than pinned to three names the sheet is not
 *  obliged to keep. */
function parsePareto(sheet: SheetData): PaceParetoSheet | undefined {
  const hm = headerMap(sheet.rows, ['Category', 'Mins', 'Events']);
  if (!hm) return undefined;
  const { row: hr, cols } = hm;
  const at = (r: CellValue[], key: string): CellValue => {
    const i = cols.get(key);
    return i == null ? null : (r[i] ?? null);
  };
  const num = (v: CellValue): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  /* Which columns are per-line minutes. "L2 mins" and "L10 mins" rather than a
     fixed three, so a fourth line appearing on the sheet appears here too. */
  const lineCols: [string, number][] = [];
  for (const [key, i] of cols) {
    const m = /^l(\d+)mins$/.exec(key);
    if (m) lineCols.push([`Line ${m[1]}`, i]);
  }
  lineCols.sort((a, b) => Number(a[0].replace(/\D/g, '')) - Number(b[0].replace(/\D/g, '')));

  /* WHERE THE TABLE ENDS, WHICH IS NOT WHERE THE SHEET DOES.
   *
   * The real Pareto sheet carries a SECOND table underneath the first — a
   * "FREQUENCY VIEW — ranked by stops" whose column B is Stops, not Mins.
   * Reading to the bottom of the sheet walked straight into it and read a stop
   * count as a minute count: 63 categories instead of 28, and 4,434 minutes
   * against a sheet that says 3,638 on its own face.
   *
   * So the table ends at a break in it: two blank rows in a row, or a row that
   * announces a new section. One blank row is tolerated, because a spacer
   * inside a table is a thing people do and truncating there would silently
   * drop the tail of a real Pareto. */
  const rows: PaceParetoRow[] = [];
  let blanks = 0;
  for (let r = hr + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? [];
    const category = txt(at(row, 'category'));
    if (!category) {
      if (txt(row.map(txt).join('')) === '' && ++blanks >= 2) break;
      continue;
    }
    blanks = 0;
    // A heading for the next section, not a category in this one.
    if (/view\b|^category$/i.test(category) && num(at(row, 'mins')) <= 0) break;
    const mins = num(at(row, 'mins'));
    // A total row at the foot of the sheet is a sum, not a category.
    if (/^(total|grand total|sum)$/i.test(category)) continue;
    if (mins <= 0) continue;
    const events = num(at(row, 'events'));
    const byLine: Record<string, number> = {};
    for (const [name, i] of lineCols) {
      const v = num(row[i] ?? null);
      if (v > 0) byLine[name] = v;
    }
    rows.push({
      category, mins, events,
      minPerEvent: num(at(row, 'minevent')) || (events > 0 ? mins / events : 0),
      profile: txt(at(row, 'profile')),
      byLine,
    });
  }
  if (!rows.length) return undefined;
  rows.sort((a, b) => b.mins - a.mins);

  /* The sheet says its own period and its own headline in the prose above the
     table. Lifting them beats restating them: the wording is the author's, and
     the period is what decides whether two Paretos are comparable at all. */
  const prose = sheet.rows.slice(0, hr).flat().map(txt).filter(Boolean);
  const period = prose
    .map(t => /covering\s+([^.(]+?)\s*(?:\(|\.|$)/i.exec(t)?.[1]?.trim())
    .find((x): x is string => !!x);
  const headline = prose.find(t => /^#\s*1\s*loss/i.test(t));

  /* The sheet states its own totals in a sentence above the table — "3,638
     minutes lost across 398 stops". Those are the author's numbers and the
     ones they will quote in a room, so they win; the column sum is the
     fallback, rounded, because adding 28 one-decimal figures in binary
     produces things like 398.99999999999994. */
  const stated = prose.map(t => /([\d,]+(?:\.\d+)?)\s*minutes?\s+lost\s+across\s+([\d,]+)\s*stops?/i.exec(t))
    .find((m): m is RegExpExecArray => !!m);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    rows,
    totalMins: stated ? Number(stated[1].replace(/,/g, '')) : round1(rows.reduce((t, r) => t + r.mins, 0)),
    totalStops: stated ? Number(stated[2].replace(/,/g, '')) : Math.round(rows.reduce((t, r) => t + r.events, 0)),
    period,
    headline,
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

  /* The Pareto sheet, when the workbook has one. Never a warning if it has
     not: most trackers do not carry one, and a project that never runs a
     Pareto is a normal project, not a misconfigured one. */
  const paretoSheet = sheets.find(s => /pareto/i.test(s.name));
  const pareto = paretoSheet ? parsePareto(paretoSheet) : undefined;
  if (paretoSheet && !pareto) {
    warnings.push('A "Pareto" sheet was found but had no Category / Mins / Events table under a heading row, so no Pareto was read from it.');
  }

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
      pareto,
    },
    sheetsSeen: sheets.map(s => s.name),
    warnings,
  };
}
