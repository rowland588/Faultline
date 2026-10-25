/* THE LINE BALANCE'S OTHER PAPERS — the time study, the combination table, the machines one person can tend, the
 * order of the work and the questions asked of each step (knowledge/specs/FC-032-line-balance.md §7, The report).
 *
 * Read by the Line balance's own paper (lib/studiesPdf studyBlocks) from the SAME modules the page's lenses read
 * (tools/linework), so the two never part. Each section appears only when the record has the thing — a balance
 * with no machine step, no order and no decision prints the times and nothing more. Colours: red only for over takt
 * or a loop; the kinds of time by fill and word, never a state colour (CLAUDE.md, Visual management). */
import type { AgreedBalance, BalanceCrew, BalanceStep } from '../study';
import { aPiece, balance, reuseSays, secs, suggest, type BalanceFigures, type ElementFigures } from '../../tools/linework/balance';
import { allowanceMoney, allowanceSays, plannedPerHour } from '../../tools/linework/allowance';
import { combination, tend, tendInput, tendSays, waitMoney, type CombinationRow } from '../../tools/linework/timeline';
import { brokenOrder, findLoop, positionalWeights, proposalSays, rankedPositional } from '../../tools/linework/order';
import { improve, improveMoney, improveMoneySays, improveSays, HOW_WORD } from '../../tools/linework/improve';
import { reusedSays } from '../../tools/linework/standardData';
import type { Block, Frame } from './flow';
import { SIZE, font, label, rows, space, text, wrap } from './blocks';

