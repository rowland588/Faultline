/* COST DEPLOYMENT — FC-057 (knowledge/specs/FC-057-cost-deployment.md; equipment.cost-deployment). */
import {
  CD_LOSSES,
  CD_PROCESSES,
  CD_WORKED_MATRIX,
  cdLossLabel,
  cdMatrixTotal,
  cdWork,
  type CdLoss,
  type CdMatrix,
  type CdProcess,
} from '../../../lib/ie/costDeployment';
import { fmt, gbp } from '../format';
import type { CalcDef, Problem, Values } from '../types';

const cellId = (loss: CdLoss, process: CdProcess) => `${loss}__${process}`;

const matrixFields = CD_LOSSES.flatMap(loss =>
  CD_PROCESSES.map(process => ({
    id: cellId(loss, process),
    label: `${cdLossLabel(loss)} · ${process.replace('_', ' ')}`,
    unit: '£',
    kind: 'number' as const,
    min: 0,
    optional: true,
    help: 'Pounds in the period — already converted from minutes or packs elsewhere.',
  })),
);

const num = (v: Values, id: string): number | undefined => {
  const x = v[id];
  return typeof x === 'number' && x >= 0 ? x : undefined;
};

const matrixFrom = (v: Values): CdMatrix => {
  const m: CdMatrix = {};
  for (const loss of CD_LOSSES) {
    for (const process of CD_PROCESSES) {
      const val = num(v, cellId(loss, process));
      if (val !== undefined && val > 0) {
        const row = m[loss] ?? (m[loss] = {});
        row[process] = val;
      }
    }
  }
  return m;
};

