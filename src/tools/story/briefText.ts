/* THE BRIEF READ INTO WORDS — in code, in the browser (8 November, docs/STORY.md §7, S6).
 *
 * Rowland, 8 November: "if a brief is available to upload, allow a brief to be uploaded … If we can build it with code, of course,
 * build it with code." So a PDF is read by its text layer (pdf.js), a Word file by mammoth's raw text, a text or Markdown file as it
 * is — nothing sent anywhere. Only a picture, or a PDF with no text in it (a scan), cannot be read by rules: for those its pages are
 * drawn as small JPEGs (four at most) and OFFERED to the assistant (tools/story/briefAsk, task `brief-read`) — the consultant asks,
 * sees the words, and keeps them only if they are right. Both libraries load only when a file is uploaded, so the app's first load is
 * unchanged. */

export type BriefKind = 'pdf' | 'docx' | 'text' | 'image' | 'other';

/** What a file is, by its type and its name. */
export function briefKindOf(name: string, mime: string): BriefKind {
  const n = name.toLowerCase();
  if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || n.endsWith('.docx')) return 'docx';
  if (mime.startsWith('text/') || /\.(txt|md|markdown|text)$/.test(n)) return 'text';
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp|heic|gif)$/.test(n)) return 'image';
  return 'other';
}

/* a byte-order mark and a no-break space, written as escapes so no invisible letter sits in the source */
const BOM = new RegExp('^\\uFEFF');
const TRAIL = new RegExp('[ \\t\\u00A0]+\\n', 'g');

/** Words as a person would read them: no byte-order mark, one kind of line end, no runs of blank lines, no trailing spaces. Pure. */
export function plainText(raw: string): string {
  return raw.replace(BOM, '').replace(/\r\n?/g, '\n').replace(TRAIL, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** The words of a brief worth keeping — fewer than this and a PDF is taken to be a scan with no text layer. */
export const MIN_WORDS_CHARS = 20;
/** The most pages drawn for the assistant, and how large. */
export const BRIEF_PAGES = 4;
const EDGE = 1280;

export type BriefRead =
  | { ok: true; text: string; kind: BriefKind }
  /** No words in it to read by rules — the pages, drawn small, for the assistant to read if the consultant asks. */
  | { ok: false; pages: string[]; kind: BriefKind; why: string }
  | { ok: false; why: string; kind: BriefKind };

const jpegOf = (cv: HTMLCanvasElement): string => { const u = cv.toDataURL('image/jpeg', 0.75); return u.slice(u.indexOf(',') + 1); };

async function imagePages(blob: Blob): Promise<string[]> {
  const { shrinkBlob } = await import('../talk/talkPictures');
  const p = await shrinkBlob(blob, EDGE, 0.75);
  return p ? [p.dataUrl.slice(p.dataUrl.indexOf(',') + 1)] : [];
}

async function pdfOf(data: ArrayBuffer): Promise<{ text: string; pages: () => Promise<string[]> }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const parts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    let line = '';
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      line += it.str;
      if (it.hasEOL) { parts.push(line); line = ''; } else if (it.str && !/\s$/.test(it.str)) line += ' ';
    }
    if (line.trim()) parts.push(line);
    parts.push('');
  }
  return {
    text: plainText(parts.join('\n')),
    pages: async () => {
      const out: string[] = [];
      for (let n = 1; n <= Math.min(doc.numPages, BRIEF_PAGES); n++) {
        const page = await doc.getPage(n);
        const v1 = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, EDGE / Math.max(v1.width, v1.height)) });
        const cv = document.createElement('canvas');
        cv.width = Math.round(viewport.width); cv.height = Math.round(viewport.height);
        const g = cv.getContext('2d');
        if (!g) continue;
        g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext: g, viewport }).promise;
        out.push(jpegOf(cv));
      }
      return out;
    },
  };
}

/** READ A BRIEF — its words by rules, or its pages for the assistant when it has none. Never throws: what went wrong is said. */
export async function readBrief(file: Blob, name: string): Promise<BriefRead> {
  const kind = briefKindOf(name, file.type);
  try {
    if (kind === 'text') {
      const text = plainText(await file.text());
      return text ? { ok: true, text, kind } : { ok: false, why: 'The file has no words in it.', kind };
    }
    if (kind === 'docx') {
      const mammoth = await import('mammoth');
      const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      const text = plainText(r.value);
      return text ? { ok: true, text, kind } : { ok: false, why: 'The Word file has no words in it.', kind };
    }
    if (kind === 'pdf') {
      const pdf = await pdfOf(await file.arrayBuffer());
      if (pdf.text.replace(/\s/g, '').length >= MIN_WORDS_CHARS) return { ok: true, text: pdf.text, kind };
      const pages = await pdf.pages();
      return pages.length
        ? { ok: false, pages, kind, why: 'This PDF is a picture of the pages — there is no text in it to read by rules.' }
        : { ok: false, why: 'The PDF could not be drawn to read.', kind };
    }
    if (kind === 'image') {
      const pages = await imagePages(file);
      return pages.length ? { ok: false, pages, kind, why: 'A photo has no text in it to read by rules.' } : { ok: false, why: 'The picture could not be opened.', kind };
    }
    return { ok: false, why: 'Upload a PDF, a Word file (.docx), a text file or a photo.', kind };
  } catch {
    return { ok: false, why: kind === 'pdf' ? 'The PDF could not be read — it may be locked or damaged.' : kind === 'docx' ? 'The Word file could not be read — save it as .docx and try again.' : 'The file could not be read.', kind };
  }
}
