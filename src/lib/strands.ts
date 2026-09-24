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

/* ONE WORD FOR WHERE A TEST HAS GOT TO — its LATEST RESULT, literally.
 *
 * It used to be NOT YET / NOT PROVED / BOOKED on the card and DIDN'T PASS /
 * NO VERDICT YET / PLANNED / FIXED on its rows: two vocabularies on one card,
 * and they contradicted each other — a test that ran and was never called was
 * badged NOT PROVED over a row reading NO VERDICT YET. Rowland: "the pdf is
 * still messy on the first page." Four words, each meaning one thing. */
export type StrandState = 'proved' | 'failed' | 'noVerdict' | 'notRun';

export const STRAND_WORD: Record<StrandState, string> = {
  proved: 'PROVED',
  failed: 'FAILED',
  noVerdict: 'NO VERDICT',
  notRun: 'NOT RUN',
};
/** A strand that is only fixes — no test above them. Not drawn on page 1 (it
 *  proves nothing); it keeps words of its own for anything that does draw it. */
export const FIX_STRAND_WORD: Record<StrandState, string> = {
  proved: 'DONE',
  failed: 'NOT FIXED',
  noVerdict: 'NO VERDICT',
  notRun: 'PLANNED',
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

/** A day a test was run — or was meant to be and did not happen. */
export interface StrandRun { when: string; word: string; reason: string; outcome: TrialRow['outcome'] }
/** A fix for this test, in one line. */
export interface StrandFix {
  what: string; who: string;
  /** DONE, NOT FIXED, NO VERDICT, NOT DONE, LATE — or blank while it is
   *  simply booked, when `when` says "by …". */
  word: string;
  tone: 'done' | 'failed' | 'waiting' | 'late' | 'due';
  when: string;
}
/** The ONE thing owed on this test, next. Everything else owed is page 3's. */
export interface StrandNext { what: string; who: string; when: string; late: boolean }

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
  /** NOT RUN and the day has gone — the badge goes red. */
  late: boolean;
  /** Days it ran (or did not happen), in date order. */
  runs: StrandRun[];
  /** The fixes for it, in date order. */
  fixes: StrandFix[];
  next?: StrandNext;
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
            ''}`
        : '',
    }));

    /* WHERE IT HAS GOT TO: the LATEST result, off the tests alone — a fix is
       work towards the answer, not the answer. A strand with no test in it is
       fixes on their own, and then the fixes are what it is about. Date order
       throughout: walking the chain branch by branch printed a re-test on the
       29th above a fix on the 25th. */
    const byOn = (a: TrialRow, b: TrialRow) => (a.on ?? '\uffff').localeCompare(b.on ?? '\uffff');
    const tests = chain.filter(r => r.kind === 'test');
    const about = (tests.length ? tests : chain).slice().sort(byOn);
    /* RAN means the day came — it ran, or it did not happen. */
    const ran = about.filter(t => t.ran);
    const last = ran[ran.length - 1];
    const pending = about.filter(t => !t.ran);
    const state: StrandState = !last ? 'notRun'
      : last.outcome === 'passed' ? 'proved'
        : last.outcome === 'failed' ? 'failed'
          : last.outcome === 'notRun' ? 'notRun'
            : 'noVerdict';
    const late = state === 'notRun'
      && (pending.some(p => p.late) || (last?.outcome === 'notRun' && pending.length === 0));

    const dated = (w: string) => (w && w !== '—' ? w : '');
    const RUN_WORD: Record<TrialRow['outcome'], string> = {
      passed: 'PASSED', failed: 'FAILED', notRun: 'DIDN’T RUN', planned: 'NO VERDICT',
    };
    const runs: StrandRun[] = (tests.length ? ran : []).map(r => ({
      when: dated(r.when), word: RUN_WORD[r.outcome], reason: r.verdict, outcome: r.outcome,
    }));

    const fixes: StrandFix[] = (tests.length ? chain.filter(r => r.kind === 'fix') : [])
      .slice().sort(byOn).map(r => {
        const w = dated(r.when);
        const tone: StrandFix['tone'] = r.outcome === 'passed' ? 'done'
          : r.outcome === 'failed' ? 'failed'
            : r.ran ? 'waiting'
              : r.late ? 'late' : 'due';
        return {
          what: r.title, who: r.withWhom, tone,
          word: tone === 'done' ? 'DONE' : tone === 'failed' ? 'NOT FIXED'
            : tone === 'waiting' ? (r.outcome === 'notRun' ? 'NOT DONE' : 'NO VERDICT')
              : tone === 'late' ? 'LATE' : '',
          when: !w ? 'no date' : tone === 'late' ? `was ${w}` : tone === 'due' ? `by ${w}` : w,
        };
      });

    /* THE ONE THING NEXT. The card used to list every debt under STILL OWED,
       which repeated the rows above it, the card's own name included. It says
       one thing now; the whole list is page 3's. */
    const next: StrandNext | undefined = !tests.length ? undefined
      : last && last.outcome === 'planned'
        ? { what: 'Call the result', who: 'the site', when: last.when ? `since ${dated(last.when) || 'the day'}` : '', late: false }
        : pending[0]
          ? {
            what: pending[0] === root ? 'Run it' : 'Re-test',
            who: pending[0].withWhom,
            when: dated(pending[0].when) ? `${pending[0].late ? 'was' : 'by'} ${dated(pending[0].when)}` : 'no date',
            late: pending[0].late,
          }
          : state === 'notRun' && last
            ? { what: 'Rebook it', who: last.withWhom, when: dated(last.when) ? `was ${dated(last.when)}` : 'no date', late: true }
            : state === 'failed'
              ? { what: 'Book the re-test', who: root.withWhom, when: 'no date', late: false }
              : undefined;

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
      state, late, runs, fixes, next,
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
const STRAND_ORDER: Record<StrandState, number> = { failed: 0, noVerdict: 1, notRun: 2, proved: 3 };

export const orderStrands = (strands: Strand[]): Strand[] =>
  [...strands].sort((a, b) =>
    /* A test whose day has gone with nothing to show leads with the failures. */
    (a.late ? 0 : STRAND_ORDER[a.state]) - (b.late ? 0 : STRAND_ORDER[b.state])
    /* Within a state, whatever is owed soonest — and a strand with nothing
       owed sorts after the ones that do. */
    || (a.owed[0]?.due ?? '\uffff').localeCompare(b.owed[0]?.due ?? '\uffff')
    || a.name.localeCompare(b.name));

/** One line under the heading that says what the whole section amounts to. */
export function strandsSay(strands: Strand[]): string {
  if (strands.length === 0) return 'nothing booked yet';
  const n = (s: StrandState) => strands.filter(x => x.state === s).length;
  const bits = [`${strands.length} test${strands.length === 1 ? '' : 's'}`];
  if (n('proved')) bits.push(`${n('proved')} proved`);
  if (n('failed')) bits.push(`${n('failed')} failed`);
  if (n('noVerdict')) bits.push(`${n('noVerdict')} no verdict`);
  if (n('notRun')) bits.push(`${n('notRun')} not run`);
  return bits.join(' · ');
}
