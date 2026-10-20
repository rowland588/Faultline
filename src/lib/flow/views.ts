/* HOW A STEP IS DRAWN — the views a method's step can be shown as, from a
 * closed list (docs/VIEWS.md).
 *
 * Rowland, 19 October: "I expect a cohesive, polished working environment
 * containing a project charter, PDCA management, an interactive fishbone
 * diagram, action tracking ... connected and behave as one integrated
 * system." Every step used to be drawn by one panel — a table of boxes —
 * however the floor thinks of it. A view draws a step the way the method
 * does: a log of causes as the fish, a log of experiments or actions as a
 * board of lanes, a form as the charter, a log of decisions as a timeline.
 *
 * A VIEW IS CODE WRITTEN ONCE, COMPOSED BY DATA — as an analysis block is
 * (lib/flow/analysis). Its entry here says which answer it draws and its
 * SLOTS: what it needs from the step, each bound to one of the step's own
 * columns (a log) or boxes (a form) of the kinds that slot can hold. The
 * validator (lib/flow/validate) refuses a binding that is not there or not
 * of its kind; the screen (ui/flow/Views) and the paper (lib/flow/reportPdf)
 * draw from the bindings; the assistant is told the list (VIEWS_SAID).
 *
 * A VIEW NEVER WORKS OUT WHAT A GATE OR A MEASURE READS. The arithmetic is
 * the analysis blocks' (the fishbone block's root causes, a count, past
 * due); a view draws the entries and edits them, so the screen, the paper,
 * the gate and the measure agree. */
import type { FieldType, FlowAnswer, FlowField, FlowStepDef } from './definition';

export const VIEW_IDS = ['fishbone', 'board', 'charter', 'timeline'] as const;
export type ViewId = typeof VIEW_IDS[number];

/** A step's view: which one, and which of the step's columns (or boxes)
 *  each of its slots is drawn from — slot key → column key. */
export interface FlowView {
  id: ViewId;
  bind: Record<string, string>;
}

export interface ViewSlot {
  key: string;
  /** How the slot is said — "the bone", "the lane". */
  name: string;
  /** The kinds of column (or box) that can fill it. */
  types: readonly FieldType[];
  required: boolean;
  /** What it is for, for the editor and the assistant. */
  says: string;
}

export interface ViewDef {
  id: ViewId;
  name: string;
  /** The answer a step must have to be drawn this way. */
  answer: FlowAnswer;
  slots: readonly ViewSlot[];
  /** The slot that names one entry — what a link to it says. */
  title?: string;
  says: string;
}

const WORDS: readonly FieldType[] = ['text'];
const WHO: readonly FieldType[] = ['person', 'text'];

