/* HORIZONTAL DEPLOYMENT — A PROVED FIX OFFERED TO EVERY LINE WITH THE SAME MACHINE (FC-155; yokoten;
 * knowledge/specs/FC-155-horizontal-deployment.md; knowledge/methods/rca/horizontal-deployment.md).
 *
 * A fix proved on one line is worth as much again on every line with the same machine, and is never copied unless
 * somebody lists the lines and asks each. Nothing new is kept: a PROVED FIX is a countermeasure on a 6M board that is
 * done and whose own before → after (lib/studyLinks beforeAfter) moved the right way; the LINES are the factory's, a
 * machine is the same machine by lib/lineRecords machineKey; an OFFER is a problem on the receiving line's register
 * (a Snag with a fixed id, so offering twice makes one) — offered = open, taken = in progress, proved or declined =
 * closed with the words said. The receiving line proves it by its own words, never by this module's claim.
 * Pure — the screen, the line's papers and the acceptance script read these sentences and no others. */
import type { PaceTodoRow } from '../../db/rows';
import type { ToolStudy } from '../../lib/study';
import type { Snag } from '../../snag/types';
import { beforeAfter } from '../../lib/studyLinks';
import { machineKey } from '../../lib/lineRecords';

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

/** Said once, on the screen and the paper, in place of a figure that was not given. */
export const MONEY_SAYS = 'No money is said: what the fix is worth a week is on its 6M board once the problem’s hours and the line’s cost are typed, and each line’s own rate comes from the problems written on this machine. Nothing is estimated here.';
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

/** A project's method page, the FC-155 row: the first fix proved on its lines that some line with the machine has not answered, and how many more. */
export function projectSpreadSays(rows: readonly { fix: ProvedFix; cands: readonly Candidate[] }[]): { says: string; lineId: string } | undefined {
  const open = rows.filter(r => tallyOf(r.cands).open > 0);
  if (!open.length) return undefined;
  const t = tallyOf(open[0].cands);
  const more = open.length > 1 ? ` ${open.length - 1} more fix${open.length === 2 ? '' : 'es'} to spread.` : '';
  return { lineId: open[0].fix.lineId, says: `${open[0].fix.what} proved on ${open[0].fix.lineName} — ${lineWord(t.lines)} with the ${open[0].fix.machine}, ${t.open} not yet answered.${more}` };
}
