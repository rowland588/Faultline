/* WHAT EACH STEP MEANS — A TOOL'S GUIDE (docs/METHODS.md §15 — Rowland, 1 November 2026: "all tools must have user guidance ..
 * what's each step means").
 *
 * A tool's page asks a person for things in an order: what are you measuring, which question, judged against what, the
 * readings, the verdict. A guide says each of those steps three ways — WHAT IT MEANS (in the floor's words, a term of art
 * explained in passing), WHAT TO DO there (the thing to type, tap, time, count, photograph or decide, and where on the floor
 * the figure comes from) and WHAT YOU GET (the figure, picture, row or decision the person leaves with) — in the page's own
 * labels, in the order a first-timer meets them. Written by us and fixed in code, never made by an assistant
 * (docs/DIRECTION.md). Drawn by ui/StepGuide on the tool's page (screens/ToolPageScreen) and over every page of the tool by the
 * context bar's *How it works* (ui/GuideButton) — one set of words, so the two never part.
 *
 * Where the guides live: one file a discipline in guides/ (`export const <NAME>_GUIDES: Record<string, Guide>`, each key a
 * catalogue number written as `  'FC-094': {` at two spaces so scripts/guides-exempt.mjs can read it), merged here by glob — a
 * new file needs no edit to this one. A mode of a tool (`partOf`) with no guide of its own is covered by its parent's; give it
 * its own when its steps differ. `guides/exempt.ts` lists the available or part-built tools with no guide yet; it only
 * shrinks (scripts/guides-exempt.mjs regenerates it, never by hand) and a tool is never added to it — a new tool is built with
 * its guide. __tests__/guides.test.ts holds all of that true. */
import type { Entry } from './types';

export interface GuideStep {
  /** The step's name — the page's own label for it, or a short natural name for a block of them. */
  step: string;
  /** What it is, in a sentence a first-timer follows; any term of art explained in passing. */
  means: string;
  /** What to do there: type, tap, time, count, photograph or decide — and where on the floor the figure comes from. */
  doThis: string;
  /** What the person leaves with — named as the page names it. */
  youGet: string;
}

export interface Guide {
  /** Who it is for and when to reach for it — one or two sentences. */
  intro?: string;
  /** Two to nine steps, in the order a person meets them. */
  steps: GuideStep[];
  /** The one thing people get wrong. */
  watch?: string;
}

const found = import.meta.glob<Record<string, unknown>>('./guides/*.ts', { eager: true });

/** Every guide, by catalogue number, merged from the files in guides/ (an export named …_GUIDES). */
export const GUIDES: Record<string, Guide> = {};
/** Which file each guide is in — a number is written in one file only (the test holds it). */
export const GUIDE_FILES: Record<string, string[]> = {};
for (const [path, mod] of Object.entries(found)) {
  for (const [name, value] of Object.entries(mod)) {
    if (!name.endsWith('_GUIDES') || !value || typeof value !== 'object') continue;
    for (const [id, guide] of Object.entries(value as Record<string, Guide>)) {
      GUIDES[id] = guide;
      (GUIDE_FILES[id] ??= []).push(path.replace('./guides/', ''));
    }
  }
}

/** A tool's own guide. */
export const ownGuide = (id: string): Guide | undefined => GUIDES[id.trim().toUpperCase()];

/** A guide for an entry: its own, else the one of the tool it is a mode of (up the chain, a few hops at most). */
export function guideFor(id: string, entries: readonly Pick<Entry, 'id' | 'partOf'>[]): { guide: Guide; from: string } | undefined {
  let at: string | undefined = id.trim().toUpperCase();
  for (let hop = 0; at && hop < 4; hop++) {
    const g = GUIDES[at];
    if (g) return { guide: g, from: at };
    at = entries.find(e => e.id === at)?.partOf;
  }
  return undefined;
}

/** The modes of a tool that have a guide of their own — shown folded under the tool's. */
export function modeGuides(parent: string, all: readonly Pick<Entry, 'id' | 'name' | 'partOf'>[]): { id: string; name: string; guide: Guide }[] {
  return all.filter(e => e.partOf === parent && GUIDES[e.id]).map(e => ({ id: e.id, name: e.name, guide: GUIDES[e.id] }));
}

/** "6 steps" */
export const stepCount = (g: Guide): string => `${g.steps.length} step${g.steps.length === 1 ? '' : 's'}`;
