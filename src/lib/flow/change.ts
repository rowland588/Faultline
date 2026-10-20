/* A METHOD CHANGED, UNDER CONTROL — what one version changes from the one
 * before it, said in words, and what moving a running project onto it would
 * do to the work already done (docs/PLATFORM-REVIEW.md §6.6; slice 5).
 *
 * Rowland's mandate, 18 October: "protect completed work, explain the
 * effect of migrating a project." Three pure readings:
 *
 *   keepKeys    a new definition (by hand or proposed by the assistant)
 *               given the keys of the version it came from wherever a
 *               stage, step or box is the same thing by its words — so the
 *               records a project already holds still point at it;
 *   changesOf   the difference between two versions, a line a change;
 *   moveEffect  what moving a project onto a new version does: which steps
 *               done stay done, which records stay only as history, what is
 *               new to do, which passed gates stand and which now need
 *               something they did not — before anybody says yes.
 *
 * Nothing is deleted by a change: a record whose step is gone stays in the
 * project's history (lib/flow/runtime reads records by key; one with no step
 * is simply not counted). */
import { allSteps, fieldKeyOf, keyOf, measureKeyOf, type FlowCondition, type FlowDefinition, type FlowMeasure, type FlowStepDef } from './definition';
import { componentOf } from './components';
import { viewSaid } from './views';
import type { FlowRecord } from './records';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Give `next` the keys `prev` had for the same things — stages and steps
 *  matched by their names, boxes by their labels within the matched step —
 *  moving every reference with the key; anything new keeps a key of its
 *  own that no old one shares. Returns a new definition. */
export function keepKeys(prev: FlowDefinition, nextIn: FlowDefinition): FlowDefinition {
  const next = structuredClone(nextIn);
  /* roles by name — a step given to a role keeps pointing at it */
  const roleMap = new Map<string, string>();
  for (const r of next.roles) {
    const was = prev.roles.find(p => same(p.name, r.name));
    const used = [...prev.roles.map(x => x.key), ...roleMap.values()];
    roleMap.set(r.key, was?.key ?? (used.includes(r.key) ? keyOf(r.name, used) : r.key));
  }
  for (const r of next.roles) r.key = roleMap.get(r.key) ?? r.key;
  for (const st of next.stages) for (const s of st.steps) if (s.role) s.role = roleMap.get(s.role) ?? s.role;
  const oldSteps = allSteps(prev);
  const taken = {
    stage: new Set(prev.stages.map(s => s.key)),
    step: new Set(oldSteps.map(r => r.step.key)),
  };
  /* stages by name */
  const stageMap = new Map<string, string>();
  for (const st of next.stages) {
    const was = prev.stages.find(p => same(p.name, st.name));
    const key = was?.key ?? (taken.stage.has(st.key) || [...stageMap.values()].includes(st.key) ? keyOf(st.name, [...taken.stage, ...stageMap.values()]) : st.key);
    stageMap.set(st.key, key);
  }
  /* steps by title, anywhere in the method */
  const stepMap = new Map<string, string>();
  const fieldMaps = new Map<string, Map<string, string>>();
  for (const { step } of allSteps(next)) {
    const was = oldSteps.find(r => same(r.step.title, step.title))?.step;
    const used = [...taken.step, ...stepMap.values()];
    const key = was?.key ?? (used.includes(step.key) ? keyOf(step.title, used) : step.key);
    stepMap.set(step.key, key);
    const fm = new Map<string, string>();
    for (const f of step.fields ?? []) {
      const wasF = was?.fields?.find(x => same(x.label, f.label));
      const usedF = [...(was?.fields ?? []).map(x => x.key), ...fm.values()];
      fm.set(f.key, wasF?.key ?? (usedF.includes(f.key) ? fieldKeyOf(f.label, usedF) : f.key));
    }
    fieldMaps.set(step.key, fm);
  }
  const sk = (k: string) => stepMap.get(k) ?? k;
  /* measures by name; what feeds them follows the steps and boxes */
  const measureMap = new Map<string, string>();
  const mTaken = (prev.measures ?? []).map(m => m.key);
  for (const m of next.measures ?? []) {
    const was = prev.measures?.find(p => same(p.name, m.name));
    const used = [...mTaken, ...measureMap.values()];
    const key = was?.key ?? (used.includes(m.key) ? measureKeyOf(m.name, used) : m.key);
    measureMap.set(m.key, key);
    m.key = key;
    m.from = m.from.map(f => ({ step: sk(f.step), field: fieldMaps.get(f.step)?.get(f.field) ?? f.field }));
  }
  for (const st of next.stages) {
    st.key = stageMap.get(st.key) ?? st.key;
    for (const s of st.steps) {
      const fm = fieldMaps.get(s.key) ?? new Map<string, string>();
      for (const f of s.fields ?? []) {
        if (f.formula) f.formula = f.formula.replace(/[a-z_][a-z0-9_]*/g, w => fm.get(w) ?? w);
        f.key = fm.get(f.key) ?? f.key;
      }
      if (s.after) s.after = s.after.map(sk);
      s.key = sk(s.key);
    }
    for (const c of st.gate.conditions) {
      if (c.type === 'measureMet') c.measure = measureMap.get(c.measure) ?? c.measure;
      if ('step' in c) {
        const before = c.step;
        c.step = sk(before);
        if (c.type === 'fieldMeets') c.field = fieldMaps.get(before)?.get(c.field) ?? c.field;
      }
    }
  }
  return next;
}

