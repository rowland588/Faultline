/* WRITE A REAL .xlsx — enough of one for a person to open, read and build on.
 *
 * The app already reads workbooks (lib/xlsxRead) with fflate; this is the other
 * direction, for "Export to Excel". Kept to what that export needs and no more:
 * text, numbers and dates, a bold header row that stays put when you scroll,
 * a filter on every column, and widths that fit. Dates go in as real Excel
 * dates (serial numbers with a date format), so a formula in the workbook can
 * compare them with TODAY() — text that only LOOKS like a date would not.
 */
import { zipSync, strToU8 } from 'fflate';

/** A cell: text, a number, an ISO date (`{ date: '2026-09-24' }`) or empty. */
export type XCell = string | number | { date: string } | null | undefined;

export interface XSheet {
  name: string;
  rows: XCell[][];
  /** Column widths in characters. Missing ones are sized off the content. */
  widths?: number[];
  /** Freeze and filter the first row. Default true. */
  header?: boolean;
}

/* Control characters XML 1.0 cannot carry at all (a pasted tab or newline is
   fine; a stray form feed from a copied PDF is not) are dropped. */
const printable = (s: string) =>
  Array.from(s).filter(ch => { const c = ch.charCodeAt(0); return c >= 32 || c === 9 || c === 10 || c === 13; }).join('');
const esc = (s: string) =>
  printable(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function colName(i: number): string {
  let s = '';
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
}

/** Excel's day number for an ISO date: days since 30 Dec 1899. */
export function excelDate(iso: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return undefined;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86_400_000);
}

/* Styles: 0 plain, 1 bold header, 2 date, 3 wrapped text. */
const STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="d mmm yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EFEA"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cellXml(v: XCell, c: number, r: number, head: boolean): string {
  if (v == null || v === '') return '';
  const ref = `${colName(c)}${r + 1}`;
  if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
  if (typeof v === 'object') {
    const n = excelDate(v.date);
    return n == null ? '' : `<c r="${ref}" s="2"><v>${n}</v></c>`;
  }
  const s = head ? 1 : v.length > 60 ? 3 : 0;
  return `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

const textLen = (v: XCell): number =>
  v == null ? 0 : typeof v === 'number' ? String(v).length : typeof v === 'object' ? 11 : v.length;

function sheetXml(sh: XSheet): string {
  const header = sh.header !== false;
  const cols = Math.max(1, ...sh.rows.map(r => r.length));
  const widths = Array.from({ length: cols }, (_, c) => {
    const set = sh.widths?.[c];
    if (set) return set;
    const longest = Math.max(...sh.rows.map(r => textLen(r[c])));
    return Math.min(60, Math.max(10, longest + 2));
  });
  const colsXml = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
  const rows = sh.rows.map((row, r) => {
    const cells = row.map((v, c) => cellXml(v, c, r, header && r === 0)).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const last = `${colName(cols - 1)}${Math.max(1, sh.rows.length)}`;
  const view = header
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${view}${colsXml}<sheetData>${rows}</sheetData>${header && sh.rows.length > 0 ? `<autoFilter ref="A1:${last}"/>` : ''}</worksheet>`;
}

/** Excel refuses a sheet name over 31 characters or with []:*?/\ in it. */
const safeName = (n: string) => n.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);

export function writeXlsx(sheets: XSheet[]): Uint8Array {
  const names = sheets.map(s => safeName(s.name));
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${
  names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
}</sheets>${sheets.some(s => s.header !== false && s.rows.length > 0) ? `<definedNames>${
  sheets.map((s, i) => (s.header !== false && s.rows.length > 0
    ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(names[i] ?? '').replace(/'/g, "''")}'!$A$1:$${colName(Math.max(1, ...s.rows.map(r => r.length)) - 1)}$${s.rows.length}</definedName>`
    : '')).join('')
}</definedNames>` : ''}</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${
  names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
}<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(STYLES),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s)); });
  return zipSync(files);
}
