/* THE SHEET'S XML, SCANNED AS IT STREAMS (docs/WORKBOOKS.md). A worksheet's XML arrives a window at a time; only the unfinished end of the
 * last window is carried over, every complete <row> is handed on with its cells (where it is, its type, its style, its value, its formula),
 * and nothing before or after the rows is lost — the columns' widths and hidden flags come before, the merged cells after. The shared strings
 * are read the same way. No DOM: a DOM of a 2 GB sheet would not fit. */

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
/** XML's escapes undone — named and numbered. */
export function unescapeXml(s: string): string {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e]));
}
/** Excel's own escape for characters XML cannot hold: _x000D_ and the like. */
const unX = (s: string): string => (s.indexOf('_x') < 0 ? s : s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))));

const attr = (tag: string, name: string): string | undefined => {
  const i = tag.indexOf(` ${name}="`);
  if (i < 0) return undefined;
  const s = i + name.length + 3;
  return tag.slice(s, tag.indexOf('"', s));
};

/** "BC7" → zero-based column 54 and row 7. */
export function cellRef(ref: string): { col: number; row: number } {
  let col = 0, i = 0;
  for (; i < ref.length; i += 1) { const c = ref.charCodeAt(i); if (c < 65 || c > 90) break; col = col * 26 + (c - 64); }
  return { col: col - 1, row: parseInt(ref.slice(i), 10) || 0 };
}
/** Zero-based column 54 → "BC". */
export function colName(n: number): string { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; }

export interface RawCell { col: number; t: string; s: number; v?: string; f?: string; hasF: boolean; text?: string }
export interface RawRow { row: number; cells: RawCell[] }

const CELL = /<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g;
const V = /<v>([\s\S]*?)<\/v>/;
const F = /<f\b[^>]*?(?:\/>|>([\s\S]*?)<\/f>)/;
const T = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;

function parseRow(xml: string, rowTag: string, next: number): RawRow {
  const r = attr(rowTag, 'r');
  const row = r ? parseInt(r, 10) : next;
  const cells: RawCell[] = [];
  let auto = 0;
  CELL.lastIndex = 0;
  for (let m = CELL.exec(xml); m; m = CELL.exec(xml)) {
    const tag = ` ${m[1]}`;
    const ref = attr(tag, 'r');
    const col = ref ? cellRef(ref).col : auto;
    auto = col + 1;
    const inner = m[3] ?? '';
    const t = attr(tag, 't') ?? 'n';
    const s = Number(attr(tag, 's') ?? 0) || 0;
    const fm = inner ? F.exec(inner) : null;
    const vm = inner ? V.exec(inner) : null;
    let text: string | undefined;
    if (t === 'inlineStr' && inner) { let x = ''; T.lastIndex = 0; for (let tm = T.exec(inner); tm; tm = T.exec(inner)) x += tm[1] ?? ''; text = unX(unescapeXml(x)); }
    cells.push({ col, t, s, ...(vm ? { v: unescapeXml(vm[1]) } : {}), ...(fm && fm[1] ? { f: unescapeXml(fm[1]) } : {}), hasF: !!fm, ...(text !== undefined ? { text } : {}) });
  }
  return { row, cells };
}

/** A worksheet scanned as it streams: `head` is everything before the rows (columns, hidden flags), `tail` after them (merged cells). */
export class SheetScanner {
  private buf = '';
  private inData = false;
  private done = false;
  private lastRow = 0;
  head = '';
  tail = '';
  constructor(private onRow: (r: RawRow) => void) {}
  feed(text: string): void {
    this.buf += text;
    if (!this.inData && !this.done) {
      const i = this.buf.indexOf('<sheetData');
      if (i < 0) { if (this.buf.length > 1 << 20) { this.head += this.buf.slice(0, -64); this.buf = this.buf.slice(-64); } return; }
      this.head += this.buf.slice(0, i);
      const close = this.buf.indexOf('>', i);
      if (close < 0) { this.buf = this.buf.slice(i); return; }
      if (this.buf[close - 1] === '/') { this.done = true; this.buf = this.buf.slice(close + 1); return; }
      this.inData = true;
      this.buf = this.buf.slice(close + 1);
    }
    if (this.done) { this.tail += this.buf; this.buf = ''; return; }
    let p = 0;
    /* the end of the rows is looked for once a window, never once a row — a 4 MB window holds tens of thousands of rows */
    const endData = this.buf.indexOf('</sheetData>');
    for (;;) {
      const rs = this.buf.indexOf('<row', p);
      if (endData >= 0 && (rs < 0 || endData < rs)) { this.inData = false; this.done = true; this.tail += this.buf.slice(endData + 12); this.buf = ''; return; }
      if (rs < 0) break;
      const tagEnd = this.buf.indexOf('>', rs);
      if (tagEnd < 0) break;
      const rowTag = this.buf.slice(rs + 4, tagEnd);
      if (this.buf[tagEnd - 1] === '/') { const r = attr(` ${rowTag}`, 'r'); this.lastRow = r ? parseInt(r, 10) : this.lastRow + 1; p = tagEnd + 1; continue; }
      const re = this.buf.indexOf('</row>', tagEnd);
      if (re < 0) break;
      const row = parseRow(this.buf.slice(tagEnd + 1, re), ` ${rowTag}`, this.lastRow + 1);
      this.lastRow = row.row;
      this.onRow(row);
      p = re + 6;
    }
    this.buf = this.buf.slice(p);
  }
  end(): void { if (this.buf) { if (this.done) this.tail += this.buf; this.buf = ''; } }
}

/** The shared strings, scanned as they stream: each <si> the joined text of its runs, phonetic guides left out. */
export class SharedStringsScanner {
  private buf = '';
  constructor(private onString: (s: string) => void) {}
  feed(text: string): void {
    this.buf += text;
    let p = 0;
    for (;;) {
      const s = this.buf.indexOf('<si', p);
      if (s < 0) break;
      const tagEnd = this.buf.indexOf('>', s);
      if (tagEnd < 0) break;
      if (this.buf[tagEnd - 1] === '/') { this.onString(''); p = tagEnd + 1; continue; }
      const e = this.buf.indexOf('</si>', tagEnd);
      if (e < 0) break;
      const inner = this.buf.slice(tagEnd + 1, e).replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
      let x = '';
      T.lastIndex = 0;
      for (let m = T.exec(inner); m; m = T.exec(inner)) x += m[1] ?? '';
      this.onString(unX(unescapeXml(x)));
      p = e + 5;
    }
    this.buf = this.buf.slice(p);
  }
}

/** Every <tag …> (or self-closing) in a small part, with its attributes. */
export function tagsOf(xml: string, tag: string): { attrs: (n: string) => string | undefined; inner: string }[] {
  const re = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'g');
  const out: { attrs: (n: string) => string | undefined; inner: string }[] = [];
  for (let m = re.exec(xml); m; m = re.exec(xml)) { const a = ` ${m[1]}`; out.push({ attrs: n => { const v = attr(a, n); return v === undefined ? undefined : unescapeXml(v); }, inner: m[2] ?? '' }); }
  return out;
}
