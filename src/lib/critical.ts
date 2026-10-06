/* A CRITICAL PROBLEM — the one the whole job has to look at.
 *
 * Rowland, 6 October: "If something happens during the project that is so
 * critical that we need to flag it as a critical element ... maybe it always
 * has to be a problem ... the ability to say that this is critical, and to
 * write more narrative behind it — potential solutions, what it means for the
 * business. For example, we just discovered that programs cannot be copied
 * over so easily, so we cannot release the line back to production in the
 * time that was agreed. There could be a mitigating thing — put a production
 * belt there to bypass the robot ... right now I don't have the ability to say
 * in a report: look at this, this is a major problem, potential solutions."
 *
 * NO NEW NOUN. It is a problem (a TestItem of kind 'found', on its stage) that
 * says three more things: it is critical, what it means for the business
 * (impact), and the ways round it (ways — one of them agreed). Its owner, its
 * hours lost, its pictures and the fix it booked are the problem's own.
 *
 * OPEN until somebody says it is sorted (doneAt) or the fix it booked has
 * been done. Open, it leads: the job's front page and Needs you, the control
 * room's row, Today's update, the plan's stage, the Fixes page, and the client
 * report straight under "Are we on target?" — which it holds at "At risk" at
 * best (lib/onTarget). Sorted, it stays in the story, said as sorted.
 *
 * Pure: read off what is kept. Nothing is stored here. */
import { live, type Asset, type Test, type TestItem, type WayRound } from './testing';
import { niceDay, todayISO } from './weeks';

export interface Critical {
  item: TestItem;
  /** The stage, test or other record it was found on. */
  on?: Test;
  /** The machine it is on, when there is one. */
  machine?: string;
  /** "Pick and place — Programs loaded", or "The job". */
  where: string;
  /** The day it was written. */
  day: string;
  /** The fix it booked, when it booked one. */
  fix?: Test;
  /** Sorted: said sorted, or its fix done. */
  sorted: boolean;
  /** The way round it the job is going with, if one is agreed. */
  agreed?: WayRound;
}

const dayOfMs = (ms: number) => todayISO(new Date(ms));

/** Is this problem's fix done, or the problem said sorted? */
const sortedOf = (i: TestItem, fix?: Test) => i.doneAt != null || fix?.outcome === 'passed';

/** Every critical problem on a job — open first (the oldest leads: it has
 *  been critical longest), then the sorted ones, newest first. */
export function criticalProblems(tests: Test[], items: TestItem[], assets: Asset[]): { open: Critical[]; sorted: Critical[] } {
  const ts = live(tests);
  const rows: Critical[] = live(items).filter(i => i.kind === 'found' && i.critical).map(item => {
    const on = ts.find(t => t.id === item.testId);
    const machine = on?.assetId ? assets.find(a => a.id === on.assetId && !a.deletedAt)?.name : undefined;
    const fix = item.becameTestId ? ts.find(t => t.id === item.becameTestId && t.kind === 'fix') : undefined;
    const agreed = item.ways?.find(w => w.agreed);
    return {
      item, ...(on ? { on } : {}), ...(machine ? { machine } : {}),
      where: on ? `${machine ?? 'The line'} — ${on.title}` : 'The job',
      day: dayOfMs(item.createdAt), ...(fix ? { fix } : {}), sorted: sortedOf(item, fix), ...(agreed ? { agreed } : {}),
    };
  });
  return {
    open: rows.filter(r => !r.sorted).sort((a, b) => a.item.createdAt - b.item.createdAt),
    sorted: rows.filter(r => r.sorted).sort((a, b) => (b.item.doneAt ?? b.item.updatedAt) - (a.item.doneAt ?? a.item.updatedAt)),
  };
}

/** The open critical problems on one stage — the count its square, its
 *  drawer and its line on the plan carry. Given the tests, one whose fix is
 *  done is sorted, as criticalProblems says it. */
export const criticalOn = (stepId: string, items: TestItem[], tests?: Test[]): TestItem[] =>
  live(items).filter(i => i.testId === stepId && i.kind === 'found' && i.critical
    && !sortedOf(i, i.becameTestId ? tests?.find(t => t.id === i.becameTestId && !t.deletedAt) : undefined));

/** How it stands, in words: "open · way agreed: belt to bypass the robot",
 *  "open · 2 ways round it, none agreed", "open · no way round it yet",
 *  "sorted 9 Oct". */
export function criticalState(c: Critical): string {
  if (c.sorted) {
    const on = c.item.doneAt ?? (c.fix?.ranOn ? Date.parse(c.fix.ranOn) : undefined);
    return on ? `sorted ${niceDay(dayOfMs(on))}` : 'sorted';
  }
  const ways = c.item.ways ?? [];
  if (c.agreed) return `open · going with: ${c.agreed.what}`;
  if (ways.length) return `open · ${ways.length} way${ways.length === 1 ? '' : 's'} round it, none agreed`;
  return 'open · no way round it yet';
}

/** "1 critical" / "2 critical" — the count beside a job or a stage. */
export const criticalCount = (n: number): string => `${n} critical`;
