/* DMAIC — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Define: [
      f('problem', 'The problem statement', 'What is wrong, where, since when, how big — in a sentence a customer would recognise, with no cause and no solution in it.', { tools: ['FC-142'] }),
      f('customer', 'The customer’s requirement', 'What they need, in their words.', { tools: ['FC-140'] }),
      f('ctq', 'The measure that matters (CTQ)', 'The one characteristic, its unit and its limits.', { line: true, tools: ['FC-140'] }),
      f('scope', 'Scope — in and out', 'Which line, product and process are in; what is deliberately out.', { tools: ['FC-139'] }),
      f('process', 'The process, start to finish (SIPOC)', 'Suppliers, inputs, the process in five or six steps, outputs, customers — at high level.', { tools: ['FC-139'] }),
      f('goal', 'The goal', 'The figure wanted, and the date.', { line: true }),
      f('worth', 'The business case — what it is worth', 'In pounds a year, and how that was worked out.', { tools: ['FC-128', 'FC-191'] }),
      f('team', 'The team and its roles', 'Sponsor, process owner, project leader (Green or Black Belt), who does the work.', { line: true }),
      f('milestones', 'The timeline — a date for each phase review', 'Define, Measure, Analyse, Improve, Control: the date each is to pass its review.'),
      f('risks', 'Risks, constraints and assumptions', 'What could stop this, what is fixed, and what is being taken as true.'),
    ],
    Measure: [
      f('baseline', 'The baseline of the measure', 'Today’s figure over a stretch long enough to see its pattern.', { tools: ['FC-094', 'FC-086'] }),
      f('dataplan', 'The data collection plan', 'What is measured, its operational definition, how, by whom, how many readings, when, and stratified by what (shift, line, product).', { tools: ['FC-094', 'FC-086'] }),
      f('gauge', 'The gauge proved fit — how', 'How you know the measurement can be trusted.', { tools: ['FC-118', 'FC-119'] }),
      f('capability', 'Baseline capability', 'How well the process meets its limits today.', { tools: ['FC-094', 'FC-095'] }),
    ],
    Analyse: [
      f('causes', 'Root causes found, and the data that shows each', 'Each cause with the evidence — not opinion.', { tools: ['FC-125', 'FC-146', 'FC-105'] }),
      f('tested', 'What was tested, and what the test said', 'Each suspected cause as a hypothesis, the test used, and the result — confirmed or ruled out.', { tools: ['FC-105', 'FC-107', 'FC-111'] }),
      f('vital', 'The vital few', 'The one to three causes that carry most of the problem.', { tools: ['FC-153'] }),
    ],
    Improve: [
      f('solutions', 'Solutions considered, and how one was chosen', 'The options and the criteria — Pugh, impact against effort.', { tools: ['FC-143', 'FC-144'] }),
      f('solrisk', 'What could go wrong with the solution', 'The failure modes of the new way and how each is covered before it goes in.', { tools: ['FC-152'] }),
      f('pilot', 'The pilot, and its result on the measure', 'What was tried, where, and what the measure did.', { tools: ['FC-105', 'FC-111'] }),
    ],
    Control: [
      f('plan', 'The control plan', 'What is checked, how often, by whom, and what is done when it drifts.', { tools: ['FC-086', 'FC-132'] }),
      f('standard', 'The standard that holds it', 'Where the new way is written.', { tools: ['FC-007'] }),
      f('benefit', 'The benefit confirmed', 'The gain on the measure after the pilot, and the money, agreed with the person who owns the budget.', { tools: ['FC-128', 'FC-191'] }),
      f('handover', 'Handed over to', 'The process owner, and the day.', { line: true }),
    ],
  };
