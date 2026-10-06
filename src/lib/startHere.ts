/* GETTING A NEW JOB RUNNING — the steps, in the order they have to happen.
 *
 * Rowland, 6 October: "there is no clear way to start a project. In the new
 * 6M project there's multiple things set up, measurements, actions, but there
 * is no clear start here, do this, then ready to run."
 *
 * A new 6M or lever tree job opened on a long setup form and a front page of
 * empty panels, one of them offering "Open a problem" before there was a line
 * or a number to have a problem with. The method has an order (docs/SIXM.md:
 * the gap, then the problem, then its causes): a line, the number it is
 * judged on, the target, where it is now — and only then the first problem,
 * or on a tree the outcome. Each step is read off a record the job already
 * keeps, so nothing new is stored and nothing is ticked by hand: it is done
 * when the thing exists. When every step is done the job is ready to run and
 * the list goes away. */
import type { PlanModel } from './planModel';

export type StepKey = 'line' | 'measure' | 'target' | 'now' | 'problem' | 'outcome';

export interface StartStep {
  key: StepKey;
  /** What to do, said as an instruction. */
  title: string;
  /** Why, or what counts — one line. */
  says: string;
  done: boolean;
}

export interface StartInput {
  model: PlanModel;
  lines: number;
  measures: number;
  targets: number;
  readings: number;
  /** 6M: problems opened on the fishbone. */
  problems: number;
  /** Lever tree: boxes on the tree. */
  treeNodes: number;
}

/** The steps for a 6M or lever tree job, in order; empty for a stage-gate job,
 *  whose start is Install — add the machines — and says so itself. */
export function startSteps(x: StartInput): StartStep[] {
  if (x.model === 'commissioning') return [];
  const steps: StartStep[] = [
    { key: 'line', title: 'Add the line', says: 'Its name, and who owns it.', done: x.lines > 0 },
    { key: 'measure', title: 'Say what it is judged on', says: 'The number — packs per minute, waste, OEE — and which way is good.', done: x.measures > 0 },
    { key: 'target', title: 'Set the target', says: 'A stretch of time (Q1, say) and the number each line has to hit in it.', done: x.targets > 0 },
    { key: 'now', title: 'Write down where it is now', says: 'The first reading — the before every change is measured against.', done: x.readings > 0 },
  ];
  steps.push(x.model === 'tree'
    ? { key: 'outcome', title: 'Write the outcome on the tree', says: 'The one result at the top; what has to be true for it goes under it.', done: x.treeNodes > 0 }
    : { key: 'problem', title: 'Open the first problem', says: 'The biggest loss — from the gap, the Pareto of timed stops, or something seen. It is the head of the fish.', done: x.problems > 0 });
  return steps;
}

/** Ready to run: every step done. A job with no steps (stage gate) is ready. */
export const readyToRun = (steps: StartStep[]): boolean => steps.every(s => s.done);

/** The first step not done — the one the list says to do next. */
export const nextStep = (steps: StartStep[]): StartStep | undefined => steps.find(s => !s.done);
