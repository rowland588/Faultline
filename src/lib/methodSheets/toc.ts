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
      f('constraint', 'The constraint', 'The one station or machine that limits the output.', { line: true, tools: ['FC-034', 'FC-038'] }),
      f('real', 'Real or a mirage — how we know', 'A mirage is a machine that looks like the limit but is not: a minute lost there costs the line nothing, because the line runs round it. Is a minute lost here a minute lost by the whole line? Say how you know — a queue in front of it, the stations after it waiting for it.', { tools: ['FC-034'] }),
    ],
    'Exploit it': [
      f('starved', 'When it waits — starved, blocked, or stopped for a break', 'Starved is waiting for material; blocked is having nowhere to put what it made. Every minute it stands — starved, blocked, short of a person or at a break — is a minute the whole line loses.', { tools: ['FC-049', 'FC-046'] }),
      f('exploit', 'What we will do to lose nothing', 'The actions, who and when.', { tools: ['FC-039', 'FC-194'] }),
    ],
    'Subordinate the rest': [
      f('rules', 'The rules the rest of the line works to', 'How the other stations are paced to the constraint — buffers, when material is released, the schedule — written down so everyone works to the same rules.', { tools: ['FC-043', 'FC-179', 'FC-046'] }),
      f('buffer', 'The buffer in front of the constraint, and how we watch it', 'Where it sits, how many hours of work it holds, and what we do when it empties or overfills.', { tools: ['FC-043', 'FC-046'] }),
      f('release', 'When material is released onto the line', 'The rope: what tells the first station to start, so that no one makes more than the constraint can take.', { tools: ['FC-043', 'FC-179'] }),
    ],
    'Elevate it': [
      f('still', 'Is it still the constraint after steps two and three?', 'Say yes or no, and why. Spend money only if it is still the limit after steps 2 and 3 — first find the capacity you already have.', { tools: ['FC-034'] }),
      f('option', 'The option, and its worth', 'More people, more capacity or a faster machine: how many packs a minute it adds, what it costs and when it pays back.', { tools: ['FC-191', 'FC-034'] }),
    ],
    'Go again': [
      f('moved', 'Where the constraint is now', 'After the change, which station limits the line now? Write the station — the next pass starts from it.', { tools: ['FC-034'] }),
      f('inertia', 'The rule we set for the old constraint that no longer holds', 'The buffer, schedule or habit built round the old constraint — and what we change so it does not become the new constraint.', {}),
    ],
  };
