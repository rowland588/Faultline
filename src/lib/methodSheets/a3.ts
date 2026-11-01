/* A3 — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. The seven blocks of Toyota's sheet
 * (Sobek & Smalley 2008; Shook 2008) are these six sections, the last holding both the plan and the follow-up; the sheet's
 * header (the problem in a line, its owner, who agreed) sits in the first. The countermeasures are a LIST — row 1 is `counter`,
 * the next rows `counter@2`, `counter@3`… (project/method/shapes/a3Model). */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Background: [
      f('problem', 'The problem, in one line', 'One problem, named by what is wrong in the business’s number — not a cause, not a fix.', { line: true }),
      f('owner', 'Owner — and who must agree it', 'The person who owns the page, and the sponsor and the people who must support the countermeasures.', { line: true }),
      f('why', 'Why it matters', 'The gap in the business’s number, and what it costs — in money where it is known.', { tools: ['FC-154', 'FC-128'] }),
    ],
    'Current condition': [
      f('current', 'The facts, drawn, with the number', 'What is happening now — measured, not remembered. A chart, a Pareto or a map: whichever shows the number.', { tools: ['FC-001', 'FC-049', 'FC-094'] }),
      f('currentnum', 'The number now, with its unit', 'The one figure the follow-up will be read against.', { line: true }),
    ],
    Target: [
      f('target', 'The number wanted, by when', 'One measure, its figure and its date.', { line: true }),
    ],
    Analysis: [
      f('root', 'The root cause, with the evidence', 'Five whys or fishbone — and the data under it.', { tools: ['FC-146', 'FC-147', 'FC-125'] }),
      f('evidence', 'How each cause is known', 'Measured, counted, observed or reported — a cause only reported is still to prove.'),
    ],
    Countermeasures: [
      f('counter', 'What, who, by when, against which cause', 'Each countermeasure tied to the cause it answers; a countermeasure that names no cause is a to-do.', { tools: ['FC-194', 'FC-143'] }),
    ],
    'Plan and follow-up': [
      f('plan', 'The steps', 'In order, with dates.', { tools: ['FC-194'] }),
      f('followup', 'The number checked — did it hold?', 'How the number will be checked, and the number it showed.', { tools: ['FC-105', 'FC-086'] }),
      f('followdate', 'When it is checked', 'The follow-up date.', { line: true }),
      f('held', 'What it showed — did it hold?', 'Written when the date comes; the page lives until it is.'),
      f('agreed', 'Who has questioned it and agreed — and the day', 'The owner drafts; the sponsor and the people affected question each block.', { line: true }),
    ],
  };
