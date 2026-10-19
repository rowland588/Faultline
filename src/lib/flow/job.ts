/* A PROJECT RUNNING A METHOD, AS THE CONTROL ROOM READS IT — its row's
 * facts, its dated steps for the shared calendar, and what it owes, from
 * the one reading lib/flow/runtime made (lib/portfolio draws it beside the
 * stage-gate, 6M and lever tree jobs; lib/useJobInputs reads it). A step
 * opens on the project's own page (lib/plan planHref, kind `step`). */
import type { Project } from '../../types';
import type { PlanMark } from '../standing';
import type { JobItem } from '../portfolio';
import type { FlowState } from './runtime';
import type { FlowDefinition } from './definition';
import type { GateCheck } from './records';
import { flowRowFacts, type FlowRowFacts } from './view';

export interface FlowJob {
  facts: FlowRowFacts;
  plan: PlanMark[];
  items: JobItem[];
  /** Who works for the supplier on it — the people given its supplier's
   *  roles, else the roles' names — so the control room files what they owe
   *  under the supplier, as a machine's OEM is, never under the site. */
  suppliers: string[];
}

/** The supplier's people on a project running a method: each supplier-side
 *  role's person, else the role's own name (as a step for it is said). */
export function suppliersOf(def: Pick<FlowDefinition, 'roles'>, people: Record<string, string> = {}): string[] {
  return def.roles.filter(r => r.side === 'supplier').map(r => people[r.key]?.trim() || r.name).filter(Boolean);
}

const placeOf = (stageKey: string, stepKey: string, assetId?: string) => `${stageKey}/${stepKey}/${assetId ?? ''}`;

export function flowJobOf(project: Pick<Project, 'id' | 'name' | 'color'>, s: FlowState, suppliers: string[] = [], checks?: Readonly<Record<string, GateCheck>>): FlowJob {
  const plan: PlanMark[] = s.stages.flatMap(st => st.steps.flatMap((x): PlanMark[] => {
    const settled = (x.complete || x.failed) && x.record?.doneOn;
    const at = settled ? x.record?.doneOn : x.due;
    if (!at) return [];
    return [{
      id: placeOf(st.key, x.def.key, x.assetId), kind: 'step', at,
      label: `${x.machine ? `${x.machine} — ` : ''}${x.def.title}`, ...(x.machine ? { on: x.machine } : {}),
      tone: x.complete ? 'done' : x.failed ? 'failed' : x.late ? 'late' : 'booked',
    }];
  }));
  const items: JobItem[] = s.outstanding.filter(o => o.kind === 'step' && o.stepKey).map(o => ({
    jobId: project.id, job: project.name, color: project.color, kind: 'step' as const,
    id: placeOf(o.stageKey, o.stepKey ?? '', o.assetId), what: o.what, who: o.who ?? '',
    ...(o.due ? { on: o.due } : {}), late: o.late,
    ...(o.failed ? { branch: o.why } : o.blocked ? { branch: o.why } : {}),
  }));
  return { facts: flowRowFacts(s, checks), plan, items, suppliers };
}

/** A project whose method has not reached this device yet — said so, never blank. */
export const flowJobMissing = (): FlowJob => ({
  facts: { at: '—', sentence: 'Its method has not reached this device yet — it will once this device has synced.', outstanding: 0, late: 0, done: 0, total: 0, stages: [] },
  plan: [], items: [], suppliers: [],
});
