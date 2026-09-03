/* A read-only .xlsx reader — sheets in, rows of values out.
 *
 * An .xlsx is a zip of XML, so this unzips it (fflate) and parses the parts the
 * app actually needs with the browser's own DOMParser. The alternative was
 * SheetJS, whose last npm release (0.18.5) carries a high-severity prototype
 * pollution and a ReDoS with no fix published to npm — not something to ship
 * inside an offline PWA to read a file the user supplies.
 *
 * Deliberately partial: values only, no formulas, styles, merges or charts.
 * Dates are the one place formatting matters, because Excel stores them as
 * plain numbers — so styles.xml is read far enough to know which cells are
 * dated and convert them. */
import { unzipSync, strFromU8 } from 'fflate';

export type CellValue = string | number | boolean | Date | null;
export interface SheetData { name: string; rows: CellValue[][] }

const parse = (xml: string): Document => new DOMParser().parseFromString(xml, 'application/xml');

/** "BC7" -> 54 (zero-based column index). */
function colIndex(ref: string): number {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/** Excel's day-zero is 1899-12-30 — the offset already absorbs the fictional
 *  1900 leap day, so serials from 1900-03-01 onward land correctly. */
function excelDate(serial: number): Date {
  const ms = Math.round(serial * 86400000);
  return new Date(Date.UTC(1899, 11, 30) + ms);
}

/** Built-in numFmt ids that mean "date" or "time" (ECMA-376 §18.8.30). */
const DATE_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);
const looksDated = (code: string): boolean =>
  // strip quoted literals and colour/condition blocks before sniffing for d/m/y
  /[dmyhs]/i.test(code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, ''));

/** cellXf index -> is this cell formatted as a date? */
function dateStyles(zip: Record<string, Uint8Array>): Set<number> {
  const out = new Set<number>();
  const f = zip['xl/styles.xml'];
  if (!f) return out;
  const doc = parse(strFromU8(f));
  const custom = new Map<number, string>();
  doc.querySelectorAll('numFmts > numFmt').forEach(el => {
    const id = Number(el.getAttribute('numFmtId'));
    const code = el.getAttribute('formatCode') ?? '';
    if (Number.isFinite(id)) custom.set(id, code);
  });
  const xfs = doc.querySelector('cellXfs');
  if (!xfs) return out;
  Array.from(xfs.children).forEach((xf, i) => {
    const id = Number(xf.getAttribute('numFmtId') ?? 0);
    if (DATE_FMT_IDS.has(id)) { out.add(i); return; }
    const code = custom.get(id);
    if (code && looksDated(code)) out.add(i);
  });
  return out;
}

/** The shared string table. Rich-text runs are concatenated to their plain text. */
function sharedStrings(zip: Record<string, Uint8Array>): string[] {
  const f = zip['xl/sharedStrings.xml'];
  if (!f) return [];
  const doc = parse(strFromU8(f));
  return Array.from(doc.getElementsByTagName('si')).map(si => {
    // A run-based <si> holds several <r><t>; a plain one holds a single <t>.
    const ts = si.getElementsByTagName('t');
    let s = '';
    for (let i = 0; i < ts.length; i++) {
      // skip <rPh> phonetic hints, which are not part of the visible value
      if (ts[i].parentElement?.tagName === 'rPh') continue;
      s += ts[i].textContent ?? '';
    }
    return s;
  });
}

/** Sheet name -> the zip path holding it, in workbook order. */
function sheetPaths(zip: Record<string, Uint8Array>): { name: string; path: string }[] {
  const wbFile = zip['xl/workbook.xml'];
  if (!wbFile) return [];
  const wb = parse(strFromU8(wbFile));

  const rels = new Map<string, string>();
  const relFile = zip['xl/_rels/workbook.xml.rels'];
  if (relFile) {
    parse(strFromU8(relFile)).querySelectorAll('Relationship').forEach(r => {
      const id = r.getAttribute('Id'); let t = r.getAttribute('Target') ?? '';
      if (!id) return;
      t = t.replace(/^\//, '').replace(/^xl\//, '');
      rels.set(id, 'xl/' + t);
    });
  }

  const out: { name: string; path: string }[] = [];
  wb.querySelectorAll('sheets > sheet').forEach((sh, i) => {
    const name = sh.getAttribute('name') ?? `Sheet${i + 1}`;
    // r:id is namespaced; getAttribute with the prefix works across parsers
    const rid = sh.getAttribute('r:id') ?? sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const path = (rid && rels.get(rid)) || `xl/worksheets/sheet${i + 1}.xml`;
    if (zip[path]) out.push({ name, path });
  });
  return out;
}

function readSheet(xml: string, strings: string[], dated: Set<number>): CellValue[][] {
  const doc = parse(xml);
  const rows: CellValue[][] = [];
  const rowEls = doc.getElementsByTagName('row');

  for (let ri = 0; ri < rowEls.length; ri++) {
    const rowEl = rowEls[ri];
    // r is 1-based and may skip empty rows entirely
    const rIdx = Number(rowEl.getAttribute('r') || ri + 1) - 1;
    const cells: CellValue[] = [];
    const cEls = rowEl.getElementsByTagName('c');

    for (let ci = 0; ci < cEls.length; ci++) {
      const c = cEls[ci];
      const at = colIndex(c.getAttribute('r') ?? '');
      const idx = at >= 0 ? at : ci;
      const t = c.getAttribute('t');

      let v: CellValue = null;
      if (t === 'inlineStr') {
        const is = c.getElementsByTagName('t');
        let s = ''; for (let k = 0; k < is.length; k++) s += is[k].textContent ?? '';
        v = s;
      } else {
        const vEl = c.getElementsByTagName('v')[0];
        // An empty <v/> is a formula whose cached result was dropped by the
        // writing tool. It is NOT zero — Number('') is 0, which silently turned
        // blank computed cells into real-looking data.
        const rawText = vEl?.textContent ?? null;
        const raw = rawText != null && rawText !== '' ? rawText : null;
        if (raw != null) {
          if (t === 's') v = strings[Number(raw)] ?? '';
          else if (t === 'b') v = raw === '1';
          else if (t === 'e') v = null;                 // error cell (#N/A etc.)
          else if (t === 'str') v = raw;                // cached formula string
          else {
            const num = Number(raw);
            if (Number.isFinite(num)) {
              const style = Number(c.getAttribute('s') ?? -1);
              v = style >= 0 && dated.has(style) ? excelDate(num) : num;
            } else v = raw;
          }
        }
      }
      while (cells.length < idx) cells.push(null);
      cells[idx] = v;
    }
    while (rows.length < rIdx) rows.push([]);
    rows[rIdx] = cells;
  }
  return rows;
}

/** Read every sheet in an .xlsx. Throws a plain-language Error if the file
 *  isn't a workbook at all — the caller surfaces that to the user. */
export function readXlsx(buf: ArrayBuffer): SheetData[] {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(new Uint8Array(buf));
  } catch {
    throw new Error("That file isn't a readable .xlsx workbook.");
  }
  if (!zip['xl/workbook.xml']) {
    throw new Error("That file isn't an Excel workbook (no workbook part inside).");
  }
  const strings = sharedStrings(zip);
  const dated = dateStyles(zip);
  return sheetPaths(zip).map(({ name, path }) => ({
    name,
    rows: readSheet(strFromU8(zip[path]), strings, dated),
  }));
}