export const VIEWS: Record<ViewId, ViewDef> = {
  fishbone: {
    id: 'fishbone', name: 'Fishbone', answer: 'log', title: 'cause',
    says: 'A log of causes drawn as the fish (Ishikawa): the problem at the head, each cause on its bone, the bones the bone column’s options (People · Machine · Method · Material · Measurement · Environment, or the method’s own); a cause added by tapping its bone, moved to another, opened to mark it a root cause, say how it is known and drill its whys; each says what is linked to it',
    slots: [
      { key: 'cause', name: 'the cause', types: WORDS, required: true, says: 'what the cause is, in words' },
      { key: 'bone', name: 'the bone', types: ['choice'], required: true, says: 'which bone it sits on — a choice whose options are the bones' },
      { key: 'root', name: 'root cause', types: ['yesno'], required: false, says: 'whether the whys end here — a root cause' },
      { key: 'known', name: 'how it is known', types: ['choice'], required: false, says: 'measured · counted · observed · reported' },
      { key: 'why', name: 'the whys', types: WORDS, required: false, says: 'the five whys, drilled' },
    ],
  },
  board: {
    id: 'board', name: 'Board', answer: 'log', title: 'card',
    says: 'A log drawn as lanes — Plan · Do · Check · Act for PDCA experiments, To do · Doing · Done for actions: each entry a card with its owner, its day (red once gone and not in the last lane) and what it is linked to; moved between lanes by dragging or Move to, added in a lane',
    slots: [
      { key: 'card', name: 'the card', types: WORDS, required: true, says: 'what each card is, in words' },
      { key: 'lane', name: 'the lane', types: ['choice'], required: true, says: 'which lane it is in — a choice whose options are the lanes, in order, the last one done' },
      { key: 'owner', name: 'who owns it', types: WHO, required: false, says: 'the person who owes it' },
      { key: 'due', name: 'its day', types: ['date'], required: false, says: 'the day it is due — red once gone and not in the last lane' },
    ],
  },
  charter: {
    id: 'charter', name: 'Charter', answer: 'form',
    says: 'A form drawn as a one-page project charter: the problem and the goal at the top, scope in and out side by side, the business case, the sponsor and the team',
    slots: [
      { key: 'problem', name: 'the problem', types: WORDS, required: true, says: 'the problem, as measured — what, where, how much' },
      { key: 'goal', name: 'the goal', types: WORDS, required: true, says: 'what it has to reach, and by when' },
      { key: 'scope_in', name: 'in scope', types: WORDS, required: false, says: 'what the project covers' },
      { key: 'scope_out', name: 'out of scope', types: WORDS, required: false, says: 'what it does not' },
      { key: 'case', name: 'the business case', types: ['number', 'calc'], required: false, says: 'what it is worth — a number, in £ when the unit is £' },
      { key: 'sponsor', name: 'the sponsor', types: WHO, required: false, says: 'who it answers to' },
      { key: 'team', name: 'the team', types: WHO, required: false, says: 'who does it' },
    ],
  },
  timeline: {
    id: 'timeline', name: 'Timeline', answer: 'log', title: 'what',
    says: 'A log of decisions (or any dated entries) down the page by day: what was decided, who, why, its kind',
    slots: [
      { key: 'what', name: 'what', types: WORDS, required: true, says: 'what was decided or happened' },
      { key: 'when', name: 'the day', types: ['date'], required: false, says: 'the day, when not the day it was logged' },
      { key: 'who', name: 'who', types: WHO, required: false, says: 'who decided' },
      { key: 'why', name: 'why', types: WORDS, required: false, says: 'the reason' },
      { key: 'kind', name: 'its kind', types: ['choice'], required: false, says: 'a kind of decision — a choice' },
    ],
  },
};

export const viewOf = (id?: string): ViewDef | undefined => (id && (VIEW_IDS as readonly string[]).includes(id) ? VIEWS[id as ViewId] : undefined);

/** The columns (a log) or boxes (a form) a step's view is bound to. */
export const boundOn = (step: Pick<FlowStepDef, 'answer' | 'columns' | 'fields'>): FlowField[] =>
  (step.answer === 'log' ? step.columns : step.fields) ?? [];

/** The column (or box) a slot of a step's view is drawn from. */
export function slotField(step: Pick<FlowStepDef, 'answer' | 'columns' | 'fields' | 'view'>, slot: string): FlowField | undefined {
  const k = step.view?.bind[slot];
  return k ? boundOn(step).find(f => f.key === k) : undefined;
}

/** How a step is shown, in words — "shown as a fishbone · bones from Bone". */
export function viewSaid(step: Pick<FlowStepDef, 'answer' | 'columns' | 'fields' | 'view'>): string | undefined {
  const v = viewOf(step.view?.id);
  if (!v) return undefined;
  const lead = v.id === 'fishbone' ? slotField(step, 'bone') : v.id === 'board' ? slotField(step, 'lane') : undefined;
  const from = lead ? ` · ${v.id === 'fishbone' ? 'bones' : 'lanes'} from ${lead.label}${lead.options?.length ? ` (${lead.options.join(' · ')})` : ''}` : '';
  return `shown as ${v.id === 'board' ? 'a board' : v.id === 'charter' ? 'a charter' : v.id === 'timeline' ? 'a timeline' : 'a fishbone'}${from}`;
}

/** The views in words, for the assistant: each, what it draws, and its slots. */
export const VIEWS_SAID = VIEW_IDS.map(id => {
  const v = VIEWS[id];
  return `- ${id} (a ${v.answer} step): ${v.says}. Slots: ${v.slots.map(s => `${s.key}${s.required ? '' : '?'} = ${s.types.join('|')} — ${s.says}`).join('; ')}.`;
}).join('\n');
