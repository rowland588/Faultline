/* STRANDS — the tests and fixes of a job, grouped into the things they set out
 * to prove. Page 1 of the client report draws them; page 3 turns their owed
 * lines the other way up (see lib/owes). Lives on its own so the report SCREEN
 * can read the same strands without loading the PDF drawer, which is a
 * separate chunk that only arrives when somebody presses Download. The long
 * account of why the unit is a strand stays beside the drawing, in
 * lib/paceReportPdf.ts.
 */
import type { PaceReportData } from './paceReportPdf';

export type TrialRow = NonNullable<PaceReportData['trials']>['rows'][number];

export type StrandState = 'proved' | 'notYet' | 'notProved' | 'booked';

/** The word a client reads. Not "stuck": the report says what is true, and
 *  what is true is that nothing has been booked yet. */
export const STRAND_WORD: Record<StrandState, string> = {
  proved: 'PROVED',
  notYet: 'NOT YET',
  notProved: 'NOT PROVED',
  booked: 'BOOKED',
};
/** A strand that is a FIX on its own — a guard fitted, a valve replaced — is
 *  not proving anything; it is done or it is not. Badging a fitted guard
 *  "BOOKED" over a row reading FIXED was the report contradicting itself. */
export const FIX_STRAND_WORD: Record<StrandState, string> = {
  proved: 'DONE',
  notYet: 'NOT YET',
  notProved: 'NOT DONE',
  booked: 'PLANNED',
};
export const strandWord = (s: Pick<Strand, 'kind' | 'state'>): string =>
  (s.kind === 'fix' ? FIX_STRAND_WORD : STRAND_WORD)[s.state];

export interface StrandStep {
  /** The attempt number for a test; absent on a fix, which is not an attempt
   *  at proving anything — it is what was done between two of them. */
  n?: number;
  kind: 'test' | 'fix';
  ran: boolean;
  when: string;
  /** What it was. Blank on the first attempt, whose title is the strand's. */
  what: string;
  verdict: string;
  outcome: TrialRow['outcome'];
  outcomeWord: string;
  /** "turned up 3 things · 2 still to decide", when it turned up anything. */
  found: string;
}

export interface Strand {
  /** The thing being proved — the first attempt's name. */
  name: string;
  /** A strand that starts with a fix is a piece of work, not a proof. */
  kind: 'test' | 'fix';
  machine: string;
  withWhom: string;
  /** What it was agreed it passes on, from the attempt that set out to do it. */
  provesIf: string;
  state: StrandState;
  attempts: number;
  steps: StrandStep[];
  /** What is still owed on this strand, with a name and a date on it.
   *  `since` is a debt that started on a day rather than one due by it —
   *  the verdict on a test that ran. */
  owed: { what: string; owner: string; due: string; late: boolean; since?: boolean; on?: string }[];
}

/** Every row that came out of `id`, in the order the work happened, depth
 *  first — a fix off attempt one belongs before attempt two, not after it. */
const descend = (id: string, byParent: Map<string, TrialRow[]>, out: TrialRow[]): void => {
  for (const child of byParent.get(id) ?? []) {
    out.push(child);
    descend(child.id, byParent, out);
  }
};

/** The tests and fixes of a job, grouped into the things they set out to prove.
 *
 *  Pure, and exported, because the shape of this report is now an argument
 *  about which record belongs with which — and that is worth asserting as data
 *  rather than looking at a sheet and deciding it seems about right. */
