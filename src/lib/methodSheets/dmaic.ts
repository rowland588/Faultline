/* DMAIC — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Define: [
      f('problem', 'The problem', 'What is wrong, where, since when — in a sentence a customer would recognise.', { tools: ['FC-142'] }),
      f('customer', 'The customer’s requirement', 'What they need, in their words.', { tools: ['FC-140'] }),
      f('ctq', 'The measure that matters (CTQ)', 'The one characteristic, its unit and its limits.', { line: true, tools: ['FC-140'] }),
      f('scope', 'Scope — in and out', 'Which line, product and process are in; what is deliberately out.', { tools: ['FC-139'] }),
      f('goal', 'The goal', 'The figure wanted, and the date.', { line: true }),
      f('worth', 'What it is worth', 'In pounds a year, and how that was worked out.', { tools: ['FC-128', 'FC-191'] }),
      f('team', 'The team', 'Sponsor, process owner, who does the work.', { line: true }),
    ],
    Measure: [
      f('baseline', 'The baseline of the measure', 'Today’s figure over a stretch long enough to see its pattern.', { tools: ['FC-094', 'FC-086'] }),
      f('gauge', 'The gauge proved fit — how', 'How you know the measurement can be trusted.', { tools: ['FC-118', 'FC-119'] }),
      f('capability', 'Baseline capability', 'How well the process meets its limits today.', { tools: ['FC-094', 'FC-095'] }),
    ],
    Analyse: [
      f('causes', 'Root causes found, and the data that shows each', 'Each cause with the evidence — not opinion.', { tools: ['FC-125', 'FC-146', 'FC-105'] }),
      f('vital', 'The vital few', 'The one to three causes that carry most of the problem.', { tools: ['FC-153'] }),
    ],
    Improve: [
      f('solutions', 'Solutions considered, and how one was chosen', 'The options and the criteria — Pugh, impact against effort.', { tools: ['FC-143', 'FC-144'] }),
      f('pilot', 'The pilot, and its result on the measure', 'What was tried, where, and what the measure did.', { tools: ['FC-105', 'FC-111'] }),
    ],
    Control: [
      f('plan', 'The control plan', 'What is checked, how often, by whom, and what is done when it drifts.', { tools: ['FC-086', 'FC-132'] }),
      f('standard', 'The standard that holds it', 'Where the new way is written.', { tools: ['FC-007'] }),
      f('handover', 'Handed over to', 'The process owner, and the day.', { line: true }),
    ],
  };
