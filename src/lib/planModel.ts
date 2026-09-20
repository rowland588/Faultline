/* WHICH PLAN A PROJECT RUNS ON.
 *
 * Three, and exactly one each. They are not features to switch on beside each
 * other — they are three different answers to "what are we doing and why", and
 * a project that showed all three would be a project whose team has not decided:
 *
 *   board         improvement work, grouped People / Plant / Process off a
 *                 weekly tracker. The default, and what most projects are.
 *   tree          one measurable outcome with a chain of conditions under it.
 *   commissioning TESTING — what we plan to run, what happened on the day, what
 *                 we found and what we do next, round the loop with the OEM.
 *                 The id stays `commissioning` because it is stored on devices
 *                 and in the cloud; what people SEE is "Testing", which is the
 *                 word Rowland used for it.
 *
 * Stored as two booleans on Project rather than one field, because both of them
 * already existed and shipped to devices; a third state is cheaper to add than
 * a migration is to get wrong. This module is the only place that turns those
 * booleans into the answer, so nothing else has to know that.
 */
import type { Project } from '../types';

export type PlanModel = 'board' | 'tree' | 'commissioning';

export const planModel = (p: Pick<Project, 'leverTree' | 'commissioning'>): PlanModel =>
  p.commissioning ? 'commissioning' : p.leverTree ? 'tree' : 'board';

/** The patch that switches a project to a model, clearing the others — the one
 *  write that keeps "exactly one" true. */
export const setPlanModel = (m: PlanModel): Pick<Project, 'leverTree' | 'commissioning'> => ({
  leverTree: m === 'tree' || undefined,
  commissioning: m === 'commissioning' || undefined,
});

export const MODELS: { id: PlanModel; label: string; blurb: string }[] = [
  { id: 'board', label: '3P board',
    blurb: 'People · Plant · Process, off the weekly tracker — the meeting runs on it directly' },
  { id: 'tree', label: 'Lever tree',
    blurb: 'Outcome, what has to be true for it, conditions and work — kept by hand, one page' },
  { id: 'commissioning', label: 'Testing',
    blurb: 'What we plan to run, what happened on the day, what we found, what we do next — with the OEM' },
];
