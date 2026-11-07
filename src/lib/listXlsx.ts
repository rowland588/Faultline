/* A LIST TO EXCEL (7 November — the enterprise basics, "Excel export"; docs/STATE.md 0b). Beside a list's paper in Report ▾, the
 * same rows as a workbook a person can sort, filter and add to — written by the app's own .xlsx writer (lib/xlsxWrite: a bold
 * header row that stays put, a filter on every column, dates as real Excel dates). No new record and no second reading: each
 * sheet is built from the rows the page shows (the line's tracker rows, Actions' rows), so the workbook and the page agree. */
import type { ProjectAction } from './projectActions';
import type { TrackerRow } from '../line/actions/lineActions';
import { writeXlsx, type XCell, type XSheet } from './xlsxWrite';

const iso = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const PRIO: Record<string, string> = { critical: 'Critical', high: 'High', low: 'Low' };
const STATUS: Record<string, string> = { open: 'To do', in_progress: 'Doing', closed: 'Done' };
const STATE: Record<TrackerRow['state'], string> = { late: 'Late', soon: 'Due soon', open: 'On time', doing: 'On time', done: 'Done', nodate: 'No day' };

/** A line's action tracker as a sheet — a row an action, as the tracker draws it (lineActions trackerRows). */
export function trackerSheet(rows: readonly TrackerRow[], whatOf: (id: string) => string): XSheet {
  const head: XCell[] = ['Action', 'Machine', 'Who', 'Priority', 'Status', 'Raised', 'Due', 'Where it stands', 'Days late', 'Waits for', 'Its day'];
  return {
    name: 'Action tracker',
    widths: [44, 18, 16, 10, 10, 12, 12, 16, 10, 40, 48],
    rows: [head, ...rows.map(r => [
      r.what, r.machine ?? '', r.owner || 'Nobody yet', PRIO[r.priority] ?? '', STATUS[r.status] ?? '', { date: iso(r.start) },
      r.due != null ? { date: iso(r.due) } : '', STATE[r.state], r.lateBy || '', r.after.map(whatOf).filter(Boolean).join('; '), r.clash ?? '',
    ] as XCell[])],
  };
}

/** Actions as a sheet — a row an action, as the Actions page lists it (lib/projectActions). */
export function actionsSheet(rows: readonly ProjectAction[], withProject: boolean): XSheet {
  const head: XCell[] = ['Action', ...(withProject ? ['Project'] : []), 'Kind', 'Priority', 'Where', 'Why', 'Who', 'Due', 'Where it stands'];
  return {
    name: 'Actions',
    widths: [44, ...(withProject ? [24] : []), 14, 10, 22, 36, 16, 12, 14],
    rows: [head, ...rows.map(a => [
      a.what, ...(withProject ? [a.project?.name ?? 'On the line'] : []), a.kind, a.priority ? PRIO[a.priority] ?? '' : '', a.where ?? '', a.why ?? '',
      a.who || 'Nobody yet', a.due ? { date: a.due } : '', a.late ? 'Late' : a.soon ? 'Due soon' : !a.due ? 'No date agreed' : 'On time',
    ] as XCell[])],
  };
}

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** Name it as its paper is named (lib/fileName), with .xlsx, and send it out the app's one way (lib/savePdf deliverBlob). */
export async function saveXlsx(sheets: XSheet[], who: string, what: string, today: string): Promise<void> {
  const [{ pdfFileName }, { deliverBlob }] = await Promise.all([import('./fileName'), import('./savePdf')]);
  const bytes = writeXlsx(sheets);
  await deliverBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: XLSX }), pdfFileName(who, what, today).replace(/\.pdf$/, '.xlsx'));
}
