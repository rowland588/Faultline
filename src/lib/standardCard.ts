/* THE LINE STANDARD CARD — one product, one A4 sheet, to put up at the line.
 *
 * Rowland: "line standard print doesn't work and I can't see the print format.
 * I want a beautiful card for any line standard."
 *
 * The card is drawn ONCE, as a picture, and that picture is both the preview on
 * the screen and the page in the PDF — so what is looked at before printing is
 * exactly what comes out, on a phone as much as a desk.
 *
 *   ┌───────────────────────────────────────────── navy band ─┐
 *   │ LINE STANDARD                                    ( 6  ) │
 *   │ Maris Piper 2kg — Tall                           PEOPLE │
 *   │ Line 2 B commissioning · printed 1 Oct 2026             │
 *   ├──────────────────────────────────┬──────────────────────┤
 *   │                                  │ WHO DOES WHAT        │
 *   │   the line, with everybody and   │ ① Op 1  Load film…   │
 *   │   everything placed on it        │ ② Op 2  Check the…   │
 *   │                                  │ AT THE LINE          │
 *   │                                  │ ▣ 2 pallets ◍ 1 bin  │
 *   ├──────────────────────────────────┴──────────────────────┤
 *   │ Agreed by ____________  Date ______          Faultline  │
 *   └─────────────────────────────────────────────────────────┘ */
import { getBlob } from '../db';
import { analyse } from '../tools/linebalance/capacity';
import { shortSays } from '../tools/linebalance/capacitySays';
import { BOARDS, boardOf, bottlenecksOf, colourOf, dashOf, FADED_ALPHA, firstPara, headcount, isShape, labelModeHere, manyOf, mapLabel, markOf, MARKS, peopleOf, TONES, weightOf, wordsUp, type Standard, type StandardMark } from './standard';

/** A4 landscape at 150 dpi: sharp on paper, light enough for a phone. */
export const CARD_W = 1754, CARD_H = 1240;
const M = 64;
const NAVY = '#12171c', BLUE = '#0c7489', BAND_FILL = '#eef3f3', INK = '#0f1417', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', SOFT = '#f2f5f5';
/* The app's own face, as on every screen and every other PDF; the system
   faces only if it has not loaded. */
const FONT = '"Instrument Sans Variable", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

async function photoOf(key?: string): Promise<HTMLImageElement | null> {
  if (!key) return null;
  try {
    const blob = await getBlob(key);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('decode failed'));
        i.src = url;
      });
    } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  } catch { return null; }
}

