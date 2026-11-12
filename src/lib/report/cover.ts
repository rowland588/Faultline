/* WHO PREPARED IT, ON A COVER (8 November, docs/STORY.md S1 — lib/brand). The blocks a client-facing paper's cover carries under its
 * band: the client it is for, the consultant's logo, "Prepared by Rowland Glew, Streamline Synergy", the strapline and the contact
 * line — nothing when no brand is saved. The line's full package, the story report (S2), the project report and the client report
 * draw them; every other paper keeps only the foot (reportKit stampBrand). */
import { readBrand, preparedBy, type Brand } from '../brand';
import { box, text } from './blocks';
import type { Block } from './flow';
import { INK, INK2, MUTED } from '../reportKit';
import { setFont } from '../reportKit';

export function preparedByBlocks(o: { client?: string; today?: string; brand?: Brand | null } = {}): Block[] {
  const b = o.brand === undefined ? readBrand() : o.brand;
  const out: Block[] = [];
  if (o.client?.trim()) out.push(text({ text: `For ${o.client.trim()}`, size: 11, style: 'bold', colour: INK, before: 10, after: 2 }));
  if (!b) return out;
  const logoH = b.logo ? 34 : 0;
  out.push(box(() => logoH + 30, (f, y) => {
    let ty = y + 2;
    if (b.logo) {
      try { f.doc.addImage(b.logo, 'PNG', f.x, y, logoH * 2.2, logoH, undefined, 'FAST'); } catch { /* an image the PDF could not take is left off, the words stand */ }
      ty = y + logoH + 6;
    }
    setFont(f.doc, 10, 'bold', INK); f.doc.text(preparedBy(b), f.x, ty + 10);
    const under = [b.strapline, b.contact].filter(Boolean).join(' · ');
    if (under) { setFont(f.doc, 8, 'normal', INK2); f.doc.text(under, f.x, ty + 22); }
  }, () => 4));
  out.push(text({ text: `Made with LUNAR${o.today ? ` · ${o.today}` : ''}`, size: 7, colour: MUTED, after: 6 }));
  return out;
}