export interface Change { what: 'added' | 'removed' | 'changed' | 'moved'; text: string }

/* a box in a form that does not depend on the order its parts were written in */
const fieldWords = (f: unknown): string => {
  const o = f as Record<string, unknown>;
  return JSON.stringify(Object.keys(o).filter(k => o[k] !== undefined).sort().map(k => [k, o[k]]));
};
const stepWords = (s: FlowStepDef): string => [
  s.per === 'machine' ? 'every machine' : 'once', s.answer, s.role ?? '', s.passesIf ?? '',
  `p${s.evidence?.photos ?? 0}f${s.evidence?.files ?? 0}`, String(s.dueDays ?? ''), (s.after ?? []).join(','),
  (s.fields ?? []).map(fieldWords).join(';'), s.component?.tool ?? '',
  (s.columns ?? []).map(fieldWords).join(';'), JSON.stringify(s.view ?? null),
].join('|');
/* a condition in a form that does not depend on its id or the order its parts were written in */
const condWords = (c: FlowCondition): string => {
  const o = c as unknown as Record<string, unknown>;
  return JSON.stringify(Object.keys(o).filter(k => k !== 'id' && o[k] !== undefined).sort().map(k => [k, o[k]]));
};

/** What `next` changes from `prev`, a line a change — stages, steps, boxes
 *  and gates, matched by key (run keepKeys first for a definition that was
 *  written afresh). */
