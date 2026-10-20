/* A LINE TALK DOCUMENT ON PAPER — the line-walk report, the summary, the
 * engineering report or the punch list Line Talk wrote and the person edited
 * (docs/LINE-TALK.md, What comes out), laid out by the report engine
 * (src/lib/report/, docs/REPORTS.md) in the house look: the light band with
 * what it is, where and when; each section's heading, its words and its
 * points — every point saying where it comes from (observed, a Faultline
 * record, or Line Talk's assessment), in words so it survives a black-and-
 * white print — and its photos whole, each with its label and caption. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, rows, text, wrap } from './report/blocks';
import { leanBand } from './report/lean';
import { bandPage } from './lean';
import { INK, INK2, LINE, MUTED } from './reportKit';
import { BASIS_WORD, DOC_KIND_WORD, type TalkBasis, type TalkDoc } from './talkAssist';
import type { Picture } from './talkPictures';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const TAG_W = 74;
/* where a point comes from — told apart by words and a shade of grey, never a state colour */
const TAG_FILL: Record<TalkBasis, string> = { observed: '#eef3f3', record: '#e3eced', interpretation: '#f6f7f7' };

export interface TalkDocPaper {
  doc: TalkDoc;
  /** The line it is about, when the talk is on one. */
  line?: string;
  /** Who it is from. */
  by?: string;
  /** The talk it was written from — "Line 7 — 21 Oct". */
  talk: string;
  printed: string;
  /** Each photo's picture by its label, made small (lib/talkPictures) — absent when not on this device. */
  photos: Map<string, Picture>;
  /** When each photo was taken, by its label — "21 Oct 10:45". */
  taken: Map<string, string>;
}

function point(p: TalkDoc['sections'][number]['points'][number]): Block {
  const meta = [p.owner ? `Owner: ${p.owner}` : '', p.due ? `Due: ${p.due}` : ''].filter(Boolean).join('   ');
  const lay = (f: Frame) => ({ t: wrap(f.doc, p.text, f.w - TAG_W - 10, SIZE.body), m: meta ? wrap(f.doc, meta, f.w - TAG_W - 10, SIZE.small, 'bold') : [] });
  return rows({
    rows: [{
      h: (f: Frame) => { const l = lay(f); return 7 + Math.max(1, l.t.length) * 12.4 + l.m.length * 11 + 3; },
      draw: (f: Frame, top: number) => {
        const l = lay(f), d = f.doc;
        d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(f.x, top, f.x + f.w, top);
        d.setFillColor(TAG_FILL[p.basis]); d.roundedRect(f.x, top + 4, TAG_W - 6, 12, 3, 3, 'F');
        font(d, SIZE.tiny, 'bold', INK2); d.text(BASIS_WORD[p.basis].toUpperCase(), f.x + 4, top + 12.4);
        font(d, SIZE.body, 'normal', INK); l.t.forEach((s, i) => d.text(s, f.x + TAG_W, top + 13 + i * 12.4));
        font(d, SIZE.small, 'bold', MUTED); l.m.forEach((s, i) => d.text(s, f.x + TAG_W, top + 13 + l.t.length * 12.4 + i * 11));
      },
    }],
    after: 's',
  });
}

/** A photo whole — as wide as the column, no taller than a third of a page — its label, when it was taken and its caption under it. */
function photo(label: string, caption: string, pic: Picture | undefined, taken?: string): Block {
  const MAXH = 290;
  const size = (f: Frame) => {
    if (!pic) return { w: f.w, h: 46 };
    const s = Math.min(f.w / pic.w, MAXH / pic.h);
    return { w: pic.w * s, h: pic.h * s };
  };
  const cap = (f: Frame) => wrap(f.doc, `${label}${taken ? ` · ${taken}` : ''}${caption ? ` — ${caption}` : ''}`, f.w, SIZE.small);
  return box(
    f => size(f).h + 6 + cap(f).length * 11 + gap(f.density, 'm'),
    (f, y) => {
      const d = f.doc, s = size(f);
      if (pic) {
        try { d.addImage(pic.dataUrl, 'JPEG', f.x, y, s.w, s.h, `talk-${label}`); } catch { /* an unreadable picture: its caption still prints */ }
        d.setDrawColor(LINE); d.setLineWidth(0.6); d.rect(f.x, y, s.w, s.h);
      } else {
        d.setFillColor('#f4f6f6'); d.rect(f.x, y, s.w, s.h, 'F');
        font(d, SIZE.small, 'normal', MUTED); d.text(`${label} — the picture is on another device and was not printed here.`, f.x + 10, y + 26);
      }
      font(d, SIZE.small, 'normal', INK2);
      cap(f).forEach((line, i) => d.text(line, f.x, y + s.h + 14 + i * 11));
    },
    f => gap(f.density, 'm'),
  );
}

function blocksOf(p: TalkDocPaper): Block[] {
  const out: Block[] = [];
  const page = bandPage(`${DOC_KIND_WORD[p.doc.kind]} · Line Talk`, { name: p.doc.title }, undefined, undefined,
    [['Line', p.line ?? 'Not on a line'], ...(p.by ? [['By', p.by] as [string, string]] : []), ['From', p.talk]]);
  out.push(leanBand(page, p.printed));
  out.push(text({ text: 'Each point says where it comes from: OBSERVED — said, typed or photographed on the line; FAULTLINE RECORD — Faultline’s own records, worked out by its formulas; ASSESSMENT — Line Talk’s reading, to be checked.', size: SIZE.small, colour: MUTED, after: 10 }));
  for (const s of p.doc.sections) {
    /* a long heading wraps, never cut (docs/REPORTS.md §2.1) */
    out.push(heading(s.heading || 'Section', undefined, { size: 12.5 }));
    for (const para of s.text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)) out.push(text({ text: para, size: SIZE.body, after: 7 }));
    for (const pt of s.points) out.push(point(pt));
    for (const ph of s.photos) out.push(photo(ph.photo, ph.caption, p.photos.get(ph.photo), p.taken.get(ph.photo)));
  }
  return out;
}

/** Draw the document into `doc`, page after page as it needs, each page footed with what it is. */
export async function drawTalkDoc(doc: jsPDF, p: TalkDocPaper): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, () => blocksOf(p));
  await pour({ ...base, density, dry: false }, blocksOf(p), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(wrap(doc, `${p.doc.title} — ${DOC_KIND_WORD[p.doc.kind].toLowerCase()} written with Line Talk from “${p.talk}”  ·  printed ${p.printed}`, CW - 50, 7.5)[0] ?? '', M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
