/* PROBLEMS WITH NO FIX — kept in sight for the whole journey.
 *
 * Rowland, 6 October: "although I may not put something as a fix, I don't
 * want to lose track of the problems that we're seeing along the journey ...
 * I could put done today, but I don't want that problem just to disappear,
 * because I want to show the story and the journey."
 *
 * A problem is something found on a record (a TestItem of kind 'found'). One
 * that booked a fix is followed on the Fixes list as that fix. One that did
 * not was seen only in its own stage's story, and once the stage was done
 * nothing else pointed at it. These are those, open until somebody says it is
 * sorted (doneAt — the item's own "closed"), whatever the stage's state. No
 * new list: read off what is already kept. */
import { live, type Asset, type Test, type TestItem } from './testing';
import { niceDay, todayISO } from './weeks';

export interface Noted {
  item: TestItem;
  /** The stage, test or other record it was found on, when it is one. */
  on?: Test;
  /** "Destaker — Sensors and controls checked (I/O)". */
  where: string;
  /** The day it was written, as an ISO date. */
  day: string;
}

const dayOfMs = (ms: number) => todayISO(new Date(ms));

/** Every problem with no fix booked from it — open first (oldest first: the
 *  one waited on longest leads), then the sorted ones, newest first. */
export function notedProblems(tests: Test[], items: TestItem[], assets: Asset[]): { open: Noted[]; sorted: Noted[] } {
  const ts = live(tests);
  const fixIds = new Set(ts.filter(t => t.kind === 'fix').map(t => t.id));
  const rows: Noted[] = live(items)
    .filter(i => i.kind === 'found' && !(i.becameTestId && fixIds.has(i.becameTestId)))
    .map(i => {
      const on = ts.find(t => t.id === i.testId);
      const machine = on?.assetId ? assets.find(a => a.id === on.assetId && !a.deletedAt)?.name : undefined;
      return { item: i, ...(on ? { on } : {}), where: on ? `${machine ?? 'The line'} — ${on.title}` : 'The job', day: dayOfMs(i.createdAt) };
    });
  return {
    open: rows.filter(r => r.item.doneAt == null).sort((a, b) => a.item.createdAt - b.item.createdAt),
    sorted: rows.filter(r => r.item.doneAt != null).sort((a, b) => (b.item.doneAt ?? 0) - (a.item.doneAt ?? 0)),
  };
}

/* PART OF THE PLAN (ui/StageParts) — a stage's own lines, which are not
   problems: the item kind 'next', ticked done by doneAt. */

/** A stage's parts, in the order they were written. */
export const partsOf = (stepId: string, items: TestItem[]): TestItem[] =>
  live(items).filter(i => i.testId === stepId && i.kind === 'next').sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);

/** "Panels to run Express 1.25 kg — done 6 Oct" / "— to do". For paper. */
export const partWords = (i: TestItem): string =>
  `${i.what}${i.owner ? ` (${i.owner})` : ''} — ${i.doneAt != null ? `done ${niceDay(todayISO(new Date(i.doneAt)))}` : 'to do'}`;

