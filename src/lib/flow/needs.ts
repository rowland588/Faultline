/* WHAT FAULTLINE CANNOT DO YET, AND HOW IT WOULD BE BUILT — the needs every
 * method has said (FlowDefinition.needs), gathered, and each made a brief a
 * developer can build from (docs/BLUEPRINT.md §3, beyond the existing tools).
 *
 * Rowland, 18 October: "I understand that new analytical capabilities may
 * require purpose-built calculations, algorithms or conventional software
 * development ... I want the underlying platform designed so that new
 * capabilities can be developed and integrated without the entire product
 * having to be rebuilt for each new requirement." A need is never run and
 * never imitated. Here the platform says what it cannot do, which methods
 * wait on it, and the one place a new block goes — its contract, the tests
 * that prove it, and what it then reaches with nothing else changed — so
 * "it can't do that yet" is a piece of work with a shape, not a wall. */
import type { FlowNeed } from './definition';
import { ANALYSIS_BLOCKS } from './analysis';

export interface NeedAsked {
  need: FlowNeed;
  /** The methods that said it — by name, newest version of each family once. */
  askedBy: { id: string; name: string }[];
}

interface MethodLike { id: string; familyId?: string; status?: string; version?: number; definition: { name: string; needs?: FlowNeed[] } }

const key = (w: string) => w.trim().toLowerCase().replace(/\s+/g, ' ');

/** Every need said by a method that is not retired — the newest version of
 *  each method only — the same need asked by several methods said once, with
 *  each of them. Most asked first, then by name. */
export function needsAsked(methods: readonly MethodLike[]): NeedAsked[] {
  const newest = new Map<string, MethodLike>();
  for (const m of methods) {
    if (m.status === 'retired') continue;
    const fam = m.familyId ?? m.id, had = newest.get(fam);
    if (!had || (m.version ?? 0) > (had.version ?? 0)) newest.set(fam, m);
  }
  const out = new Map<string, NeedAsked>();
  for (const m of newest.values()) {
    for (const n of m.definition.needs ?? []) {
      if (!n.what?.trim()) continue;
      const k = key(n.what);
      const seen = out.get(k);
      if (seen) { if (!seen.askedBy.some(a => a.id === m.id)) seen.askedBy.push({ id: m.id, name: m.definition.name }); }
      else out.set(k, { need: n, askedBy: [{ id: m.id, name: m.definition.name }] });
    }
  }
  return [...out.values()].sort((a, b) => b.askedBy.length - a.askedBy.length || a.need.what.localeCompare(b.need.what));
}

/** THE BRIEF — what to build, why, from what, how it is checked, and where it
 *  goes: one block in lib/flow/analysis with its tests, offered from then on
 *  to the editor, the validator, the assistant, the screen and the paper. */
export function needBrief(a: NeedAsked): string {
  const n = a.need;
  const line = (label: string, v?: string) => (v?.trim() ? `${label}: ${v.trim()}` : `${label}: not said yet — to agree before it is built`);
  return [
    `FAULTLINE — A CAPABILITY TO DEVELOP`,
    ``,
    `What: ${n.what.trim()}`,
    line('Why', n.why),
    line('From', n.inputs),
    line('Method', n.method),
    line('How it is checked', n.check),
    `Asked for by: ${a.askedBy.map(m => `“${m.name}”`).join(', ')}`,
    ``,
    `WHERE IT GOES`,
    `One entry in src/lib/flow/analysis.ts (BLOCKS), beside the ${ANALYSIS_BLOCKS.length} there are (${ANALYSIS_BLOCKS.join(', ')}):`,
    `- id, name, and what it is for in a line (says);`,
    `- needs: what it reads — of (the number worked on), by (a words column grouped by), against (a second number), when (which entries count), target, formula (arithmetic over the figures before it), from (an earlier log, for a before and after) — each required, optional or none;`,
    `- output: a number gates and measures can read, a picture, or both; and its picture (none, bars, pareto, control, scatter, forecast, curve — or a new one drawn once on screen and once on paper);`,
    `- compute(entries, analysis, columns, context) → its figure, its points and one sentence, from the entries (and, through the context, the figures before it, the step's boxes and the earlier logs) — nothing stored, a struck entry counting for nothing.`,
    ``,
    `HOW IT IS PROVED`,
    `- tests in src/lib/flow/__tests__/ with every figure worked by hand in its comment, and the edges said, not faked: too few entries, nothing varying, nothing to read;`,
    `- where an established tool already works the same arithmetic, a test holding the two equal (as the control chart's limits are held to the capability study's spread);`,
    `- the check above, run on real entries before it is offered.`,
    ``,
    `WHAT IT THEN REACHES, WITH NOTHING ELSE CHANGED`,
    `The method editor's list of analyses, the validator's words, the assistant's brief (generated from the registry), the step's figures for gates and measures, the screen and the method report. The methods above can then replace this need with a step that uses it.`,
  ].join('\n');
}
