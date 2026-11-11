/* THE VISIT REPORT — a day at a customer on paper, client-facing (11 November, docs/CONSULTANT-WORKSPACE.md C3; lib/visits). Drawn the way the
 * Story's chapter is (lib/report/storyPaper): the band (the customer, the site, the day), who prepared it (lib/report/cover — the brand),
 * the four figures, then WHAT WE WERE ASKED (the brief said at the door), WHAT WE SAW (the measurements, studies and talks of the day), WHAT
 * WE FOUND (each problem with its money where the line's cost model holds it — a problem with no price says so), THE PHOTOS (each whole, its
 * caption under it), WHAT WE RECOMMEND NEXT (typed, optional) and WHAT THE FIGURES REST ON. Every line is a record of the visit's own
 * customer; another customer's never reaches it (visitRecords reads by the customer's lines). A4, the report engine's blocks. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { font, text } from './blocks';
import { leanBand, leanHead, leanTiles, leanClosing, leanActions } from './lean';
import { bandPage, type LeanTile } from '../lean';
import { preparedByBlocks } from './cover';
import { photo } from './docPaper';
import type { Picture } from '../../tools/talk/talkPictures';
import { INK, INK2, MUTED } from '../reportKit';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface VisitPaperInputs {
  client: string;
  site?: string;
  /** "Tuesday 11 November 2026" */
  day: string;
  by?: string;
  brief?: string;
  recommend?: string;
  ended: boolean;
  /** Each problem found: its words, where, its priority, and its money in words when the line's cost model holds it. */
  found: { what: string; where: string; priority: 'critical' | 'high' | 'low'; money?: string; who?: string }[];
  /** What was seen: a measurement, study or talk of the day — its name and what it says. */
  seen: { what: string; says: string }[];
  photos: { caption: string; pic?: Picture }[];
  /** The tools behind the figures — "Stops timed (4) · Capability (1)". */
  restsOn: string;
  printed: string;
}

export function visitBlocks(i: VisitPaperInputs): Block[] {
  const out: Block[] = [];
  const band = bandPage(`VISIT REPORT · ${i.ended ? 'ENDED' : 'IN HAND'}`, { name: i.client }, undefined, undefined,
    [['Day', i.day], ...(i.site ? [['Site', i.site] as [string, string]] : []), ...(i.by ? [['By', i.by] as [string, string]] : [])]);
  const worst = i.found.some(f => f.priority === 'critical') ? 'r' : i.found.length ? 'a' : 'g';
  out.push(leanBand({ ...band, sub: i.brief ?? '', verdict: { text: i.found.length ? `${plural(i.found.length, 'problem')} found on the visit` : 'Nothing found to put right on the visit', tone: worst } }, i.printed));
  out.push(...preparedByBlocks({ client: i.client, today: i.printed }));
  const priced = i.found.filter(f => f.money).length;
  const tiles: LeanTile[] = [
    { k: 'Found', v: String(i.found.length), of: i.found.length ? `${plural(i.found.length, 'problem')}${priced < i.found.length ? ` · ${i.found.length - priced} not priced` : ''}` : 'nothing to put right', tone: worst === 'r' ? 'r' : i.found.length ? 'a' : 'g' },
    { k: 'Seen', v: String(i.seen.length), of: i.seen.length ? 'measurements, studies and talks' : 'nothing measured', tone: 'n' },
    { k: 'Photos', v: String(i.photos.length), of: i.photos.length ? 'taken on the visit' : 'none taken', tone: 'n' },
  ];
  out.push(leanTiles(tiles));

  out.push(leanHead('What we were asked'));
  out.push(text({ text: i.brief?.trim() || 'No brief was said at the door — the visit is what was seen on the floor.', size: 9.5, colour: i.brief ? INK : MUTED, after: 8 }));

  out.push(leanHead('What we saw', i.seen.length ? plural(i.seen.length, 'record') : undefined));
  if (!i.seen.length) out.push(text({ text: 'Nothing measured or studied on the visit.', size: 9, colour: MUTED, after: 8 }));
  i.seen.forEach((s, k) => out.push(text({ text: `${s.what} — ${s.says}`, size: 9, colour: INK2, indent: 10, bullet: '•', after: k === i.seen.length - 1 ? 8 : 2 })));

  out.push(leanHead('What we found', i.found.length ? `${plural(i.found.length, 'problem')}${priced ? ` · ${priced} priced` : ''}` : undefined));
  out.push(...leanActions(i.found.map(f => ({ what: `${f.what}${f.money ? ` — ${f.money}` : ' — not priced: no minutes, rejects or held packs said yet'}`, ...(f.who ? { who: f.who } : {}), state: `${f.where} · ${f.priority === 'critical' ? 'Critical' : f.priority === 'high' ? 'High' : 'Low'}`, tone: f.priority === 'critical' ? 'r' as const : f.priority === 'high' ? 'a' as const : 'n' as const })), 'Nothing found to put right.'));

  if (i.photos.length) {
    out.push(leanHead('Photos', plural(i.photos.length, 'photo')));
    for (const p of i.photos) out.push(photo(p.caption, p.pic));
  }

  out.push(leanHead('What we recommend next'));
  out.push(text({ text: i.recommend?.trim() || 'Nothing written yet.', size: 9.5, colour: i.recommend?.trim() ? INK : MUTED, after: 8 }));

  out.push(leanHead('What the figures rest on'));
  out.push(text({ text: `Recorded at ${i.client} in Luna on the visit${i.restsOn ? `: ${i.restsOn}` : ''}. Every figure is a record’s own — counted, timed or photographed by a person; money is the line’s own cost model (wage, speed, margin, materials a pack), and a problem with no price says so. Nothing of any other customer is in this report.`, size: 8, colour: INK2, after: 8 }));
  out.push(leanClosing({ text: i.found.length ? `${plural(i.found.length, 'problem')} found at ${i.client} on ${i.day}${priced ? `, ${priced} priced` : ''}.` : `Nothing found to put right at ${i.client} on ${i.day}.`, tone: worst }));
  return out;
}

export async function makeVisitPaper(i: VisitPaperInputs): Promise<jsPDF> {
  const { loadPdfLib } = await import('../savePdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, () => visitBlocks(i));
  await pour({ ...base, density, dry: false }, visitBlocks(i), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); font(doc, 7, 'normal', MUTED); doc.text(`${i.client} · visit of ${i.day} · page ${p} of ${pages}`, W / 2, H - 14, { align: 'center' }); }
  return doc;
}
