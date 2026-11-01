/* A3 — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Background: [
      f('why', 'Why it matters', 'The gap in the business’s number, and what it costs.', { tools: ['FC-154', 'FC-128'] }),
    ],
    'Current condition': [
      f('current', 'The facts, drawn, with the number', 'What is happening now — measured, not remembered.', { tools: ['FC-001', 'FC-049', 'FC-094'] }),
    ],
    Target: [
      f('target', 'The number wanted, by when', 'One measure, its figure and its date.', { line: true }),
    ],
    Analysis: [
      f('root', 'The root cause, with the evidence', 'Five whys or fishbone — and the data under it.', { tools: ['FC-146', 'FC-147', 'FC-125'] }),
    ],
    Countermeasures: [
      f('counter', 'What, who, by when, against which cause', 'Each countermeasure tied to a cause it answers.', { tools: ['FC-194', 'FC-143'] }),
    ],
    'Plan and follow-up': [
      f('plan', 'The steps', 'In order, with dates.', { tools: ['FC-194'] }),
      f('followup', 'The number checked — did it hold?', 'The follow-up date and what it showed.', { tools: ['FC-105', 'FC-086'] }),
    ],
  };
