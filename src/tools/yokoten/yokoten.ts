/* HORIZONTAL DEPLOYMENT — A PROVED FIX OFFERED TO EVERY LINE WITH THE SAME MACHINE (FC-155; yokoten;
 * knowledge/specs/FC-155-horizontal-deployment.md; knowledge/methods/rca/horizontal-deployment.md).
 *
 * A fix proved on one line is worth as much again on every line with the same machine, and is never copied unless
 * somebody lists the lines and asks each. Nothing new is kept: a PROVED FIX is a countermeasure on a 6M board that is
 * done and whose own before → after (lib/studyLinks beforeAfter) moved the right way; the LINES are the factory's, a
 * machine is the same machine by lib/lineRecords machineKey; an OFFER is a problem on the receiving line's register
 * (a Snag with a fixed id, so offering twice makes one) — offered = open, taken = in progress, proved or declined =
 * closed with the words said. The receiving line proves it by its own words, never by this module's claim.
 * THE MONEY (20 November; MONEY.md row FC-155): where it was proved, the 6M board's own figure — the countermeasure's share of its
 * problem (lib/sixmMoney counterWorth, FC-146); on any other line an IF — the same hours a week priced by that line's own cost model
 * and bottleneck (lib/sixmMoney problemMoney, never a second model); the lines not yet answered added up part by part only where every
 * one of them can be priced, the rest named.
 * Pure — the screen, the line's papers and the acceptance script read these sentences and no others. */
import type { PaceTodoRow } from '../../db/rows';
import type { ToolStudy } from '../../lib/study';
import type { Snag } from '../../snag/types';
import type { ProblemMeasure } from '../../lib/problems';
import type { Neck } from '../../lib/lineLoss';
import { beforeAfter } from '../../lib/studyLinks';
import { machineKey } from '../../lib/lineRecords';
import { counterWorth, partsWords, problemMoney, type CostLine, type Parts, type ProblemMoney } from '../../lib/sixmMoney';

/** The line of the factory as this module reads it: its name and the machines on its list. */
export interface FactoryLine { id: string; name: string; machines: readonly string[]; archived?: boolean; madeOf?: readonly string[] }
/** A project's line (pace_ppm): which factory line it is. */
export interface ProjectLine { id: string; workspaceId?: string }

export const OFFER_CATEGORY = 'Spread a fix';
export const DAY = 86_400_000;
/** The window of the receiving line's own rate of the problem — Faultline's choice, said on the screen. */
export const RATE_DAYS = 90;
export const offerId = (fixId: string, lineId: string) => `yokoten-${fixId}-${lineId}`;

export interface ProvedFix {
  id: string; what: string; machine: string;
  /** The factory line it was proved on. */
  lineId: string; lineName: string;
  /** Its own before → after, in the words the 6M board says them. */
  proof: string;
  projectId?: string;
}

const isWholeLine = (m: string) => !m.trim() || machineKey(m) === 'whole line';

/** Every countermeasure that is done, names a machine, sits on a factory line and has a before → after that moved the right way. */
export function provedFixes(todos: readonly PaceTodoRow[], projectLines: readonly ProjectLine[], studies: readonly ToolStudy[], lines: readonly FactoryLine[]): ProvedFix[] {
  const live = studies.filter(s => s.deletedAt == null);
  const out: ProvedFix[] = [];
  for (const t of todos) {
    if (t.state !== 'done' || isWholeLine(t.where ?? '')) continue;
    const ws = projectLines.find(l => l.id === t.lineId)?.workspaceId;
    const line = ws ? lines.find(l => l.id === ws) : undefined;
    if (!line) continue;
    const ba = beforeAfter(live as ToolStudy[], t.id, 'action');
    if (!ba || ba.tone !== 'g') continue;
    out.push({ id: t.id, what: t.what.trim() || 'A countermeasure', machine: t.where.trim(), lineId: line.id, lineName: line.name, proof: ba.text, ...(t.projectId ? { projectId: t.projectId } : {}) });
  }
  return out;
}

export type OfferState = 'not-offered' | 'offered' | 'taken' | 'proved' | 'declined';
export const STATE_WORD: Record<OfferState, string> = { 'not-offered': 'not offered', offered: 'offered', taken: 'taken', proved: 'proved here', declined: 'declined' };

export const PROVED_PREFIX = 'Proved — ';
export const DECLINED_PREFIX = 'Declined — ';