const def: CalcDef = {
  key: 'cost-deployment',
  fc: 'FC-057',
  title: 'Cost deployment',
  says: 'Losses by type and process in pounds — ranked so the next project pays back',
  question: 'Where is the line losing money, and which fix returns most?',
  group: 'Losses in money',
  inputs: [
    { id: 'period', label: 'Period', kind: 'text', optional: true, help: 'e.g. Week ending 12 Oct — names the paper only.' },
    ...matrixFields,
    { id: 'causal_loss', label: 'Causal move — loss type', kind: 'choice', optional: true,
      options: CD_LOSSES.map(l => ({ value: l, label: cdLossLabel(l) })),
      help: 'Move value from where a loss shows to where it is caused (WCM resultant → causal).' },
    { id: 'causal_from', label: 'From process', kind: 'choice', optional: true, options: CD_PROCESSES.map(p => ({ value: p, label: p.replace('_', ' ') })) },
    { id: 'causal_to', label: 'To causal process', kind: 'choice', optional: true, options: CD_PROCESSES.map(p => ({ value: p, label: p.replace('_', ' ') })) },
    { id: 'causal_amount', label: 'Amount to move', unit: '£', kind: 'number', min: 0, optional: true },
    { id: 'project_loss', label: 'Project — which loss', kind: 'choice', optional: true, options: CD_LOSSES.map(l => ({ value: l, label: cdLossLabel(l) })) },
    { id: 'project_recovery', label: 'Recovery expected', unit: '% of that loss', kind: 'number', min: 0, max: 100, optional: true },
    { id: 'project_cost', label: 'Project cost', unit: '£', kind: 'number', min: 0, optional: true, money: true },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    if (cdMatrixTotal(matrixFrom(v)) <= 0) {
      out.push({ block: true, say: 'Type at least one loss in pounds for the period — empty cells stay empty until the records feed them.' });
    }
    const from = v.causal_from as string | undefined;
    const to = v.causal_to as string | undefined;
    const amt = num(v, 'causal_amount');
    if ((from || to || amt) && !(from && to && amt && amt > 0)) {
      out.push({ say: 'A causal move needs the loss type, from and to processes, and an amount in pounds.' });
    }
    return out;
  },
  compute(v) {
    const matrix = matrixFrom(v);
    const moves = (() => {
      const loss = v.causal_loss as CdLoss | undefined;
      const from = v.causal_from as CdProcess | undefined;
      const to = v.causal_to as CdProcess | undefined;
      const amount = num(v, 'causal_amount');
      if (!loss || !from || !to || !(amount && amount > 0)) return undefined;
      return [{ loss, from, to, amount }];
    })();
    const pl = v.project_loss as CdLoss | undefined;
    const recovery = num(v, 'project_recovery');
    const cost = num(v, 'project_cost');
    const project = pl && recovery !== undefined && recovery > 0
      ? { loss: pl, recoveryShare: recovery, cost: cost ?? 0 }
      : undefined;
    const raw = cdWork({ matrix, moves, project });
    if ('problems' in raw) {
      return { verdict: '—', tone: 'n', sentence: raw.problems.join(' '), tiles: [], working: [], caveats: raw.problems, closing: raw.problems[0] ?? '' };
    }
    const top = raw.topLoss;
    const second = raw.byLoss[1];
    let sentence = top
      ? `Losses total ${gbp(raw.total)} a week: ${cdLossLabel(top.loss)} ${gbp(top.total)} (${fmt(top.share * 100, 0)}%)${second ? `, then ${cdLossLabel(second.loss)} ${gbp(second.total)}` : ''}.`
      : `Losses total ${gbp(raw.total)} in the period.`;
    if (raw.movesApplied.length) sentence += ` Causal trace: ${gbp(raw.movesApplied[0].amount)} moved from ${raw.movesApplied[0].from} to ${raw.movesApplied[0].to} on ${cdLossLabel(raw.movesApplied[0].loss)}.`;
    if (raw.projectWeekly !== undefined) {
      sentence += ` A project returning ${fmt(num(v, 'project_recovery') ?? 0, 0)}% of ${pl ? cdLossLabel(pl) : 'that loss'} gives ${gbp(raw.projectWeekly)} a week`;
      if (raw.paybackMonths !== undefined) sentence += ` — about ${fmt(raw.paybackMonths, 1)} months to pay back ${gbp(cost ?? 0)} at 4.33 weeks a month.`;
      else sentence += '.';
    }
    const caveats = [
      'Each cell is pounds you typed — minutes and packs are converted in their own tools, not here.',
      ...raw.refusedMoves,
      ...(raw.movesApplied.length ? [] : ['Causal moves are optional — trace starvation at the filler back from the bagger when you know the link.']),
    ];
    return {
      verdict: top ? `${gbp(raw.total)} · top ${cdLossLabel(top.loss)}` : gbp(raw.total),
      tone: 'n',
      sentence,
      more: raw.byLoss.slice(0, 5).map(r => `${cdLossLabel(r.loss)}: ${gbp(r.total)} (${fmt(r.share * 100, 0)}%)`),
      tiles: [
        { k: 'Total', v: gbp(raw.total), of: typeof v.period === 'string' && v.period.trim() ? v.period.trim() : 'the period', n: raw.total, fmt: gbp },
        top ? { k: 'Top loss', v: gbp(top.total), of: cdLossLabel(top.loss), n: top.total, better: 'lower', fmt: gbp } : { k: 'Top loss', v: '—', of: 'fill the matrix' },
        raw.projectWeekly !== undefined
          ? { k: 'Project return', v: `${gbp(raw.projectWeekly)}/wk`, of: `${fmt(num(v, 'project_recovery') ?? 0, 0)}% recovery`, n: raw.projectWeekly, better: 'higher', fmt: gbp }
          : { k: 'Project return', v: '—', of: 'pick a loss and recovery %' },
        raw.paybackMonths !== undefined
          ? { k: 'Payback', v: `${fmt(raw.paybackMonths, 1)} mo`, of: `on ${gbp(cost ?? 0)} spend`, n: raw.paybackMonths, better: 'lower', fmt: x => `${fmt(x, 1)} mo` }
          : { k: 'Payback', v: '—', of: 'needs project cost' },
      ],
      working: raw.byLoss.map(r => ({ label: cdLossLabel(r.loss), value: gbp(r.total), note: `${fmt(r.share * 100, 1)}% of total` })),
      caveats,
      closing: top ? `Chase ${cdLossLabel(top.loss)} first — it carries ${fmt(top.share * 100, 0)}% of the money on this matrix.` : 'Fill the matrix from the loss count, SMED and capability studies when they link here.',
      picture: undefined,
      money: { missing: ['Money is the cells you typed — each loss keeps its own causation from MONEY.md.'] },
    };
  },
  examples: [
    {
      name: 'Line 2 — one week in pounds (cases-operations.py)',
      source: 'scripts/knowledge/cases-operations.py equipment.cost-deployment',
      inputs: Object.fromEntries(
        CD_LOSSES.flatMap(loss => CD_PROCESSES.map(p => [cellId(loss, p), CD_WORKED_MATRIX[loss]?.[p] ?? ''])),
      ),
      expect: {
        verdict: '£10,100 · top Breakdowns',
        tone: 'n',
        sentence: 'Losses total £10,100 a week: Breakdowns £3,000 (30%), then Give-away £2,200.',
        tiles: { Total: '£10,100', 'Top loss': '£3,000' },
      },
    },
    {
      name: 'SMED on changeover — 60% recovery',
      source: 'cases-operations.py — £1,140/week, six-month payback on £28k',
      inputs: {
        ...Object.fromEntries(CD_LOSSES.flatMap(loss => CD_PROCESSES.map(p => [cellId(loss, p), CD_WORKED_MATRIX[loss]?.[p] ?? '']))),
        project_loss: 'changeover',
        project_recovery: 60,
        project_cost: 28000,
      },
      expect: {
        verdict: '£10,100 · top Breakdowns',
        tone: 'n',
        sentence:
          'Losses total £10,100 a week: Breakdowns £3,000 (30%), then Give-away £2,200. A project returning 60% of Changeover gives £1,140 a week — about 5.7 months to pay back £28,000 at 4.33 weeks a month.',
        tiles: { 'Project return': '£1,140/wk', Payback: '5.7 mo' },
      },
    },
  ],
  refused: [{ name: 'empty matrix', inputs: { period: 'Week' }, blocked: 'at least one loss' }],
};

export default def;
