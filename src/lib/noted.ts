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
import { live, type Asset, type PartResult, type PartResultIs, type Test, type TestItem } from './testing';
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

/** A stage's parts, in the order the person set (▲ ▼ in ui/StageParts) —
 *  which is the order they were written until somebody moves one. */
export const partsOf = (stepId: string, items: TestItem[]): TestItem[] =>
  live(items).filter(i => i.testId === stepId && i.kind === 'next').sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt);

/** One part moved a place up (-1) or down (+1) on its stage. Rowland, 8
 *  October: "when I've got all the programs there, helping me to organize my
 *  programs, I need to be able to move them up and down." The stage's parts
 *  are renumbered 1, 2, 3 … so the order is exact, and only the parts whose
 *  place changed come back to be written. */
export function partMoved(stepId: string, items: TestItem[], id: string, by: -1 | 1): TestItem[] {
  const list = partsOf(stepId, items);
  const i = list.findIndex(p => p.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((p, k) => ({ p, sort: k + 1 })).filter(x => x.p.sort !== x.sort).map(x => ({ ...x.p, sort: x.sort }));
}

/** Past its day and not done — the one rule the drawer, the grid, the day,
 *  Needs you and the band all read. */
export const partLate = (i: TestItem, today: string): boolean => i.doneAt == null && !!i.due && i.due < today;

/* ITS STATUS, WITH WHAT WAS SEEN (TestItem.results). Rowland, 8 October: "in
   programs we need to show status of program, not just problem — pass, fail,
   baseline achieved ... I need status with commentary." A problem is what
   went wrong; a status is where the part has got to — both are kept. */

export const RESULT_WORD: Record<PartResultIs, string> = { baseline: 'baseline achieved', passed: 'passed', failed: 'failed' };

/** The status said last on a part, if any. */
export const lastResult = (p: TestItem): PartResult | undefined => (p.results?.length ? p.results[p.results.length - 1] : undefined);

/** THE STATUS THE PART STANDS ON NOW — passed only while it is ticked done;
 *  failed or baseline achieved only while it is not (ticking it done after a
 *  failure is the failure sorted, and unticking a pass takes the pass back). */
export function resultNow(p: TestItem): PartResult | undefined {
  const r = lastResult(p);
  if (!r) return undefined;
  return (r.is === 'passed') === (p.doneAt != null) ? r : undefined;
}

/** "baseline achieved 8 Oct" · "failed 8 Oct" · "passed 8 Oct". */
export const resultWords = (r: PartResult): string => `${RESULT_WORD[r.is]} ${niceDay(r.on)}`;

/** A status said on a part: its list grows by one. Passed ticks it done;
 *  failed or baseline achieved means it is not done yet. */
export function saidResult(p: TestItem, is: PartResultIs, note: string, now = Date.now()): TestItem {
  const said = note.trim();
  const r: PartResult = { is, on: dayOfMs(now), ...(said ? { note: said } : {}), at: now };
  return { ...p, results: [...(p.results ?? []), r], doneAt: is === 'passed' ? p.doneAt ?? now : undefined };
}

/* EDITING WHAT WAS SAID. Rowland, 8 October: "I don't have ability to edit
   the status commentary — you only allow the title." One form edits all of
   it (ui/StageParts), by one rule:
     · the same status, new words      → the words are corrected in place;
     · a different status, said today  → today's is corrected (a mis-tap);
     · a different status, said before → a new one, the old kept in its
                                         history — that is the program's story. */
export function editedResult(p: TestItem, is: PartResultIs, note: string, now = Date.now()): TestItem {
  const last = lastResult(p);
  const said = note.trim();
  if (!last) return saidResult(p, is, said, now);
  const rest = (p.results ?? []).slice(0, -1);
  if (last.is === is) {
    if (said === (last.note ?? '')) return p;
    return { ...p, results: [...rest, { is: last.is, on: last.on, at: last.at, ...(said ? { note: said } : {}) }] };
  }
  if (last.on === dayOfMs(now)) {
    return { ...p, results: [...rest, { is, on: last.on, at: now, ...(said ? { note: said } : {}) }],
      doneAt: is === 'passed' ? p.doneAt ?? now : undefined };
  }
  return saidResult(p, is, said, now);
}

/** One status taken off its history (the owner's, as deleting always is).
 *  Taking off the one it stands on hands the part to the one before — a
 *  pass taken back is no longer done. */
export function withoutResult(p: TestItem, at: number): TestItem {
  const results = (p.results ?? []).filter(r => r.at !== at);
  const before = lastResult(p), after = results[results.length - 1];
  const wasPass = before?.at === at && before.is === 'passed';
  return {
    ...p, results,
    ...(after?.is === 'passed' ? { doneAt: p.doneAt ?? after.at } : wasPass ? { doneAt: undefined } : {}),
  };
}

/** "Panels to run Express 1.25 kg — Ilapak UK · by 9 Oct" / "— done 6 Oct" /
 *  "— late · was 5 Oct" / "— to do" / "— baseline achieved 8 Oct: running 32
 *  ppm, film tracking to tune". For paper: the words the line says on the
 *  stage (ui/StageParts), its status's commentary after it. */
export const partWords = (i: TestItem, today = todayISO()): string => {
  const r = resultNow(i);
  const state = r && r.is !== 'baseline' ? resultWords(r)
    : i.doneAt != null ? `done ${niceDay(dayOfMs(i.doneAt))}`
    : partLate(i, today) ? `late · was ${niceDay(i.due)}${r ? ` · ${resultWords(r)}` : ''}`
    : r ? resultWords(r) : i.due ? `by ${niceDay(i.due)}` : 'to do';
  return `${i.what} — ${[i.owner?.trim(), state].filter(Boolean).join(' · ')}${r?.note ? `: ${r.note}` : ''}`;
};

/** A STAGE'S PARTS IN A FEW WORDS — the branch mark on its square, its card
 *  row and its drawer: "2 parts · 1 done · 1 at baseline", and "· 1 failed"
 *  or "· 1 late" when one is — the only numbers in it that carry a colour. */
export function partsSaid(parts: TestItem[], today: string): { text: string; head: string; late: number; failed: number } | undefined {
  if (!parts.length) return undefined;
  const done = parts.filter(p => p.doneAt != null).length;
  const late = parts.filter(p => partLate(p, today)).length;
  const now = parts.map(resultNow);
  const failed = now.filter(r => r?.is === 'failed').length;
  const baseline = now.filter(r => r?.is === 'baseline').length;
  const head = `${parts.length} part${parts.length === 1 ? '' : 's'}${done ? ` · ${done} done` : ''}${baseline ? ` · ${baseline} at baseline` : ''}`;
  return { text: [head, failed ? `${failed} failed` : '', late ? `${late} late` : ''].filter(Boolean).join(' · '), head, late, failed };
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

