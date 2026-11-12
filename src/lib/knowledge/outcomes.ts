/* DID THE FIX WORK, AND DID IT LAST? (12 November, docs/LUNAR-KNOWLEDGE.md §4). Pure: a fix (a closed problem, a countermeasure done,
 * a 6M case's called proof) and the line's stops in; its outcome out — said in words, by code, with what it rests on and what it cannot
 * say; then versioned into the ledger like a finding (too early → improved → came back is three versions, all kept).
 *
 * The method. The stops the fix was about (its machine and reason, else its machine alone — said) are counted in the 28 days before the
 * fix and the first 28 after, each per WATCHED DAY — a day on which the line had any stop timed — so a day nobody timed is never read as
 * a day with no stops. The two rates are compared by the exact conditional test B1 uses (lib/brain binomTwoSided). Improved or worse at
 * p < 0.05; no clear change otherwise; too early under 7 watched days after; not enough timed under 5 stops in all or 3 watched days
 * before. Once 8 weeks have passed, the latest 28 days against the 28 before the fix: held, came back, or not clearly holding. The mean
 * minutes a stop either side are said beside it (lib/proof's measure — a change in how long stops last, not how often). */
import { binomTwoSided } from '../brain/engine';
import type { Observation } from '../../types';
import { entryId, nextVersion, subjectOf, type Entry } from './model';

const DAY = 86_400_000;
const WINDOW = 28 * DAY;

export type Verdict = 'improved' | 'worse' | 'no-clear-change' | 'too-early' | 'not-enough' | 'no-measure' | 'held' | 'came-back' | 'not-holding';
export const VERDICT_WORD: Record<Verdict, string> = {
  improved: 'Improved', worse: 'Worse since', 'no-clear-change': 'No clear change', 'too-early': 'Too early to say', 'not-enough': 'Not enough timed to say',
  'no-measure': 'Nothing to measure it by', held: 'Improved and held', 'came-back': 'Came back', 'not-holding': 'Improved, not clearly holding',
};
/** Evidence that the fix worked (supports), that it did not (contradicts), or neither yet. */
export const VERDICT_STANCE: Record<Verdict, 'supports' | 'contradicts' | 'neutral'> = {
  improved: 'supports', held: 'supports', worse: 'contradicts', 'came-back': 'contradicts', 'no-clear-change': 'contradicts',
  'not-holding': 'neutral', 'too-early': 'neutral', 'not-enough': 'neutral', 'no-measure': 'neutral',
};

export interface Fix {
  id: string;
  kind: 'problem' | 'countermeasure' | 'case';
  lineId: string;
  title: string;
  /** When it was closed, done or called. */
  at: number;
  machine?: string;
  reason?: string;
  /** What the person said when they closed it — kept as what was said, never as proof. */
  saidWhenClosed?: string;
  by?: string;
  /** The finding it was raised from, when it was (lib/knowledge — the loop). */
  fromFinding?: string;
  projectId?: string;
  /** An outcome already measured elsewhere — a 6M case's frozen proof, a countermeasure's before → after study — in its own words. */
  measured?: { verdict: Verdict; says: string; source: string; refs: string[] };
}

export interface Window { stops: number; watchedDays: number; perDay: number; minPerStop: number }
export interface Outcome {
  fix: Fix;
  verdict: Verdict;
  known: 'counted' | 'measured';
  subject: string;
  measureWords: string;
  before?: Window;
  after?: Window;
  latest?: Window;
  p?: number;
  says: string;
  limits: string[];
}

const dayOf = (ms: number) => Math.floor(ms / DAY);
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const norm = (s?: string) => (s ?? '').trim().toLowerCase();

