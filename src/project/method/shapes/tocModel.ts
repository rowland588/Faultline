/* THE THEORY OF CONSTRAINTS' FIVE FOCUSING STEPS, READ FROM THE LINE'S OWN NUMBERS (docs/METHODS.md §16).
 *
 * One module for the board (shapes/toc.tsx) and the paper (shapes/tocPaper.ts), so they cannot part. It reads — never types twice —
 * what the project's Line capacity already says (tools/linebalance/capacity analyse: the constraint, what the line makes, the next
 * station, what its stops cost), the project's latest loss count (the minutes lost at the constraint and their worth), the buffer and
 * orders typed on the line's products (the drum–buffer–rope), and the elevate options (the plan to the target, one more person, the
 * what-ifs). Where an input is missing it says which and where to give it; nothing is invented, no AI, nothing read from a machine.
 * The person's own words (the sheet's answers) sit beside the reading and are the method's record. Pure. */
import type { Standard } from '../../../tools/linestandard/standard';
import type { ToolStudy } from '../../../lib/study';
import type { Workspace } from '../../../types';
import { analyse, bottleneckCost, bottleneckCostSays, fmtMoney, labourInputs, oneMorePerson, type CapacityResult, type Capacity } from '../../../tools/linebalance/capacity';
import { planToTarget } from '../../../tools/linebalance/capacityPlan';
import { fmtBig, fmtN } from '../../../tools/linebalance/capacityWords';
import { contributionOf, gbp, inWindow, minWords } from '../../../tools/losses/losses';
import { lossFiguresOf } from '../../../lib/studyLinks';
import type { Observation } from '../../../types';
import { bufferOf, ordersOf } from '../../../tools/plan/planInputs';
import { fieldsOf, sectionState, type SectionState } from '../../../lib/methodSheet';
import { methodByKey } from '../../../lib/methods';

/** What the model reads (the project's records). */
export interface TocRecords {
  standards: readonly Standard[];
  studies: readonly ToolStudy[];
  /** The constraint's line — its cost model and its stops. */
  ws?: Workspace;
  observations?: readonly Observation[];
}

export interface TocReading {
  /** The Line capacity read, when the project has one with stations. */
  capacity?: { product: string; cap: Capacity; r: CapacityResult };
  /** The loss count read at the constraint. */
  loss?: { name: string; says: string; atConstraintMin?: number; packs?: number; money?: string; bars: string[] };
}

const nameOf = (s: { name: string }, i: number) => s.name.trim() || `Station ${i + 1}`;

export function readToc(x: TocRecords): TocReading {
  const std = [...x.standards].filter(s => !s.deletedAt && s.capacity?.stations.length).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const out: TocReading = {};
  if (std?.capacity) {
    const r = analyse(std.capacity);
    if (r.limit) out.capacity = { product: std.product, cap: std.capacity, r };
  }
  const count = [...x.studies].filter(s => s.tool === 'losses' && !s.deletedAt && s.facts.losses).sort((a, b) => b.startedAt - a.startedAt)[0];
  if (count) {
    const f = lossFiguresOf(count, { observations: x.observations ? [...x.observations] : undefined, workspaces: x.ws ? [x.ws] : undefined });
    const limitName = out.capacity?.r.limit ? nameOf(out.capacity.r.limit.station, out.capacity.r.limit.index).toLowerCase() : undefined;
    /* the stops in the count's window that name the constraint — its own minutes, whatever the category */
    const c0 = count.facts.losses;
    const mine = limitName && c0 && x.observations ? inWindow([...x.observations], c0.from, c0.to, count.workspaceId).filter(o => (o.asset ?? '').trim().toLowerCase() === limitName) : [];
    const atMin = mine.reduce((n, o) => n + (o.durationMs ?? 0) / 60_000, 0);
    const line = out.capacity?.r.line;
    const packs = limitName && atMin > 0 && line ? atMin * line : undefined;
    const c = contributionOf(x.ws);
    out.loss = {
      name: count.name,
      says: f.enough && f.lostMin != null ? `${minWords(f.lostMin)} lost in the shift in all` : `The count is not complete — ${f.missing.join('; ') || 'something is still to put in'}.`,
      ...(limitName ? { atConstraintMin: atMin } : {}),
      ...(packs != null ? { packs } : {}),
      ...(packs != null && c ? { money: `${gbp(packs * c.perPack)} of contribution` } : {}),
      bars: f.bars.slice(0, 4).map(b => `${b.label}${b.asset ? ` (${b.asset})` : ''} — ${minWords(b.min)}`),
    };
  }
  return out;
}

