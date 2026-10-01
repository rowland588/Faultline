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
import { headcount, markOf, MARKS, peopleOf, type Standard, type StandardMark } from './standard';

/** A4 landscape at 150 dpi: sharp on paper, light enough for a phone. */
export const CARD_W = 1754, CARD_H = 1240;
const M = 64;
const NAVY = '#0d1f3c', BLUE = '#1f63e0', INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', SOFT = '#f3f6fb';
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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

/** One icon: a white-ringed disc in the kind's colour, its glyph in white. */
export function drawIcon(ctx: CanvasRenderingContext2D, kind: StandardMark['kind'], cx: number, cy: number, r: number) {
  const k = markOf(kind);
  ctx.save();
  ctx.shadowColor = 'rgba(13,31,60,0.28)'; ctx.shadowBlur = r * 0.5; ctx.shadowOffsetY = r * 0.12;
  ctx.beginPath(); ctx.arc(cx, cy, r + Math.max(2, r * 0.12), 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = k.colour; ctx.fill();
  ctx.save();
  const g = r * 1.3;
  ctx.translate(cx - g / 2, cy - g / 2); ctx.scale(g / 24, g / 24);
  ctx.fillStyle = '#ffffff'; ctx.fill(new Path2D(k.glyph), 'evenodd');
  ctx.restore();
}

function pillLabel(ctx: CanvasRenderingContext2D, text: string, cx: number, top: number, size: number) {
  ctx.font = `700 ${size}px ${FONT}`;
  const tw = ctx.measureText(text).width, h = size * 1.5, w = tw + size * 1.1;
  ctx.fillStyle = 'rgba(15,26,46,0.9)';
  round(ctx, cx - w / 2, top, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, top + h / 2 + 1);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/** The whole card, as a canvas. */
export async function renderCard(s: Standard, projectName: string, printed: string): Promise<HTMLCanvasElement> {
  /* The photo first: nothing below waits on anything once drawing starts. */
  const img = await photoOf(s.photoKey);
  const cv = document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, CARD_W, CARD_H);

  /* ---------------- the band ---------------- */
  const bandH = 236;
  const grad = ctx.createLinearGradient(0, 0, CARD_W, bandH);
  grad.addColorStop(0, NAVY); grad.addColorStop(0.65, '#14306a'); grad.addColorStop(1, BLUE);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, CARD_W, bandH);
  // a soft shimmer across the band
  const sh = ctx.createRadialGradient(CARD_W * 0.78, -40, 10, CARD_W * 0.78, -40, 520);
  sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, 0, CARD_W, bandH);

  ctx.fillStyle = '#9fc0ff'; ctx.font = `800 24px ${FONT}`;
  ctx.fillText('L I N E   S T A N D A R D', M, 70);
  ctx.fillStyle = '#ffffff'; ctx.font = `800 60px ${FONT}`;
  const title = wrap(ctx, s.product || 'Untitled product', CARD_W - 2 * M - 300, 2);
  title.forEach((l, i) => ctx.fillText(l, M, 138 + i * 64));
  ctx.fillStyle = '#c9d6ee'; ctx.font = `500 26px ${FONT}`;
  ctx.fillText(`${projectName}   ·   printed ${printed}`, M, title.length > 1 ? 222 : 190);

  // the headcount — the number a supervisor reads first
  const n = headcount(s);
  const bx = CARD_W - M - 104, by = bandH / 2;
  ctx.beginPath(); ctx.arc(bx, by, 96, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, 82, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.fillStyle = NAVY; ctx.textAlign = 'center';
  ctx.font = `800 ${n > 99 ? 54 : 70}px ${FONT}`; ctx.fillText(String(n), bx, by + 14);
  ctx.fillStyle = MUTED; ctx.font = `800 17px ${FONT}`; ctx.fillText(n === 1 ? 'PERSON' : 'PEOPLE', bx, by + 46);
  ctx.textAlign = 'left';

  /* ---------------- the map ---------------- */
  const top = bandH + 40, footH = 112;
  const sideW = 520, gap = 36;
  const mapX = M, mapW = CARD_W - 2 * M - sideW - gap, mapH = CARD_H - top - footH - 28;
  ctx.save();
  ctx.shadowColor = 'rgba(13,31,60,0.16)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
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
    ctx.strokeStyle = '#e1e8f2'; ctx.lineWidth = 1;
    for (let x = mapX; x < mapX + mapW; x += 40) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + mapH); ctx.stroke(); }
    for (let y = top; y < top + mapH; y += 40) { ctx.beginPath(); ctx.moveTo(mapX, y); ctx.lineTo(mapX + mapW, y); ctx.stroke(); }
  }
  const r = Math.max(20, Math.min(iw, ih) * 0.036);
  for (const m of s.marks) {
    const cx = ix + (m.x / 100) * iw, cy = iy + (m.y / 100) * ih;
    drawIcon(ctx, m.kind, cx, cy, r);
    if (m.label) pillLabel(ctx, m.label, cx, cy + r + 8, Math.round(r * 0.72));
  }
  ctx.restore();
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; round(ctx, mapX, top, mapW, mapH, 22); ctx.stroke();

  /* ---------------- who does what ---------------- */
  const sx = CARD_W - M - sideW;
  let y = top + 8;
  ctx.fillStyle = BLUE; ctx.font = `800 21px ${FONT}`; ctx.fillText('W H O   D O E S   W H A T', sx, y + 16);
  y += 44;
  const people = peopleOf(s);
  if (people.length === 0) { ctx.fillStyle = MUTED; ctx.font = `500 26px ${FONT}`; ctx.fillText('Nobody placed yet.', sx, y + 24); y += 50; }
  const listBottom = top + mapH - 170;
  people.forEach((p, i) => {
    if (y > listBottom) return;
    if (y + 40 > listBottom && i < people.length) {
      ctx.fillStyle = MUTED; ctx.font = `600 22px ${FONT}`; ctx.fillText(`and ${people.length - i} more on the map`, sx, y + 24); y = listBottom + 1; return;
    }
    // the number disc
    ctx.beginPath(); ctx.arc(sx + 22, y + 22, 22, 0, Math.PI * 2); ctx.fillStyle = BLUE; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), sx + 22, y + 30); ctx.textAlign = 'left';
    ctx.fillStyle = INK; ctx.font = `800 28px ${FONT}`;
    ctx.fillText(wrap(ctx, p.label || `Person ${i + 1}`, sideW - 64, 1)[0], sx + 60, y + 31);
    let ty = y + 31;
    if (p.task) {
      ctx.fillStyle = INK2; ctx.font = `500 23px ${FONT}`;
      for (const l of wrap(ctx, p.task, sideW - 64, 3)) { ty += 31; ctx.fillText(l, sx + 60, ty); }
    }
    y = ty + 26;
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(sx, y - 10); ctx.lineTo(sx + sideW, y - 10); ctx.stroke();
  });

  // the kit at the line, with its icons
  const kit = MARKS.filter(k => k.kind !== 'person')
    .map(k => ({ k, n: s.marks.filter(m => m.kind === k.kind).length })).filter(x => x.n > 0);
  if (kit.length) {
    let ky = top + mapH - 150;
    ctx.fillStyle = BLUE; ctx.font = `800 21px ${FONT}`; ctx.fillText('A T   T H E   L I N E', sx, ky);
    ky += 26;
    let kx = sx;
    for (const { k, n: c } of kit) {
      ctx.font = `700 24px ${FONT}`;
      const word = `${c} ${k.word.toLowerCase()}${c === 1 ? '' : k.kind === 'box' ? 'es' : 's'}`;
      const w = 52 + ctx.measureText(word).width + 24;
      if (kx + w > sx + sideW) { kx = sx; ky += 58; }
      drawIcon(ctx, k.kind, kx + 22, ky + 24, 20);
      ctx.fillStyle = INK; ctx.fillText(word, kx + 52, ky + 32);
      kx += w;
    }
  }
  if (s.note) {
    ctx.fillStyle = MUTED; ctx.font = `italic 500 21px ${FONT}`;
    wrap(ctx, s.note, sideW, 2).forEach((l, i) => ctx.fillText(l, sx, top + mapH - 186 - (1 - i) * 28));
  }

  /* ---------------- the foot: signed off at the line ---------------- */
  const fy = CARD_H - footH + 20;
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, fy); ctx.lineTo(CARD_W - M, fy); ctx.stroke();
  ctx.fillStyle = MUTED; ctx.font = `600 22px ${FONT}`;
  ctx.fillText('Agreed by', M, fy + 54);
  ctx.strokeStyle = '#9aa8bd'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(M + 132, fy + 56); ctx.lineTo(M + 520, fy + 56); ctx.stroke();
  ctx.fillText('Date', M + 560, fy + 54);
  ctx.beginPath(); ctx.moveTo(M + 630, fy + 56); ctx.lineTo(M + 830, fy + 56); ctx.stroke();
  ctx.textAlign = 'right'; ctx.fillStyle = INK2; ctx.font = `800 24px ${FONT}`;
  ctx.fillText('Faultline', CARD_W - M, fy + 54);
  ctx.textAlign = 'left';
  return cv;
}

/** The card as a JPEG, for the screen and the PDF alike. */
export async function cardImage(s: Standard, projectName: string, printed: string): Promise<string> {
  return (await renderCard(s, projectName, printed)).toDataURL('image/jpeg', 0.9);
}