export function strandsOf(rows: TrialRow[]): Strand[] {
  const byId = new Map(rows.map(r => [r.id, r]));
  const byParent = new Map<string, TrialRow[]>();
  for (const r of rows) {
    /* A parent that is not in this report — deleted, or on another line — makes
       an orphan a root. Hanging it off nothing would lose it altogether, and a
       test nobody can see is the one fault this must not have. */
    const parent = r.fromId && byId.has(r.fromId) ? r.fromId : undefined;
    if (!parent) continue;
    const kids = byParent.get(parent) ?? [];
    kids.push(r);
    byParent.set(parent, kids);
  }
  /* Children in the order they were planned, so the chain reads forwards. */
  for (const kids of byParent.values()) kids.sort((a, b) => a.when.localeCompare(b.when));

  const roots = rows.filter(r => !(r.fromId && byId.has(r.fromId)));

  return roots.map(root => {
    const chain = [root];
    descend(root.id, byParent, chain);

    let n = 0;
    const steps: StrandStep[] = chain.map(r => ({
      n: r.kind === 'test' ? ++n : undefined,
      kind: r.kind,
      ran: r.ran,
      when: r.when,
      /* The first attempt's title IS the strand's name, so repeating it as the
         step would print the same words twice one under the other. */
      what: r === root ? '' : r.title,
      verdict: r.verdict,
      outcome: r.outcome,
      outcomeWord: r.outcomeWord,
      found: r.found.written
        ? `turned up ${r.found.written} thing${r.found.written === 1 ? '' : 's'}${
            r.found.undecided ? ` · ${r.found.undecided} still to decide` : ''}`
        : '',
    }));

    /* WHERE IT HAS GOT TO, off the tests alone. A fix is work done towards the
       answer; it is not the answer, and a strand whose fix is done but whose
       re-test has not run is NOT proved. */
    const tests = chain.filter(r => r.kind === 'test');
    /* The state comes off the TESTS when there are any — a fix is work towards
       the answer, not the answer. A strand with no test in it is a fix on its
       own, and then the fixes are what it is about. */
    const about = tests.length ? tests : chain;
    /* RAN means the day happened, not that somebody has called it. A test
       written up on the floor and never given a verdict is not "booked" — it is
       an answer the client is still waiting for, and the strand says so. */
    const ran = about.filter(t => t.ran);
    const last = ran[ran.length - 1];
    const booked = about.some(t => !t.ran);
    const state: StrandState = !last ? 'booked'
      : last.outcome === 'passed' ? 'proved'
        : booked ? 'notYet'
          : 'notProved';

    /* What is still owed: every step not settled, plus the agreed next step
       hanging off any of them. Named and dated, because "outstanding" without
       a name on it is the thing a client asks about in the meeting. */
    const owed: Strand['owed'] = [];
    for (const r of chain) {
      /* Ran and not called: the debt is the verdict, not the day — and it is
         the SITE's debt. withWhom is who we ran it with; calling it is ours.
         It printed "Say whether it passed · Ilapak UK", which told the OEM's
         project manager the site was blaming him for the site's own call. */
      if (r.ran && r.outcome === 'planned') {
        owed.push({ what: r.kind === 'fix' ? 'Say whether it fixed it' : 'Say whether it passed',
          owner: 'the site', due: r.when, late: false, since: true, on: r.on });
        continue;
      }
      if (r.outcome === 'planned' || r.outcome === 'notRun') {
        /* Saying the strand's own name back under its own heading reads as
           the page having nothing to add. What is owed on a test nobody has
           run is that somebody runs it. */
        owed.push({
          what: r.title === root.title ? (r.kind === 'fix' ? 'Do it' : 'Run it') : r.title,
          owner: r.withWhom, due: r.when, late: r.late, on: r.on,
        });
      }
    }
    /* An agreed next step that is ALSO a record in the chain is already listed
       above, with its own date and its own lateness. It used to be pushed with
       its parent's lateness and win the de-duplication, so a re-test two days
       ahead printed "WAS 26 Sept" in red. The record's own line wins. */
    for (const r of chain) {
      if (r.next && !r.next.done && !owed.some(o => o.what === r.next?.what)) {
        owed.push({ what: r.next.what, owner: r.next.owner, due: r.next.due, late: r.next.late, on: r.next.on });
      }
    }

    return {
      name: root.title,
      kind: root.kind,
      machine: root.machine,
      withWhom: root.withWhom,
      provesIf: root.passesIf,
      state,
      /* Attempts are days that happened. One run and one booked is one attempt. */
      attempts: tests.filter(t => t.ran).length,
      steps,
      /* The same thing twice — a booked re-test IS the next step off the one
         before it — reads as two jobs. Kept once, by its words. */
      owed: owed.filter((o, i) => owed.findIndex(x => x.what === o.what) === i).slice(0, 4),
    };
  });
}

/* THE ORDER A PRESENTATION READS IN.
 *
 * Alphabetical, or by date added, puts a test booked for next month above the
 * one that failed last week — which is the report choosing for the client what
 * to look at, and choosing wrong. What needs attention leads, then what is
 * coming, then what is finished. Rowland, on the same argument for the tests
 * list: "a client wants what is coming before what we did." */
const STRAND_ORDER: Record<StrandState, number> = { notProved: 0, notYet: 1, booked: 2, proved: 3 };

export const orderStrands = (strands: Strand[]): Strand[] =>
  [...strands].sort((a, b) =>
    STRAND_ORDER[a.state] - STRAND_ORDER[b.state]
    /* Within a state, whatever is owed soonest — and a strand with nothing
       owed sorts after the ones that do. */
    || (a.owed[0]?.due ?? '\uffff').localeCompare(b.owed[0]?.due ?? '\uffff')
    || a.name.localeCompare(b.name));

/** One line under the heading that says what the whole section amounts to. */
export function strandsSay(strands: Strand[]): string {
  if (strands.length === 0) return 'nothing booked yet';
  const n = (s: StrandState) => strands.filter(x => x.state === s).length;
  const bits = [`${strands.length} thing${strands.length === 1 ? '' : 's'} to prove`];
  if (n('proved')) bits.push(`${n('proved')} proved`);
  if (n('notYet')) bits.push(`${n('notYet')} not yet`);
  if (n('notProved')) bits.push(`${n('notProved')} not proved`);
  if (n('booked')) bits.push(`${n('booked')} still to run`);
  return bits.join(' · ');
}