/** A rounded rectangle, drawn by hand — not every phone's canvas has roundRect. */
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Words into lines that fit, at most `max` of them; the last ends in … if cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= width || !cur) cur = next;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > max) {
    const kept = out.slice(0, max);
    let last = kept[max - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    kept[max - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return out;
}

/** Words into at most `max` lines; when they do not all fit, the last line
 *  ends "… (notes, 4)" — where they are printed whole. Never cut silently. */
function wrapRef(ctx: CanvasRenderingContext2D, text: string, width: number, max: number, ref: string, more = false): { lines: string[]; cut: boolean } {
  const all = wrap(ctx, text, width, 10_000);
  const tail = ` (notes, ${ref})`;
  if (all.length <= max) {
    if (!more) return { lines: all, cut: false };
    /* all of it fits, and there is more on the notes: said at its end, or on a line of its own */
    const last = all[all.length - 1];
    if (ctx.measureText(`${last}${tail}`).width <= width) return { lines: [...all.slice(0, -1), `${last}${tail}`], cut: true };
    if (all.length < max) return { lines: [...all, tail.trim()], cut: true };
  }
  const kept = all.slice(0, max);
  let last = kept[max - 1];
  while (last.length > 1 && ctx.measureText(`${last}…${tail}`).width > width) last = last.slice(0, -1);
  kept[max - 1] = `${last.trimEnd()}…${tail}`;
  return { lines: kept, cut: true };
}

/** One icon: a white-ringed disc in the kind's colour — or the person's own
 *  (lib/standard colourOf), the same as on the board — its glyph in white. */
export function drawIcon(ctx: CanvasRenderingContext2D, kind: StandardMark['kind'], cx: number, cy: number, r: number, colour?: string) {
  const k = markOf(kind);
  ctx.save();
  ctx.shadowColor = 'rgba(18,23,28,0.28)'; ctx.shadowBlur = r * 0.5; ctx.shadowOffsetY = r * 0.12;
  ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(2, r * 0.12), 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = colour ?? k.colour; ctx.fill();
  ctx.save();
  const g = r * 1.3;
  ctx.translate(cx - g / 2, cy - g / 2); ctx.scale(g / 24, g / 24);
  ctx.fillStyle = '#ffffff'; ctx.fill(new Path2D(k.glyph), k.rule ?? 'evenodd');
  ctx.restore();
}

/** Where a box sits on the card — for a label to keep clear of what is already drawn. */
interface Box { x: number; y: number; w: number; h: number }
const hits = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A pill's box, before it is drawn. */
function pillBox(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, size: number): Box {
  ctx.font = `700 ${size}px ${FONT}`;
  const h = size * 1.5, w = ctx.measureText(text).width + size * 1.1;
  return { x: cx - w / 2, y: top, w, h };
}

function pillLabel(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, size: number) {
  ctx.font = `700 ${size}px ${FONT}`;
  const tw = ctx.measureText(text).width, h = size * 1.5, w = tw + size * 1.1;
  ctx.fillStyle = 'rgba(15,20,23,0.9)';
  round(ctx, cx - w / 2, top, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, top + h / 2 + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/** THE BOTTLENECK, in words — an ink tag, never a state colour (the map
 *  says it as the screen does). `left` places it from its left edge; else it
 *  is centred on `cx`. */
function bnTag(ctx: CanvasRenderingContext2D, cx: number, top: number, size: number, left?: boolean): Box {
  ctx.font = `800 ${size}px ${FONT}`;
  const text = 'BOTTLENECK', tw = ctx.measureText(text).width, h = size * 1.55, w = tw + size * 1.1;
  const x = left ? cx : cx - w / 2;
  ctx.fillStyle = '#0f1417'; round(ctx, x, top, w, h, 4); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + size * 0.55, top + h / 2 + 1); ctx.textBaseline = 'alphabetic';
  return { x, y: top, w, h };
}
/** The tag's size, before it is drawn. */
function bnTagSize(ctx: CanvasRenderingContext2D, size: number): { w: number; h: number } {
  ctx.font = `800 ${size}px ${FONT}`;
  return { w: ctx.measureText('BOTTLENECK').width + size * 1.1, h: size * 1.55 };
}

/** A shape on the map: the same geometry the editor draws, its words in the middle. */
function drawShape(ctx: CanvasRenderingContext2D, m: StandardMark, ix: number, iy: number, iw: number, ih: number): boolean {
  const t = TONES[m.tone ?? (m.shape === 'text' ? 'grey' : 'blue')];
  const cx = ix + (m.x / 100) * iw, cy = iy + (m.y / 100) * ih;
  const w = ((m.w ?? 10) / 100) * iw, h = ((m.h ?? 10) / 100) * ih;
  const lw = Math.max(2, iw * 0.0028);
  ctx.save();
  if (m.shape === 'arrow') {
    const x2 = cx + w, y2 = cy + h, ang = Math.atan2(h, w), head = Math.max(14, iw * 0.016);
    ctx.strokeStyle = t.stroke; ctx.fillStyle = t.stroke; ctx.lineWidth = lw * 1.6 * weightOf(m.line); ctx.lineCap = 'round';
    ctx.setLineDash(dashOf(m.line, lw * 1.6 * weightOf(m.line)));
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
    ctx.setLineDash([]); ctx.closePath(); ctx.fill();
    ctx.restore();
    return false;
  }
  const x = cx - w / 2, y = cy - h / 2;
  ctx.beginPath();
  if (m.shape === 'circle') ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
  else if (m.shape === 'triangle') { ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }
  else { round(ctx, x, y, w, h, Math.min(10, w * 0.06)); }
  if (m.shape !== 'text') {
    /* its fill — light (the colour's wash), faded (the colour, the picture seen through) or none — and its line */
    if (m.fill !== 'none') {
      ctx.save();
      if (m.fill === 'faded') { ctx.globalAlpha = FADED_ALPHA; ctx.fillStyle = t.stroke; } else ctx.fillStyle = t.fill;
      ctx.fill(); ctx.restore();
    }
    const lwi = lw * weightOf(m.line) * (m.bottleneck ? 1.6 : 1);
    ctx.strokeStyle = t.stroke; ctx.lineWidth = lwi; ctx.setLineDash(dashOf(m.line, lwi)); ctx.stroke(); ctx.setLineDash([]);
  }
  let cut = false;
  if (m.label?.trim()) {
    const up = wordsUp(m, w, h, iw * 0.017);
    /* written up a tall shape: its length is the line, its width the room for lines */
    const along = up ? Math.abs(h) : Math.abs(w), across = up ? Math.abs(w) : Math.abs(h);
    const size = Math.max(14, Math.min(iw * 0.017, across * 0.34));   /* the screen's: the board's width × 0.017 */
    ctx.font = `800 ${size}px ${FONT}`; ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const inner = m.shape === 'triangle' ? along * 0.55 : m.shape === 'circle' ? along * 0.72 : along - 12;
    const lh = size * 1.15, room = Math.max(1, Math.floor((across - 6) / lh));
    const all = m.label.split('\n').flatMap(part => wrap(ctx, part, Math.max(30, inner), 10_000));
    const max = Math.max(1, Math.min(4, room));
    let lines = all;
    if (all.length > max) { cut = true; lines = all.slice(0, max); let last = lines[max - 1]; while (last.length > 1 && ctx.measureText(`${last}…`).width > Math.max(30, inner)) last = last.slice(0, -1); lines[max - 1] = `${last.trimEnd()}…`; }
    ctx.translate(cx, m.shape === 'triangle' && !up ? cy + h * 0.18 : cy);
    if (up) ctx.rotate(-Math.PI / 2);
    const ty0 = -((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, 0, ty0 + i * lh));
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
  return cut;
}

/** Where a shape's words sit — for a person's name to keep clear of them
 *  (never of the shape itself: people stand inside areas). */
function shapeWordsBox(ctx: CanvasRenderingContext2D, m: StandardMark, ix: number, iy: number, iw: number, ih: number): Box | undefined {
  if (!m.label?.trim() || m.shape === 'arrow') return undefined;
  const cx = ix + (m.x / 100) * iw, cy = iy + (m.y / 100) * ih;
  const w = ((m.w ?? 10) / 100) * iw, h = ((m.h ?? 10) / 100) * ih;
  const up = wordsUp(m, w, h, iw * 0.017);
  const along = up ? Math.abs(h) : Math.abs(w), across = up ? Math.abs(w) : Math.abs(h);
  const size = Math.max(14, Math.min(iw * 0.017, across * 0.34));
  ctx.font = `800 ${size}px ${FONT}`;
  const inner = m.shape === 'triangle' ? along * 0.55 : m.shape === 'circle' ? along * 0.72 : along - 12;
  const room = Math.max(1, Math.min(4, Math.floor((across - 6) / (size * 1.15))));
  const lines = m.label.split('\n').flatMap(part => wrap(ctx, part, Math.max(30, inner), 3)).slice(0, room);
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width)), th = lines.length * size * 1.15;
  const my = m.shape === 'triangle' && !up ? cy + h * 0.18 : cy;
  return up ? { x: cx - th / 2 - 2, y: my - tw / 2 - 4, w: th + 4, h: tw + 8 } : { x: cx - tw / 2 - 4, y: my - th / 2 - 2, w: tw + 8, h: th + 4 };
}

/** The whole card, as a canvas. */
/** THE WORK, TIMED (ui/WorkBalance workOf): each person's work against takt,
 *  and its sentence — printed beside each person and in the footer. */
export interface CardWork { taktSec: number; people: { who: string; work: number; over: boolean; untimed?: boolean; takt?: number; piece?: string }[]; text: string; short?: string }

/** `shift`: capacity a shift, short (ui/ShiftCapacity shiftShortsFor) — "32,400 bags a shift — 126 of 450 min changing over". */
/** WORDS PRINTED WHOLE (Rowland, 15 October: "I've done bottleneck and
 *  there's a large amount of context in there, but when I print it, the
 *  context is not there ... if we have to put the context onto another page,
 *  so it becomes a two-pager, then that should be fine"). Anything the card
 *  has to cut — what a person does, an area's words, the note — is marked
 *  "(notes, 4)" where it is cut, and printed in full on the notes page after
 *  the card, under the same number as on the map. */
export interface CardNote { ref: string; title: string; text: string; colour: string; bottleneck?: boolean; person?: boolean }

export async function renderCard(s: Standard, projectName: string, printed: string, work?: CardWork, shift?: string): Promise<HTMLCanvasElement> {
  return (await renderCardWithNotes(s, projectName, printed, work, shift)).canvas;
}

async function renderCardWithNotes(s: Standard, projectName: string, printed: string, work?: CardWork, shift?: string): Promise<{ canvas: HTMLCanvasElement; notes: CardNote[] }> {
  const notes: CardNote[] = [];
  /* The photo first: nothing below waits on anything once drawing starts. A
     canvas draws in whatever face is loaded at that instant, so the app's own
     is asked for first — or the card came out in the system face. */
  await Promise.all(['500', '700', '800'].map(w => document.fonts?.load(`${w} 20px "Instrument Sans Variable"`))).catch(() => undefined);
  const img = await photoOf(s.photoKey);
  const cv = document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CARD_W, CARD_H);

  /* ---------------- the band ----------------
     LIGHT ON PAPER (reportKit BAND): the card is printed and pinned at the
     line, so its band is a pale fill with the brand's teal along its foot
     and graphite words, not a slab of toner (Rowland, 17 October). */
  const bandH = 236;
  ctx.fillStyle = BAND_FILL; ctx.fillRect(0, 0, CARD_W, bandH);
  ctx.fillStyle = BLUE; ctx.fillRect(0, bandH - 8, CARD_W, 8);

  ctx.fillStyle = BLUE; ctx.font = `800 24px ${FONT}`;
  ctx.fillText('L I N E   S T A N D A R D', M, 70);
  ctx.fillStyle = INK; ctx.font = `800 60px ${FONT}`;
  const title = wrap(ctx, s.product || 'Untitled product', CARD_W - 2 * M - 300, 2);
  title.forEach((l, i) => ctx.fillText(l, M, 138 + i * 64));
  ctx.fillStyle = MUTED; ctx.font = `500 26px ${FONT}`;
  ctx.fillText(`${projectName}   ·   printed ${printed}`, M, title.length > 1 ? 222 : 190);

  // the headcount — the number a supervisor reads first
  const n = headcount(s);
  const bx = CARD_W - M - 104, by = bandH / 2;
  ctx.beginPath(); ctx.arc(bx, by, 96, 0, Math.PI * 2); ctx.fillStyle = 'rgba(12,116,137,0.14)'; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, 82, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.fillStyle = NAVY; ctx.textAlign = 'center';
  ctx.font = `800 ${n > 99 ? 54 : 70}px ${FONT}`; ctx.fillText(String(n), bx, by + 14);
  ctx.fillStyle = MUTED; ctx.font = `800 17px ${FONT}`; ctx.fillText(n === 1 ? 'PERSON' : 'PEOPLE', bx, by + 46);
  ctx.textAlign = 'left';

  /* LINE CAPACITY for this product (lib/capacity), when it has one: where
     the line is limited — beside the sign-off, so the card at the line says
     who stands where AND what holds the line back; what it makes once its
     breaks and changeovers come off (capacity a shift), on a line of its
     own; and the work, timed, when it has been. Three facts take the foot a
     line deeper — never one cut short at "…". */
  const capR = s.capacity?.stations.length ? analyse(s.capacity) : undefined;
  const said = [
    !capR ? '' : shift ? shortSays(capR) ?? capR.sentence : capR.sentence,
    capR && shift ? `Makes ${shift}` : '',
    work ? `Work: ${work.short ?? work.text}` : '',
  ].filter(Boolean);

  /* ---------------- the map ----------------
     THE MAP IS ITS BOARD'S SHAPE (Rowland, 13 October: "i pick square it
     then clusters everything up, or tall, it does the same, it's only set
     for wide"). The frame is the board's own shape — wide, square, tall or
     the photo's — as tall as the page allows; Who does what takes the room
     left beside it (two columns of people beside a tall board), so nothing
     is squeezed into the middle of a frame drawn for wide. */
  const top = bandH + 40, footH = said.length > 2 ? 136 : 112, gap = 36;
  const mapH = CARD_H - top - footH - 28;
  const shape = img ? { w: img.width, h: img.height } : BOARDS[boardOf(s)];
  const mapX = M, mapW = Math.min(CARD_W - 2 * M - 520 - gap, Math.round(mapH * shape.w / shape.h));
  const sideW = CARD_W - 2 * M - mapW - gap;
  ctx.save();
  ctx.shadowColor = 'rgba(18,23,28,0.16)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
  round(ctx, mapX, top, mapW, mapH, 22); ctx.fillStyle = SOFT; ctx.fill();
  ctx.restore();
  ctx.save();
  round(ctx, mapX, top, mapW, mapH, 22); ctx.clip();
  let ix = mapX, iy = top, iw = mapW, ih = mapH;
  if (img) {
    const k = Math.min(mapW / img.width, mapH / img.height);
    iw = img.width * k; ih = img.height * k; ix = mapX + (mapW - iw) / 2; iy = top + (mapH - ih) / 2;
    ctx.drawImage(img, ix, iy, iw, ih);
  } else {
    /* The plain board is the shape it is on the screen — wide, square or
       tall (lib/standard BOARDS) — so a square drawn there is a square here. */
    const b = BOARDS[boardOf(s)];
    const k = Math.min(mapW / b.w, mapH / b.h);
    iw = b.w * k; ih = b.h * k; ix = mapX + (mapW - iw) / 2; iy = top + (mapH - ih) / 2;
    ctx.fillStyle = '#f7f9fc'; ctx.fillRect(ix, iy, iw, ih);
    ctx.strokeStyle = '#e1e7e7'; ctx.lineWidth = 1;
    for (let x = ix; x < ix + iw; x += 40) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke(); }
    for (let y = iy; y < iy + ih; y += 40) { ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); }
  }
  // shapes first — everything placed stands on them; an area whose words
  // are cut carries a letter, and its words are on the notes page
  const cutShapes: StandardMark[] = [];
  for (const m of s.marks) if (isShape(m) && drawShape(ctx, m, ix, iy, iw, ih)) cutShapes.push(m);
  cutShapes.forEach((m, i) => {
    const ref = String.fromCharCode(65 + (i % 26));
    const w = ((m.w ?? 10) / 100) * iw, h = ((m.h ?? 10) / 100) * ih;
    const bx = ix + (m.x / 100) * iw + Math.abs(w) / 2, by = iy + (m.y / 100) * ih - Math.abs(h) / 2, rr = 14;
    ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fillStyle = TONES[m.tone ?? 'grey'].stroke; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ref, bx, by + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    notes.push({ ref, title: firstPara(m.label ?? '').slice(0, 60) || 'An area', text: (m.label ?? '').trim(), colour: TONES[m.tone ?? 'grey'].stroke, ...(m.bottleneck ? { bottleneck: true } : {}) });
  });
  /* THE MARKS AS THE SCREEN DRAWS THEM (Rowland, 13 October: "everything's
     still merged together"). The screen draws a person 14 px across the
     middle and their name in 12 px type on a board about 1,000 px wide; the
     card drew them half as big again against the same board, so neighbours
     ran into each other on paper and not on the screen. Now the same share
     of the board, never below what reads on paper. */
  const r = Math.max(15, iw * 0.0155), pillPx = Math.max(13, Math.round(iw * 0.0125)), tagPx = Math.max(11, Math.round(iw * 0.0105));
  const people = peopleOf(s), labels = labelModeHere();
  const inBoard = (b: Box) => b.x >= ix + 2 && b.x + b.w <= ix + iw - 2 && b.y >= iy + 2 && b.y + b.h <= iy + ih - 2;
  /* What is drawn already, for each name to keep clear of: every mark, and
     every BOTTLENECK tag. An area's tag sits on its top edge, outside it —
     never on top of the area's own name — or under it at the board's top. */
  const taken: Box[] = [];
  const icons = s.marks.filter(m => !isShape(m)).map(m => ({ m, cx: ix + (m.x / 100) * iw, cy: iy + (m.y / 100) * ih }));
  for (const { cx, cy } of icons) taken.push({ x: cx - r - 4, y: cy - r - 4, w: 2 * r + 8, h: 2 * r + 8 });
  for (const m of s.marks) { const b = isShape(m) ? shapeWordsBox(ctx, m, ix, iy, iw, ih) : undefined; if (b) taken.push(b); }
  const tag = bnTagSize(ctx, tagPx);
  const tags: { box: Box; draw: () => void }[] = [];
  for (const m of s.marks.filter(x => isShape(x) && x.bottleneck && x.shape !== 'arrow')) {
    const w = ((m.w ?? 10) / 100) * iw, h = ((m.h ?? 10) / 100) * ih;
    const x0 = ix + (m.x / 100) * iw - w / 2, y0 = iy + (m.y / 100) * ih - h / 2;
    const above = y0 - tag.h - 5 >= iy + 2;
    const box = { x: x0, y: above ? y0 - tag.h - 5 : y0 + h + 5, w: tag.w, h: tag.h };
    tags.push({ box, draw: () => { bnTag(ctx, box.x, box.y, tagPx, true); } });
  }
  for (const { cx, cy } of icons.filter(x => x.m.bottleneck)) {
    const box = { x: cx - tag.w / 2, y: cy - r - 10 - tag.h, w: tag.w, h: tag.h };
    tags.push({ box, draw: () => { bnTag(ctx, cx, box.y, tagPx); } });
  }
  for (const t of tags) taken.push(t.box);
  /* the marks, then the tags */
  for (const { m, cx, cy } of icons) {
    if (m.bottleneck) { ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.strokeStyle = '#0f1417'; ctx.lineWidth = 4; ctx.stroke(); }
    drawIcon(ctx, m.kind, cx, cy, r, colourOf(m));
  }
  for (const t of tags) t.draw();
  /* EACH NAME WHERE IT IS CLEAR — under the mark as on the screen; above it
     when that is taken; a person's number (the same as in Who does what)
     when neither is clear; the whole of it, and what they do, beside the map. */
  for (const { m, cx, cy } of icons) {
    const name = mapLabel(m, labels, people);
    const num = m.kind === 'person' ? mapLabel(m, 'number', people) : undefined;
    const lift = m.bottleneck ? tag.h + 6 : 0;
    const under = cy + r + 6, over = (h: number) => cy - r - 6 - lift - h;
    const tries: { text: string; top: (h: number) => number }[] = [
      ...(name ? [{ text: name, top: () => under }, { text: name, top: over }] : []),
      ...(num && num !== name ? [{ text: num, top: () => under }, { text: num, top: over }] : []),
    ];
    let placed: { text: string; box: Box } | undefined;
    for (const t of tries) {
      const h = pillPx * 1.5, box = pillBox(ctx, t.text, cx, t.top(h), pillPx);
      if (inBoard(box) && !taken.some(b => hits(b, box))) { placed = { text: t.text, box }; break; }
    }
    /* nowhere clear: a person still carries their number, under them */
    if (!placed && num) placed = { text: num, box: pillBox(ctx, num, cx, under, pillPx) };
    if (!placed) continue;
    taken.push(placed.box);
    pillLabel(ctx, placed.text, cx, placed.box.y, pillPx);
  }
  ctx.restore();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; round(ctx, mapX, top, mapW, mapH, 22); ctx.stroke();

  /* ---------------- who does what ----------------
     LAID OUT, NEVER PILED (Rowland, 13 October: "PDF details gone strange
     even in the side commentary or the bottleneck"). The kit at the foot and
     the note above it are measured first and given their room — the note was
     printed at a fixed height, over the people. The bottleneck is said once,
     under one tag. Then everybody, in rows as roomy as the room left allows:
     a name and what they do in full; a line of each; one line a person; two
     columns of those — and "and N more on the map" only when even that
     cannot hold them all. */
  const sx = CARD_W - M - sideW, sideBottom = top + mapH;
  const kit = MARKS.filter(k => k.kind !== 'person')
    .map(k => ({ k, n: s.marks.filter(m => m.kind === k.kind).length })).filter(x => x.n > 0)
    .slice(0, 6);   // the card has room for six kinds; the map shows the rest
  ctx.font = `700 24px ${FONT}`;
  const kitWord = (k: typeof MARKS[number], c: number) => `${c} ${c === 1 ? k.word.toLowerCase() : manyOf(k.word)}`;
  let kitRows = 0;
  { let kx = 0; for (const { k, n: c } of kit) { const w = 52 + ctx.measureText(kitWord(k, c)).width + 24; if (kx > 0 && kx + w > sideW) { kitRows++; kx = 0; } kx += w; } if (kit.length) kitRows++; }
  const kitH = kit.length ? 30 + kitRows * 58 : 0, kitTop = sideBottom - kitH;
  ctx.font = `italic 500 21px ${FONT}`;
  const noteFit = s.note?.trim() ? wrapRef(ctx, s.note.trim(), sideW, 3, 'the note') : { lines: [] as string[], cut: false };
  const noteLines = noteFit.lines;
  const personNotes = new Map<string, CardNote>();
  const notePerson = (p: StandardMark, i: number) => {
    if (!p.task?.trim() || personNotes.has(p.id)) return;
    personNotes.set(p.id, { ref: String(i + 1), title: p.label?.trim() || `Person ${i + 1}`, text: p.task.trim(), colour: colourOf(p), person: true, ...(p.bottleneck ? { bottleneck: true } : {}) });
  };
  const noteH = noteLines.length ? noteLines.length * 28 + 6 : 0;
  const noteTop = kitTop - (kit.length && noteH ? 22 : 0) - noteH;
  const listBottom = (noteH ? noteTop : kit.length ? kitTop : sideBottom) - 18;

  let y = top + 8;
  ctx.fillStyle = BLUE; ctx.font = `800 21px ${FONT}`; ctx.fillText('W H O   D O E S   W H A T', sx, y + 16);
  y += 44;
  /* THE BOTTLENECK, first, in words — one tag, what it is beside it */
  const bns = bottlenecksOf(s).slice(0, 3);
  if (bns.length) {
    const t = bnTag(ctx, sx, y, 18, true);
    const tx = sx + t.w + 12, tw = sideW - t.w - 12;
    ctx.fillStyle = INK; ctx.font = `700 23px ${FONT}`;
    let by = y + 21;
    for (const b of bns) {
      /* the head of what was written; the whole on the notes page */
      const pi = people.findIndex(p => p.id === b.id), m = s.marks.find(x => x.id === b.id);
      const ref = pi >= 0 ? String(pi + 1) : String.fromCharCode(65 + Math.max(0, cutShapes.indexOf(m as StandardMark)));
      const more = !!m && (pi >= 0 ? (m.task?.trim() ?? '') !== firstPara(m.task ?? '') : cutShapes.includes(m));
      const fit = wrapRef(ctx, b.words, tw, 2, ref, more);
      if (fit.cut && pi >= 0 && m) notePerson(m, pi);
      for (const l of fit.lines) { ctx.fillText(l, tx, by); by += 28; }
      by += 4;
    }
    y = Math.max(y + t.h, by - 28) + 22;
  }
  if (people.length === 0) { ctx.fillStyle = MUTED; ctx.font = `500 26px ${FONT}`; ctx.fillText('Nobody placed yet.', sx, y + 24); y += 50; }

  /* Their work against takt, right-aligned on their row — red when over. */
  const workOf = (p: StandardMark) => {
    const w = work?.people.find(x => x.who === (p.label ?? '').trim());
    return w && work ? { text: w.untimed ? `${w.work.toFixed(1)} s so far` : `${w.work.toFixed(1)} s of ${(w.takt ?? work.taktSec).toFixed(1)} s${w.piece ?? ''}`, over: w.over } : undefined;
  };
  type Style = 'roomy' | 'snug' | 'line';
  const STY: Record<Style, { disc: number; name: number; task: number }> = {
    roomy: { disc: 22, name: 28, task: 23 }, snug: { disc: 19, name: 25, task: 21 }, line: { disc: 15, name: 22, task: 19 },
  };
  const avail = listBottom - y;
  const twoCols = sideW >= 640, colW2 = (sideW - 32) / 2;
  const refOf = (p: StandardMark) => String(people.indexOf(p) + 1);
  const taskFit = (p: StandardMark, w: number) => { ctx.font = `500 ${STY.roomy.task}px ${FONT}`; return p.task?.trim() ? wrapRef(ctx, p.task.trim(), w - 64, 3, refOf(p)) : { lines: [] as string[], cut: false }; };
  const taskLines = (p: StandardMark, w: number) => taskFit(p, w).lines;
  const roomyH = (p: StandardMark, w: number) => 31 + taskLines(p, w).length * 31 + 26;
  const rowH = (st: Style, p: StandardMark, w: number) => (st === 'roomy' ? roomyH(p, w) : st === 'snug' ? (p.task?.trim() ? 72 : 46) : 42);
  const total = (st: Style, w: number) => people.reduce((n, p) => n + rowH(st, p, w), 0);
  const plan: { st: Style; cols: number } =
    total('roomy', sideW) <= avail ? { st: 'roomy', cols: 1 }
      : total('snug', sideW) <= avail ? { st: 'snug', cols: 1 }
        : total('line', sideW) <= avail ? { st: 'line', cols: 1 }
          : twoCols && total('snug', colW2) <= avail * 2 - 72 ? { st: 'snug', cols: 2 }
            : { st: 'line', cols: twoCols ? 2 : 1 };
  const colW = plan.cols === 2 ? colW2 : sideW;
  const one = (text: string, w: number) => wrap(ctx, text, w, 1)[0] ?? '';
  const listTop = y;
  let col = 0;
  for (let i = 0; i < people.length; i++) {
    const p = people[i], st = STY[plan.st], h = rowH(plan.st, p, colW);
    if (y + h > listBottom && col + 1 < plan.cols) { col++; y = listTop; }
    const px = sx + col * (colW + 32);
    if (y + h > listBottom) {
      ctx.fillStyle = MUTED; ctx.font = `600 22px ${FONT}`; ctx.fillText(`and ${people.length - i} more on the map — all on the notes`, px, Math.min(y + 24, listBottom + 14));
      for (let k = i; k < people.length; k++) personNotes.set(people[k].id, { ref: String(k + 1), title: people[k].label?.trim() || `Person ${k + 1}`, text: people[k].task?.trim() || '—', colour: colourOf(people[k]), person: true, ...(people[k].bottleneck ? { bottleneck: true } : {}) });
      break;
    }
    // the number disc, in the person's colour — the same as on the map
    const d = st.disc, mid = y + d;
    ctx.beginPath(); ctx.arc(px + d, mid, d, 0, Math.PI * 2); ctx.fillStyle = colourOf(p); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(d * 0.95)}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), px + d, mid + d * 0.34); ctx.textAlign = 'left';
    const tx = px + d * 2 + 14, tw = colW - (d * 2 + 14);
    const wk = workOf(p);
    ctx.font = `800 ${Math.round(st.task)}px ${FONT}`;
    const wkW = wk ? ctx.measureText(wk.text).width + 14 : 0;
    if (wk) { ctx.textAlign = 'right'; ctx.fillStyle = wk.over ? '#c4281c' : INK2; ctx.fillText(wk.text, px + colW, mid + st.name * 0.36); ctx.textAlign = 'left'; }
    ctx.fillStyle = INK; ctx.font = `800 ${st.name}px ${FONT}`;
    const name = p.label?.trim() || `Person ${i + 1}`;
    if (plan.st === 'line') {
      /* one line: the name, then what they do, as far as it goes */
      const nm = one(name, tw - wkW);
      ctx.fillText(nm, tx, mid + st.name * 0.36);
      const used = ctx.measureText(nm).width;
      if (p.task?.trim() && used + 40 < tw - wkW) {
        ctx.fillStyle = INK2; ctx.font = `500 ${st.task}px ${FONT}`;
        const f = wrapRef(ctx, `— ${p.task.trim()}`, tw - wkW - used - 10, 1, refOf(p));
        if (f.cut) notePerson(p, i);
        ctx.fillText(f.lines[0] ?? '', tx + used + 10, mid + st.name * 0.36);
      } else if (p.task?.trim()) notePerson(p, i);
    } else {
      ctx.fillText(one(name, tw - wkW), tx, y + st.name + 2);
      ctx.fillStyle = INK2; ctx.font = `500 ${st.task}px ${FONT}`;
      const fit = plan.st === 'roomy' ? taskFit(p, colW) : p.task?.trim() ? wrapRef(ctx, p.task.trim(), tw, 1, refOf(p)) : { lines: [] as string[], cut: false };
      if (fit.cut) notePerson(p, i);
      const lines = fit.lines;
      lines.forEach((l, k) => ctx.fillText(l, tx, y + st.name + 2 + (k + 1) * (st.task + 8)));
    }
    y += h;
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, y - 9); ctx.lineTo(px + colW, y - 9); ctx.stroke();
  }

  if (noteLines.length) {
    ctx.fillStyle = MUTED; ctx.font = `italic 500 21px ${FONT}`;
    noteLines.forEach((l, i) => ctx.fillText(l, sx, noteTop + 21 + i * 28));
  }
  // the kit at the line, with its icons
  if (kit.length) {
    ctx.fillStyle = BLUE; ctx.font = `800 21px ${FONT}`; ctx.fillText('A T   T H E   L I N E', sx, kitTop + 18);
    let ky = kitTop + 30, kx = sx;
    for (const { k, n: c } of kit) {
      ctx.font = `700 24px ${FONT}`;
      const word = kitWord(k, c), w = 52 + ctx.measureText(word).width + 24;
      if (kx > sx && kx + w > sx + sideW) { kx = sx; ky += 58; }
      drawIcon(ctx, k.kind, kx + 22, ky + 24, 20);
      ctx.fillStyle = INK; ctx.fillText(word, kx + 52, ky + 32);
      kx += w;
    }
  }

  /* ---------------- the foot: signed off at the line ---------------- */
  const fy = CARD_H - footH + 20;
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, fy); ctx.lineTo(CARD_W - M, fy); ctx.stroke();
  ctx.fillStyle = MUTED; ctx.font = `600 22px ${FONT}`;
  ctx.fillText('Agreed by', M, fy + 54);
  ctx.strokeStyle = '#99a6ab'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(M + 132, fy + 56); ctx.lineTo(M + 520, fy + 56); ctx.stroke();
  ctx.fillText('Date', M + 560, fy + 54);
  ctx.beginPath(); ctx.moveTo(M + 630, fy + 56); ctx.lineTo(M + 830, fy + 56); ctx.stroke();
  if (said.length) {
    ctx.fillStyle = BLUE; ctx.font = `800 17px ${FONT}`; ctx.fillText('L I N E   C A P A C I T Y', M + 880, fy + 30);
    ctx.fillStyle = INK;
    const tw = CARD_W - M - 170 - (M + 880);
    /* One fact wraps onto two lines; more take a line each, the type brought
       down until each fits whole (to 14 px). */
    if (said.length === 1) {
      ctx.font = `600 20px ${FONT}`;
      wrap(ctx, said[0], tw, 2).forEach((l, i) => ctx.fillText(l, M + 880, fy + 56 + i * 24));
    } else {
      said.forEach((t, i) => {
        let px = 20;
        ctx.font = `600 ${px}px ${FONT}`;
        while (px > 14 && ctx.measureText(t).width > tw) { px -= 1; ctx.font = `600 ${px}px ${FONT}`; }
        ctx.fillText(wrap(ctx, t, tw, 1)[0], M + 880, fy + 56 + i * 24);
      });
    }
  }
  /* the notes, in the order a reader meets them: people by number, areas by letter, the note */
  const all: CardNote[] = [
    ...people.filter(p => personNotes.has(p.id)).map(p => personNotes.get(p.id) as CardNote),
    ...notes,
    ...(noteFit.cut && s.note ? [{ ref: '', title: 'Note', text: s.note.trim(), colour: MUTED }] : []),
  ];
  ctx.textAlign = 'right'; ctx.fillStyle = INK2; ctx.font = `800 24px ${FONT}`;
  ctx.fillText('Faultline', CARD_W - M, fy + 54);
  if (all.length) { ctx.fillStyle = BLUE; ctx.font = `700 18px ${FONT}`; ctx.fillText('Notes in full on the next page', CARD_W - M, fy + 84); }
  ctx.textAlign = 'left';
  return { canvas: cv, notes: all };
}

