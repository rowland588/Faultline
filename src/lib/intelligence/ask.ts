/* ASK — a question about a line answered from the tested functions, and the
 * figures it used shown with the answer (docs/upgrade-plan.md F4). The common
 * shapes are answered here, with no AI and no network: will an extra order fit,
 * the biggest loss, what changed, where the line is held, what it can make.
 * Anything else is said to be outside what it answers — the AI that narrated
 * those was taken out on 20 October (docs/DIRECTION.md: the only AI is the
 * voice and the camera). Pure. */
import type { Change } from './changes';
import type { ConstraintTrend, LineConstraint } from './constraint';
import type { LoadVsDemand } from './demand';
import type { LineRates } from './lineRates';
import type { PeriodWaterfall } from './waterfall';

export interface LineFacts {
  line: string;
  unit: string;
  rates: LineRates;
  fall: PeriodWaterfall;
  constraint?: LineConstraint;
  trend: ConstraintTrend;
  changes: Change[];
  load: LoadVsDemand;
  /** How many of the line's unit make one of another word: { pallets: 360, trays: 10 }. */
  unitsPer: Record<string, number>;
}

export interface Answer {
  /** Matched a shape this function answers; false — hand it on. */
  matched: boolean;
  text: string;
  /** The figures it used, in words — shown under the answer. */
  used: string[];
}

const fmt = (n: number, d = 1) => n.toLocaleString('en-GB', { maximumFractionDigits: d });
const singular = (w: string) => w.toLowerCase().replace(/(es|s)$/, '');

export function askLine(q: string, f: LineFacts): Answer {
  const s = q.toLowerCase();
  /* CAN IT TAKE N MORE <unit>? */
  const m = /(?:take|fit|make|squeeze in|run)\s+(?:an?other|more|an extra|extra)?\s*([\d,.]+)\s*(?:more\s+)?([a-z]+)?/.exec(s);
  if (m && /\b(can|could|will|would|is there room)\b/.test(s)) {
    const n = Number(m[1].replace(/,/g, ''));
    const word = m[2] ?? f.unit;
    const per = singular(word) === singular(f.unit) ? 1 : Object.entries(f.unitsPer).find(([k]) => singular(k) === singular(word))?.[1];
    const rate = f.rates.plannable ?? f.rates.demonstrated;
    if (!per) return { matched: true, text: `I don’t know how many ${f.unit} make a ${singular(word)} on ${f.line} — its Line capacity doesn’t count in ${word}.`, used: [] };
    if (!rate) return { matched: true, text: `${f.line} has no counted shifts to plan on yet, so I can’t say how long ${fmt(n, 0)} ${word} take. Count a shift first.`, used: [f.rates.says] };
    const units = n * per, hours = units / rate / 60;
    const room = f.load.headroomH;
    const used = [`${fmt(n, 0)} ${word} = ${fmt(units, 0)} ${f.unit}`, `planned at ${fmt(rate)} ${f.unit}/min (${f.rates.plannable != null ? 'four shifts in five' : 'a typical shift'})`, f.load.says];
    if (room == null) return { matched: true, text: `${fmt(n, 0)} ${word} take about ${fmt(hours)} h of the line. Whether that fits depends on next week’s orders and its running hours — put them in below.`, used };
    const fits = room >= hours;
    const day = /(mon|tues|wednes|thurs|fri|satur|sun)day/.exec(s)?.[0];
    return { matched: true, used,
      text: `${fits ? 'Yes' : 'No'} — ${fmt(n, 0)} ${word} take about ${fmt(hours)} h; next week has ${room >= 0 ? `${fmt(room)} h spare` : `${fmt(-room)} h too little already`}${day ? ` (said for the week — the day’s plan is not in the app; check ${day[0].toUpperCase()}${day.slice(1)}’s shifts have it)` : ''}.${fits ? '' : ` It would need ${fmt(hours - Math.max(0, room))} h more — an extra shift, or less lost at the ${f.constraint?.name ?? 'constraint'}.`}` };
  }
  /* THE BIGGEST LOSS */
  if (/\b(biggest|largest|worst|top|main)\b.*\b(loss|losses|problem|stop|stops|issue)\b/.test(s) || /\bwhere\b.*\btime go/.test(s)) {
    const b = f.fall.bands[0];
    if (!b) return { matched: true, text: `${f.line} has no counted shifts in the last weeks — count one to see where its time goes.`, used: [] };
    /* the pounds in their two parts, never added into one figure (lib/cost:
       idle labour is money spent, lost contribution is money not made) */
    const money = [b.labour ? `£${fmt(b.labour, 0)} idle labour` : '', b.contribution ? `£${fmt(b.contribution, 0)} lost contribution` : ''].filter(Boolean);
    return { matched: true, used: [f.fall.says, ...(b.says ? [b.says] : [])],
      text: `${b.label}${b.asset ? ` on the ${b.asset}` : ''}: ${fmt(b.min, 0)} min over ${f.fall.shifts} counted shift${f.fall.shifts === 1 ? '' : 's'}${money.length ? `, ${money.join(' · ')}` : ''}. ${b.onConstraint === false ? `But it is not the constraint — fixing it makes no more. The prize is at the ${f.constraint?.name}.` : b.onConstraint ? 'It is on the constraint: every minute back is output.' : ''}`.trim() };
  }
  /* WHAT CHANGED */
  if (/\b(changed|different|new|worse|better|this week)\b/.test(s)) {
    return { matched: true, used: f.changes.map(c => c.says),
      text: f.changes.length ? f.changes.slice(0, 3).map(c => c.says).join(' ') : `Nothing has moved enough to call a change this week on ${f.line} (half again and 30 minutes against the usual, with two weeks or more before).` };
  }
  /* WHERE IT IS HELD */
  if (/\b(constraint|bottleneck|held|holding|limit|limits|limiting)\b/.test(s)) {
    return { matched: true, used: [f.trend.says],
      text: f.constraint ? `${f.line} is held at the ${f.constraint.name} (${f.constraint.products.join(', ')}).${f.trend.moved ? ` But ${f.trend.says[0].toLowerCase()}${f.trend.says.slice(1)}` : ''}` : `Not known yet — work out a product’s Line capacity on ${f.line}.` };
  }
  /* WHAT IT CAN MAKE */
  if (/\b(make|rate|capacity|output|speed|how much|how many)\b/.test(s)) return { matched: true, text: f.rates.says, used: [f.rates.confidence.says] };
  return { matched: false, text: '', used: [] };
}

export const ASK_EXAMPLES = ['Can it take another 40 pallets on Thursday?', 'What’s the biggest loss?', 'What changed this week?', 'Where is the line held?'];
