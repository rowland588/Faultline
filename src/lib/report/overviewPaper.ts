/* THE FACTORY OVERVIEW ON PAPER — the page the customer is shown (screens/OverviewScreen), poured from the same model (lib/overview), so
 * the two never part (13 November, docs/OVERVIEW.md). The band (the customer, the day), who prepared it, the four tiles, then: what is
 * costing the most, what holds each line, where we have looked, what Faultline found, what needs attention, what has improved, since the
 * baseline, and what the figures rest on. Every line is a record's own; a missing figure is said, never filled. A4, the engine's blocks. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { font, text } from './blocks';
import { leanBand, leanHead, leanTiles, leanClosing, leanActions } from './lean';
import { bandPage } from '../lean';
import { preparedByBlocks } from './cover';
import { INK, INK2, MUTED } from '../reportKit';
import { fmtGBP } from '../cost';
import type { Overview } from '../overview';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const PRI = { critical: 'Critical', high: 'High', low: 'Low' } as const;
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function overviewBlocks(o: Overview, printed: string): Block[] {
  const out: Block[] = [];
  const tone = o.risks.some(r => r.tone === 'r') ? 'r' : o.risks.length ? 'a' : 'g';
  const band = bandPage('FACTORY OVERVIEW', { name: o.client || 'The factory' }, undefined, undefined, [['As of', printed]]);
  out.push(leanBand({ ...band, sub: o.coverage.says, verdict: { text: o.says, tone } }, printed));
  out.push(...preparedByBlocks({ client: o.client, today: printed }));
  out.push(leanTiles(o.tiles));

  out.push(leanHead('What is costing the most', o.losses.length ? `${o.losses.length} shown` : undefined));
  out.push(...leanActions(o.losses.map(l => ({
    what: `${l.what}${l.poundsDay != null ? ` — ${fmtGBP(l.poundsDay)} a day` : ' — not priced yet'}`,
    ...(l.owner ? { who: l.owner } : {}),
    state: `${l.line}${l.machine ? ` · ${l.machine}` : ''} · ${PRI[l.priority]}${l.late ? ' · late' : ''}`,
    tone: l.priority === 'critical' || l.late ? 'r' as const : l.priority === 'high' ? 'a' as const : 'n' as const,
  })), 'No problem is open.'));
  if (o.unpriced > 0) out.push(text({ text: `${o.unpriced} of the open problems ${o.unpriced === 1 ? 'has' : 'have'} no cost a day: the minutes it takes, or the line’s rate, is not said yet.`, size: 8.5, colour: MUTED, after: 8 }));

  out.push(leanHead('What holds each line'));
  o.constraints.forEach((c, k) => out.push(text({ text: `${c.line} — ${c.neck ? `held by ${c.neck.join(' and ')}` : 'the bottleneck is not worked out yet'}${c.open ? ` · ${c.open} open` : ''}`, size: 9, colour: c.neck ? INK : INK2, indent: 10, bullet: '•', after: k === o.constraints.length - 1 ? 8 : 2 })));
  if (!o.constraints.length) out.push(text({ text: 'No line is set up yet.', size: 9, colour: MUTED, after: 8 }));

  out.push(leanHead('Where we have looked', o.coverage.lines ? `${o.coverage.looked} of ${o.coverage.lines} lines` : undefined));
  out.push(text({ text: o.coverage.says, size: 9.5, colour: INK, after: 4 }));
  for (const a of o.coverage.areas) {
    out.push(text({ text: a.title.toUpperCase(), size: 7.5, style: 'bold', colour: MUTED, after: 2 }));
    a.lines.forEach((l, k) => out.push(text({
      text: `${l.line} — ${l.studies + l.problems ? `${l.studies} tool record${l.studies === 1 ? '' : 's'}, ${l.problems} problem${l.problems === 1 ? '' : 's'}${l.machines ? `, ${l.machinesLooked} of ${l.machines} machines` : ''}${l.last ? ` · last ${day(l.last)}` : ''}` : 'not looked at yet'}`,
      size: 9, colour: l.studies + l.problems ? INK2 : MUTED, indent: 10, bullet: '•', after: k === a.lines.length - 1 ? 6 : 2 })));
  }

  if (o.findings.length) {
    out.push(leanHead('What Faultline found', `${o.findings.length} shown`));
    o.findings.forEach((f, k) => out.push(text({ text: `${f.line}: ${f.says}${f.money ? ` ${f.money}` : ''} (${f.sure})`, size: 9, colour: INK2, indent: 10, bullet: '•', after: k === o.findings.length - 1 ? 8 : 3 })));
  }

  out.push(leanHead('What needs attention', o.risks.length ? String(o.risks.length) : undefined));
  if (!o.risks.length) out.push(text({ text: 'Nothing stands out.', size: 9, colour: MUTED, after: 8 }));
  o.risks.forEach((r, k) => out.push(text({ text: r.says, size: 9, style: r.tone === 'r' ? 'bold' : 'normal', colour: INK, indent: 10, bullet: '•', after: k === o.risks.length - 1 ? 8 : 2 })));

  out.push(leanHead('What has improved', o.improved.proved.length ? `${o.improved.proved.length} proved` : undefined));
  out.push(text({ text: o.improved.says, size: 9.5, colour: INK, after: 4 }));
  o.improved.proved.forEach((p, k) => out.push(text({ text: `${p.what} — ${p.lineName}${p.machine ? ` · ${p.machine}` : ''}: ${p.proof}`, size: 9, colour: INK2, indent: 10, bullet: '•', after: k === o.improved.proved.length - 1 ? 8 : 2 })));

  out.push(leanHead('Since the baseline', o.progress.since ? day(o.progress.since) : undefined));
  out.push(text({ text: o.progress.says, size: 9.5, colour: INK, after: 4 }));
  o.progress.rows.forEach((r, k) => out.push(text({ text: `${r.k}: ${r.before} then, ${r.now} now${r.better === true ? ' — better' : r.better === false ? ' — worse' : ''}`, size: 9, colour: INK2, indent: 10, bullet: '•', after: k === o.progress.rows.length - 1 ? 8 : 2 })));

  out.push(leanHead('What the figures rest on'));
  out.push(text({ text: `Read from the records kept in Faultline for ${o.client || 'this factory'}: the problems raised, the tools used on each line, the stops timed, each line’s capacity and its own cost model (wage, speed, margin, materials a pack). Every figure is counted, timed or typed by a person; a cost a day is said only where the line can price it; a fix is proved by its own number measured again. The baseline is the first update approved on the Story. Nothing of any other customer is in this report.`, size: 8, colour: INK2, after: 8 }));
  out.push(leanClosing({ text: o.says, tone }));
  return out;
}

export async function makeOverviewPaper(o: Overview, printed: string): Promise<jsPDF> {
  const { loadPdfLib } = await import('../savePdf');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, () => overviewBlocks(o, printed));
  await pour({ ...base, density, dry: false }, overviewBlocks(o, printed), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); font(doc, 7, 'normal', MUTED); doc.text(`${o.client || 'The factory'} · factory overview · ${printed} · page ${p} of ${pages}`, W / 2, H - 14, { align: 'center' }); }
  return doc;
}