export interface TocStep {
  n: number;
  /** The method's section name (lib/methods). */
  section: string;
  /** The step in Goldratt's words. */
  title: string;
  /** The one-line reading of the line, or why there is none. */
  says: string;
  /** Further readings, each a sentence. */
  lines: string[];
  /** What is missing, and where to give it. */
  missing: string[];
  /** The tool that answers it and the project's record of it, when there is one. */
  tool?: { key: 'linebalance' | 'losses'; has: boolean };
  state: SectionState;
  /** The person's own words for the section: question → answer. */
  answers: { id: string; label: string; value: string }[];
}

const GOLDRATT = ['Identify the system’s constraint', 'Decide how to exploit the constraint', 'Subordinate everything else to that decision', 'Elevate the constraint', 'Go back to step one — do not let inertia become the constraint'];

export function tocSteps(answers: Readonly<Record<string, string>>, rec: TocRecords, read: TocReading = readToc(rec)): TocStep[] {
  const m = methodByKey('toc');
  if (!m) return [];
  const cap = read.capacity, r = cap?.r;
  const lim = r?.limit;
  const limit = lim ? nameOf(lim.station, lim.index) : undefined;
  const unit = r?.unit ?? 'packs';
  const needCap = 'The project has no Line capacity with stations yet — start one to read the constraint from the line’s own speeds.';
  const cost = contributionOf(rec.ws);
  const li = cap ? labourInputs(cap.cap, undefined, rec.ws) : undefined;
  const steps: TocStep[] = m.sections.map((s, i) => ({
    n: i + 1, section: s.name, title: GOLDRATT[i], says: '', lines: [], missing: [],
    state: sectionState('toc', s.name, answers),
    answers: fieldsOf('toc', s.name).map(fl => ({ id: fl.id, label: fl.label, value: (answers[fl.id] ?? '').trim() })),
  }));
  const [s1, s2, s3, s4, s5] = steps;

  /* 1 identify */
  s1.tool = { key: 'linebalance', has: !!cap };
  if (!r || !lim || !limit) { s1.says = 'The constraint is not read yet.'; s1.missing.push(needCap); }
  else {
    s1.says = `${limit} limits the line: it makes ${fmtN(r.line ?? 0)} ${unit} a minute${r.target != null ? ` against ${fmtN(r.target)} wanted` : ''}${r.gap != null && r.gap > 1e-9 ? `, ${fmtN(r.gap)} short` : r.gap != null ? ', meeting the target' : ''}.`;
    if (r.limitAtRunning && r.limitAtRunning.station.id !== lim.station.id) s1.lines.push(`On running speed alone ${nameOf(r.limitAtRunning.station, r.limitAtRunning.index)} is slowest; once stops are counted it is ${limit} — it is stops, not speed, that hold the line.`);
    if (r.next) s1.lines.push(`The next to limit it is ${nameOf(r.next.station, r.next.index)}${r.liftAtMost != null ? `, so fixing ${limit} gives at most ${fmtN(r.liftAtMost)} ${unit} a minute more` : ''}.`);
    if (r.target == null) s1.missing.push('No target on the Line capacity — give it, so the gap is said.');
  }

  /* 2 exploit */
  s2.tool = { key: 'losses', has: !!read.loss };
  if (read.loss) {
    s2.says = read.loss.says + (read.loss.atConstraintMin != null ? `; ${minWords(read.loss.atConstraintMin)} of it at ${limit}` : '') + '.';
    s2.lines.push(...read.loss.bars.map(b => `${b}.`));
    if (read.loss.packs != null) s2.lines.push(`At ${limit} a minute is a minute for the whole line: ${minWords(read.loss.atConstraintMin ?? 0)} is about ${fmtBig(read.loss.packs)} ${unit}${read.loss.money ? `, ${read.loss.money}` : ''}.`);
    else if (limit && (read.loss.atConstraintMin ?? 0) === 0) s2.lines.push(`The stops logged name no stop at ${limit} in that shift — check the machine name on the stops.`);
    if (!cost) s2.missing.push('No margin a pack on the line — give it (Set up the line) and the lost minutes are said in pounds.');
  } else { s2.says = 'No loss count in the project yet.'; s2.missing.push('Count a shift’s losses (Loss count) to see where the constraint’s time went.'); }
  if (r?.liftNoStops != null && r.liftNoStops > 1e-9 && limit) s2.lines.push(`Losing ${limit}’s own stops would give ${fmtN(r.liftNoStops)} ${unit} a minute more, capped by the next station.`);

  /* 3 subordinate */
  const bufferH = bufferOf(rec.standards), orders = ordersOf(rec.standards);
  s3.tool = { key: 'linebalance', has: !!cap };
  if (bufferH != null) s3.says = `A buffer of ${fmtN(bufferH)} hour${bufferH === 1 ? '' : 's'} of the constraint’s running time is set in front of ${limit ?? 'the constraint'}.`;
  else { s3.says = 'No buffer is set in front of the constraint.'; s3.missing.push('Set the buffer (hours) on the Line capacity’s week plan to protect the constraint.'); }
  s3.lines.push(orders.length ? `${orders.length} order${orders.length === 1 ? '' : 's'} laid on the week at the constraint’s pace — the rope.` : 'No orders are laid on the week yet.');
  if (!orders.length) s3.missing.push('Type the week’s orders on the Line capacity page to schedule to the constraint.');

  /* 4 elevate */
  s4.tool = { key: 'linebalance', has: !!cap };
  if (cap && r) {
    const plan = planToTarget(cap.cap);
    s4.says = plan ? plan.sentence : r.target == null ? 'No target, so no way to the target is worked out.' : 'The line meets its target — nothing to elevate to reach it.';
    const more = oneMorePerson(cap.cap, r, li?.people, li?.rate);
    if (more) s4.lines.push(more.sentence);
    if (cap.cap.whatIfs?.length) s4.lines.push(`${cap.cap.whatIfs.length} what-if${cap.cap.whatIfs.length === 1 ? '' : 's'} kept beside the line.`);
    const bc = bottleneckCost(r, li?.people, li?.rate, cost?.perPack);
    if (bc) s4.lines.push(bottleneckCostSays(bc, r).text);
    else s4.missing.push('Give the people and a rate an hour (Line capacity, or the line’s crew and wage) and what the constraint costs is said in money.');
  } else { s4.says = 'Nothing to elevate yet.'; s4.missing.push(needCap); }

  /* 5 go again */
  s5.tool = { key: 'linebalance', has: !!cap };
  if (r?.next && limit) {
    const nx = nameOf(r.next.station, r.next.index);
    s5.says = `When ${limit} is lifted the constraint moves to ${nx}${r.liftAtMost != null ? ` after ${fmtN(r.liftAtMost)} ${unit} a minute more` : ''} — check ${nx} next.`;
  } else s5.says = r ? 'No second station is close behind — the next constraint is not yet read.' : 'The next constraint is read once the first is.';
  if (r?.line != null && cap) s5.lines.push(`The line makes ${fmtN(r.line)} ${unit} a minute now${cost ? ` — each ${unit.replace(/s$/, '')} earns ${fmtMoney(cost.perPack)}` : ''}; write it here and read again after the change.`);
  void fmtMoney;
  return steps;
}

export { nextPass, tocPasses, type TocPass } from '../../../lib/tocPasses';
