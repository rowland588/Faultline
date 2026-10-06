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

/** Past its day and not done — the one rule the drawer, the grid, the day,
 *  Needs you and the band all read. */
export const partLate = (i: TestItem, today: string): boolean => i.doneAt == null && !!i.due && i.due < today;

/** "Panels to run Express 1.25 kg — Ilapak UK · by 9 Oct" / "— done 6 Oct" /
 *  "— late · was 5 Oct" / "— to do". For paper: the words the line says on
 *  the stage (ui/StageParts). */
export const partWords = (i: TestItem, today = todayISO()): string => {
  const state = i.doneAt != null ? `done ${niceDay(dayOfMs(i.doneAt))}`
    : partLate(i, today) ? `late · was ${niceDay(i.due)}` : i.due ? `by ${niceDay(i.due)}` : 'to do';
  return `${i.what} — ${[i.owner?.trim(), state].filter(Boolean).join(' · ')}`;
};

/** A STAGE'S PARTS IN A FEW WORDS — the branch mark on its square, its card
 *  row and its drawer: "2 parts · 1 done", and "· 1 late" when one is, the
 *  only part of it that carries a colour. */
export function partsSaid(parts: TestItem[], today: string): { text: string; head: string; late: number } | undefined {
  if (!parts.length) return undefined;
  const done = parts.filter(p => p.doneAt != null).length;
  const late = parts.filter(p => partLate(p, today)).length;
  const head = `${parts.length} part${parts.length === 1 ? '' : 's'}${done ? ` · ${done} done` : ''}`;
  return { text: late ? `${head} · ${late} late` : head, head, late };
}

/** "Programs loaded — first program to verify Tesco Express 1.25 packs
 *  (Ilapak flow wrapper)": a part off the list it hangs from, said with its
 *  stage first — a branch, never a line of its own. */
export const partOnStage = (part: TestItem, stage: Test, machine?: string): string =>
  `${stage.title} — ${part.what}${machine ? ` (${machine})` : ''}`;

/** Every part on a live stage, with its stage — in the stages' order, then
 *  the order they were written. */
export function partsOnStages(tests: Test[], items: TestItem[]): { part: TestItem; stage: Test }[] {
  const stages = new Map(live(tests).filter(t => t.kind === 'install').map(t => [t.id, t]));
  return live(items).flatMap(part => {
    const stage = part.kind === 'next' ? stages.get(part.testId) : undefined;
    return stage ? [{ part, stage }] : [];
  }).sort((a, b) => a.stage.sort - b.stage.sort || a.part.sort - b.part.sort || a.part.createdAt - b.part.createdAt);
}

/** WHAT IS OWED BY A DAY: every part on a stage with a day and not done. A
 *  part with no day rides on its stage's own date and is not counted again.
 *  ONE RULE, read by lib/standing (the band, the rail, the client report's
 *  "What we're waiting on") and lib/portfolio jobItems (Needs you, the
 *  control room's week), so the counts and the rows cannot disagree. */
export const owedParts = (tests: Test[], items: TestItem[]): { part: TestItem; stage: Test }[] =>
  partsOnStages(tests, items).filter(x => !!x.part.due && x.part.doneAt == null);