const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', DANGER = '#c4281c', WORK = '#3c474c', WORK_BG = '#dde6e6', WALK_BG = '#edf1f1';
const LH = 9, BAR = 11;
const m = (v: number) => `£${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;

/** A table whose cells wrap inside their columns, a row as tall as its longest cell. */
function table(header: string[], body: string[][], shares: number[], red?: (i: number) => boolean): Block {
  const lines = (f: Frame, cells: string[], bold: boolean) => cells.map((c, i) => { font(f.doc, 7.5, bold ? 'bold' : 'normal', INK2); return wrap(f.doc, c, f.w * shares[i] - 6, 7.5); });
  const row = (cells: string[], bold: boolean, r = false) => ({
    h: (f: Frame) => Math.max(...lines(f, cells, bold).map(l => l.length)) * LH + 4,
    draw: (fr: Frame, y: number) => {
      let x = fr.x;
      lines(fr, cells, bold).forEach((ls, i) => { font(fr.doc, 7.5, bold ? 'bold' : 'normal', bold ? MUTED : r ? DANGER : INK2); ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH)); x += fr.w * shares[i]; });
      if (bold) { fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); const h = Math.max(...lines(fr, cells, bold).map(l => l.length)) * LH + 2; fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h); }
    },
  });
  return rows({ header: row(header, true), rows: body.map((b, i) => row(b, false, red?.(i) ?? false)), after: 'm' });
}

const say = (t: string, o: { red?: boolean; bold?: boolean; after?: number; size?: number; muted?: boolean } = {}): Block =>
  text({ text: t, size: o.size ?? SIZE.small, colour: o.red ? DANGER : o.muted ? MUTED : INK2, ...(o.bold || o.red ? { style: 'bold' as const } : {}), after: o.after ?? 3 });

/* ------------------------------------------------------------- the times */

function paceCell(e: ElementFigures): string {
  if (e.kind === 'machine') return 'machine';
  if (e.source === 'timed') return e.rated ? String(e.rating) : 'not rated (100)';
  return '—';
}

export function timesBlocks(f: BalanceFigures, a: AgreedBalance | undefined, o: { rate?: number }): Block[] {
  if (!f.elements.length) return [];
  const out: Block[] = [label('Times — observed, pace, basic, standard')];
  out.push(say('Observed is the mean of the timed laps; basic = observed × pace ÷ 100; standard = basic + the allowance. The pace is a trained observer’s judgement (100 is the standard pace, BS 3138); a step never rated is taken at 100 and says so; a machine’s run is never rated and carries no allowance.', { muted: true, size: SIZE.tiny, after: 4 }));
  const body = f.people.flatMap(p => p.elements.map(e => [
    e.name, p.who,
    e.source === 'timed' ? `${e.n} of ${e.needed}${e.enough ? '' : ' (short)'}` : '—',
    e.observed != null ? secs(e.observed) : '—',
    paceCell(e),
    e.basic != null ? secs(e.basic) : '—',
    e.standard != null ? `${secs(e.standard)}${e.source === 'typed' ? ' typed' : e.source === 'library' ? ' reused' : ''}` : 'not timed yet',
    e.source === 'timed' && e.margin != null ? `±${(e.margin * 100).toFixed(1)}%` : '—',
  ]));
  const flat = f.people.flatMap(p => p.elements);
  out.push(table(['Step', 'Whose', 'Cycles', 'Observed', 'Pace', 'Basic', 'Standard', '± at 95%'], body, [0.25, 0.09, 0.11, 0.1, 0.12, 0.09, 0.14, 0.1], i => flat[i]?.source === 'timed' && !flat[i]?.enough));
  for (const p of f.people) {
    if (!(p.work > 0)) continue;
    out.push(say(`${p.who}’s task: standard ${secs(p.work)}${aPiece(p)}${p.source !== 'none' ? ` — ${Math.round(plannedPerHour(p.work) ?? 0).toLocaleString('en-GB')}${p.unit ? ` ${p.unit}` : ''} an hour planned` : ' so far — not all timed'}.`, { after: 1 }));
  }
  out.push(say(allowanceSays(a), { after: 2 }));
  const money = allowanceMoney(f, a, o.rate);
  if (money.text) out.push(say(money.text, { after: 2 }));
  if (money.missing) out.push(say(money.missing, { muted: true, after: 2 }));
  const reused = reusedSays(f);
  if (reused) out.push(say(reused.text, { after: 2 }));
  for (const e of flat.filter(x => x.source === 'library' && x.reuse)) out.push(say(`${e.name}: ${reuseSays(e.reuse as NonNullable<typeof e.reuse>)}.`, { muted: true, size: SIZE.tiny, after: 1 }));
  out.push(space('s'));
  return out;
}

/* ----------------------------------------------- the combination table */

function chart(r: CombinationRow): Block {
  const H = 8 + 2 * (BAR + 4) + 14;
  return rows({
    rows: [{
      h: () => H,
      draw: (fr: Frame, y: number) => {
        const d = fr.doc, L = 52, w = fr.w - L;
        const span = Math.max(r.tl.cycle, r.takt ?? 0) * 1.05 || 1;
        const X = (v: number) => fr.x + L + (v / span) * w;
        const lane = (i: number) => y + 8 + i * (BAR + 4);
        font(d, 7, 'bold', INK2); d.text(r.who, fr.x, lane(0) + BAR - 2); d.text('Machine', fr.x, lane(1) + BAR - 2);
        const box = (kind: string, a: number, b: number, i: number, name: string) => {
          const x0 = X(a), ww = Math.max(1, X(b) - X(a));
          d.setLineWidth(0.7); d.setDrawColor(WORK); d.setLineDashPattern([], 0);
          if (kind === 'wait') { d.setFillColor('#ffffff'); d.setLineDashPattern([2, 1.5], 0); d.rect(x0, lane(i), ww, BAR, 'FD'); }
          else if (kind === 'machine') { d.setFillColor(WALK_BG); d.setLineDashPattern([0.6, 1.8], 0); d.setLineWidth(1.1); d.rect(x0, lane(i), ww, BAR, 'FD'); }
          else if (kind === 'walk') {
            d.setFillColor(WALK_BG); d.rect(x0, lane(i), ww, BAR, 'FD'); d.setLineWidth(0.4);
            for (let k = -BAR; k < ww; k += 4) d.line(Math.max(x0, x0 + k), lane(i) + BAR - Math.max(0, -k), Math.min(x0 + ww, x0 + k + BAR), lane(i) + Math.max(0, k + BAR - ww));
          } else { d.setFillColor(WORK_BG); d.rect(x0, lane(i), ww, BAR, 'FD'); }
          d.setLineDashPattern([], 0);
          font(d, 6.3, 'normal', INK2);
          const t = wrap(d, name, ww - 4, 6.3)[0] ?? '';
          if (ww > 26 && t) d.text(t.length < name.length ? `${t.slice(0, Math.max(1, t.length - 1))}…` : t, x0 + 2, lane(i) + BAR - 3);
        };
        for (const g of r.tl.segs) if (g.sec > 0) box(g.kind === 'machine' ? 'machine' : g.kind, g.start, g.end, g.kind === 'machine' ? 1 : 0, g.name);
        if (r.tl.personWaits > 0.05) box('wait', r.tl.personEnd, r.tl.cycle, 0, 'waits');
        if (r.tl.machineWaits > 0.05) box('wait', r.tl.machineEnd, r.tl.personEnd, 1, 'waits');
        if (r.takt != null) { d.setDrawColor('#0f1417'); d.setLineWidth(0.9); d.setLineDashPattern([2, 1.6], 0); d.line(X(r.takt), y + 2, X(r.takt), lane(1) + BAR + 3); d.setLineDashPattern([], 0); }
        font(d, 6.5, 'normal', MUTED); d.text('0', X(0), lane(1) + BAR + 11); d.text(secs(r.tl.cycle), X(r.tl.cycle), lane(1) + BAR + 11, { align: 'center' });
        if (r.takt != null) d.text(`takt ${secs(r.takt)}`, Math.min(X(r.takt) + 3, fr.x + fr.w - 40), y + 6);
      },
    }],
    after: 's',
  });
}

export function combinationBlocks(f: BalanceFigures, o: { rate?: number }): Block[] {
  const rowsOf = combination(f.people);
  if (!rowsOf.length) return [];
  const out: Block[] = [label('Combination table — the person and the machine')];
  out.push(say('Each person’s steps on one time scale with the machine’s own run beside them. A machine step starts when the step before it ends and goes on while the person carries on; the cycle is the longer of the two. Solid: their own work · hatched: walking · dashed hollow: waiting · dotted: the machine running · the dashed mark is takt.', { muted: true, size: SIZE.tiny, after: 4 }));
  for (const r of rowsOf) {
    out.push(chart(r));
    out.push(say(r.says, { red: r.overBy > 0, after: 2 }));
    const w = waitMoney(r, o.rate);
    if (w.text || w.missing) out.push(say(w.text || w.missing || '', { muted: !w.text, after: 6 }));
    else out.push(space('s'));
  }
  return out;
}

/* ----------------------------------------- how many machines can be tended */

export function tendBlocks(f: BalanceFigures, tendFacts: Record<string, { machineRate?: number; packsPerCycle?: number }> | undefined, o: { rate?: number; contribution?: number }): Block[] {
  const out: Block[] = [];
  for (const p of f.people) {
    const i = tendInput(p);
    if (!i) continue;
    const mine = tendFacts?.[p.who] ?? {};
    const t = tend(p.who, i, { ...(o.rate ? { operatorRate: o.rate } : {}), ...(mine.machineRate ? { machineRate: mine.machineRate } : {}) });
    const said = tendSays(t, { ...(mine.packsPerCycle ? { packsPerCycle: mine.packsPerCycle } : {}), ...(o.contribution ? { contributionPerPack: o.contribution } : {}) });
    if (!out.length) out.push(label('How many machines one person can tend'));
    out.push(say(said.text, { bold: true, after: 2 }));
    for (const l of said.lines) out.push(say(l, { after: 2 }));
    const withOp = t.rows.some(r => r.operatorCost != null), withAll = t.rows.some(r => r.allCost != null);
    out.push(table(['Machines', 'Cycle', 'An hour', `${p.who} idle`, 'Each machine waits', ...(withOp ? ['Labour a cycle'] : []), ...(withAll ? ['With machines'] : [])],
      t.rows.map(r => [String(r.n), secs(r.cycle), r.perHour.toFixed(1), r.idle > 0.05 ? secs(r.idle) : '—', r.machineWaits > 0.05 ? secs(r.machineWaits) : '—', ...(withOp ? [r.operatorCost != null ? m(r.operatorCost) : '—'] : []), ...(withAll ? [r.allCost != null ? m(r.allCost) : '—'] : [])]),
      withOp && withAll ? [0.12, 0.13, 0.1, 0.15, 0.2, 0.15, 0.15] : withOp ? [0.14, 0.16, 0.12, 0.18, 0.22, 0.18] : [0.16, 0.2, 0.16, 0.2, 0.28]));
  }
  if (out.length) out.push(say('Synchronous servicing assumes identical machines and a fixed cycle; machines that stop at random keep a person waiting in a way it does not work out. Waiting steps are left out of it.', { muted: true, size: SIZE.tiny, after: 6 }));
  return out;
}

/* --------------------------------------------------- the order of the work */

export function orderBlocks(f: BalanceFigures): Block[] {
  const given = f.elements.filter(e => e.after.length);
  if (!given.length) return [];
  const items = f.elements.filter(e => e.kind !== 'wait').map(e => ({ id: e.id, name: e.name, t: e.standard ?? 0, after: e.after }));
  const byId = new Map(f.elements.map(e => [e.id, e]));
  const out: Block[] = [label('The order the work must follow')];
  const loop = findLoop(items);
  if (loop) out.push(say(`The order goes round in a circle — ${loop.map(id => byId.get(id)?.name ?? id).join(' → ')} — so no balance is proposed.`, { red: true }));
  const w = loop ? {} : positionalWeights(items);
  out.push(table(['Step', 'Whose', 'Must follow', 'Weight'], f.elements.filter(e => e.kind !== 'wait').map(e => [e.name, e.who, e.after.map(id => byId.get(id)?.name).filter(Boolean).join(', ') || '—', w[e.id] != null ? secs(w[e.id]) : '—']), [0.34, 0.12, 0.38, 0.16]));
  for (const b of brokenOrder(f)) out.push(say(b, { red: true, after: 2 }));
  const ghost = suggest(f);
  if (!loop && ghost && f.taktSec) {
    const prop = rankedPositional(items, f.taktSec);
    if ('stations' in prop) {
      out.push(say(proposalSays(prop, f.taktSec, f.people.length).text, { after: 3 }));
      out.push(table(['Person', 'Steps', 'Work'], ghost.map(g => [g.who, g.ids.map(id => byId.get(id)?.name).join(' · '), `${secs(g.work)} of ${secs(f.taktSec as number)}`]), [0.14, 0.62, 0.24], i => ghost[i].work > (f.taktSec as number) + 1e-9));
    }
  }
  return out;
}

/* ------------------------------------------------------ the questions asked */

export function improveBlocks(steps: BalanceStep[], a: AgreedBalance | undefined, crew: readonly BalanceCrew[] | undefined, o: { rate?: number }): Block[] {
  if (!steps.some(s => s.ecrs)) return [];
  const r = improve(steps, a, crew);
  const out: Block[] = [label('Method questions — eliminate, combine, rearrange, simplify')];
  const f = r.before;
  const dec = f.elements.flatMap(e => { const d = steps.find(s => s.id === e.id)?.ecrs; return d ? [{ e, d }] : []; });
  const nameOf = (id?: string) => f.elements.find(x => x.id === id)?.name ?? '—';
  out.push(table(['Step', 'Whose', 'Now', 'Decision', 'Expected', 'Why or where'], dec.map(({ e, d }) => [
    e.name, e.who, e.standard != null ? secs(e.standard) : '—', HOW_WORD[d.how],
    d.how === 'E' ? '0' : d.how === 'C' ? `adds ${secs(d.afterSec ?? 0)}` : d.afterSec != null ? secs(d.afterSec) : d.how === 'R' ? 'as now' : '—',
    d.how === 'E' ? d.why ?? 'reason missing' : d.how === 'C' ? `joins ${nameOf(d.into)}` : d.how === 'R' ? (d.to === '' ? 'off the line' : d.to ? `to ${d.to}` : 'stays') : '—',
  ]), [0.22, 0.1, 0.1, 0.14, 0.14, 0.3]));
  const s = improveSays(r);
  out.push(say(s.text, { bold: true, after: 2 }));
  for (const l of s.lines) out.push(say(l, { after: 2 }));
  const mon = improveMoney(r, o.rate);
  const ms = improveMoneySays(mon.money, mon.missing);
  if (ms) out.push(say(ms, { after: 2 }));
  out.push(say('Every figure here is expected — the work has not been timed again. Time it after the change; that, not this, is the proof.', { muted: true, size: SIZE.tiny, after: 6 }));
  return out;
}

/** Everything a Line balance's paper adds to what it already prints. */
export function lineworkBlocks(steps: BalanceStep[], a: AgreedBalance | undefined, crew: readonly BalanceCrew[] | undefined,
  tendFacts: Record<string, { machineRate?: number; packsPerCycle?: number }> | undefined, o: { rate?: number; contribution?: number }): Block[] {
  const f = balance(steps, a, crew);
  return [...timesBlocks(f, a, o), ...combinationBlocks(f, o), ...tendBlocks(f, tendFacts, o), ...orderBlocks(f), ...improveBlocks(steps, a, crew, o)];
}
