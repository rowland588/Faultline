/* ECRS ON THE ELEMENTS — ELIMINATE, COMBINE, REARRANGE, SIMPLIFY (FC-028;
 * knowledge/specs/FC-032-line-balance.md §3, §6.6; ie.ecrs).
 *
 * Once the work is timed, each step is questioned in the ILO's order — what is done and why (purpose), where
 * (place), when (sequence), by whom (person), how (means) — and gets a decision: Eliminate, Combine, Rearrange,
 * Simplify, or keep. The order matters: there is no point simplifying what should not exist. Each decision says
 * what the step is EXPECTED to take (a standard time); the balance is then read again from those expected times
 * by the same module that reads the timed ones, so the cycle after, the person over takt, the people needed and
 * the money come out of one place. EXPECTED, until the work is timed again — the page and the paper say so.
 * Nothing here changes the timed work. Pure; the case is scripts/knowledge/cases-time.py §6. */
import type { AgreedBalance, BalanceCrew, BalanceStep, EcrsHow } from '../../lib/study';
import { balance, secs, type BalanceFigures } from './balance';
import type { Tone } from '../capability/sample';

/** The five primary questions of the critical examination, in order, each pointing at the decision it leads to. */
export const QUESTIONS: { q: string; asks: string; leads: string }[] = [
  { q: 'Purpose', asks: 'What is achieved by this step? Is it necessary at all?', leads: 'Eliminate' },
  { q: 'Place', asks: 'Where is it done? Why there?', leads: 'Rearrange' },
  { q: 'Sequence', asks: 'When is it done? Why then — could it join another step?', leads: 'Combine or Rearrange' },
  { q: 'Person', asks: 'Who does it? Why them — or why not the machine?', leads: 'Rearrange' },
  { q: 'Means', asks: 'How is it done? Is there an easier way?', leads: 'Simplify' },
];

export const HOW_WORD: Record<EcrsHow, string> = { E: 'Eliminate', C: 'Combine', R: 'Rearrange', S: 'Simplify' };

/** A step that sounds like a check: quality and food safety are asked before it goes (the record's rule). */
export const soundsLikeACheck = (name: string): boolean => /check|inspect|test|detect|verif|metal|label|code|allergen/i.test(name);

export interface Improve {
  before: BalanceFigures;
  after: BalanceFigures;
  /** Steps with a decision. */
  decided: number;
  counts: Record<EcrsHow, number>;
  /** Work in a piece of the line's unit, seconds, before and after. */
  beforeSec: number;
  afterSec: number;
  savedSec: number;
  /** Words for what needs another look. */
  flags: string[];
  /** Steps whose time is not known, so their effect is not claimed. */
  untimed: number;
  oneOff: number;
}

/** The steps as they would be after the decisions: expected standard times typed in, the removed gone, the moved
 *  with their new person. */
export function afterSteps(steps: readonly BalanceStep[], before: BalanceFigures): { steps: BalanceStep[]; flags: string[] } {
  const std = new Map(before.elements.map(e => [e.id, e.standard]));
  const ids = new Set(steps.map(s => s.id));
  const extra = new Map<string, number>();
  const flags: string[] = [];
  const gone = new Set<string>();
  for (const s of steps) {
    const d = s.ecrs;
    if (!d) continue;
    if (d.how === 'E') {
      gone.add(s.id);
      if (!d.why?.trim()) flags.push(`${s.name}: reason missing — why can it go?`);
      if (soundsLikeACheck(s.name)) flags.push(`${s.name}: ask quality and food safety before a check goes.`);
    }
    else if (d.how === 'C') {
      if (d.into && ids.has(d.into) && d.into !== s.id) { gone.add(s.id); extra.set(d.into, (extra.get(d.into) ?? 0) + (d.afterSec ?? 0)); }
      else flags.push(`${s.name}: Combine names no step to join — left as it is.`);
    } else if (d.how === 'R' && d.to === '') gone.add(s.id);
    else if (d.how === 'S' && d.afterSec == null) flags.push(`${s.name}: Simplify wants the time it is expected to take — left as it is.`);
  }
  const out: BalanceStep[] = [];
  for (const s of steps) {
    if (gone.has(s.id)) continue;
    const d = s.ecrs;
    const base = std.get(s.id);
    let t = base;
    if (d?.how === 'S' && d.afterSec != null) t = d.afterSec;
    if (d?.how === 'R' && d.afterSec != null) t = d.afterSec;
    if (t != null) t += extra.get(s.id) ?? 0;
    const who = d?.how === 'R' && d.to ? d.to : s.who;
    out.push({ id: s.id, order: s.order, name: s.name, who, ...(s.kind ? { kind: s.kind } : {}), ...(t != null && t > 0 ? { typedSec: t } : {}) });
  }
  return { steps: out, flags };
}

