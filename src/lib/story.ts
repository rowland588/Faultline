/* THE STORY OF A STAGE — what happened to it, read off what is already kept.
 *
 * Rowland: "What's the point of a static Gantt chart? There's the plan. Plans
 * change. This is the reason why. This is what happened. Look at the film.
 * Look at the picture. It's now booked in as a fix, and we've even agreed a
 * date, or we haven't."
 *
 * Three things, all records the job already has:
 *   MOVES   something found on the step, written because its finish was pushed
 *           later — the reason, the film and the pictures, from → to
 *   FOUND   anything else found on it — a problem written up on the day
 *   FIXES   the fixes that came out of it, each with its agreed date or none
 *
 * The Gantt draws these on the stage's own row and opens them in one panel;
 * the plan PDF prints the reasons. Nothing here is stored — it is a reading.
 */
import { live, type Test, type TestItem } from './testing';
import type { MediaRef } from '../types';
import { daysBetween, niceDay, todayISO } from './weeks';
import { DAY_HOURS, hoursTally, hoursWord, partsWord } from './hoursLost';

export interface Move { id: string; on: string; from: string; to: string; days: number; why: string; media: MediaRef[]; fixId?: string }
export interface Found { id: string; on: string; what: string; media: MediaRef[]; fixId?: string }
export interface StageStory {
  moves: Move[];
  found: Found[];
  fixes: Test[];
  /** The finish first planned, before anything moved it. */
  original?: string;
  /** Every day something happened on it — for the marks on its row. */
  days: string[];
}

const dayOf = (ms: number) => todayISO(new Date(ms));

/** Is this a push later? Only a finish that already existed, moved later. */
export const movedLater = (was?: string, now?: string): boolean => !!was && !!now && now > was;

export function storyOf(stepId: string, tests: Test[], items: TestItem[]): StageStory {
  const mine = live(items).filter(i => i.testId === stepId && i.kind === 'found').sort((a, b) => a.createdAt - b.createdAt);
  const moves: Move[] = mine.filter(i => i.movedFrom && i.movedTo).map(i => ({
    id: i.id, on: dayOf(i.createdAt), from: i.movedFrom as string, to: i.movedTo as string,
    days: daysBetween(i.movedFrom as string, i.movedTo as string), why: i.what, media: i.media ?? [],
    ...(i.becameTestId ? { fixId: i.becameTestId } : {}),
  }));
  const found: Found[] = mine.filter(i => !(i.movedFrom && i.movedTo)).map(i => ({
    id: i.id, on: dayOf(i.createdAt), what: i.what, media: i.media ?? [],
    ...(i.becameTestId ? { fixId: i.becameTestId } : {}),
  }));
  const fixes = live(tests).filter(t => t.kind === 'fix' && t.fromTestId === stepId).sort((a, b) => a.createdAt - b.createdAt);
  const days = [...new Set([...moves.map(m => m.on), ...found.map(f => f.on)])].sort();
  return { moves, found, fixes, ...(moves.length ? { original: moves[0].from } : {}), days };
}

/** "+3 days" — how far the finish is now from the one first planned. */
export function slipOf(s: StageStory, finishNow?: string): number {
  return s.original && finishNow ? Math.max(0, daysBetween(s.original, finishNow)) : 0;
}

/** Every push later on these stages, oldest first, in words for paper — the
 *  "Why the plan moved" list under the printed Gantt. */
