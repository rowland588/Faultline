/* A PROGRAM'S STATUS SECTION — typed by hand (Rowland, 2 November: "the program report and app ui needs a clear program status
 * section this can be manually inputted by the user. Programs status done, doing etc, best speed. Speed production can run at ..
 * any caveats"). Four things a person says of a program, kept on the program (programs.run_status):
 *
 *   work       where the work on it stands — Not started · Doing · Done · On hold
 *   bestSpeed  the best speed it has been run at (packs a minute)
 *   runAt      the speed production can run it at (packs a minute)
 *   caveats    what to watch, in words
 *
 * It is NOT the proof state (Not written · On the machine · Proved — lib/programs) and NOT a test's verdict (lib/programJourney):
 * those are read from the tests; this is the person's own word, saying what the tests cannot. Nothing here is worked out, nothing
 * is invented, and a program with nothing said reads as nothing said. The screen's row and section and the programs report's
 * line all say it through this one module. No AI. */

export type ProgramWork = 'notStarted' | 'doing' | 'done' | 'onHold';
export const WORKS: ProgramWork[] = ['notStarted', 'doing', 'done', 'onHold'];
export const WORK_WORD: Record<ProgramWork, string> = { notStarted: 'Not started', doing: 'Doing', done: 'Done', onHold: 'On hold' };
/** Colour is the app's one set: grey not started, indigo under way, green done, amber waiting on somebody. */
export const WORK_TONE: Record<ProgramWork, 'n' | 'w' | 'g' | 'a'> = { notStarted: 'n', doing: 'w', done: 'g', onHold: 'a' };

export interface ProgramStatus { work: ProgramWork; bestSpeed?: number; runAt?: number; caveats?: string; at: number; by?: string }

export const CAVEATS_MAX = 600;

/** A speed said as the floor says it — "75 ppm", the decimals only when there are some. */
export const speedWord = (n: number): string => `${+n.toFixed(2)} ppm`;

/** What is typed in the boxes, as the boxes hold it. */
export interface StatusDraft { work: ProgramWork; bestSpeed: string; runAt: string; caveats: string }

export const draftOf = (s: ProgramStatus | undefined): StatusDraft => ({
  work: s?.work ?? 'notStarted', bestSpeed: s?.bestSpeed != null ? String(s.bestSpeed) : '', runAt: s?.runAt != null ? String(s.runAt) : '', caveats: s?.caveats ?? '',
});

/** A speed typed: a positive number, or nothing. Anything else is refused (undefined), never guessed. */
export const speedOf = (t: string): number | undefined => {
  const v = Number(t.trim().replace(/,/g, ''));
  return t.trim() !== '' && Number.isFinite(v) && v > 0 && v < 100000 ? +v.toFixed(2) : undefined;
};

/** Why a draft cannot be kept, in words — or undefined when it can. A speed that is typed must be a number above nothing. */
export function draftProblem(d: StatusDraft): string | undefined {
  if (d.bestSpeed.trim() !== '' && speedOf(d.bestSpeed) === undefined) return 'Best speed is a number above nothing — packs a minute.';
  if (d.runAt.trim() !== '' && speedOf(d.runAt) === undefined) return 'The speed production can run at is a number above nothing — packs a minute.';
  return undefined;
}

/** The record to keep from a draft, or undefined when nothing is said at all (not started, no speeds, no caveats). */
export function statusFrom(d: StatusDraft, at: number, by?: string): ProgramStatus | undefined {
  if (draftProblem(d)) return undefined;
  const bestSpeed = speedOf(d.bestSpeed), runAt = speedOf(d.runAt), caveats = d.caveats.trim().slice(0, CAVEATS_MAX);
  if (d.work === 'notStarted' && bestSpeed === undefined && runAt === undefined && !caveats) return undefined;
  return { work: d.work, ...(bestSpeed !== undefined ? { bestSpeed } : {}), ...(runAt !== undefined ? { runAt } : {}), ...(caveats ? { caveats } : {}), at, ...(by ? { by } : {}) };
}

/** Production asked to run faster than the best speed it has ever been run at — said, never refused. */
export const aheadOfBest = (s: ProgramStatus | undefined): boolean => !!s && s.bestSpeed != null && s.runAt != null && s.runAt > s.bestSpeed;

/** The parts of the one line: ["Doing", "Best speed 75 ppm", "Production can run at 70 ppm", "Caveats: …"], what is said only. */
export function statusParts(s: ProgramStatus | undefined): string[] {
  if (!s) return [];
  return [WORK_WORD[s.work], ...(s.bestSpeed != null ? [`Best speed ${speedWord(s.bestSpeed)}`] : []), ...(s.runAt != null ? [`Production can run at ${speedWord(s.runAt)}`] : []), ...(s.caveats ? [`Caveats: ${s.caveats}`] : [])];
}
/** The line a row and a paper say, or '' when nothing is said. */
export const statusSays = (s: ProgramStatus | undefined): string => statusParts(s).join(' · ');
export const AHEAD_SAYS = 'Production is asked to run faster than the best speed it has been run at.';

/** From the cloud: kept only when it is the shape this build reads — a row written by a later build never crashes a screen. */
export function statusFromRow(v: unknown): { status?: ProgramStatus } {
  const o = v as Partial<ProgramStatus> | null;
  if (!o || typeof o !== 'object' || !WORKS.includes(o.work as ProgramWork)) return {};
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined);
  const bestSpeed = num(o.bestSpeed), runAt = num(o.runAt), caveats = typeof o.caveats === 'string' && o.caveats.trim() ? o.caveats.trim() : undefined;
  return { status: { work: o.work as ProgramWork, ...(bestSpeed !== undefined ? { bestSpeed } : {}), ...(runAt !== undefined ? { runAt } : {}), ...(caveats ? { caveats } : {}),
    at: Number(o.at) || 0, ...(typeof o.by === 'string' && o.by ? { by: o.by } : {}) } };
}

/** What a set of programs says together — "3 programs with a status — 1 doing · 2 done", or '' when none says anything. */
export function statusTally(ps: readonly { status?: ProgramStatus }[]): string {
  const said = ps.filter(p => p.status);
  if (!said.length) return '';
  const n = (w: ProgramWork) => said.filter(p => p.status?.work === w).length;
  const parts = WORKS.filter(w => n(w) > 0).map(w => `${n(w)} ${WORK_WORD[w].toLowerCase()}`);
  return `${said.length} of ${ps.length} programs with a status — ${parts.join(' · ')}`;
}