export function changesOf(prev: FlowDefinition, next: FlowDefinition): Change[] {
  const out: Change[] = [];
  if (prev.name !== next.name) out.push({ what: 'changed', text: `Renamed “${prev.name}” to “${next.name}”` });
  if (prev.purpose !== next.purpose) out.push({ what: 'changed', text: 'What it is for, reworded' });
  for (const r of next.roles) if (!prev.roles.some(p => p.key === r.key)) out.push({ what: 'added', text: `Role “${r.name}”` });
  for (const r of prev.roles) if (!next.roles.some(p => p.key === r.key)) out.push({ what: 'removed', text: `Role “${r.name}”` });
  for (const st of next.stages) if (!prev.stages.some(p => p.key === st.key)) out.push({ what: 'added', text: `Stage “${st.name}”` });
  for (const st of prev.stages) if (!next.stages.some(p => p.key === st.key)) out.push({ what: 'removed', text: `Stage “${st.name}” and its ${st.steps.length} step${st.steps.length === 1 ? '' : 's'}` });
  const pi = prev.stages.map(s => s.key).filter(k => next.stages.some(n => n.key === k));
  const ni = next.stages.map(s => s.key).filter(k => prev.stages.some(p => p.key === k));
  if (pi.join() !== ni.join()) out.push({ what: 'moved', text: 'The stages in a new order' });
  for (const st of next.stages) {
    const was = prev.stages.find(p => p.key === st.key);
    if (!was) continue;
    if (was.name !== st.name) out.push({ what: 'changed', text: `Stage “${was.name}” renamed “${st.name}”` });
    for (const s of st.steps) {
      const old = allSteps(prev).find(r => r.step.key === s.key);
      if (!old) { out.push({ what: 'added', text: `Step “${s.title}” in ${st.name}` }); continue; }
      if (old.stage.key !== st.key) out.push({ what: 'moved', text: `Step “${s.title}” moved to ${st.name}` });
      if (old.step.title !== s.title) out.push({ what: 'changed', text: `Step “${old.step.title}” renamed “${s.title}”` });
      if (stepWords(old.step) !== stepWords(s)) out.push({ what: 'changed', text: `Step “${s.title}”: ${whatChanged(old.step, s)}` });
    }
    const conds = (cs: FlowCondition[]) => new Set(cs.map(condWords));
    const a = conds(was.gate.conditions), b = conds(st.gate.conditions);
    const added = [...b].filter(x => !a.has(x)).length, gone = [...a].filter(x => !b.has(x)).length;
    if (added || gone) out.push({ what: 'changed', text: `${st.name}'s gate: ${[added ? `${added} thing${added === 1 ? '' : 's'} it now needs` : '', gone ? `${gone} it no longer needs` : ''].filter(Boolean).join(', ')}` });
  }
  for (const r of allSteps(prev)) if (!allSteps(next).some(n => n.step.key === r.step.key)) out.push({ what: 'removed', text: `Step “${r.step.title}” from ${r.stage.name}` });
  /* what it measures */
  const goal = (m: FlowMeasure) => (m.target !== undefined ? `${m.better === 'lower' ? 'at most' : 'at least'} ${m.target}${m.unit ? ` ${m.unit}` : ''}` : 'no target');
  for (const m of next.measures ?? []) {
    const was = prev.measures?.find(p => p.key === m.key);
    if (!was) { out.push({ what: 'added', text: `Measure “${m.name}” — ${goal(m)}` }); continue; }
    if (was.name !== m.name) out.push({ what: 'changed', text: `Measure “${was.name}” renamed “${m.name}”` });
    if (goal(was) !== goal(m)) out.push({ what: 'changed', text: `Measure “${m.name}”: ${goal(m)} (was ${goal(was)})` });
    if (JSON.stringify(was.from) !== JSON.stringify(m.from)) out.push({ what: 'changed', text: `Measure “${m.name}”: read from other steps` });
  }
  for (const m of prev.measures ?? []) if (!next.measures?.some(n => n.key === m.key)) out.push({ what: 'removed', text: `Measure “${m.name}”` });
  return out;
}

function whatChanged(a: FlowStepDef, b: FlowStepDef): string {
  const parts: string[] = [];
  if (a.per !== b.per) parts.push(b.per === 'machine' ? 'now on every machine' : 'now once for the job');
  if (a.answer !== b.answer) parts.push(`answered as ${b.answer} (was ${a.answer})`);
  if ((a.role ?? '') !== (b.role ?? '')) parts.push('given to someone else');
  if ((a.passesIf ?? '') !== (b.passesIf ?? '')) parts.push('what it must show, reworded');
  if ((a.evidence?.photos ?? 0) !== (b.evidence?.photos ?? 0) || (a.evidence?.files ?? 0) !== (b.evidence?.files ?? 0)) parts.push('the photos or files it needs');
  if ((a.dueDays ?? null) !== (b.dueDays ?? null)) parts.push(b.dueDays === undefined ? 'no longer due on a day' : `due day ${b.dueDays}`);
  if ((a.after ?? []).join() !== (b.after ?? []).join()) parts.push('what it waits on');
  if ((a.fields ?? []).map(fieldWords).join(';') !== (b.fields ?? []).map(fieldWords).join(';')) parts.push('its boxes or their limits');
  if ((a.component?.tool ?? '') !== (b.component?.tool ?? '')) parts.push(b.component ? `done with ${componentOf(b.component.tool)?.name ?? b.component.tool}` : 'no longer done with a tool');
  if ((a.columns ?? []).map(fieldWords).join(';') !== (b.columns ?? []).map(fieldWords).join(';')) parts.push('what each entry asks');
  if (JSON.stringify(a.view ?? null) !== JSON.stringify(b.view ?? null)) parts.push(b.view ? (viewSaid(b) ?? 'shown another way') : 'shown as a table');
  return parts.join('; ') || 'changed';
}