type MoveWords = { on: string; stage: string; from: string; to: string; days: number; why: string; fix?: string };
export function moveLines(stages: { id?: string; label: string; key?: string }[], tests: Test[], items: TestItem[], day: number = DAY_HOURS): MoveWords[] {
  const out: { at: string; line: MoveWords }[] = [];
  /* The handover first among equals: it is the date the client asks about. */
  for (const s of [{ label: 'Handover', key: HANDOVER_KEY } as { id?: string; label: string; key?: string }, ...stages]) {
    const key = s.key ?? s.id;
    if (!key) continue;
    const st = storyOf(key, tests, items);
    /* Hours lost (lib/hoursLost): a push made from hours says which hours made
       the day. Hours not yet a day have moved nothing, so they are not here —
       the client report gives them under each gate. */
    const hrs = hoursTally(key, items, day);
    for (const m of st.moves) {
      const f = m.fixId ? st.fixes.find(x => x.id === m.fixId) : undefined;
      const fix = f ? `${f.title} — ${f.outcome === 'passed' ? 'done' : f.plannedFor ? `date agreed ${niceDay(f.plannedFor)}` : 'no date agreed yet'}` : undefined;
      const parts = hrs.pushes.get(m.id);
      const why = parts ? `${partsWord(parts)} — ${m.days} full day${m.days === 1 ? '' : 's'} at ${hoursWord(day)} a day` : m.why;
      out.push({ at: m.on, line: { on: niceDay(m.on, { weekday: 'short' }), stage: s.label, from: niceDay(m.from), to: niceDay(m.to), days: m.days, why, ...(fix ? { fix } : {}) } });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).map(x => x.line);
}

/* ---------------------------------------------------------------------------
 * THE OTHER DATES THAT SLIP. Rowland: "do 1 to 3" — the first being that the
 * handover, a machine's arrival, a material and a program's test date could
 * all move with no reason asked. Their reasons are kept the same way a stage's
 * are — something found, with the date it moved from and to — filed under a
 * key that names what moved. A stage's key is its own id.
 * ------------------------------------------------------------------------- */
export const HANDOVER_KEY = 'job:handover';
export type MovedThing = 'stage' | 'machine' | 'material' | 'program' | 'handover';
export const keyOf = (thing: MovedThing, id?: string): string =>
  thing === 'handover' ? HANDOVER_KEY
    : thing === 'machine' ? `asset:${id}` : thing === 'material' ? `material:${id}` : thing === 'program' ? `program:${id}` : (id as string);
/** The key a plan mark's story is filed under, when it has one. */
export function keyOfMark(kind: string, id?: string): string | undefined {
  if (!id) return undefined;
  if (kind === 'machine') return keyOf('machine', id);
  if (kind === 'material') return keyOf('material', id);
  if (kind === 'program') return keyOf('program', id);
  if (kind === 'install' || kind === 'setup' || kind === 'handover' || kind === 'test') return id;
  return undefined;
}

/* ---------------------------------------------------------------------------
 * WHAT FOLLOWS A STAGE. Rowland: when Install runs three days over, "Set up
 * doesn't move and nothing says the two now overlap." What follows is every
 * step or test on the same machine that starts after this one, not yet done.
 * ------------------------------------------------------------------------- */
export function followingOf(step: Test, tests: Test[]): Test[] {
  const start = step.plannedFor ?? step.plannedTo;
  if (!start) return [];
  return live(tests)
    .filter(t => t.id !== step.id && t.kind !== 'fix' && t.assetId === step.assetId && !!t.plannedFor
      && (t.plannedFor as string) > start && t.outcome !== 'passed')
    .sort((a, b) => (a.plannedFor as string).localeCompare(b.plannedFor as string) || a.sort - b.sort);
}

/** Of those, the ones a finish this late now runs into. */
export const runsInto = (following: Test[], newEnd: string): Test[] =>
  following.filter(t => (t.plannedFor as string) <= newEnd);

/** A step that starts before the one ahead of it on its machine has finished:
 *  the overlap, and which step it overlaps. An overlap said to be fine
 *  (overlapOk) is the plan, not a warning — `asked` ignores that answer, for
 *  the dates form that asks the question. */
export function overlapOf(step: Test, tests: Test[], asked = false): Test | undefined {
  if (!step.plannedFor || step.outcome === 'passed' || (step.overlapOk && !asked)) return undefined;
  const end = (t: Test) => (t.plannedTo && t.plannedTo > (t.plannedFor ?? '') ? t.plannedTo : t.plannedFor) as string;
  return live(tests)
    .filter(t => t.id !== step.id && t.kind !== 'fix' && t.assetId === step.assetId && !!t.plannedFor
      && (t.plannedFor as string) < (step.plannedFor as string) && t.outcome !== 'passed' && end(t) >= (step.plannedFor as string))
    .sort((a, b) => end(b).localeCompare(end(a)))[0];
}