export function stateOf(s: Snag | undefined): OfferState {
  if (!s || s.deletedAt != null) return 'not-offered';
  if (s.status === 'open') return 'offered';
  if (s.status === 'in_progress') return 'taken';
  return (s.closeNote ?? '').startsWith(DECLINED_PREFIX) ? 'declined' : 'proved';
}

/** The register's problems on this machine in the window — the line's own rate of the problem, as far as it was written down. */
export function ownRate(line: Pick<FactoryLine, 'id'>, machine: string, snags: readonly Snag[], ref: number): number {
  const key = machineKey(machine);
  return snags.filter(s => s.workspaceId === line.id && s.deletedAt == null && s.targetCategory !== OFFER_CATEGORY
    && machineKey(s.targetAsset ?? '') === key && ref - s.raisedAt <= RATE_DAYS * DAY && ref >= s.raisedAt).length;
}

export interface Candidate { line: FactoryLine; state: OfferState; rate: number; offer?: Snag }

/** The other lines with the same machine, the line with the most problems on it first (ties by name), each with its state. */
export function candidatesOf(fix: ProvedFix, lines: readonly FactoryLine[], snags: readonly Snag[], ref: number): Candidate[] {
  const key = machineKey(fix.machine);
  return lines
    .filter(l => l.id !== fix.lineId && !l.archived && !(l.madeOf ?? []).length && l.machines.some(m => machineKey(m) === key))
    .map(line => {
      const offer = snags.find(s => s.id === offerId(fix.id, line.id) && s.deletedAt == null);
      return { line, offer, state: stateOf(offer), rate: ownRate(line, fix.machine, snags, ref) };
    })
    .sort((a, b) => b.rate - a.rate || a.line.name.localeCompare(b.line.name));
}

const list = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const lineWord = (n: number) => `${n} line${n === 1 ? '' : 's'}`;

/** "Splice guide proved on Line 3 (…) — Lines 1, 4 and 7 have the Wrapper: taken on Line 1; not offered on Lines 4 and 7." */
export function fixSays(fix: ProvedFix, cands: readonly Candidate[]): string {
  const head = `${fix.what} proved on ${fix.lineName} (${fix.proof.replace(/\.$/, '')})`;
  if (!cands.length) return `${head} — no other line has the ${fix.machine}.`;
  const by = (s: OfferState) => cands.filter(c => c.state === s).map(c => c.line.name);
  const parts = (['proved', 'taken', 'offered', 'declined', 'not-offered'] as OfferState[])
    .filter(s => by(s).length).map(s => `${STATE_WORD[s]} on ${list(by(s))}`);
  return `${head} — ${list(cands.map(c => c.line.name))} ${cands.length === 1 ? 'has' : 'have'} the ${fix.machine}: ${parts.join('; ')}.`;
}

export interface Tally { lines: number; offered: number; taken: number; proved: number; declined: number; notOffered: number; open: number }
export function tallyOf(cands: readonly Candidate[]): Tally {
  const n = (s: OfferState) => cands.filter(c => c.state === s).length;
  const t = { lines: cands.length, offered: n('offered'), taken: n('taken'), proved: n('proved'), declined: n('declined'), notOffered: n('not-offered') };
  /* open = not yet answered: a line that has not been asked, or was asked and has not taken it; a decline with a reason is complete */
  return { ...t, open: t.notOffered + t.offered };
}
export const tallySays = (t: Tally): string => t.lines
  ? `${lineWord(t.lines)} with this machine · ${t.proved} proved · ${t.taken} taken · ${t.offered} offered, not answered · ${t.declined} declined · ${t.notOffered} not offered`
  : 'No other line has this machine.';

export const RATE_SAYS = (rate: number) => rate ? `${rate} problem${rate === 1 ? '' : 's'} written on it in ${RATE_DAYS} days` : `no problem written on it in ${RATE_DAYS} days`;
export const NOT_CHECKED = 'A fix copied is a rumour until the line proves it: each line checks it works there, by its own before → after.';

/** The offer as a problem on the receiving line — a fixed id, so it is made once. */
export function offerSnag(fix: ProvedFix, line: FactoryLine, ref: number, sourceDay: string): Snag {
  return {
    id: offerId(fix.id, line.id), workspaceId: line.id,
    problem: `Take the fix: ${fix.what}`,
    proposedSolution: `${fix.what} — proved on ${fix.lineName} (${fix.proof.replace(/\.$/, '')}).`,
    targetCategory: OFFER_CATEGORY, targetSubcategory: fix.id, targetAsset: fix.machine,
    status: 'open', priority: 'low',
    latestUpdate: `Offered from ${fix.lineName} on ${sourceDay}.`, latestUpdateAt: ref,
    raisedAt: ref, updatedAt: ref,
  };
}

