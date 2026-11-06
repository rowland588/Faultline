/* PICTURES, VIDEOS AND LINKS ON PAPER (docs/ATTACHMENTS.md — Rowland, 6 November: "ensure they are on the report; if video, create URL links").
 *
 * Under any tool's own blocks, only when it has some: each part's attachments under that part's name (a workstation's, a station's), the whole
 * record's first. A photo is printed whole with its caption. A video cannot be printed, so it is printed as what it is: its first frame, its name, and
 * a LINK — a real link in the PDF that opens the video in Faultline (the study's page with ?media=…; the reader signs in as they do for the record).
 * A link is printed as its address, also clickable. Pictures are read before the paper is poured (preloadAttachPictures) and kept for the sitting. */
import type { ToolStudy } from '../study';
import { attachName, attachmentsOf, hostOf, paperUrl, type Attachment } from '../attachments';
import { studyHref } from '../studyLinks';
import { studyCalc } from '../../tools/calc/calc';
import { shrinkPicture, type Picture } from '../../tools/talk/talkPictures';
import { INK2, MUTED, LINE, BRAND } from '../reportKit';
import { SIZE, box, font, gap, text, wrap } from './blocks';
import { leanHead } from './lean';
import { photo } from './docPaper';
import type { Block, Frame } from './flow';

const pics = new Map<string, Picture>();   // an attachment's id → its picture (a photo, or a video's first frame)

/** Read the pictures the studies' attachments will print, made small — before the paper is poured; whatever is not on this device prints its caption and says so. */
export async function preloadAttachPictures(studies: readonly Pick<ToolStudy, 'facts'>[]): Promise<void> {
  for (const s of studies) {
    for (const a of attachmentsOf(s)) {
      if (pics.has(a.id) || a.kind === 'link') continue;
      const key = a.kind === 'photo' ? a.blobKey : a.thumbKey;
      if (!key) continue;
      const p = await shrinkPicture(key, a.kind === 'photo' ? 900 : 480, 0.8).catch(() => undefined);
      if (p) pics.set(a.id, p);
    }
  }
}

/** What a part is called: a calculator's tile by its definition; the whole record has no name. */
export function partName(s: ToolStudy, target: string): string {
  if (!target) return '';
  const c = studyCalc(s);
  if (c?.def.tileTarget && c.def.tileName) {
    for (let i = 0; i < 60; i++) if (c.def.tileTarget(i) === target) return c.def.tileName(c.run.values, i);
  }
  return target;
}

const origin = (): string => (typeof location !== 'undefined' && location.origin ? location.origin : 'https://faultline.opexelevate.co.uk');

/** A web address on the page, in the brand colour, underlined, every line of it a real link. */
function addressBlock(kind: string, name: string, url: string, note: string): Block {
  const W = 52;
  const nameLines = (f: Frame) => wrap(f.doc, name, f.w - W, SIZE.body, 'bold');
  const urlLines = (f: Frame) => wrap(f.doc, url, f.w - W, SIZE.small);
  const noteLines = (f: Frame) => (note ? wrap(f.doc, note, f.w - W, SIZE.tiny) : []);
  return box(
    f => 6 + nameLines(f).length * 12.4 + urlLines(f).length * 11 + noteLines(f).length * 10 + 4,
    (f, y) => {
      const d = f.doc;
      d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(f.x, y, f.x + f.w, y);
      font(d, SIZE.tiny, 'bold', MUTED); d.text(kind, f.x, y + 14);
      let yy = y + 14;
      font(d, SIZE.body, 'bold', INK2); nameLines(f).forEach(l => { d.text(l, f.x + W, yy); yy += 12.4; });
      yy -= 2;
      font(d, SIZE.small, 'normal', BRAND);
      urlLines(f).forEach(l => {
        yy += 11;
        d.text(l, f.x + W, yy - 1);
        const w = d.getTextWidth(l);
        d.setDrawColor(BRAND); d.setLineWidth(0.4); d.line(f.x + W, yy + 0.5, f.x + W + w, yy + 0.5);
        d.link(f.x + W, yy - 9, w, 11, { url });
      });
      font(d, SIZE.tiny, 'normal', MUTED); noteLines(f).forEach(l => { yy += 10; d.text(l, f.x + W, yy); });
    },
    f => gap(f.density, 's'),
  );
}

function oneBlocks(s: ToolStudy, a: Attachment): Block[] {
  const name = attachName(a);
  const href = studyHref(s);
  if (a.kind === 'photo') return [photo(name, pics.get(a.id))];
  const url = paperUrl(origin(), href, a) ?? '';
  if (a.kind === 'video') {
    const poster = pics.get(a.id);
    return [...(poster ? [photo(`Video — first frame`, poster)] : []),
      addressBlock('VIDEO', name, url, 'Opens in Faultline — sign in to watch it. The paper cannot play it.')];
  }
  return [addressBlock('LINK', name, url, hostOf(url))];
}

/** Everything a study's attachments print, grouped by the part they are about — nothing when there are none. */
export function attachTail(s: ToolStudy): Block[] {
  const all = attachmentsOf(s);
  if (!all.length) return [];
  const targets = [...new Set(all.map(a => a.target ?? ''))];
  const order = (t: string) => (t === '' ? '' : partName(s, t));
  targets.sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
  const out: Block[] = [leanHead('Pictures, videos and links')];
  for (const t of targets) {
    const mine = all.filter(a => (a.target ?? '') === t);
    if (t) out.push(text({ text: order(t), size: SIZE.h2, style: 'bold', before: 4, after: 2 }));
    for (const a of mine) out.push(...oneBlocks(s, a));
  }
  return out;
}
