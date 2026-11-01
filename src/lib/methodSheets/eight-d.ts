/* EIGHT-D — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    'D0–D1  Symptom, emergency response, team': [
      f('customer', 'Who raised it, and their reference', 'The customer or the part of the factory that complained, and their complaint or incident number.', { line: true }),
      f('opened', 'Opened, and the reply due', 'The day it was opened and the day the customer wants the report.', { line: true }),
      f('symptom', 'The symptom', 'What was reported, by whom, when.'),
      f('response', 'The emergency response', 'What was done at once to protect the customer.'),
      f('team', 'The team', 'Who is on it, and who leads.', { line: true }),
    ],
    'D2  Describe the problem': [
      f('is', 'What it is — what, where, when, how much', 'The facts, as measured — numbers where you have them.'),
      f('isnot', 'What it is not', 'What could have been wrong but is not — it narrows the cause.'),
    ],
    'D3  Contain': [
      f('contain', 'Containment', 'Product held, sorted or reworked; who checked, and how many.'),
      f('worked', 'Checked that it works', 'How you know nothing more is reaching the customer.'),
    ],
    'D4  Root cause and escape point': [
      f('why', 'Why it happened', 'The root cause — the reason the fault could happen — with the evidence. “Operator error” is not an answer: ask what let it happen.', { tools: ['FC-125', 'FC-146', 'FC-147'] }),
      f('escape', 'Why it was not caught', 'The escape point — the check that should have found it.', { tools: ['FC-146'] }),
      f('verified', 'Verified', 'How you proved it: the fault came back when the cause was put back, and went when it was taken away.'),
    ],
    'D5–D6  Corrective action, implemented and validated': [
      f('action', 'The permanent corrective action', 'What was chosen to stop it for good, and why it should work. List each step, with who and by when, on the form above.', { tools: ['FC-143', 'FC-194'] }),
      f('validated', 'Validated on the number', 'The same number the complaint was about, measured after the action — and for how long it has held.', { tools: ['FC-105', 'FC-086'] }),
    ],
    'D7  Prevent recurrence': [
      f('system', 'What changed in the system', 'FMEA, control plan, standard — and the other lines it applies to.', { tools: ['FC-132', 'FC-007', 'FC-155'] }),
    ],
    'D8  Close': [
      f('evidence', 'Evidence for each discipline', 'Where it is kept.'),
      f('recognised', 'The team recognised', 'Who, and how.', { line: true }),
      f('sent', 'The report sent to', 'Whom, and on what day.', { line: true }),
    ],
  };
