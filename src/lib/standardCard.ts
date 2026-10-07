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
import { analyse } from './capacity';
import { headcount, isShape, manyOf, markOf, MARKS, peopleOf, TONES, type Standard, type StandardMark } from './standard';

/** A4 landscape at 150 dpi: sharp on paper, light enough for a phone. */
export const CARD_W = 1754, CARD_H = 1240;
const M = 64;
const NAVY = '#0d1f3c', BLUE = '#1f63e0', INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', SOFT = '#f3f6fb';
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
  ctx.fillStyle = '#ffffff'; ctx.fill(new Path2D(k.glyph), k.rule ?? 'evenodd');
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

/** A shape on the map: the same geometry the editor draws, its words in the middle. */
function drawShape(ctx: CanvasRenderingContext2D, m: StandardMark, ix: number, iy: number, iw: number, ih: number) {
  const t = TONES[m.tone ?? (m.shape === 'text' ? 'grey' : 'blue')];
  const cx = ix + (m.x / 100) * iw, cy = iy + (m.y / 100) * ih;
  const w = ((m.w ?? 10) / 100) * iw, h = ((m.h ?? 10) / 100) * ih;
  const lw = Math.max(2, iw * 0.0028);
  ctx.save();
  if (m.shape === 'arrow') {
    const x2 = cx + w, y2 = cy + h, ang = Math.atan2(h, w), head = Math.max(14, iw * 0.016);
    ctx.strokeStyle = t.stroke; ctx.fillStyle = t.stroke; ctx.lineWidth = lw * 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }
  const x = cx - w / 2, y = cy - h / 2;
  ctx.beginPath();
  if (m.shape === 'circle') ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
  else if (m.shape === 'triangle') { ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }
  else { round(ctx, x, y, w, h, Math.min(10, w * 0.06)); }
  if (m.shape !== 'text') {
    ctx.fillStyle = t.fill; ctx.fill();
    ctx.strokeStyle = t.stroke; ctx.lineWidth = lw; ctx.stroke();
  }
  if (m.label?.trim()) {
    const size = Math.max(16, Math.min(iw * 0.02, h * 0.34));
    ctx.font = `800 ${size}px ${FONT}`; ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const inner = m.shape === 'triangle' ? w * 0.55 : m.shape === 'circle' ? w * 0.72 : w - 12;
    const lines = m.label.split('\n').flatMap(part => wrap(ctx, part, Math.max(30, inner), 3)).slice(0, 4);
    const lh = size * 1.15, ty0 = (m.shape === 'triangle' ? cy + h * 0.18 : cy) - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, ty0 + i * lh));
  }
  ctx.restore();
}

/** The whole card, as a canvas. */
export async function renderCard(s: Standard, projectName: string, printed: string): Promise<HTMLCanvasElement> {
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
    /* The plain board is 16:9 on the screen, so it is 16:9 here too — a
       square drawn there is a square on the card. */
    const k = Math.min(mapW / 16, mapH / 9);
    iw = 16 * k; ih = 9 * k; ix = mapX + (mapW - iw) / 2; iy = top + (mapH - ih) / 2;
    ctx.fillStyle = '#f7f9fc'; ctx.fillRect(ix, iy, iw, ih);
    ctx.strokeStyle = '#e1e8f2'; ctx.lineWidth = 1;
    for (let x = ix; x < ix + iw; x += 40) { ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x, iy + ih); ctx.stroke(); }
    for (let y = iy; y < iy + ih; y += 40) { ctx.beginPath(); ctx.moveTo(ix, y); ctx.lineTo(ix + iw, y); ctx.stroke(); }
  }
  // shapes first — everything placed stands on them
  for (const m of s.marks) if (isShape(m)) drawShape(ctx, m, ix, iy, iw, ih);
  const r = Math.max(20, Math.min(iw, ih) * 0.036);
  for (const m of s.marks) {
    if (isShape(m)) continue;
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
    .map(k => ({ k, n: s.marks.filter(m => m.kind === k.kind).length })).filter(x => x.n > 0)
    .slice(0, 6);   // the card has room for six kinds; the map shows the rest
  if (kit.length) {
    let ky = top + mapH - 150;
    ctx.fillStyle = BLUE; ctx.font = `800 21px ${FONT}`; ctx.fillText('A T   T H E   L I N E', sx, ky);
    ky += 26;
    let kx = sx;
    for (const { k, n: c } of kit) {
      ctx.font = `700 24px ${FONT}`;
      const word = `${c} ${c === 1 ? k.word.toLowerCase() : manyOf(k.word)}`;
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
  /* THE LINE BALANCE for this product (lib/capacity), when it has one: where
     the line is limited, in its own sentence — beside the sign-off, so the
     card at the line says who stands where AND what holds the line back. */
  if (s.capacity?.stations.length) {
    const said = analyse(s.capacity).sentence;
    ctx.fillStyle = BLUE; ctx.font = `800 17px ${FONT}`; ctx.fillText('L I N E   B A L A N C E', M + 880, fy + 30);
    ctx.fillStyle = INK; ctx.font = `600 20px ${FONT}`;
    wrap(ctx, said, CARD_W - M - 170 - (M + 880), 2).forEach((l, i) => ctx.fillText(l, M + 880, fy + 56 + i * 24));
  }
  ctx.textAlign = 'right'; ctx.fillStyle = INK2; ctx.font = `800 24px ${FONT}`;
  ctx.fillText('Faultline', CARD_W - M, fy + 54);
  ctx.textAlign = 'left';
  return cv;
}

/** The card as a JPEG, for the screen and the PDF alike. */
export async function cardImage(s: Standard, projectName: string, printed: string): Promise<string> {
  return (await renderCard(s, projectName, printed)).toDataURL('image/jpeg', 0.9);
}
