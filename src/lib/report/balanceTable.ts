/* THE LINE BALANCE ON PAPER — each person's work against their takt, as the
 * screen lays it out (ui/WorkBalance PersonBar): a row a person — who, where
 * on the line, the figure in words — and under it their cycle as a bar,
 * work filled, walking hatched, waiting hollow, the takt a dashed mark and
 * the part past it red. Then what the bottleneck costs, a pack and a minute
 * (lib/ie/balanceLink balanceCostSays). Read by the line balance's own paper
 * (lib/studiesPdf) and by All together's (lib/togetherPdf), so the two
 * never part. Colours: red only for over takt; the three kinds of time by
 * fill, never by a state colour (docs: Visual management). */
import { aPiece, secs, type BalanceFigures, type PersonFigures } from '../../tools/linework/balance';
import { balanceCostSays, type BalanceCost } from '../../tools/linework/balanceLink';
import type { Block, Frame } from './flow';
import { SIZE, font, label, rows, text, wrap } from './blocks';

const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', DANGER = '#c4281c', WORK = '#3c474c', WALK_BG = '#edf1f1';
const BAR = 13;

/** A person's figure in words — the same sentence the screen prints beside them. */
export function personFigure(p: PersonFigures): string {
  const piece = aPiece(p);
  return p.source === 'none' ? `${secs(p.work)}${piece} so far — not all timed`
    : p.takt ? `${secs(p.work)} of ${secs(p.takt)}${piece} takt${p.overBy ? ` — over by ${secs(p.overBy)}` : p.spare ? ` — ${secs(p.spare)} to spare` : ''}`
      : `${secs(p.work)}${piece} a cycle`;
}

function drawBar(fr: Frame, p: PersonFigures, x: number, y: number, w: number): void {
  const d = fr.doc;
  const span = Math.max(p.work, p.takt ?? 0) * 1.06 || 1;
  let at = x;
  d.setLineWidth(0.6);
  for (const e of p.elements) {
    const t = e.standard ?? 0;
    if (t <= 0) continue;
    const sw = (t / span) * w;
    if (e.kind === 'wait') { d.setDrawColor(WORK); d.setFillColor('#ffffff'); d.rect(at, y, sw, BAR, 'FD'); }
    else if (e.kind === 'walk') {
      d.setFillColor(WALK_BG); d.setDrawColor(WORK); d.rect(at, y, sw, BAR, 'FD');
      d.setDrawColor(WORK); d.setLineWidth(0.4);
      for (let k = -BAR; k < sw; k += 4) d.line(Math.max(at, at + k), y + BAR - Math.max(0, -k), Math.min(at + sw, at + k + BAR), y + Math.max(0, k + BAR - sw));
      d.setLineWidth(0.6);
    } else { d.setFillColor(WORK); d.setDrawColor('#ffffff'); d.rect(at, y, sw, BAR, 'FD'); }
    /* the step's name in it, when it fits */
    font(d, 6.5, 'normal', e.kind === 'work' ? '#ffffff' : INK2);
    const name = wrap(d, e.name, sw - 4, 6.5)[0] ?? '';
    if (sw > 24 && name) d.text(name.length < e.name.length ? `${name.slice(0, Math.max(1, name.length - 1))}…` : name, at + 2, y + BAR - 4);
    at += sw;
  }
  if (p.takt) {
    const tx = x + (p.takt / span) * w;
    if (p.work > p.takt) {
      const ow = ((p.work - p.takt) / span) * w;
      d.setDrawColor(DANGER); d.setLineWidth(1.4); d.line(tx, y + BAR + 1.6, tx + ow, y + BAR + 1.6);
    }
    d.setDrawColor('#0f1417'); d.setLineWidth(0.9); d.setLineDashPattern([2, 1.6], 0);
    d.line(tx, y - 1, tx, y + BAR + 3); d.setLineDashPattern([], 0);
  }
}

/** Each person, a row with their bar; the legend; the cost. */
export function balanceBlocks(f: BalanceFigures, o: { cost?: BalanceCost; unit?: string; heading?: string } = {}): Block[] {
  const out: Block[] = [];
  if (!f.people.length) return out;
  out.push(label(o.heading ?? 'Each person against takt'));
  out.push(rows({
    rows: f.people.map(p => ({
      h: (fr: Frame) => 12 + BAR + 10 + Math.max(0, wrap(fr.doc, personFigure(p), fr.w * 0.55, 8).length - 1) * 9,
      draw: (fr: Frame, y: number) => {
        const d = fr.doc;
        font(d, 9, 'bold', INK2); d.text(p.who, fr.x, y + 9);
        const whoW = d.getTextWidth(p.who);
        if (p.station) { font(d, 8, 'normal', MUTED); d.text(` at ${p.station}`, fr.x + whoW, y + 9); }
        const lines = wrap(d, personFigure(p), fr.w * 0.55, 8);
        font(d, 8, p.overBy ? 'bold' : 'normal', p.overBy ? DANGER : INK2);
        lines.forEach((l, i) => d.text(l, fr.x + fr.w, y + 9 + i * 9, { align: 'right' }));
        drawBar(fr, p, fr.x, y + 12 + Math.max(0, lines.length - 1) * 9, fr.w);
        d.setDrawColor(LINE); d.setLineWidth(0.4);
      },
    })),
    after: 's',
  }));
  const walk = f.people.some(p => p.walk > 0), wait = f.people.some(p => p.wait > 0);
  out.push(text({ text: `Filled: work${walk ? ' · hatched: walking' : ''}${wait ? ' · hollow: waiting' : ''} · the dashed mark is takt; red under a bar is the time over it.`, size: SIZE.tiny, colour: MUTED, after: 8 }));
  if (o.cost) {
    const said = balanceCostSays(o.cost, o.unit);
    out.push(label('What it costs'));
    said.lines.forEach((l, i) => out.push(text({ text: l, size: SIZE.small, colour: i === 0 && said.tone === 'r' ? DANGER : INK2, style: i === 0 && said.tone === 'r' ? 'bold' : 'normal', after: 3 })));
  }
  return out;
}
