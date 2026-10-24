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

export type CostLine = Pick<Workspace, 'crew' | 'labourRatePerHour' | 'labourBurden' | 'packsPerMin' | 'marginPerPack' | 'materialsPerPack'>;

export interface ProblemCost {
  /** The minutes a day typed on the problem (part 1); absent when only its rejects or held packs are said. */
  minutes?: number;
  /** Part 2 (M, H): the rejects a day it causes, at the line's materials a pack; the packs it holds, the money tied up in them. */
  rejects?: number; materials?: number;
  held?: number; tiedUp?: number;
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
  missing: ('wage' | 'speed' | 'margin' | 'materials')[];
  /** The whole sentence (the editor, the card, the report); the short form (the row). */
  words: string;
  short: string;
}

/** The cost, or nothing until the minutes are typed. */
const given = (v: number | undefined): v is number => v != null && Number.isFinite(v) && v > 0;

export function problemCost(s: { minutesPerDay?: number; rejectsPerDay?: number; heldPacks?: number }, machine: string | undefined, line: CostLine | undefined, neck: Neck | undefined): ProblemCost | undefined {
  const minutes = given(s.minutesPerDay) ? s.minutesPerDay : undefined;
  const rejects = given(s.rejectsPerDay) ? s.rejectsPerDay : undefined;
  const held = given(s.heldPacks) ? s.heldPacks : undefined;
  if (minutes === undefined && rejects === undefined && held === undefined) return undefined;
  const m = machine?.trim() || undefined;
  const stopsLine = stopsTheLine({ asset: m ?? '' }, neck);
  const out: ProblemCost = { ...(minutes !== undefined ? { minutes } : {}), ...(m ? { machine: m } : {}), stopsLine, neckKnown: !!neck, missing: [], words: '', short: '' };
  if (minutes !== undefined) {
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
  }
  /* part 2 — a reject costs its materials; product held is money tied up at its materials (cost.inventory-carrying-cost: not a daily loss) */
  if (rejects !== undefined || held !== undefined) {
    const u = line?.materialsPerPack;
    const priced = u != null && Number.isFinite(u) && u >= 0;
    if (rejects !== undefined) { out.rejects = rejects; if (priced) out.materials = rejects * u; }
    if (held !== undefined) { out.held = held; if (priced) out.tiedUp = held * u; }
    if (!priced) out.missing.push('materials');
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

/** The minutes' sentence, without its full stop (part 1 — unchanged since 24 October). */
function timeWords(c: ProblemCost & { minutes: number }): string {
  const head = `${minWord(c.minutes)} ${whereOf(c)}`;
  const parts = partsOf(c);
  if (c.missing.includes('wage') && !parts) return `${head} — give the line a wage (Set up the line) to say it in money`;
  const asks = [
    c.missing.includes('wage') ? 'give the line a wage to say the labour' : '',
    c.missing.includes('speed') ? 'give the line a speed to say the packs lost' : '',
    c.missing.includes('margin') ? 'give the line a margin a pack to say the contribution lost' : '',
  ].filter(Boolean);
  return `${head}: ${parts} a day${asks.length ? `; ${asks.join('; ')}` : ''}`;
}

const HELD_NOTE = 'tied up (not lost unless they go out of life)';
const count = (n: number) => Math.round(n).toLocaleString('en-GB');

/** The rejects' and the held product's sentence (part 2), without its full stop. */
function stockWords(c: ProblemCost): string[] {
  if (c.rejects === undefined && c.held === undefined) return [];
  if (c.missing.includes('materials')) {
    const what = [c.rejects !== undefined ? `${count(c.rejects)} rejects a day` : '', c.held !== undefined ? `${fmtPacks(c.held)} on hold` : ''].filter(Boolean).join(' and ');
    return [`${what} — give the line a pack’s materials (Set up the line) to say them in money`];
  }
  return [
    c.rejects !== undefined && c.materials !== undefined ? `${count(c.rejects)} rejects a day: ${fmtGBP(c.materials)} materials` : '',
    c.held !== undefined && c.tiedUp !== undefined ? `${fmtPacks(c.held)} on hold: ${fmtGBP(c.tiedUp)} ${HELD_NOTE}` : '',
  ].filter(Boolean);
}

function wordsOf(c: ProblemCost): string {
  const bits = [...(c.minutes !== undefined ? [timeWords(c as ProblemCost & { minutes: number })] : []), ...stockWords(c)];
  return `${bits.join('; ')}.`;
}

function shortOf(c: ProblemCost): string {
  const bits: string[] = [];
  if (c.minutes !== undefined) { const parts = partsOf(c); bits.push(parts ? `${parts} a day` : `${minWord(c.minutes)} — give the line a wage`); }
  if (c.materials !== undefined) bits.push(`${fmtGBP(c.materials)} materials a day`);
  if (c.tiedUp !== undefined) bits.push(`${fmtGBP(c.tiedUp)} tied up`);
  if ((c.rejects !== undefined || c.held !== undefined) && c.missing.includes('materials')) bits.push('give the line a pack’s materials');
  return bits.join(' · ');
}

/** THE REGISTER'S SUM — what the open problems that say their minutes cost a day, and how many say them. */
export interface RegisterCost { open: number; said: number; labour: number; contribution: number; packs: number; /** part 2: the open problems' rejects in materials a day, and the product they hold */ materials: number; tiedUp: number; words: string }

export function registerCost(rows: readonly { status: string; cost?: ProblemCost }[]): RegisterCost {
  const open = rows.filter(r => r.status !== 'closed');
  const said = open.filter(r => r.cost);
  const timeSaid = said.filter(r => r.cost?.minutes !== undefined);
  const labour = timeSaid.reduce((n, r) => n + (r.cost?.labour ?? 0), 0);
  const contribution = timeSaid.reduce((n, r) => n + (r.cost?.contribution ?? 0), 0);
  const packs = timeSaid.reduce((n, r) => n + (r.cost?.packs ?? 0), 0);
  /* part 2 — the rejects in materials a day, the product held as money tied up */
  const rej = said.filter(r => r.cost?.materials !== undefined), hold = said.filter(r => r.cost?.tiedUp !== undefined);
  const materials = rej.reduce((n, r) => n + (r.cost?.materials ?? 0), 0);
  const tiedUp = hold.reduce((n, r) => n + (r.cost?.tiedUp ?? 0), 0);
  const askMaterials = said.some(r => r.cost?.missing.includes('materials'));
  const anyStock = said.some(r => r.cost?.rejects !== undefined || r.cost?.held !== undefined);
  const out: RegisterCost = { open: open.length, said: said.length, labour, contribution, packs, materials, tiedUp, words: '' };
  if (!said.length) return out;
  const money = [labour > 0 ? `${fmtGBP(labour)} labour` : '', contribution > 0 ? `${fmtGBP(contribution)} contribution` : ''].filter(Boolean).join(' and ');
  const one = timeSaid.length === 1;
  const time = !timeSaid.length ? ''
    : money ? `The ${timeSaid.length} open ${one ? 'problem that says its' : 'problems that say their'} minutes cost the line ${money} a day${packs > 0 ? ` (${fmtPacks(packs)} not made)` : ''}`
    : `${timeSaid.length} open ${one ? 'problem says its' : 'problems say their'} minutes a day; give the line a wage (Set up the line) to say them in money`;
  const stock = [
    rej.length ? `${rej.length} ${rej.length === 1 ? 'says its' : 'say their'} rejects: ${fmtGBP(materials)} materials a day` : '',
    hold.length ? `${hold.length} ${hold.length === 1 ? 'holds' : 'hold'} ${fmtGBP(tiedUp)} of product` : '',
    askMaterials ? 'give the line a pack’s materials (Set up the line) to price the rejects and the product held' : '',
  ].filter(Boolean);
  const rest = open.length > said.length ? ` — ${open.length - said.length} more say no ${anyStock ? 'cost' : 'minutes'} yet` : '';
  if (!time && !rej.length && !hold.length) {
    /* only rejects or held product said, and the line cannot price them yet */
    out.words = `${said.length} open ${said.length === 1 ? 'problem says its' : 'problems say their'} rejects or product held; give the line a pack’s materials (Set up the line) to price them${rest}.`;
    return out;
  }
  out.words = `${time || 'Of the open problems'}${stock.length ? `; ${stock.join('; ')}` : ''}${rest}.`;
  return out;
}
