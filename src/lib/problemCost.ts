/* WHAT A PROBLEM COSTS THE LINE WHILE IT IS OPEN (knowledge/specs/FC-154-
 * problem-cost.md; knowledge/MONEY.md §4, FC-154 — causations L and T).
 *
 * Rowland, 24 October: "the cost is merely one of the outputs ... if the
 * user doesn't have that information then the app must handle it
 * gracefully, don't block anything." A problem on the register says, when
 * somebody types it, how many minutes a day it costs the line — a stop,
 * slow running, a workaround — and the line's own cost model says what that
 * is in money, in the loss count's two parts, never blended (docs/CAPACITY.md
 * §6; lib/lineLoss): the crew's labour for the minutes, wherever the problem
 * is; and the packs and the contribution lost only where it stops the line —
 * on its bottleneck, on the whole line, or on no machine named (the
 * bottleneck being Line capacity's, lib/lineLoss neckOf; not known until a
 * product's capacity is counted, and then every problem is counted as
 * stopping the line, said so). Every input optional: the minutes typed on the
 * problem, the wage, speed and margin on the line — the missing one named,
 * the rest still said. Nothing stored but the minutes. */
import type { Workspace } from '../types';
import { fmtGBP, fmtPacks, labourPerHour, ratedPerMin } from './cost';
import { stopsTheLine, type Neck } from './lineLoss';
import { contributionOf } from '../tools/losses/losses';

export type CostLine = Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin' | 'marginPerPack'>;

export interface ProblemCost {
  /** The minutes a day typed on the problem. */
  minutes: number;
  /** The machine it is on, if one is named. */
  machine?: string;
  /** Does it stop the line — its machine the bottleneck, the whole line, or none named? */
  stopsLine: boolean;
  /** Was the bottleneck known (a product's Line capacity on the line)? */
  neckKnown: boolean;
  /** £ of the crew's labour a day for the minutes. */
  labour?: number;
  /** Packs not made a day, and their contribution — only where it stops the line. */
  packs?: number;
  contribution?: number;
  /** What is missing, in the order it is asked. */
  missing: ('wage' | 'speed' | 'margin')[];
  /** The whole sentence (the editor, the card, the report); the short form (the row). */
  words: string;
  short: string;
}

/** The cost, or nothing until the minutes are typed. */
export function problemCost(s: { minutesPerDay?: number }, machine: string | undefined, line: CostLine | undefined, neck: Neck | undefined): ProblemCost | undefined {
  const minutes = s.minutesPerDay;
  if (minutes == null || !(minutes > 0)) return undefined;
  const m = machine?.trim() || undefined;
  const stopsLine = stopsTheLine({ asset: m ?? '' }, neck);
  const out: ProblemCost = { minutes, ...(m ? { machine: m } : {}), stopsLine, neckKnown: !!neck, missing: [], words: '', short: '' };
  const lab = line ? labourPerHour(line) : 0;
  if (lab > 0) out.labour = (minutes / 60) * lab; else out.missing.push('wage');
  if (stopsLine) {
    const rate = line ? ratedPerMin(line) : undefined;
    if (rate !== undefined) {
      out.packs = minutes * rate;
      const c = contributionOf(line);
      if (c) out.contribution = out.packs * c.perPack; else out.missing.push('margin');
    } else out.missing.push('speed');
  }
  out.words = wordsOf(out);
  out.short = shortOf(out);
  return out;
}

const minWord = (n: number) => `${Number(n.toFixed(n >= 10 ? 0 : 1))} min a day`;

/** The money parts as the loss count says them: "£25 labour · 2,000 packs lost · £80 contribution". */
function partsOf(c: ProblemCost): string {
  return [c.labour !== undefined ? `${fmtGBP(c.labour)} labour` : '', c.packs !== undefined ? `${fmtPacks(c.packs)} lost` : '', c.contribution !== undefined ? `${fmtGBP(c.contribution)} contribution` : ''].filter(Boolean).join(' · ');
}

function whereOf(c: ProblemCost): string {
  if (!c.machine) return 'on the line';
  if (!c.neckKnown) return `at ${c.machine} (counted as stopping the line — the bottleneck is not known until the line’s capacity is counted)`;
  return c.stopsLine ? `at ${c.machine}, the bottleneck` : `at ${c.machine} — not the bottleneck, so the line runs round it`;
}

function wordsOf(c: ProblemCost): string {
  const head = `${minWord(c.minutes)} ${whereOf(c)}`;
  const parts = partsOf(c);
  if (c.missing.includes('wage') && !parts) return `${head} — give the line a wage (Set up the line) to say it in money.`;
  const asks = [
    c.missing.includes('wage') ? 'give the line a wage to say the labour' : '',
    c.missing.includes('speed') ? 'give the line a speed to say the packs lost' : '',
    c.missing.includes('margin') ? 'give the line a margin a pack to say the contribution lost' : '',
  ].filter(Boolean);
  return `${head}: ${parts} a day${asks.length ? `; ${asks.join('; ')}` : ''}.`;
}

function shortOf(c: ProblemCost): string {
  const parts = partsOf(c);
  return parts ? `${parts} a day` : `${minWord(c.minutes)} — give the line a wage`;
}

/** THE REGISTER'S SUM — what the open problems that say their minutes cost a day, and how many say them. */
export interface RegisterCost { open: number; said: number; labour: number; contribution: number; packs: number; words: string }

export function registerCost(rows: readonly { status: string; cost?: ProblemCost }[]): RegisterCost {
  const open = rows.filter(r => r.status !== 'closed');
  const said = open.filter(r => r.cost);
  const labour = said.reduce((n, r) => n + (r.cost?.labour ?? 0), 0);
  const contribution = said.reduce((n, r) => n + (r.cost?.contribution ?? 0), 0);
  const packs = said.reduce((n, r) => n + (r.cost?.packs ?? 0), 0);
  const money = [labour > 0 ? `${fmtGBP(labour)} labour` : '', contribution > 0 ? `${fmtGBP(contribution)} contribution` : ''].filter(Boolean).join(' and ');
  const words = !said.length ? '' : money
    ? `The ${said.length} open ${said.length === 1 ? 'problem that says its' : 'problems that say their'} minutes cost the line ${money} a day${packs > 0 ? ` (${fmtPacks(packs)} not made)` : ''}${open.length > said.length ? ` — ${open.length - said.length} more say no minutes yet` : ''}.`
    : `${said.length} open ${said.length === 1 ? 'problem says its' : 'problems say their'} minutes a day; give the line a wage (Set up the line) to say them in money.`;
  return { open: open.length, said: said.length, labour, contribution, packs, words };
}
