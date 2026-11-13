/* A PDF'S WORDS, PAGE BY PAGE, ON THE DEVICE (13 November, docs/ASSET-DOCUMENTS.md) — no AI and nothing sent anywhere: pdf.js reads the
 * text layer and each page comes back as its lines, in reading order, so a rule or a search can say which PAGE a thing is on. A page with
 * no text layer (a scan, a drawing) comes back empty and is counted, never guessed at. */
export interface PdfPages { pages: string[]; pageCount: number; /** Pages with no words in them — scans or drawings. */ blank: number; capped: boolean }

/** The most text kept from one manual — about 600 pages of prose; past it the manual is said to be cut short. */
export const MANUAL_CHARS = 1_500_000;

export async function pdfPageTexts(data: ArrayBuffer): Promise<PdfPages> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];
  let blank = 0, kept = 0, capped = false;
  for (let n = 1; n <= doc.numPages; n++) {
    if (kept >= MANUAL_CHARS) { capped = true; break; }
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    const lines: string[] = [];
    let line = '';
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      line += it.str;
      if (it.hasEOL) { lines.push(line.replace(/[ \t]+/g, ' ').trim()); line = ''; } else if (it.str && !/\s$/.test(it.str)) line += ' ';
    }
    if (line.trim()) lines.push(line.replace(/[ \t]+/g, ' ').trim());
    const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (text.replace(/\s/g, '').length < 8) blank++;
    kept += text.length;
    pages.push(text);
  }
  return { pages, pageCount: doc.numPages, blank, capped };
}