export interface MoveEffect {
  /** Steps done (on a machine or once) whose step is still on the new version — they stay done. */
  keptDone: number;
  /** Records whose step is not on the new version — kept as history, no longer counted. */
  history: string[];
  /** Steps on the new version with nothing recorded yet. */
  newSteps: string[];
  /** Passed gates whose stage is on the new version. */
  gatesStand: string[];
  /** Passed gates whose conditions changed — they stand (completed work is
   *  protected) and are said so: what they would now also need. */
  gatesChanged: string[];
  /** Passed gates whose stage is gone — the pass kept as history. */
  gatesGone: string[];
  /** In words, first. */
  says: string;
}

/** What moving a project's records onto `next` would do — read before
 *  anybody says yes; nothing is changed by reading it. */
export function moveEffect(prev: FlowDefinition, next: FlowDefinition, records: readonly FlowRecord[]): MoveEffect {
  const live = records.filter(r => !r.deletedAt);
  const nextStep = new Map(allSteps(next).map(r => [r.step.key, r]));
  const prevStep = new Map(allSteps(prev).map(r => [r.step.key, r]));
  const steps = live.filter(r => r.kind === 'step');
  const keptDone = steps.filter(r => r.outcome === 'done' && r.stepKey && nextStep.has(r.stepKey)).length;
  const history = [...new Set(steps.filter(r => r.stepKey && !nextStep.has(r.stepKey)).map(r => prevStep.get(r.stepKey ?? '')?.step.title ?? r.stepKey ?? ''))];
  const recorded = new Set(steps.map(r => r.stepKey));
  const newSteps = allSteps(next).filter(r => !prevStep.has(r.step.key) && !recorded.has(r.step.key)).map(r => r.step.title);
  const gatesStand: string[] = [], gatesChanged: string[] = [], gatesGone: string[] = [];
  for (const g of live.filter(r => r.kind === 'gate' && r.outcome === 'done')) {
    const was = prev.stages.find(s => s.key === g.stageKey);
    const now = next.stages.find(s => s.key === g.stageKey);
    const name = now?.name ?? was?.name ?? g.stageKey;
    if (!now) { gatesGone.push(name); continue; }
    const a = new Set((was?.gate.conditions ?? []).map(condWords));
    const added = now.gate.conditions.filter(c => !a.has(condWords(c)));
    if (added.length) gatesChanged.push(`${name} — passed before it also needed ${added.length} more thing${added.length === 1 ? '' : 's'}`);
    else gatesStand.push(name);
  }
  const parts = [
    `${keptDone} step${keptDone === 1 ? '' : 's'} done stay${keptDone === 1 ? 's' : ''} done`,
    newSteps.length ? `${newSteps.length} new step${newSteps.length === 1 ? '' : 's'} to do` : '',
    history.length ? `${history.length} step${history.length === 1 ? '' : 's'} no longer on the method kept as history` : '',
    gatesChanged.length ? `${gatesChanged.length} passed gate${gatesChanged.length === 1 ? '' : 's'} stand${gatesChanged.length === 1 ? 's' : ''} though ${gatesChanged.length === 1 ? 'it now needs' : 'they now need'} more` : '',
    gatesGone.length ? `${gatesGone.length} passed gate${gatesGone.length === 1 ? '' : 's'} on a stage now gone kept as history` : '',
  ].filter(Boolean);
  return { keptDone, history, newSteps, gatesStand, gatesChanged, gatesGone, says: `${parts.join('; ')}. Nothing is deleted.` };
}