/** The register's change for each answer — a line that declines says why; a line that proves says what it saw. */
export const takeChange = (ref: number): Partial<Snag> => ({ status: 'in_progress', latestUpdate: 'Taken on this line.', latestUpdateAt: ref });
export const proveChange = (words: string, ref: number): Partial<Snag> => ({ status: 'closed', closedAt: ref, closeNote: PROVED_PREFIX + words.trim(), latestUpdate: PROVED_PREFIX + words.trim(), latestUpdateAt: ref });
export const declineChange = (why: string, ref: number): Partial<Snag> => ({ status: 'closed', closedAt: ref, closeNote: DECLINED_PREFIX + why.trim(), latestUpdate: DECLINED_PREFIX + why.trim(), latestUpdateAt: ref });
/** An answer needs its words: a proof says what moved, a decline says why. */
export const wordsNeeded = (kind: 'prove' | 'decline') => kind === 'prove' ? 'Say what moved on this line — its own before → after.' : 'Say why — a different model, a different product.';

/** What an offer says on the receiving line, from its register row. */
export function offerSays(fixWhat: string, s: Snag): string {
  const st = stateOf(s);
  return st === 'proved' || st === 'declined' ? `${fixWhat}: ${s.closeNote}` : `${fixWhat}: ${STATE_WORD[st]}.`;
}

/** A project's method page, the FC-155 row: the first fix proved on its lines that some line with the machine has not answered, and how
 *  many more — then what the lines not yet answered would be worth, as the line's page says it (the sum, or why no money is said). */
export function projectSpreadSays(rows: readonly { fix: ProvedFix; cands: readonly Candidate[]; money?: FixMoney; ifs?: ReadonlyMap<string, LineIf> }[]): { says: string; lineId: string } | undefined {
  const open = rows.filter(r => tallyOf(r.cands).open > 0);
  if (!open.length) return undefined;
  const t = tallyOf(open[0].cands);
  const more = open.length > 1 ? ` ${open.length - 1} more fix${open.length === 2 ? '' : 'es'} to spread.` : '';
  const m = open[0].money;
  const worth = !m ? '' : m.kind === 'none' ? ` ${fixMoneySays(open[0].fix, m)}` : (() => { const s = spreadIfSays(m, open[0].cands, open[0].ifs ?? new Map()); return s ? ` ${s}` : ''; })();
  return { lineId: open[0].fix.lineId, says: `${open[0].fix.what} proved on ${open[0].fix.lineName} — ${lineWord(t.lines)} with the ${open[0].fix.machine}, ${t.open} not yet answered.${more}${worth}` };
}

/* ================================================== THE MONEY ==================================================
 * knowledge/specs/FC-155-horizontal-deployment.md §3 (Money) and §6 (In money); knowledge/MONEY.md §4, FC-155 — L and T through
 * the 6M problem. Nothing here is a second cost model: the source is FC-146's counterWorth over the problem's own money, and every
 * other line is problemMoney asked of that line's cost model and bottleneck for the same hours. */

export type MoneyInput = ProblemMoney['missing'][number];

/** What the proved fix is worth where it was proved — the board's figure — or why no money is said. */
export type FixMoney =
  | { kind: 'worth'; pct: number; problemHours: number; hours: number; here: Parts; missing: MoneyInput[]; countedAsStop: boolean }
  | { kind: 'none'; why: 'no-problem' | 'not-measured' | 'not-hours' | 'no-share'; unit?: string };

/** From the countermeasure's share (expectPct, typed on its 6M board) and its problem's measure and money as the board works them
 *  (lib/fishbone buildView). `countedAsStop`: the problem's machine stops the line only because its bottleneck is not known. */
export function fixMoneyOf(pct: number | undefined, measure: ProblemMeasure | null | undefined, money: ProblemMoney | undefined, o: { onProblem: boolean; countedAsStop?: boolean }): FixMoney {
  if (!o.onProblem) return { kind: 'none', why: 'no-problem' };
  if (measure && measure.unit !== 'h a week') return { kind: 'none', why: 'not-hours', unit: measure.unit };
  const base = measure ? (measure.before ?? measure.now) : undefined;
  if (!measure || !money || base == null || !(base > 0)) return { kind: 'none', why: 'not-measured' };
  if (pct == null || !(pct > 0)) return { kind: 'none', why: 'no-share' };
  const w = counterWorth(pct, money);
  return { kind: 'worth', pct, problemHours: base, hours: (pct / 100) * base, here: w?.parts ?? {}, missing: [...money.missing], countedAsStop: !!o.countedAsStop };
}

