/* KATA — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    'Understand the direction': [
      f('challenge', 'The challenge', 'A measurable aim months out, and why it matters.', { line: true }),
      f('coach', 'The learner and the coach', 'Who is learning the routine and who asks the five questions each day.', { line: true }),
    ],
    'Grasp the current condition': [
      f('measure', 'The measure and its unit', 'What is counted or timed, how, and in what unit — packs a minute, seconds a cycle.', { line: true }),
      f('current', 'The process as it is — its pattern', 'Measured: the spread and the pattern, not the average.', { tools: ['FC-086', 'FC-094', 'FC-049'] }),
    ],
    'Establish the next target condition': [
      f('target', 'The target condition, and its date', 'A described state of the process a few weeks away — not a solution.'),
      f('obstacles', 'The obstacles in the way', 'What stands between today and that state — a parking lot, one obstacle a line.'),
      f('obstacle_now', 'The obstacle we are addressing now', 'One at a time — the one the next step goes at.', { line: true }),
    ],
    'Experiment toward it': [
      f('step', 'The next step', 'One small step, at the obstacle named above.'),
      f('prediction', 'What we expect', 'Written before the step — a number or a pattern, so a miss can be seen.'),
      f('result', 'What happened', 'After the step — what was seen, against what was expected.', { tools: ['FC-105'] }),
      f('learning', 'What we learned', 'A prediction matched is confirmed; one missed is the lesson. The next step comes from this.'),
      f('ran', 'The day the step was taken', 'A date — a storyboard with no entry for three days is a routine that has stopped.', { line: true }),
      f('see_by', 'When we go and see what we have learned', 'The coach’s fifth question: the day and time of the next look.', { line: true }),
    ],
  };
