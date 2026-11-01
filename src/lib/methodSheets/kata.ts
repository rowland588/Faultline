/* KATA — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    'Understand the direction': [
      f('challenge', 'The challenge', 'A measurable aim months out, and why it matters.', { line: true }),
    ],
    'Grasp the current condition': [
      f('current', 'The process as it is — its pattern', 'Measured: the spread and the pattern, not the average.', { tools: ['FC-086', 'FC-094', 'FC-049'] }),
    ],
    'Establish the next target condition': [
      f('target', 'The target condition, and its date', 'A described state of the process a few weeks away — not a solution.'),
      f('obstacles', 'The obstacles in the way', 'What stands between today and that state, in the order you will take them.'),
    ],
    'Experiment toward it': [
      f('step', 'The next step', 'One small step.'),
      f('prediction', 'What we expect', 'Written before the step.'),
      f('result', 'What happened, and what we learned', 'After the step — the next step comes from this.', { tools: ['FC-105'] }),
    ],
  };
