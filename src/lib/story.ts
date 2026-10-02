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
export function moveLines(stages: { id?: string; label: string }[], tests: Test[], items: TestItem[]):
  { on: string; stage: string; from: string; to: string; days: number; why: string; fix?: string }[] {
  const out: { at: string; line: { on: string; stage: string; from: string; to: string; days: number; why: string; fix?: string } }[] = [];
  for (const s of stages) {
    if (!s.id) continue;
    const st = storyOf(s.id, tests, items);
    for (const m of st.moves) {
      const f = m.fixId ? st.fixes.find(x => x.id === m.fixId) : undefined;
      const fix = f ? `${f.title} — ${f.outcome === 'passed' ? 'done' : f.plannedFor ? `date agreed ${niceDay(f.plannedFor)}` : 'no date agreed yet'}` : undefined;
      out.push({ at: m.on, line: { on: niceDay(m.on, { weekday: 'short' }), stage: s.label, from: niceDay(m.from), to: niceDay(m.to), days: m.days, why: m.why, ...(fix ? { fix } : {}) } });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).map(x => x.line);
}
