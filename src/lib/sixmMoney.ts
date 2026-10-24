/* WHAT A 6M PROBLEM COSTS A WEEK, AND WHAT ITS COUNTERMEASURES SHOULD BE
 * WORTH (knowledge/specs/FC-146-sixm-money.md; knowledge/MONEY.md §4, FC-146
 * — causations L and T, through the problem's own number).
 *
 * Rowland, 24 October: "the cost is merely one of the outputs ... don't
 * block anything." A 6M problem's number is hours a week lost in its scope
 * (lib/fishbone measureOf — a Pareto bar, the constraint, something seen);
 * the line's cost model prices hours the way the loss count prices a stop
 * (docs/CAPACITY.md §6; lib/lineLoss): the crew's labour for every hour, and
 * the packs and contribution lost only where the scope stops the line — its
 * machine the bottleneck (Line capacity's), or the whole line. Before, now and
 * the target each in money; what has been saved so far; what the target is
 * worth. A countermeasure's worth is the share of the problem it should
 * remove — the A3's expected effect, typed before it is done (Shook 2008;
 * Sobek & Smalley 2008) — × the problem's £ before. A gap problem (a measure
 * in its own unit) has no money here, and says so. Every line input optional;
 * the missing one named. Nothing stored but the share. */
import type { Workspace } from '../types';
import { fmtGBP, fmtPacks, labourPerHour, ratedPerMin } from './cost';
import { stopsTheLine, type Neck } from './lineLoss';
import { contributionOf } from '../tools/losses/losses';
import type { ProblemMeasure } from './problems';

export type CostLine = Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin' | 'marginPerPack'>;

/** Two parts, never blended (Rowland, 14 October). */
export interface Parts { labour?: number; packs?: number; contribution?: number }

export interface ProblemMoney {
  /** The hours a week the money is of. */
  before?: number; now?: number; target?: number;
  /** Each in money. */
  beforeMoney?: Parts; nowMoney?: Parts; targetMoney?: Parts;
  /** before − now, when both are known; before − target. */
  saved?: Parts; targetWorth?: Parts;
  /** Does the scope stop the line, and was the bottleneck known? */
  stopsLine: boolean; neckKnown: boolean;
  missing: ('wage' | 'speed' | 'margin')[];
  /** The whole sentence (the problem card, the report). */
  words: string;
}

const partsOf = (hours: number, perHour: Parts): Parts => ({
  ...(perHour.labour !== undefined ? { labour: hours * perHour.labour } : {}),
  ...(perHour.packs !== undefined ? { packs: hours * perHour.packs } : {}),
  ...(perHour.contribution !== undefined ? { contribution: hours * perHour.contribution } : {}),
});
const minus = (a: Parts, b: Parts): Parts => ({
  ...(a.labour !== undefined && b.labour !== undefined ? { labour: a.labour - b.labour } : {}),
  ...(a.packs !== undefined && b.packs !== undefined ? { packs: a.packs - b.packs } : {}),
  ...(a.contribution !== undefined && b.contribution !== undefined ? { contribution: a.contribution - b.contribution } : {}),
});
/** "£289 labour · 10,800 packs lost · £648 contribution" — each part only when the line has it. */
export function partsWords(p: Parts, o: { lost?: boolean } = {}): string {
  return [p.labour !== undefined ? `${fmtGBP(Math.abs(p.labour))} labour` : '', p.packs !== undefined ? `${fmtPacks(Math.abs(p.packs))}${o.lost === false ? '' : ' lost'}` : '', p.contribution !== undefined ? `${fmtGBP(Math.abs(p.contribution))} contribution` : ''].filter(Boolean).join(' · ');
}
const hasMoney = (p: Parts | undefined): boolean => !!p && (p.labour !== undefined || p.contribution !== undefined);
const hoursWord = (h: number) => `${Number(h.toFixed(1))} h`;

/** The money, or nothing while the problem's number is not hours a week (a gap problem) or not yet measured. */
export function problemMoney(m: ProblemMeasure | null | undefined, scope: { asset?: string; whole?: boolean } | undefined, line: CostLine | undefined, neck: Neck | undefined): ProblemMoney | undefined {
  if (!m || m.unit !== 'h a week' || (m.before == null && m.now == null)) return undefined;
  const stopsLine = scope?.whole !== false || !scope.asset ? true : stopsTheLine({ asset: scope.asset }, neck);
  const out: ProblemMoney = { stopsLine, neckKnown: !!neck, missing: [], words: '',
    ...(m.before != null ? { before: m.before } : {}), ...(m.now != null ? { now: m.now } : {}), ...(m.target != null ? { target: m.target } : {}) };
  const perHour: Parts = {};
  const lab = line ? labourPerHour(line) : 0;
  if (lab > 0) perHour.labour = lab; else out.missing.push('wage');
  if (stopsLine) {
    const rate = line ? ratedPerMin(line) : undefined;
    if (rate !== undefined) {
      perHour.packs = rate * 60;
      const c = contributionOf(line);
      if (c) perHour.contribution = perHour.packs * c.perPack; else out.missing.push('margin');
    } else out.missing.push('speed');
  }
  if (m.before != null) out.beforeMoney = partsOf(m.before, perHour);
  if (m.now != null) out.nowMoney = partsOf(m.now, perHour);
  if (m.target != null) out.targetMoney = partsOf(m.target, perHour);
  if (out.beforeMoney && out.nowMoney) out.saved = minus(out.beforeMoney, out.nowMoney);
  if (out.beforeMoney && out.targetMoney) out.targetWorth = minus(out.beforeMoney, out.targetMoney);
  out.words = wordsOf(out, scope);
  return out;
}

