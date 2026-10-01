/* THE LINE STANDARD, ON PAPER — one A4 page per product, to put up at the
 * line. The picture with everything on it, and beside it who does what.
 *
 * The map is drawn ONCE, on a canvas, off the same glyphs and colours the
 * screen uses (lib/standard MARKS), and the PDF carries that one image — so
 * what was placed on the screen is exactly what prints. */
import type { jsPDF } from 'jspdf';
import { getBlob } from '../db';
import { headcount, markOf, peopleOf, thingsOf, type Standard } from './standard';

const MAX_EDGE = 1600;

async function imageOf(key?: string): Promise<HTMLImageElement | null> {
  if (!key) return null;
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
  } catch { return null; } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}

/** The map as one picture: the photo (or a plain board when there is none)
 *  with every mark drawn on it, roles under the people. */
export async function composeMap(s: Standard): Promise<{ data: string; w: number; h: number }> {
  const img = await imageOf(s.photoKey);
  const scale = img ? Math.min(1, MAX_EDGE / Math.max(img.width, img.height)) : 1;
  const w = img ? Math.max(1, Math.round(img.width * scale)) : 1600;
  const h = img ? Math.max(1, Math.round(img.height * scale)) : 900;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  if (img) ctx.drawImage(img, 0, 0, w, h);
  else {
    ctx.fillStyle = '#eef3f9'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#dbe4ef'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
  const r = Math.max(14, Math.round(Math.min(w, h) * 0.034));
  for (const m of s.marks) {
    const k = markOf(m.kind);
    const cx = (m.x / 100) * w, cy = (m.y / 100) * h;
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = k.colour; ctx.fill();
    ctx.save();
    const g = r * 1.3;
    ctx.translate(cx - g / 2, cy - g / 2); ctx.scale(g / 24, g / 24);
    ctx.fillStyle = '#ffffff'; ctx.fill(new Path2D(k.glyph), 'evenodd');
    ctx.restore();
    if (m.label) {
      ctx.font = `700 ${Math.round(r * 0.75)}px system-ui, sans-serif`;
      const tw = ctx.measureText(m.label).width, ph = r * 1.05, pw = tw + r * 0.8;
      const px = cx - pw / 2, py = cy + r + 5;
      ctx.fillStyle = 'rgba(15,26,46,0.88)';
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(m.label, cx, py + ph / 2 + 1);
    }
  }
  return { data: cv.toDataURL('image/jpeg', 0.86), w, h };
}

const INK = '#0f1a2e', MUTED = '#5b6b82', BRAND = '#1f63e0', LINE = '#dbe4ef';

/** One page per product, in the order given. */
export async function drawStandards(doc: jsPDF, standards: Standard[], projectName: string, printed: string): Promise<void> {
  const W = 842, H = 595, M = 30;
  for (let i = 0; i < standards.length; i++) {
    const s = standards[i];
    if (i > 0) doc.addPage('a4', 'landscape');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(BRAND);
    doc.text('LINE STANDARD', M, M + 6);
    doc.setFontSize(20); doc.setTextColor(INK);
    doc.text(s.product || 'Untitled product', M, M + 30, { maxWidth: W - 2 * M - 160 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(MUTED);
    const things = thingsOf(s);
    doc.text(`${projectName}${things ? `  ·  ${things}` : ''}`, M, M + 46, { maxWidth: W - 2 * M - 160 });
    // the headcount, big, top right: the number a supervisor reads first
    const n = headcount(s);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(INK);
    doc.text(String(n), W - M, M + 30, { align: 'right' });
    doc.setFontSize(9); doc.setTextColor(MUTED);
    doc.text(n === 1 ? 'person' : 'people', W - M, M + 44, { align: 'right' });
    doc.setDrawColor(LINE); doc.setLineWidth(1); doc.line(M, M + 58, W - M, M + 58);

    // the map, left, as large as the page allows
    const top = M + 70, listW = 220, mapW = W - 2 * M - listW - 20, mapH = H - top - M - 18;
    const map = await composeMap(s);
    const k = Math.min(mapW / map.w, mapH / map.h);
    const dw = map.w * k, dh = map.h * k;
    doc.addImage(map.data, 'JPEG', M, top, dw, dh);
    doc.setDrawColor(LINE); doc.rect(M, top, dw, dh);

    // who does what, right
    const lx = W - M - listW;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(BRAND);
    doc.text('WHO DOES WHAT', lx, top + 8);
    let y = top + 26;
    const people = peopleOf(s);
    if (people.length === 0) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(MUTED);
      doc.text('Nobody placed yet.', lx, y);
    }
    for (const p of people) {
      if (y > H - M - 30) { doc.setFontSize(9); doc.setTextColor(MUTED); doc.text(`and ${people.length - people.indexOf(p)} more`, lx, y); break; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(INK);
      doc.text(p.label || 'Person', lx, y);
      y += 14;
      if (p.task) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(MUTED);
        const lines = doc.splitTextToSize(p.task, listW) as string[];
        doc.text(lines.slice(0, 4), lx, y);
        y += Math.min(lines.length, 4) * 12;
      }
      y += 8;
      doc.setDrawColor(LINE); doc.line(lx, y - 4, lx + listW, y - 4);
      y += 6;
    }
    if (s.note) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(MUTED);
      doc.text(doc.splitTextToSize(s.note, listW) as string[], lx, Math.min(y + 6, H - M - 40));
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED);
    doc.text(`Printed ${printed}  ·  Faultline`, M, H - M + 6);
    doc.text(`${i + 1} of ${standards.length}`, W - M, H - M + 6, { align: 'right' });
  }
}
