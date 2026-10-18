/* WHICH PLAN A PROJECT RUNS ON.
 *
 * Three, and exactly one each. They are not features to switch on beside each
 * other — they are three different answers to "what are we doing and why", and
 * a project that showed all three would be a project whose team has not decided:
 *
 *   board         6M — a running line made to perform better: the gap to its
 *                 target, the problem behind it traced on the fishbone's six
 *                 bones (People, Machine, Method, Material, Measurement,
 *                 Environment) to a root, countermeasures on the board, proof
 *                 on the same number, and holding (docs/SIXM.md). The id stays
 *                 `board` because it is stored on devices and in the cloud.
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
 *   flow          A METHOD OF YOUR OWN — a project that runs a method written as
 *                 data (lib/flow; docs/PLATFORM-REVIEW.md): its stages,
 *                 steps and gates are the method's definition, pinned to the
 *                 version it started on (Project.flow). Never on the
 *                 new-project picker below: such a project is started from
 *                 the method (screens/MethodScreen), so the method is chosen
 *                 on purpose, not by a default.
 *
 * Stored as two booleans on Project rather than one field, because both of them
 * already existed and shipped to devices; a third state is cheaper to add than
 * a migration is to get wrong. This module is the only place that turns those
 * booleans into the answer, so nothing else has to know that. A project's
 * `flow` link wins over both: it is set once, when the project is started on
 * a method, and the booleans are never set beside it.
 */
import type { Project } from '../types';

export type PlanModel = 'board' | 'tree' | 'commissioning' | 'flow';

type Held = Pick<Project, 'leverTree' | 'commissioning'> & Partial<Pick<Project, 'flow'>>;

export const planModel = (p: Held): PlanModel =>
  p.flow ? 'flow' : p.commissioning ? 'commissioning' : p.leverTree ? 'tree' : 'board';

/** The patch that switches a project to a model, clearing the others — the one
 *  write that keeps "exactly one" true. */
export const setPlanModel = (m: PickedModel): Pick<Project, 'leverTree' | 'commissioning'> => ({
  leverTree: m === 'tree' || undefined,
  commissioning: m === 'commissioning' || undefined,
});

/** UNDO A SWITCH (HUNT 31): the patch that puts a project back exactly as it
 *  ran before — the two stored flags as they were, so switching and switching
 *  back is a round trip, and nothing else on the project is touched. */
export const switchBack = (before: Pick<Project, 'leverTree' | 'commissioning'>): Pick<Project, 'leverTree' | 'commissioning'> => ({
  leverTree: before.leverTree || undefined,
  commissioning: before.commissioning || undefined,
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
  /** What the person is trying to DO, in their words — what a new project asks
   *  first. Rowland: the control room starts from the situation, and the
   *  method follows from it; nobody should have to know the method's name to
   *  start the right kind of change. */
  situation: string;
  /** One line — the question it answers. Also the setup switcher's line. */
  blurb: string;
  useWhen: string;
  organised: string;
  rhythm: string;
  done: string;
  /** What it prints. */
  document: string;
}

/** The methods a new project is offered — the three; a method of your own is
 *  started from the method itself. */
export type PickedModel = Exclude<PlanModel, 'flow'>;

export const MODELS: (Method & { id: PickedModel })[] = [
  { id: 'commissioning', label: 'Stage gate',
    situation: 'Bring new equipment into use',
    blurb: 'Is the equipment proved to what was agreed, so it can be accepted?',
    useWhen: 'New or moved equipment — a supplier to work with, gates to pass, a handover date.',
    organised: 'Machines through their install stages, tests with agreed pass marks, fixes, materials and programs',
    rhythm: 'Daily, at the line',
    done: 'Handed over',
    /* All it prints (docs/JOBSTART.md) — the card said two of seven. */
    document: 'Status report · client report · the plan · programs report · handover report · test and fix cards' },
  { id: 'board', label: '6M',
    situation: 'Make a running line perform better',
    blurb: 'What is holding this line back, what is the root cause, and who is fixing it?',
    useWhen: 'Running lines that need to perform better — a gap to a target, a team, a weekly meeting.',
    organised: 'Lines with owners · problems traced on the fishbone — People, Machine, Method, Material, Measurement, Environment',
    rhythm: 'Weekly, in the meeting',
    done: 'At target, and holding',
    document: 'The fishbone · the 6M board · client report' },
  { id: 'tree', label: 'Lever tree',
    situation: 'Hit a number by a date',
    blurb: 'What has to be true to reach this outcome, and is it being done?',
    useWhen: 'One defined outcome with a sponsor — a number to move, by a date.',
    organised: 'Outcome → levers → conditions → the work under each',
    rhythm: 'Monthly, with the sponsor',
    done: 'The outcome proved',
    document: 'The tree on one page · client report' },
];

/** A project running a method of its own (lib/flow) — the same five things
 *  said of every such method; its own name is the label. Not in MODELS, so
 *  the new-project picker never offers it. */
export const FLOW_METHOD: Method = {
  id: 'flow', label: 'Own method',
  situation: 'Run a method written for this kind of work',
  blurb: 'Is every stage done and proved as the method says, so its gate can be passed?',
  useWhen: 'Work the three methods do not fit — written once as a method, approved, then run on project after project.',
  organised: 'Stages of steps, each per machine or once, with what each must show; a gate at the end of every stage',
  rhythm: 'As the method sets it',
  done: 'Every gate passed',
  document: 'The method report',
};

export const methodOf = (p: Held): Method =>
  p.flow ? { ...FLOW_METHOD, label: p.flow.name?.trim() || FLOW_METHOD.label }
    : MODELS.find(m => m.id === planModel(p)) ?? MODELS[0];