function whereOf(c: ProblemMoney, scope: { asset?: string; whole?: boolean } | undefined): string {
  if (!scope || scope.whole !== false || !scope.asset) return 'on the line';
  if (!c.neckKnown) return `at ${scope.asset} (counted as stopping the line — the bottleneck is not known until the line’s capacity is counted)`;
  return c.stopsLine ? `at ${scope.asset}, the bottleneck` : `at ${scope.asset} — not the bottleneck, so the line runs round it`;
}

function wordsOf(c: ProblemMoney, scope: { asset?: string; whole?: boolean } | undefined): string {
  const base = c.before ?? c.now ?? 0;
  const head = `${hoursWord(base)} a week ${whereOf(c, scope)}`;
  const baseMoney = c.beforeMoney ?? c.nowMoney;
  if (!hasMoney(baseMoney) && !(baseMoney?.packs !== undefined)) return `${head} — give the line a wage (Set up the line) to say it in money.`;
  const parts = [`${head}: ${partsWords(baseMoney as Parts)} a week${c.before != null ? ' when it opened' : ''}`];
  if (c.before != null && c.now != null && c.saved) {
    const better = (c.saved.labour ?? c.saved.contribution ?? c.saved.packs ?? 0) >= 0;
    parts.push(`now ${hoursWord(c.now)} — ${partsWords(c.saved, { lost: false })} a week ${better ? 'less' : 'more'}`);
  }
  if (c.target != null && c.targetWorth) parts.push(`the target (${hoursWord(c.target)}) is worth ${partsWords(c.targetWorth, { lost: false })} a week`);
  const asks = [
    c.missing.includes('wage') ? 'give the line a wage to say the labour' : '',
    c.missing.includes('speed') ? 'give the line a speed to say the packs lost' : '',
    c.missing.includes('margin') ? 'give the line a margin a pack to say the contribution lost' : '',
  ].filter(Boolean);
  return `${parts.join('; ')}${asks.length ? `; ${asks.join('; ')}` : ''}.`;
}

/** A COUNTERMEASURE'S WORTH — its typed share of the problem × the problem's £ when it opened. */
export interface CounterWorth { pct: number; parts: Parts; words: string }

export function counterWorth(pct: number | undefined, money: ProblemMoney | undefined): CounterWorth | undefined {
  if (pct == null || !(pct > 0) || !money) return undefined;
  const base = money.beforeMoney ?? money.nowMoney;
  if (!base || (!hasMoney(base) && base.packs === undefined)) return { pct, parts: {}, words: `Should remove ${Number(pct.toFixed(1))}% of the problem — give the line a wage to say what that is worth.` };
  const parts = partsOf(pct / 100, base);
  return { pct, parts, words: `Should remove ${Number(pct.toFixed(1))}% of the problem: ${partsWords(parts, { lost: false })} a week.` };
}

/** THE BOARD'S SUM for one problem — what its countermeasures say they should remove together. */
export function boardWorth(pcts: readonly (number | undefined)[], money: ProblemMoney | undefined): { pct: number; said: number; parts: Parts; words: string } | undefined {
  const said = pcts.filter((p): p is number => p != null && p > 0);
  if (!said.length || !money) return undefined;
  const pct = said.reduce((n, p) => n + p, 0);
  const base = money.beforeMoney ?? money.nowMoney;
  const parts = base ? partsOf(pct / 100, base) : {};
  const over = pct > 100 ? ' — more than the whole problem, so the shares want looking at' : '';
  const words = base && (hasMoney(base) || base.packs !== undefined)
    ? `The ${said.length} ${said.length === 1 ? 'countermeasure that says its share' : 'countermeasures that say their shares'} should remove ${Number(pct.toFixed(1))}% of the problem: ${partsWords(parts, { lost: false })} a week${over}.`
    : `${said.length} ${said.length === 1 ? 'countermeasure says its share' : 'countermeasures say their shares'} (${Number(pct.toFixed(1))}%); give the line a wage to say what that is worth${over}.`;
  return { pct, said: said.length, parts, words };
}
