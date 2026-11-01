/* PDCA — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Plan: [
      f('number', 'The number we are improving', 'One measure, in its unit — packs a minute, rejects a shift, minutes lost.', { line: true, tools: ['FC-094', 'FC-049'] }),
      f('gap', 'Where it is, and where it should be', 'Today’s figure, the figure wanted, and the gap between them.', { tools: ['FC-154', 'FC-049'] }),
      f('cause', 'The cause we suspect, and why', 'What you think is making the gap, and what you have seen that says so.', { tools: ['FC-125', 'FC-146'] }),
      f('change', 'The change we will make', 'One change, small enough to try — what, where, on which line.'),
      f('expect', 'The effect we expect, in the number', 'Written before the change: how far should the number move?', { line: true }),
    ],
    Do: [
      f('who', 'Who does what, by when', 'The people and the days. It lands on the project’s Actions.', { tools: ['FC-194'] }),
      f('small', 'How small we start', 'One shift, one line, one product — the size of the trial.'),
      f('seen', 'What we saw while doing it', 'Surprises, what went differently from the plan.'),
    ],
    Check: [
      f('result', 'The number now, against before', 'The same measure, the same way — before and after.', { tools: ['FC-105', 'FC-086'] }),
      f('predicted', 'Against what we predicted', 'Did it move as far as you wrote down in Plan?'),
      f('beyond', 'Beyond the noise? How we know', 'Why the movement is the change and not ordinary variation.', { tools: ['FC-105', 'FC-086'] }),
    ],
    Act: [
      f('standard', 'Made the standard — where it is written', 'The procedure, line standard or checklist that now says it.', { tools: ['FC-007', 'FC-013'] }),
      f('trained', 'Who was trained', 'The people and the shifts, and the day.'),
      f('spread', 'Other lines to offer it to', 'Where the same machine or problem is.', { tools: ['FC-155'] }),
      f('again', 'Or: the next cycle’s change', 'If it did not hold or did not go far enough — what you plan next.'),
    ],
  };