/* ------------------------------ the notes page ------------------------------
 * The words the card had to cut, whole: each under its number or letter, in
 * its colour, paragraphs and bullets as they were typed, poured down two
 * columns and onto as many pages as it takes. */
function notesPages(s: Standard, projectName: string, printed: string, notes: CardNote[]): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  const bandH = 150, top = bandH + 36, bottom = CARD_H - 70, gap = 48, colW = (CARD_W - 2 * M - gap) / 2;
  const T = 22, LH = 31;
  type Op = { h: number; head?: CardNote; text?: string; indent?: number; bullet?: boolean; keep?: boolean };
  /* every note as lines, measured once */
  const measure = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
  const ops: Op[] = [];
  for (const n of notes) {
    ops.push({ h: 52, head: n, keep: true });
    for (const raw of n.text.split('\n')) {
      const line = raw.trim();
      if (!line) { ops.push({ h: 12 }); continue; }
      const bullet = /^[•\-*·]\s*/.test(line);
      const indent = bullet ? 26 : 0;
      measure.font = `500 ${T}px ${FONT}`;
      const parts = wrap(measure, bullet ? line.replace(/^[•\-*·]\s*/, '') : line, colW - 52 - indent, 10_000);
      parts.forEach((t, k) => ops.push({ h: LH, text: t, indent, bullet: bullet && k === 0 }));
    }
    ops.push({ h: 26 });
  }
  let ctx: CanvasRenderingContext2D | null = null, col = 0, y = top;
  const newPage = () => {
    const cv = document.createElement('canvas'); cv.width = CARD_W; cv.height = CARD_H;
    const c = cv.getContext('2d') as CanvasRenderingContext2D;
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, CARD_W, CARD_H);
    /* light on paper, as the card's own band (reportKit BAND) */
    c.fillStyle = BAND_FILL; c.fillRect(0, 0, CARD_W, bandH);
    c.fillStyle = BLUE; c.fillRect(0, bandH - 6, CARD_W, 6);
    c.fillStyle = BLUE; c.font = `800 22px ${FONT}`; c.fillText('L I N E   S T A N D A R D   ·   N O T E S', M, 56);
    c.fillStyle = INK; c.font = `800 42px ${FONT}`; c.fillText(wrap(c, s.product || 'Untitled product', CARD_W - 2 * M - 420, 1)[0] ?? '', M, 108);
    c.fillStyle = MUTED; c.font = `500 22px ${FONT}`; c.textAlign = 'right';
    c.fillText(`${projectName}  ·  printed ${printed}`, CARD_W - M, 108); c.textAlign = 'left';
    c.fillStyle = MUTED; c.font = `500 19px ${FONT}`;
    c.fillText('The words the card could not hold, in full — numbered as on the map.', M, CARD_H - 34);
    pages.push(cv); ctx = c; col = 0; y = top;
  };
  newPage();
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    /* a heading never stands alone at the foot: it goes with its first two lines */
    const need = op.keep ? op.h + LH * 2 : op.h;
    if (y + need > bottom) {
      if (col === 0) { col = 1; y = top; } else newPage();
      if (!op.head && !op.text) continue;   // a space at the top of a column is no space
    }
    const c = ctx as unknown as CanvasRenderingContext2D;
    const x = M + col * (colW + gap);
    if (op.head) {
      const n = op.head, r = 18;
      c.beginPath(); c.arc(x + r, y + r + 4, r, 0, Math.PI * 2); c.fillStyle = n.colour; c.fill();
      c.fillStyle = '#ffffff'; c.font = `800 18px ${FONT}`; c.textAlign = 'center'; c.fillText(n.ref || '•', x + r, y + r + 10); c.textAlign = 'left';
      let hx = x + 2 * r + 12;
      if (n.bottleneck) { const t = bnTag(c, hx, y + 8, 16, true); hx += t.w + 10; }
      c.fillStyle = INK; c.font = `800 26px ${FONT}`; c.fillText(wrap(c, n.title, x + colW - hx, 1)[0] ?? '', hx, y + 32);
    } else if (op.text) {
      c.fillStyle = INK2; c.font = `500 ${T}px ${FONT}`;
      if (op.bullet) c.fillText('•', x + 56, y + 22);
      c.fillText(op.text, x + 52 + (op.indent ?? 0), y + 22);
    }
    y += op.h;
  }
  pages.forEach((cv, k) => {
    const c = cv.getContext('2d') as CanvasRenderingContext2D;
    c.fillStyle = INK2; c.font = `800 20px ${FONT}`; c.textAlign = 'right';
    c.fillText(pages.length > 1 ? `Notes ${k + 1} of ${pages.length}` : 'Notes', CARD_W - M, CARD_H - 34); c.textAlign = 'left';
  });
  return pages;
}

/** The card and, when it had to cut anything, its notes page(s) — every
 *  page as a JPEG, for the screen and the PDF alike. */
export async function cardPages(s: Standard, projectName: string, printed: string, work?: CardWork, shift?: string): Promise<string[]> {
  const { canvas, notes } = await renderCardWithNotes(s, projectName, printed, work, shift);
  return [canvas, ...(notes.length ? notesPages(s, projectName, printed, notes) : [])].map(c => c.toDataURL('image/jpeg', 0.9));
}

/** The card as a JPEG, for the screen and the PDF alike. */
export async function cardImage(s: Standard, projectName: string, printed: string, work?: CardWork, shift?: string): Promise<string> {
  return (await renderCard(s, projectName, printed, work, shift)).toDataURL('image/jpeg', 0.9);
}