/** What the fix would be worth on one line IF the same hours a week came back there — that line's own crew, wage, speed, margin and
 *  bottleneck. A machine that is not its bottleneck costs labour only: packs and contribution are a known 0, never missing. */
export interface LineIf { hours: number; labour?: number; packs?: number; contribution?: number; stopsLine: boolean; neckKnown: boolean; missing: MoneyInput[] }

export function lineIfOf(hours: number, machine: string, line: CostLine | undefined, neck: Neck | undefined): LineIf {
  const m = problemMoney({ label: machine, unit: 'h a week', better: 'lower', before: hours }, { asset: machine, whole: false }, line, neck);
  const p = m?.beforeMoney ?? {};
  const stopsLine = m?.stopsLine ?? true;
  return {
    hours, stopsLine, neckKnown: m?.neckKnown ?? !!neck, missing: [...(m?.missing ?? ['wage'])],
    ...(p.labour !== undefined ? { labour: p.labour } : {}),
    ...(stopsLine
      ? { ...(p.packs !== undefined ? { packs: p.packs } : {}), ...(p.contribution !== undefined ? { contribution: p.contribution } : {}) }
      : { packs: 0, contribution: 0 }),
  };
}

/** The lines not yet answered (not offered, offered — the tally's open) added up: each part only when every one of them has it. */
export interface SpreadIf {
  lines: string[];
  labour?: number; packs?: number; contribution?: number;
  /** The lines that keep a part from being added, by the input they lack. */
  noWage: string[]; noSpeed: string[]; noMargin: string[];
  /** Lines whose packs are counted as stopping the line because their bottleneck is not known. */
  countedAsStop: string[];
}

const OPEN_STATES: readonly OfferState[] = ['not-offered', 'offered'];

export function spreadIfOf(cands: readonly Candidate[], ifs: ReadonlyMap<string, LineIf>): SpreadIf | undefined {
  const open = cands.filter(c => OPEN_STATES.includes(c.state)).map(c => ({ name: c.line.name, v: ifs.get(c.line.id) }));
  if (!open.length || open.some(o => !o.v)) return undefined;
  const xs = open as { name: string; v: LineIf }[];
  const all = (k: 'labour' | 'packs' | 'contribution') => xs.every(x => x.v[k] !== undefined) ? xs.reduce((n, x) => n + (x.v[k] as number), 0) : undefined;
  const labour = all('labour'), packs = all('packs'), contribution = all('contribution');
  return {
    lines: xs.map(x => x.name),
    ...(labour !== undefined ? { labour } : {}), ...(packs !== undefined ? { packs } : {}), ...(contribution !== undefined ? { contribution } : {}),
    noWage: xs.filter(x => x.v.labour === undefined).map(x => x.name),
    noSpeed: xs.filter(x => x.v.packs === undefined).map(x => x.name),
    noMargin: xs.filter(x => x.v.packs !== undefined && x.v.contribution === undefined).map(x => x.name),
    countedAsStop: packs !== undefined ? xs.filter(x => x.v.stopsLine && !x.v.neckKnown && x.v.packs !== undefined).map(x => x.name) : [],
  };
}

/* ---------------------------------------------------------------- the words */

/** "1.2 h" — a tenth, as the 6M board says hours; two places under an hour. */
export const hoursSaid = (h: number) => `${Number(h.toFixed(h < 1 ? 2 : 1))} h`;
const INPUT_WORD: Record<MoneyInput, string> = { wage: 'a wage', speed: 'a speed', margin: 'a margin a pack' };
const INPUT_PART: Record<MoneyInput, string> = { wage: 'the labour', speed: 'the packs', margin: 'the contribution' };
/** "give Line 4 a wage (Set up the line) to say the labour" — one ask a missing input. */
const askOf = (line: string, missing: readonly MoneyInput[]) => missing.length
  ? `give ${line} ${list(missing.map(m => INPUT_WORD[m]))} (Set up the line) to say ${list(missing.map(m => INPUT_PART[m]))}` : '';
const said = (p: Parts) => partsWords(p, { lost: false });

