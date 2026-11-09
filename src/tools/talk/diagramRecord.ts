/* A DIAGRAM SAID ALOUD, MADE INTO ITS TOOL'S RECORD — one module for Line Talk's Make it and AI Mode's draw_diagram (10 November,
 * docs/AI-OPERATING.md; docs/LINE-TALK-TOOLSETS.md). Rowland, 10 November: "bring its report writing, document generation and
 * voice-drawn diagrams into the main AI experience. I want one intelligent colleague, not two separate AI systems."
 *
 * The three diagrams a person can say: a process flow chart (the process-flow calculator), a spaghetti diagram of several walkers
 * (spaghetti-walkers) and a value stream map (the map tool). The capture is what was said (tools/talk/talkSets — every figure as
 * said, converted in code); the record is the tool's own, made the way its New makes it, and an update changes only the steps that
 * were said, keeping everything the person added on the tool's page (the money, the layout, the before). */
import type { ToolStudy } from '../../lib/study';
import processFlow, { inputsOfSteps } from '../calc/defs/process-flow';
import spaghettiWalkers, { inputsOfWalkers } from '../calc/defs/spaghetti-walkers';
import type { FlowCapture, SpagCapture, TalkCapture } from './talkSets';
import { vsAgreed, vsFlow } from './vsMap';

/** The chart's boxes from a capture — the calculator's own mapping, each box marked as said where it came from. */
export function flowInputs(c: FlowCapture, source: string): { inputs: Record<string, number | string>; src: Record<string, string> } {
  const inputs = inputsOfSteps(c.steps) as Record<string, number | string>;
  const src: Record<string, string> = {};
  for (const k of Object.keys(inputs)) src[k] = source;
  return { inputs, src };
}

/** The calculator's boxes from a spaghetti capture — each marked as said. */
export function spagInputs(c: SpagCapture, source: string): { inputs: Record<string, number | string>; src: Record<string, string> } {
  const inputs = inputsOfWalkers(c.walkers.map(w => ({ label: w.label, steps: w.steps.map(s => ({ place: s.place, ...(s.m !== undefined ? { m: s.m } : {}) })) }))) as Record<string, number | string>;
  const src: Record<string, string> = {};
  for (const k of Object.keys(inputs)) src[k] = source;
  return { inputs, src };
}

/** The calculator a flow or spaghetti diagram is kept in. */
export const diagramCalcKey = (c: Exclude<TalkCapture, { set: 'vs' }>): string => (c.set === 'spag' ? spaghettiWalkers.key : processFlow.key);
export const DIAGRAM_WORD = { flow: 'Process flow chart', spag: 'Spaghetti diagram', vs: 'Value stream map' } as const;

/** The tool's record for a diagram said — a line's value stream map, or a calculator's record — as Line Talk's Make it makes it. */
export function diagramRecord(capture: TalkCapture, o: { id: string; at: number; workspaceId?: string; projectId?: string; source: string; from: Record<string, unknown> }): ToolStudy {
  const where = { ...(o.workspaceId ? { workspaceId: o.workspaceId } : {}), ...(o.projectId ? { projectId: o.projectId } : {}) };
  if (capture.set === 'vs') {
    return { id: o.id, tool: 'map', name: `${capture.title.trim() || 'Value stream'}${o.workspaceId ? '' : ' (from a talk)'}`, ...where,
      agreed: { map: vsAgreed(capture) }, facts: { flow: vsFlow(capture), fromTalk: o.from } as ToolStudy['facts'], uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at };
  }
  const { inputs, src } = capture.set === 'spag' ? spagInputs(capture, o.source) : flowInputs(capture, o.source);
  const made: ToolStudy = { id: o.id, tool: 'calc', name: `${capture.title.trim() || (capture.set === 'spag' ? 'Spaghetti diagram' : 'Flow diagram')}${o.workspaceId ? '' : ' (from a talk)'}`, ...where,
    agreed: { calc: { key: diagramCalcKey(capture), inputs, src } }, facts: { fromTalk: o.from } as ToolStudy['facts'], uses: [], startedAt: o.at, createdAt: o.at, updatedAt: o.at };
  return made;
}

/** The change to a record already made: the steps that were said, every other figure on it the person's. */
export function diagramUpdate(capture: TalkCapture, cur: ToolStudy, source: string): Partial<ToolStudy> {
  if (capture.set === 'vs') return { agreed: { ...cur.agreed, map: vsAgreed(capture, cur.agreed?.map) }, facts: { ...cur.facts, flow: vsFlow(capture, cur.facts.flow ?? []) } };
  const { inputs, src } = capture.set === 'spag' ? spagInputs(capture, source) : flowInputs(capture, source);
  const mine = capture.set === 'spag' ? /^w\d_/ : /^s\d\d_/;
  const a = cur.agreed?.calc;
  if (!a) return {};
  const keep = Object.fromEntries(Object.entries(a.inputs).filter(([k]) => !mine.test(k)));
  const keepSrc = Object.fromEntries(Object.entries(a.src ?? {}).filter(([k]) => !mine.test(k)));
  return { agreed: { ...cur.agreed, calc: { ...a, inputs: { ...keep, ...inputs }, src: { ...keepSrc, ...src } } } };
}
