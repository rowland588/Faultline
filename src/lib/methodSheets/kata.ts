/* KATA — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16–§17). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. Source: Rother (2009) Toyota Kata
 * and the Toyota Kata Practice Guide (2018): the four steps, a written prediction before each step, the five coaching questions. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    'Understand the direction': [
      f('challenge', 'The challenge', 'Where you are heading, some months away: a number, a unit and a date — and why it matters to the business. It is not a plan.', { line: true }),
      f('coach', 'The learner and the coach', 'Who is learning the routine, and who asks the five questions each day.', { line: true }),
    ],
    'Grasp the current condition': [
      f('measure', 'The measure and its unit', 'What is counted or timed, how, and in what unit — packs a minute, seconds a cycle.', { line: true }),
      f('current', 'The process as it is — its pattern', 'Measured, not guessed: how much it swings and when, not only the average. “32 s on average, from 25 to 45” says more than “32 s”.', { tools: ['FC-086', 'FC-094', 'FC-049'] }),
    ],
    'Establish the next target condition': [
      f('target', 'The target condition', 'Describe how the process will run when you get there — the value and the pattern, for example “25 s every cycle”. A state to reach, not a solution to install.'),
      f('target_by', 'The date we aim to reach it', 'A day two to four weeks away.', { line: true }),
      f('obstacles', 'The obstacles in the way', 'Everything you can see standing between today and that state — your list to work down, one obstacle a line. Not solutions.'),
      f('obstacle_now', 'The obstacle we are addressing now', 'Only one at a time — the one the next step goes at.', { line: true }),
    ],
    'Experiment toward it': [
      f('step', 'The next step', 'One small step, aimed at the obstacle named above — small enough to try soon.'),
      f('prediction', 'What we expect', 'Written before the step, as a number or a pattern, so a miss can be seen.'),
      f('result', 'What happened', 'After the step — what was seen, against what was expected.', { tools: ['FC-105'] }),
      f('matched', 'Did it match what we expected?', 'Yes, partly or no — then say why in a few words. A miss is not a failure: it is the lesson.', { line: true }),
      f('learning', 'What we learned', 'What this step showed about the obstacle. The next step comes from here.'),
      f('ran', 'The day the step was taken', 'A date. A storyboard with no step for three days is a routine that has stopped.', { line: true }),
      f('see_by', 'When we go and see what we have learned', 'The coach’s fifth question: the day and time of the next look at the process.', { line: true }),
    ],
  };