/** Where it was proved — the board's figure, never "earned"; or the one thing that keeps money from being said. */
export function fixMoneySays(fix: Pick<ProvedFix, 'lineName'>, m: FixMoney): string {
  if (m.kind === 'none') {
    switch (m.why) {
      case 'no-problem': return 'No money is said: on its 6M board the countermeasure answers no problem, so there is no share of a problem’s hours to price — put it under its problem on the board.';
      case 'not-hours': return `No money is said: its problem is measured in ${m.unit || 'its own unit'}, not hours a week, so its 6M board puts no money on it.`;
      case 'not-measured': return 'No money is said: its problem on the 6M board has no hours a week lost measured yet.';
      case 'no-share': return 'No money is said: its 6M board gives it no share of the problem — type How much of the problem it should remove on the countermeasure (its 6M board) to say what it is worth, here and on every line.';
    }
  }
  const head = `What it is worth on ${fix.lineName}, by the share its 6M board gives it — ${Number(m.pct.toFixed(1))}% of the problem’s ${hoursSaid(m.problemHours)} a week, so ${hoursSaid(m.hours)} a week`;
  const words = said(m.here);
  const ask = askOf(fix.lineName, m.missing);
  const counted = m.countedAsStop && m.here.packs !== undefined ? ', the packs counted as stopping the line as its board counts them (the bottleneck is not known)' : '';
  return words ? `${head}: ${words} a week${counted}${ask ? `; ${ask}` : ''}.` : `${head} — ${ask || 'nothing on the line to price it by'}.`;
}

/** One line's IF — "there" on the source line's row, "here" on the receiving line's own page. */
export function lineIfSays(lineName: string, machine: string, v: LineIf, where: 'there' | 'here'): string {
  const head = `If the same ${hoursSaid(v.hours)} a week comes back ${where}`;
  const parts: Parts = { ...(v.labour !== undefined ? { labour: v.labour } : {}), ...(v.stopsLine && v.packs !== undefined ? { packs: v.packs } : {}), ...(v.stopsLine && v.contribution !== undefined ? { contribution: v.contribution } : {}) };
  const words = said(parts);
  const why = !v.stopsLine ? `the ${machine} is not ${lineName}’s bottleneck, so the line runs round it`
    : !v.neckKnown ? `counted as stopping the line: ${lineName}’s bottleneck is not known until its capacity is counted`
    : `the ${machine} is ${lineName}’s bottleneck`;
  const ask = askOf(lineName, v.missing);
  return words ? `${head}: ${words} a week — ${why}${ask ? `; ${ask}` : ''}.` : `${head} — ${why}; ${ask}.`;
}

/** The lines not yet answered, added up — an if, never earned; a part not added names the lines and the input. */
export function spreadIfSays(m: Extract<FixMoney, { kind: 'worth' }>, cands: readonly Candidate[], ifs: ReadonlyMap<string, LineIf>): string {
  const s = spreadIfOf(cands, ifs);
  if (!s) return '';
  const on = s.lines.length === 1 ? `on ${s.lines[0]}, the line not yet answered` : `on the ${s.lines.length} lines not yet answered`;
  const words = said({ ...(s.labour !== undefined ? { labour: s.labour } : {}), ...(s.packs !== undefined ? { packs: s.packs } : {}), ...(s.contribution !== undefined ? { contribution: s.contribution } : {}) });
  const head = `If it brings back the same ${hoursSaid(m.hours)} a week ${on}`;
  const has = (xs: readonly string[]) => (xs.length === 1 ? 'has' : 'have');
  const notAdded = [
    s.noWage.length ? `The labour is not added up — ${list(s.noWage)} ${has(s.noWage)} no wage (Set up the line).` : '',
    s.noSpeed.length ? `The packs and the contribution are not added up — ${list(s.noSpeed)} ${has(s.noSpeed)} no speed (Set up the line).` : '',
    s.noMargin.length ? `The contribution is not added up — ${list(s.noMargin)} ${has(s.noMargin)} no margin a pack (Set up the line).` : '',
  ].filter(Boolean);
  const counted = s.countedAsStop.length ? [`The packs are counted as stopping the line on ${list(s.countedAsStop)}, whose bottleneck is not known.`] : [];
  const first = words
    ? `${head}: ${words} a week — an if, not earned: each line proves it by its own before → after.`
    : `${head}, nothing can be added up yet — an if, not earned: each line proves it by its own before → after.`;
  return [first, ...notAdded, ...counted].join(' ');
}
