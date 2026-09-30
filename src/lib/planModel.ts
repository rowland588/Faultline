/* WHICH PLAN A PROJECT RUNS ON.
 *
 * Three, and exactly one each. They are not features to switch on beside each
 * other — they are three different answers to "what are we doing and why", and
 * a project that showed all three would be a project whose team has not decided:
 *
 *   board         improvement work, grouped People / Plant / Process off a
 *                 weekly tracker. The default, and what most projects are.
 *   tree          one measurable outcome with a chain of conditions under it.
 *   commissioning STAGE GATE — new equipment taken through its gates: install
 *                 stages, tests against what was agreed, fixes, what it waits
 *                 on, handover. The id stays `commissioning` because it is
 *                 stored on devices and in the cloud; what people SEE is
 *                 "Stage gate". Rowland: "commissioning was just the part I was
 *                 in at the moment in time ... we have these gated processes —
 *                 the wording commissioning is not really the correct wording."
 *                 Commissioning is one gate in the middle; the method is the
 *                 gates.
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

/* THE THREE METHODS, DEFINED ONCE. Rowland: "I've built three individual
   project methods ... I want to be able to use this in multiple business
   scenarios." Each is a different way of running a project, and each is
   defined by the same five things — the question it answers, when to reach
   for it, how it is organised, its rhythm, and what done means — so choosing
   one is a decision somebody can make on purpose, and a fourth method later is
   one more entry here, filled in the same way.

   Stage gate first because it is the one in use; nothing is pre-selected on
   the new-project form, because a default was how a site lead once got the
   wrong kind of project without noticing there was a choice. */
export interface Method {
  id: PlanModel;
  label: string;
  /** One line — the question it answers. Also the setup switcher's line. */
  blurb: string;
  useWhen: string;
  organised: string;
  rhythm: string;
  done: string;
  /** What it prints. */
  document: string;
}

export const MODELS: Method[] = [
  { id: 'commissioning', label: 'Stage gate',
    blurb: 'Is the equipment proved to what was agreed, so it can be accepted?',
    useWhen: 'New or moved equipment — a supplier to work with, gates to pass, a handover date.',
    organised: 'Machines through their install stages, tests with agreed pass marks, fixes, materials and programs',
    rhythm: 'Daily, at the line',
    done: 'Handed over',
    document: 'Client report · test and fix cards' },
  { id: 'board', label: '3P',
    blurb: 'What is holding this line back, and who is on it this week?',
    useWhen: 'Running lines that need to perform better — a team, a weekly meeting, a rate to hit.',
    organised: 'Lines with owners and sponsors · actions sorted People, Plant, Process off the weekly tracker',
    rhythm: 'Weekly, in the meeting',
    done: 'At target, and holding',
    document: 'The 3P board · client report' },
  { id: 'tree', label: 'Lever tree',
    blurb: 'What has to be true to reach this outcome, and is it being done?',
    useWhen: 'One defined outcome with a sponsor — a number to move, by a date.',
    organised: 'Outcome → levers → conditions → the work under each',
    rhythm: 'Monthly, with the sponsor',
    done: 'The outcome proved',
    document: 'The tree on one page · client report' },
];

export const methodOf = (p: Pick<Project, 'leverTree' | 'commissioning'>): Method =>
  MODELS.find(m => m.id === planModel(p)) ?? MODELS[0];
