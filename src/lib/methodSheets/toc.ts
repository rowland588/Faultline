/* TOC — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    'Identify the constraint': [
      f('constraint', 'The constraint', 'The one station or machine that limits the output.', { line: true, tools: ['FC-034', 'FC-038'] }),
      f('real', 'Real or a mirage — how we know', 'Whether a lost minute here costs the whole line a minute.', { tools: ['FC-034'] }),
    ],
    'Exploit it': [
      f('losses', 'What is lost at the constraint', 'Stops, slow running, changeovers, idle time — in minutes and packs.', { tools: ['FC-049', 'FC-056', 'FC-051'] }),
      f('exploit', 'What we will do to lose nothing', 'The actions, who and when.', { tools: ['FC-039', 'FC-194'] }),
    ],
    'Subordinate the rest': [
      f('rules', 'The rules the rest of the line works to', 'Buffers, release, schedule — written down.', { tools: ['FC-043', 'FC-179', 'FC-046'] }),
    ],
    'Elevate it': [
      f('option', 'The option, and its worth', 'More people, capacity or a faster machine — what it adds and when it pays back.', { tools: ['FC-191', 'FC-034'] }),
    ],
    'Go again': [
      f('moved', 'Where the constraint is now', 'The new constraint, and what to protect from the old one.', { tools: ['FC-034'] }),
    ],
  };
