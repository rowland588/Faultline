/* KAIZEN-EVENT — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Prepare: [
      f('charter', 'The charter', 'The problem, the goal for the week, the scope.', { tools: ['FC-142'] }),
      f('team', 'The team', 'Who is released for the week.', { line: true }),
      f('baseline', 'The baseline', 'The measure on day one.', { tools: ['FC-019', 'FC-051'] }),
    ],
    Observe: [
      f('waste', 'The waste seen on the floor', 'What the team watched — waiting, walking, rework — with the numbers.', { tools: ['FC-001', 'FC-019', 'FC-199'] }),
    ],
    Improve: [
      f('tried', 'Changes tried in the week, and measured', 'Each change and what the measure did.', { tools: ['FC-105'] }),
    ],
    Standardise: [
      f('written', 'The new way, written', 'Where it is, and who has been trained.', { tools: ['FC-007'] }),
    ],
    Sustain: [
      f('open', 'Open actions to the 30-day check', 'Who owes what, by when.', { tools: ['FC-194'] }),
      f('holding', 'Is the gain still holding?', 'The measure at 30 days.', { tools: ['FC-086'] }),
    ],
  };
