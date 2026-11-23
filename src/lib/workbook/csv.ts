/* A CSV OR TSV READ AS ONE SHEET — through the same workbook reader as an .xlsx (docs/LUNA-ANALYSIS.md A9). */
import { zipSync, strToU8 } from 'fflate';
import { csvCells } from '../../colleague/factoryRegister';
import type { ByteSource } from './zip';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = (i: number): string => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

export function isTabularName(name: string): boolean {
  return /\.(csv|tsv|txt)$/i.test(name);
}

export function parseTabular(text: string): { rows: string[][]; sep: string } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim());
  if (!lines.length) throw new Error('The file is empty.');
  const pick = (l: string) => (['\t', ',', ';'] as const).map(s => ({ s, n: csvCells(l, s).length })).sort((a, b) => b.n - a.n)[0];
  const sep = pick(lines[0]).s;
  if (pick(lines[0]).n < 2) throw new Error('A comma-, semicolon- or tab-separated table is needed — one header row and at least two columns.');
  return { rows: lines.map(l => csvCells(l, sep)), sep };
}

const cell = (r: number, c: number, v: string): string => {
  const ref = `${col(c)}${r}`;
  const n = Number(v);
  if (v !== '' && Number.isFinite(n) && String(n) === v.trim()) return `<c r="${ref}"><v>${n}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
};

/** Minimal .xlsx bytes from a parsed table — one sheet, first row the header. */
export function tabularToXlsx(rows: string[][], sheetName: string): Uint8Array {
  const safe = sheetName.replace(/[^\w .-]/g, '').slice(0, 31) || 'Data';
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, i) => `<row r="${i + 1}">${row.map((v, c) => cell(i + 1, c, v)).join('')}</row>`).join('')}</sheetData></worksheet>`;
  const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files: Record<string, string> = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets><sheet name="${esc(safe)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': sheetXml,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

export async function tabularBytesFrom(src: ByteSource, name: string): Promise<Uint8Array> {
  const raw = await src.read(0, src.size);
  const { rows } = parseTabular(new TextDecoder().decode(raw));
  const sheet = name.replace(/\.[^.]+$/, '') || 'Data';
  return tabularToXlsx(rows, sheet);
}