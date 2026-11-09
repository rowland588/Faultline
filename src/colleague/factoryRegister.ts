/* AN EQUIPMENT REGISTER READ BY RULES — a CSV, in code, nothing sent anywhere (9 November, docs/FACTORY-KNOWLEDGE.md F4).
 *
 * Rowland, 8 November: "If we can build it with code, of course, build it with code." A register is a table: its header row names
 * its columns (Line, Machine or Equipment or Asset, Type or Kind, Model, Serial, Make or Manufacturer, Site, Area). Each row
 * after it is ONE proposed machine on its line, carrying the row itself, word for word, as the words it came from. A row that names
 * no line or no machine is left out and said. Excel's own files (.xlsx) are not read: no spreadsheet reader is in the app — save
 * the sheet as CSV. Pure. */
import type { FactoryReadItem } from '../capabilities/factoryRead';

/** One CSV line split into its cells — quotes kept apart, "" an escaped quote, commas or semicolons or tabs between. */
export function csvCells(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const HEADS: Record<'line' | 'name' | 'kind' | 'model' | 'serial' | 'maker' | 'site' | 'area', RegExp> = {
  line: /^(production )?line( name| no\.?| number)?$/i,
  name: /^(machine|equipment|asset)( name| description)?$|^name$|^description$/i,
  kind: /^(type|kind|equipment type|machine type|asset type|category)$/i,
  model: /^model( no\.?| number)?$/i,
  serial: /^serial( no\.?| number)?$|^s\/n$/i,
  maker: /^(make|maker|manufacturer|oem|supplier|brand)$/i,
  site: /^(site|factory|plant)( name)?$/i,
  area: /^(area|department|dept\.?|hall|section|production area)$/i,
};

export interface RegisterRead { items: FactoryReadItem[]; skipped: string[]; columns: string[]; day?: string; dayQuote?: string }

/** THE REGISTER — its header found (the first line naming a line and a machine column), each row a machine with its quote. A line
 *  before the header that says "Date: 2026-03-01" (or "Issued 01/03/2026") gives the register's day, with those words. */
export function readRegister(csv: string): RegisterRead | { why: string } {
  const lines = csv.replace(/\r\n?/g, '\n').split('\n');
  const sepOf = (l: string) => ([',', ';', '\t'] as const).map(s => ({ s, n: csvCells(l, s).length })).sort((a, b) => b.n - a.n)[0].s;
  let head = -1, sep = ',', cols: Partial<Record<keyof typeof HEADS, number>> = {};
  for (let i = 0; i < Math.min(lines.length, 30) && head < 0; i++) {
    const s = sepOf(lines[i]);
    const cells = csvCells(lines[i], s);
    const found: Partial<Record<keyof typeof HEADS, number>> = {};
    cells.forEach((c, j) => { for (const [k, re] of Object.entries(HEADS) as [keyof typeof HEADS, RegExp][]) if (found[k] === undefined && re.test(c)) { found[k] = j; break; } });
    if (found.line !== undefined && found.name !== undefined) { head = i; sep = s; cols = found; }
  }
  if (head < 0) return { why: 'No header row naming a Line column and a Machine (or Equipment, or Asset) column was found — the register cannot be read by rules.' };
  let day: string | undefined, dayQuote: string | undefined;
  for (const l of lines.slice(0, head)) {
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(l), uk = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(l);
    if (/date|issued|as at|as of|updated/i.test(l) && (iso || uk)) {
      day = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : uk ? `${uk[3]}-${uk[2].padStart(2, '0')}-${uk[1].padStart(2, '0')}` : undefined;
      dayQuote = l.trim();
      break;
    }
  }
  const items: FactoryReadItem[] = [], skipped: string[] = [];
  const at = (cells: string[], k: keyof typeof HEADS) => (cols[k] !== undefined ? (cells[cols[k] as number] ?? '').trim() : '');
  lines.slice(head + 1).forEach((raw, i) => {
    if (!raw.trim() || csvCells(raw, sep).every(c => !c)) return;
    const cells = csvCells(raw, sep);
    const name = at(cells, 'name'), line = at(cells, 'line');
    if (!name || !line) { skipped.push(`Row ${i + 1} names ${!line ? 'no line' : 'no machine'} — left out: “${raw.trim().slice(0, 120)}”`); return; }
    const v = (k: keyof typeof HEADS) => { const x = at(cells, k); return x ? { [k === 'name' ? 'name' : k]: x } : {}; };
    items.push({ level: 'machine', name, quote: raw.trim(), line, ...v('site'), ...v('area'), ...v('kind'), ...v('model'), ...v('serial'), ...v('maker') });
  });
  const columns = (Object.keys(cols) as (keyof typeof HEADS)[]).sort((a, b) => (cols[a] as number) - (cols[b] as number));
  return { items, skipped, columns, ...(day && dayQuote ? { day, dayQuote } : {}) };
}

/** Is this file a CSV register? */
export const isCsv = (name: string, mime: string): boolean => /\.csv$/i.test(name) || mime === 'text/csv' || mime === 'application/vnd.ms-excel' && /\.csv$/i.test(name);
/** Is this an Excel workbook, which is not read here? */
export const isExcel = (name: string): boolean => /\.(xlsx|xlsm|xls)$/i.test(name);