export function improve(steps: readonly BalanceStep[] | undefined, agreed: AgreedBalance | undefined, crew?: readonly BalanceCrew[]): Improve {
  const list = steps ?? [];
  const before = balance([...list], agreed, crew);
  const { steps: next, flags } = afterSteps(list, before);
  const after = balance(next, agreed, crew);
  const counts: Record<EcrsHow, number> = { E: 0, C: 0, R: 0, S: 0 };
  for (const s of list) if (s.ecrs) counts[s.ecrs.how]++;
  const decided = counts.E + counts.C + counts.R + counts.S;
  const sum = (f: BalanceFigures) => f.total;
  return { before, after, decided, counts, beforeSec: sum(before), afterSec: sum(after), savedSec: sum(before) - sum(after), flags, untimed: before.untimed,
    oneOff: list.reduce((t, s) => t + (s.ecrs?.oneOff && s.ecrs.oneOff > 0 ? s.ecrs.oneOff : 0), 0) };
}

export interface ImproveMoney { perPack: number; per1000: number; perHour?: number; oneOff: number; paybackHours?: number }

/** What the seconds saved are worth in labour (MONEY.md, FC-028: L): seconds × rate ÷ 3,600 a pack; at takt an
 *  hour; and the one-off cost's payback in running hours at takt. Or the one input it needs. */
export function improveMoney(r: Improve, ratePerHour: number | undefined): { money?: ImproveMoney; missing?: string } {
  if (r.decided === 0 || r.untimed > 0 || !(r.savedSec > 0.0005)) return {};
  if (!(ratePerHour != null && ratePerHour > 0)) return { missing: 'Give the line an hourly rate in Line capacity to say the saving in money.' };
  const perPack = (r.savedSec * ratePerHour) / 3600;
  const takt = r.before.taktSec;
  const perHour = takt ? (perPack * 3600) / takt : undefined;
  return { money: { perPack, per1000: perPack * 1000, ...(perHour != null ? { perHour } : {}), oneOff: r.oneOff, ...(perHour && r.oneOff > 0 ? { paybackHours: r.oneOff / perHour } : {}) } };
}

const pcLess = (a: number, b: number) => (a > 0 ? Math.round((1 - b / a) * 100) : 0);

/** The result in words — expected, until timed again. */
export function improveSays(r: Improve): { text: string; tone: Tone; lines: string[] } {
  if (!r.before.elements.length) return { text: 'List and time the work first — then question each step.', tone: 'n', lines: [] };
  if (r.decided === 0) return { text: 'No step has a decision yet. Ask each in turn: why is it done (purpose), where, when, by whom, and how — then Eliminate, Combine, Rearrange or Simplify it.', tone: 'n', lines: [] };
  if (r.untimed) return { text: `${r.untimed} step${r.untimed === 1 ? ' has' : 's have'} no time yet, so what the decisions save cannot be said. Time them (or type a time), then come back.`, tone: 'a', lines: [] };
  const lines: string[] = [];
  const takt = r.before.taktSec;
  const c0 = r.before.constraint, c1 = r.after.constraint;
  if (takt && c0 && c1) {
    const where = (p: typeof c0) => `${p.who} ${secs(p.work)}`;
    lines.push(c0.overBy > 0
      ? (c1.overBy > 0 ? `The longest stack is ${where(c0)} now, ${where(c1)} expected — still over a ${secs(takt)} takt by ${secs(c1.overBy)}.` : `The longest stack is ${where(c0)} now, ${where(c1)} expected — within a ${secs(takt)} takt.`)
      : `The longest stack is ${where(c0)} now, ${where(c1)} expected, against a ${secs(takt)} takt.`);
  }
  if (r.before.fewest != null && r.after.fewest != null && r.after.fewest !== r.before.fewest)
    lines.push(`The work would need ${r.after.fewest} ${r.after.fewest === 1 ? 'person' : 'people'} instead of ${r.before.fewest}.`);
  const waiting = r.before.people.filter(p => p.machineWait > 0.05);
  if (waiting.length && r.savedSec <= 0.0005) lines.push(`${waiting.map(p => p.who).join(' and ')} wait${waiting.length === 1 ? 's' : ''} for the machine, so the machine sets the cycle: what is saved on their own steps shows as less waiting, not a shorter cycle.`);
  const text = `${secs(r.beforeSec)} of work → ${secs(r.afterSec)} expected${r.savedSec > 0.0005 ? ` (${pcLess(r.beforeSec, r.afterSec)}% less)` : ''}${takt && r.before.people.length ? `, ${Math.round((r.beforeSec / r.before.people.length / takt) * 100)}% → ${Math.round((r.afterSec / Math.max(1, r.after.people.length) / takt) * 100)}% of takt a person${r.before.people.length > 1 ? ' on average' : ''}` : ''}. Expected, until the work is timed again.`;
  return { text, tone: r.flags.length ? 'a' : r.savedSec > 0.0005 ? 'g' : 'n', lines: [...lines, ...r.flags] };
}

/** The money in words, or the sentence that names what is missing. */
export function improveMoneySays(m: ImproveMoney | undefined, missing?: string): string {
  if (missing) return missing;
  if (!m) return '';
  const p = (v: number) => `£${v < 1 ? v.toFixed(3) : v.toFixed(2)}`;
  return `${p(m.perPack)} of labour a pack, ${p(m.per1000)} for every 1,000 packs${m.perHour != null ? `, ${p(m.perHour)} an hour at takt` : ''}${m.oneOff > 0 ? `; the changes cost ${p(m.oneOff)}${m.paybackHours != null ? ` and pay back in ${m.paybackHours.toFixed(1)} running hours` : ''}` : ''} — expected.`;
}
