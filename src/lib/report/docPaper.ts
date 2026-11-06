/* A DOCUMENT ON PAPER — one generic page for every document (knowledge/specs/FC-240-documents.md, The report).
 *
 * Built from the SAME run the screen draws (tools/doc/doc studyDoc, the definition's read), never a second reading of it: the band with
 * the status, the tiles, the sentence (lib/studiesPdf prints it under "What it says"), then here — who agreed it and when, what else it
 * says and the checks, each section of the document with its boxes (a blank one shown as blank, so a draft prints as the form it is), the
 * lists as tables, the photos whole with their captions, the tables the definition worked out, how they were worked out, the money
 * or the sentence saying why there is none, and what it does not say. Laid out by the report engine (docs/REPORTS.md): every block
 * measures itself with the real font; nothing is cut and nothing is drawn by a hand-kept y. */
import type { LeanTile, LeanTone } from '../lean';
import type { ToolStudy } from '../study';
import { niceDay, isoDay } from '../weeks';
import { INK2, MUTED, LINE, WARN } from '../reportKit';
import { askedSections, cellText, isList, isPhotos, isScalar, rowsOf, studyDoc, valueSaid } from '../../tools/doc/doc';
import type { DocCtx, DocField } from '../../tools/doc/types';
import type { Picture } from '../../tools/talk/talkPictures';
import { SIZE, box, font, gap, label, rows, text, wrap, type Row } from './blocks';
import { leanHead } from './lean';
import { table } from './calcPaper';
import type { Block, Frame } from './flow';

/** What the paper needs that the record does not hold: the project's records and the photos made small (async, before the paper is poured). */
export interface DocPaperExtras { ctx: DocCtx; pictures: Map<string, Picture> }

export interface DocPaperParts {
  eyebrow: string;
  /** The one sentence the document says, printed under "What it says" — the reading's, with the project's records. */
  sentence: string;
  verdict: { text: string; tone: LeanTone };
  tiles: LeanTile[];
  closing: { text: string; tone: LeanTone };
  body: Block[];
}

const LH = 10.5;

/** Paragraphs wrapped inside a width: a line break in a long box is a new paragraph (the engine collapses breaks in a string). */
const paragraphs = (f: Frame, t: string, w: number, bold = false): string[] => t.split(/\n+/).flatMap(p => wrap(f.doc, p, w, 8.5, bold ? 'bold' : 'normal'));

/** The boxes of a section as label / value rows. */
function fieldRows(pairs: { label: string; value: string; blank: boolean }[]): Block {
  const LW = 0.3;
  const make = (p: { label: string; value: string; blank: boolean }): Row => ({
    h: f => Math.max(wrap(f.doc, p.label, f.w * LW - 8, 8, 'bold').length, paragraphs(f, p.value, f.w * (1 - LW) - 4).length, 1) * LH + 5,
    draw: (fr, y) => {
      const l = wrap(fr.doc, p.label, fr.w * LW - 8, 8, 'bold'), v = paragraphs(fr, p.value, fr.w * (1 - LW) - 4);
      font(fr.doc, 8, 'bold', MUTED); l.forEach((s, i) => fr.doc.text(s, fr.x, y + 8 + i * LH));
      font(fr.doc, 8.5, 'normal', p.blank ? MUTED : INK2); v.forEach((s, i) => fr.doc.text(s, fr.x + fr.w * LW, y + 8 + i * LH));
      const h = Math.max(l.length, v.length, 1) * LH + 3;
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h);
    },
  });
  return rows({ rows: pairs.map(make), after: 's' });
}

/** A photo whole — as wide as the column and no taller than a third of a page — its caption under it. */
export function photo(caption: string, pic: Picture | undefined): Block {
  const MAXH = 250;
  const size = (f: Frame) => (pic ? (() => { const s = Math.min(f.w / pic.w, MAXH / pic.h, 1.4); return { w: pic.w * s, h: pic.h * s }; })() : { w: f.w, h: 40 });
  const cap = (f: Frame) => wrap(f.doc, caption, f.w, SIZE.small);
  return box(
    f => size(f).h + 6 + cap(f).length * 11 + gap(f.density, 'm'),
    (f, y) => {
      const d = f.doc, s = size(f);
      if (pic) {
        try { d.addImage(pic.dataUrl, 'JPEG', f.x, y, s.w, s.h, `doc-${caption.slice(0, 12)}`); } catch { /* an unreadable picture: its caption still prints */ }
        d.setDrawColor(LINE); d.setLineWidth(0.6); d.rect(f.x, y, s.w, s.h);
      } else {
        d.setFillColor('#f4f6f6'); d.rect(f.x, y, s.w, s.h, 'F');
        font(d, SIZE.small, 'normal', MUTED); d.text('The picture is on another device and was not printed here.', f.x + 10, y + 24);
      }
      font(d, SIZE.small, 'normal', INK2);
      cap(f).forEach((line, i) => d.text(line, f.x, y + s.h + 14 + i * 11));
    },
    f => gap(f.density, 'm'),
  );
}

