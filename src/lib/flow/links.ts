/* WHAT IS LINKED TO WHAT — a link column (definition `ref`) followed both
 * ways (docs/VIEWS.md).
 *
 * A link is kept as the id of an entry of an earlier log, inside the entry
 * (or the box) that names it — no table of its own, no new record. It is
 * said by the words of the entry it names, as they are now: "Seal jaw
 * temperature drifts", or that the entry was struck, or that it is no
 * longer on the log. And it is followed back: a root cause lists the
 * experiments that test it, an experiment the actions that belong to it.
 *
 * Pure: read from the project as lib/flow/runtime read it, the same on the
 * screen and on paper. Struck entries count for nothing here as everywhere —
 * a struck experiment is not one of a cause's experiments — but a link TO a
 * struck entry keeps its place and says so. */
import { niceDay } from '../weeks';
import type { FlowField, FlowStepDef } from './definition';
import type { FlowEntry } from './analysis';
import type { FlowState, StepInstance } from './runtime';
import { slotField, viewOf } from './views';

/** The words an entry is known by: its view's title column (a fishbone's
 *  cause, a board's card, a timeline's what), else its first words column,
 *  else its first choice or person, else its day. */
export function entryTitle(step: Pick<FlowStepDef, 'answer' | 'columns' | 'fields' | 'view'>, e: Pick<FlowEntry, 'values' | 'on'>): string {
  const v = viewOf(step.view?.id);
  const cols = step.columns ?? [];
  const col = (v?.title ? slotField(step, v.title) : undefined)
    ?? cols.find(c => c.type === 'text') ?? cols.find(c => c.type === 'choice' || c.type === 'person');
  const val = col ? e.values[col.key] : undefined;
  const words = typeof val === 'string' ? val.trim() : typeof val === 'number' ? String(val) : '';
  return words || `the entry of ${niceDay(e.on)}`;
}

const instancesOf = (state: Pick<FlowState, 'stages'>, stepKey: string): StepInstance[] =>
  state.stages.flatMap(st => st.steps.filter(i => i.def.key === stepKey));

/** The log a link names an entry of — on the same machine when that log is
 *  kept machine by machine. */
export function linkedLog(state: Pick<FlowState, 'stages'>, field: Pick<FlowField, 'of'>, assetId?: string): StepInstance | undefined {
  const list = field.of ? instancesOf(state, field.of) : [];
  if (!list.length) return undefined;
  return list[0].def.per === 'machine' ? list.find(i => (i.assetId ?? undefined) === (assetId ?? undefined)) : list[0];
}

export interface LinkChoice { id: string; title: string; on: string; struck: boolean }

/** The entries a link may name, in the order they were logged. */
export function linkChoices(state: Pick<FlowState, 'stages'>, field: Pick<FlowField, 'of'>, assetId?: string): LinkChoice[] {
  const log = linkedLog(state, field, assetId);
  if (!log) return [];
  return [...(log.record?.entries ?? [])].sort((a, b) => a.on.localeCompare(b.on) || a.at - b.at)
    .map(e => ({ id: e.id, title: entryTitle(log.def, e), on: e.on, struck: !!e.struck }));
}

export interface LinkRead {
  /** The entry's words, or what became of it. */
  title: string;
  /** The log it is on. */
  log?: string;
  struck?: boolean;
  /** It is no longer on the log (or the log is not on the method). */
  gone?: boolean;
}

/** A link in words, as the entry it names stands now. */
export function linkSaid(state: Pick<FlowState, 'stages'>, field: Pick<FlowField, 'of'>, value: unknown, assetId?: string): LinkRead | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const log = linkedLog(state, field, assetId);
  const e = log?.record?.entries?.find(x => x.id === value);
  if (!log || !e) return { title: log ? `an entry no longer on “${log.def.title}”` : 'an entry no longer on the method', ...(log ? { log: log.def.title } : {}), gone: true };
  return { title: entryTitle(log.def, e), log: log.def.title, ...(e.struck ? { struck: true } : {}) };
}

/** One thing linked to an entry: a later log's entry (or a form's box) that names it. */
export interface Backlink {
  inst: StepInstance;
  field: FlowField;
  /** Absent when it is a form's box. */
  entry?: FlowEntry;
  title: string;
}

/** Everything that names an entry — later logs' entries not struck, and
 *  forms' boxes — on the same machine where both are kept machine by machine. */
export function linksTo(state: Pick<FlowState, 'stages'>, stepKey: string, entryId: string, assetId?: string): Backlink[] {
  const target = instancesOf(state, stepKey)[0];
  if (!target) return [];
  const byMachine = target.def.per === 'machine';
  const out: Backlink[] = [];
  for (const st of state.stages) {
    for (const inst of st.steps) {
      if (byMachine && (inst.assetId ?? undefined) !== (assetId ?? undefined)) continue;
      for (const c of inst.def.columns ?? []) {
        if (c.type !== 'ref' || c.of !== stepKey) continue;
        for (const e of inst.record?.entries ?? []) {
          if (!e.struck && e.values[c.key] === entryId) out.push({ inst, field: c, entry: e, title: entryTitle(inst.def, e) });
        }
      }
      for (const f of inst.def.fields ?? []) {
        if (f.type === 'ref' && f.of === stepKey && inst.values[f.key] === entryId) out.push({ inst, field: f, title: inst.def.title });
      }
    }
  }
  return out;
}

/** What links to an entry, in words, log by log — "2 in PDCA experiments ·
 *  1 in Actions". */
export function linksSaid(links: readonly Backlink[]): string {
  const by = new Map<string, number>();
  for (const l of links) by.set(l.inst.def.title, (by.get(l.inst.def.title) ?? 0) + 1);
  return [...by].map(([title, n]) => `${n} in ${title}`).join(' · ');
}