function windowOf(stops: readonly Observation[], watched: ReadonlySet<number>, from: number, to: number): Window {
  const days = [...watched].filter(d => d >= dayOf(from) && d < dayOf(to)).length;
  const inside = stops.filter(o => o.startedAt >= from && o.startedAt < to);
  const mins = inside.reduce((a, o) => a + Math.max(0, o.durationMs) / 60_000, 0);
  return { stops: inside.length, watchedDays: days, perDay: days ? r2(inside.length / days) : 0, minPerStop: inside.length ? r1(mins / inside.length) : 0 };
}
const wSaid = (w: Window) => `${w.stops} stop${w.stops === 1 ? '' : 's'} on ${w.watchedDays} watched day${w.watchedDays === 1 ? '' : 's'} (${w.perDay} a day, ${w.minPerStop} min each)`;
const pSaid = (p: number) => (p < 0.001 ? '< 0.001' : String(Math.round(p * 1000) / 1000));
const dayWords = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** The outcome of one fix, from the line's stops (every stop on the line, not deleted). */
export function outcomeOf(fix: Fix, lineStops: readonly Observation[], now: number): Outcome {
  const head = `${fix.kind === 'case' ? 'Proof called' : fix.kind === 'countermeasure' ? 'Done' : 'Closed'} ${dayWords(fix.at)}: ${fix.title}${fix.saidWhenClosed ? ` — closed as “${fix.saidWhenClosed}”${fix.by ? ` (${fix.by}, reported)` : ' (reported)'}` : ''}.`;
  const limits = ['A day nobody timed is left out, never read as a day with no stops.', 'It says whether the stops changed after the fix, not that the fix caused it — something else may have changed too.'];
  if (fix.measured) {
    return { fix, verdict: fix.measured.verdict, known: 'measured', subject: subjectOf({ fixId: fix.id }), measureWords: fix.measured.source,
      says: `${head} ${fix.measured.says}`, limits: ['As its own study measured it.'] };
  }
  const live = lineStops.filter(o => !o.deletedAt && o.durationMs >= 0);
  const watched = new Set(live.map(o => dayOf(o.startedAt)));
  const m = norm(fix.machine), r = norm(fix.reason);
  if (!m) {
    return { fix, verdict: 'no-measure', known: 'counted', subject: subjectOf({ fixId: fix.id }), measureWords: 'no machine named',
      says: `${head} It names no machine, so its stops cannot be told apart — say which machine it was about to have it checked.`, limits };
  }
  const mine = live.filter(o => norm(o.asset) === m && (!r || norm(o.category) === r));
  const measureWords = r ? `${fix.reason} on the ${fix.machine}` : `every stop on the ${fix.machine} (it names no reason)`;
  const before = windowOf(mine, watched, fix.at - WINDOW, fix.at);
  const after = windowOf(mine, watched, fix.at, Math.min(now, fix.at + WINDOW));
  const base = { fix, known: 'counted' as const, subject: subjectOf({ fixId: fix.id }), measureWords, before, after, limits };
  if (after.watchedDays < 7) {
    const v: Verdict = now - fix.at < WINDOW ? 'too-early' : 'not-enough';
    return { ...base, verdict: v, says: `${head} ${measureWords}: ${v === 'too-early' ? `only ${after.watchedDays} watched day${after.watchedDays === 1 ? '' : 's'} since — too early to say (7 are needed).` : `only ${after.watchedDays} watched days in the 4 weeks after — not enough timed to say.`}` };
  }
  if (before.stops + after.stops < 5 || before.watchedDays < 3) {
    return { ...base, verdict: 'not-enough', says: `${head} ${measureWords}: before, ${wSaid(before)}; after, ${wSaid(after)} — too few to say whether it changed.` };
  }
  const p = binomTwoSided(after.stops, before.stops + after.stops, after.watchedDays / (before.watchedDays + after.watchedDays));
  let verdict: Verdict = p < 0.05 ? (after.perDay < before.perDay ? 'improved' : 'worse') : 'no-clear-change';
  let latest: Window | undefined;
  let tail = '';
  if (verdict === 'improved' && now - fix.at >= 2 * WINDOW) {
    latest = windowOf(mine, watched, now - WINDOW, now);
    if (latest.watchedDays >= 7) {
      const pl = binomTwoSided(latest.stops, before.stops + latest.stops, latest.watchedDays / (before.watchedDays + latest.watchedDays));
      verdict = pl < 0.05 && latest.perDay < before.perDay ? 'held' : latest.perDay >= before.perDay ? 'came-back' : 'not-holding';
      tail = ` The latest 4 weeks: ${wSaid(latest)} — ${verdict === 'held' ? 'still well below before; it has held' : verdict === 'came-back' ? 'back where it was before; it came back' : 'lower than before but not clearly; not clearly holding'}.`;
    }
  }
  const word = verdict === 'improved' ? 'fewer stops; unlikely to be chance' : verdict === 'worse' ? 'more stops; unlikely to be chance' : verdict === 'no-clear-change' ? 'no clear change — it may not have worked, or not yet' : 'fewer stops at first';
  return { ...base, verdict, p: Math.round(p * 1000) / 1000, ...(latest ? { latest } : {}),
    says: `${head} ${measureWords}: before, ${wSaid(before)}; after, ${wSaid(after)} — ${word} (p = ${pSaid(p)}).${tail}` };
}

/** The ledger entries for these outcomes: a version when a fix's verdict changes, naming the one before. A fix raised from a finding
 *  is linked to that finding (neutral: whether a fix worked is evidence about the fix, not about the finding). */
export function outcomeVersions(line: { id: string; client?: string }, outcomes: readonly Outcome[], ledger: readonly Entry[], now: number): Entry[] {
  const all = [...ledger];
  const out: Entry[] = [];
  for (const o of outcomes) {
    const claim = `outcome:${o.subject}`;
    const v = nextVersion(all, {
      workspaceId: line.id, ...(line.client ? { client: line.client } : {}), ...(o.fix.projectId ? { projectId: o.fix.projectId } : {}),
      kind: 'outcome', known: o.known, subject: o.subject, claim, says: o.says, source: 'outcome-1', at: now,
      ...(o.fix.fromFinding ? { about: o.fix.fromFinding, stance: 'neutral' as const } : {}),
      body: {
        signature: o.verdict, verdict: o.verdict, fixKind: o.fix.kind, fixId: o.fix.id, fixTitle: o.fix.title, fixAt: o.fix.at,
        measure: o.measureWords, ...(o.fix.machine ? { machine: o.fix.machine } : {}), ...(o.fix.reason ? { reason: o.fix.reason } : {}),
        ...(o.before ? { before: o.before } : {}), ...(o.after ? { after: o.after } : {}), ...(o.latest ? { latest: o.latest } : {}),
        ...(o.p !== undefined ? { p: o.p } : {}), ...(o.fix.saidWhenClosed ? { saidWhenClosed: o.fix.saidWhenClosed } : {}),
        ...(o.fix.measured ? { refs: o.fix.measured.refs } : {}), limits: o.limits,
      },
    });
    if (v) { out.push(v); all.push(v); }
  }
  return out;
}

/** An id for a person's entry — never the same twice. */
export const personEntryId = (who: string, at: number, about?: string) => entryId('person', who, String(at), about, Math.random().toString(36));