/** Everything a document prints, from its record — undefined when its definition is not in this build. */
export function docPaperParts(s: ToolStudy, extras?: DocPaperExtras): DocPaperParts | undefined {
  const ctx: DocCtx = extras?.ctx ?? { today: isoDay(Date.now()) };
  const run = studyDoc(s, ctx);
  if (!run) return undefined;
  const { def, values, result } = run;
  const out: Block[] = [];

  /* who agreed it, or why it is not agreed yet */
  out.push(text({
    text: run.signed ? `${def.signoff?.word ?? 'Agreed'} by ${run.signed.by} on ${niceDay(isoDay(run.signed.at), { year: true })}.`
      : run.need.length ? `${def.signoff ? 'A draft' : 'In progress'} — still to fill in: ${run.need.join('; ')}.`
        : `Everything needed is filled in${def.signoff ? ` — waiting for ${def.signoff.by} to ${def.signoff.ask.charAt(0).toLowerCase()}${def.signoff.ask.slice(1)}` : ''}.`,
    size: 9, style: 'bold', colour: run.signed || !run.need.length ? INK2 : WARN, after: 4,
  }));

  const more = [...(result.more ?? []), ...run.problems.map(p => `Check: ${p.say}`)];
  if (more.length) { out.push(label('What else it says')); for (const m of more) out.push(text({ text: m, size: 8.5, colour: m.startsWith('Check:') ? WARN : INK2, after: 2 })); }

  /* the boxes, section by section — a blank one printed as blank */
  for (const sec of askedSections(def, values)) {
    out.push(leanHead(sec.title));
    let pending: { label: string; value: string; blank: boolean }[] = [];
    const flush = () => { if (pending.length) { out.push(fieldRows(pending)); pending = []; } };
    for (const it of sec.items) {
      if (isScalar(it)) {
        const x = values[it.id] as string | number | undefined;
        pending.push({ label: it.label, value: x === undefined ? (it.required ? '— still needed' : '—') : valueSaid(it as DocField, x), blank: x === undefined });
      } else if (isList(it)) {
        flush();
        const rs = rowsOf(values, it.id);
        out.push(text({ text: it.label, size: 8, style: 'bold', colour: MUTED, after: 2 }));
        if (rs.length) out.push(table(['#', ...it.columns.map(c => c.label)], rs.map((r, i) => [String(i + 1), ...it.columns.map(c => (r.c[c.id] === undefined ? '—' : valueSaid(c, r.c[c.id])))]), [0.06, ...it.columns.map(() => 0.94 / it.columns.length)]));
        else out.push(text({ text: it.required ? `No ${it.rowWord}s yet — still needed.` : `No ${it.rowWord}s.`, size: 8.5, colour: MUTED, after: 4 }));
      } else if (isPhotos(it)) {
        flush();
        const ps = run.photos.filter(p => p.field === it.id);
        out.push(text({ text: it.label, size: 8, style: 'bold', colour: MUTED, after: 2 }));
        if (ps.length) ps.forEach((p, i) => out.push(photo(`Photo ${i + 1}${p.caption ? ` — ${p.caption}` : ''}${p.at ? ` · ${niceDay(isoDay(p.at), { year: true })}` : ''}`, extras?.pictures.get(p.blobKey))));
        else out.push(text({ text: it.required ? 'No photos yet — still needed.' : 'No photos.', size: 8.5, colour: MUTED, after: 4 }));
      }
    }
    flush();
  }

  for (const t of result.tables ?? []) {
    out.push(leanHead(t.title));
    if (t.note) out.push(text({ text: t.note, size: 8, colour: MUTED, after: 3 }));
    out.push(table(t.head, t.rows, t.shares ?? t.head.map(() => 1 / t.head.length)));
  }

  if ((result.working ?? []).length) {
    out.push(leanHead('How it is worked out'));
    out.push(table(['Step', 'Working', 'Method'], (result.working ?? []).map(w => [w.label, w.value, w.note ?? '']), [0.24, 0.52, 0.24]));
  }

  out.push(leanHead('In money'));
  if (result.money.text) out.push(text({ text: result.money.text, size: 9, style: 'bold', colour: INK2, after: 3 }));
  if (result.money.figures?.length) out.push(table(['Figure', 'Value'], result.money.figures, [0.62, 0.38]));
  if (result.money.none) out.push(text({ text: result.money.none, size: 8.5, colour: INK2, after: 2 }));
  for (const m of result.money.missing) out.push(text({ text: m, size: 8, colour: MUTED, after: 2 }));

  out.push(leanHead('What this does not say'));
  for (const c of result.caveats) out.push(text({ text: c, size: 8.5, colour: INK2, indent: 10, bullet: '·', after: 2 }));

  return {
    eyebrow: def.title,
    sentence: result.sentence || (run.need.length ? `Not yet said — still to fill in: ${run.need.slice(0, 4).join(', ')}${run.need.length > 4 ? ` and ${run.need.length - 4} more` : ''}.` : def.question),
    verdict: { text: run.status.word, tone: run.status.tone },
    tiles: run.tiles,
    closing: { text: result.closing, tone: result.tone === 'r' || result.tone === 'a' ? result.tone : run.status.tone },
    body: out,
  };
}

void cellText;
