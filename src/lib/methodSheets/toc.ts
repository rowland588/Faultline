/* TOC — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one.
 *
 * The five focusing steps are Goldratt's (The Goal, 1984; What Is This Thing Called Theory of Constraints, 1990, ch. 1 and 8; Goldratt &
 * Cox's "Don't let inertia become the constraint"): identify the constraint; decide how to exploit it; subordinate everything else to
 * that decision; elevate it; and, if it has been broken, go back to step one — without letting inertia set the new constraint. In a
 * food factory the constraint is nearly always a machine (a filler, a wrapper, an oven) or a crew; the questions are put to it. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    'Identify the constraint': [
      f('goal', 'What the line must make, and what it makes', 'The number the line is asked for and the number it actually gives, in packs a minute or a shift.', { line: true, tools: ['FC-034', 'FC-201'] }),
      f('constraint', 'The constraint', 'The one station or machine that limits the output.', { line: true, tools: ['FC-034', 'FC-038'] }),
      f('real', 'Real or a mirage — how we know', 'Whether a lost minute here costs the whole line a minute.', { tools: ['FC-034'] }),
    ],
    'Exploit it': [
      f('losses', 'What is lost at the constraint', 'Stops, slow running, changeovers, idle time — in minutes and packs.', { tools: ['FC-049', 'FC-056', 'FC-051'] }),
      f('starved', 'When it waits — starved, blocked, or stopped for a break', 'Every minute it stands for want of material, room downstream, a person or a break: those minutes are the line’s.', { tools: ['FC-049', 'FC-046'] }),
      f('exploit', 'What we will do to lose nothing', 'The actions, who and when.', { tools: ['FC-039', 'FC-194'] }),
    ],
    'Subordinate the rest': [
      f('rules', 'The rules the rest of the line works to', 'Buffers, release, schedule — written down.', { tools: ['FC-043', 'FC-179', 'FC-046'] }),
      f('buffer', 'The buffer in front of the constraint, and how we watch it', 'Where it sits, how many hours of work it holds, and what we do when it empties or overfills.', { tools: ['FC-043', 'FC-046'] }),
      f('release', 'When material is released onto the line', 'The rope: what tells the first station to start, so that no one makes more than the constraint can take.', { tools: ['FC-043', 'FC-179'] }),
    ],
    'Elevate it': [
      f('still', 'Is it still the constraint after steps two and three?', 'Elevate only if it is — do not spend until the free capacity has been found.', { tools: ['FC-034'] }),
      f('option', 'The option, and its worth', 'More people, capacity or a faster machine — what it adds and when it pays back.', { tools: ['FC-191', 'FC-034'] }),
    ],
    'Go again': [
      f('moved', 'Where the constraint is now', 'The new constraint, and what to protect from the old one.', { tools: ['FC-034'] }),
      f('inertia', 'The rule we set for the old constraint that no longer holds', 'The buffer, schedule or habit built round the old constraint — and what we change so it does not become the new constraint.', {}),
    ],
  };
