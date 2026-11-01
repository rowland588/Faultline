/* KAIZEN-EVENT — the questions this method asks, section by section (lib/methodSheet; docs/METHODS.md §16). One file a method, so a
 * method is worked on alone. A field's `id` is kept in the answer's scope — never rename one. Source: knowledge/methods/lean/
 * kaizen-event.md (the charter's scope, target, team and sponsor; the baseline; the waste; the changes and the measure after; the
 * new standard and the people trained; the actions carried to the 30-day check). The week's days and the check's date and verdict
 * are on the method's board (lib/kaizenEvent; project/method/shapes/kaizen-event), not here. */
import { f, type SheetSections } from '../methodSheetKit';

export const SECTIONS: SheetSections = {
    Prepare: [
      f('charter', 'The charter', 'The problem in one sentence, the goal for the week, the scope — this line, this changeover, not wider.', { tools: ['FC-142'] }),
      f('sponsor', 'Who is the sponsor?', 'The person who owns the follow-up after the week.', { line: true }),
      f('target', 'The measure, and its target', 'What will be measured (minutes, packs a minute, rejects) and the number the week is aiming at.', { line: true }),
      f('team', 'The team', 'Who is released for the week: the people who do the work, an engineer, a facilitator.', { line: true }),
      f('dates', 'The dates', 'The days of the event, as agreed with the line.', { line: true }),
      f('baseline', 'The baseline', 'The measure on day one, taken before the week — not remembered: how many readings, how much they vary.', { tools: ['FC-019', 'FC-051'] }),
    ],
    Observe: [
      f('waste', 'The waste seen on the floor', 'What the team watched — waiting, walking, rework — with the numbers. The day-by-day notes are on the board above; this is the week in one answer.', { tools: ['FC-001', 'FC-019', 'FC-199'] }),
    ],
    Improve: [
      f('tried', 'Changes tried in the week, and measured', 'Each change and what the measure did. The day-by-day record is on the board above.', { tools: ['FC-105'] }),
      f('after', 'The measure after the changes', 'The same measure, taken again the same way — the number to set against the baseline.', { line: true, tools: ['FC-105'] }),
    ],
    Standardise: [
      f('written', 'The new way, written', 'Where it is, and who has been trained.', { tools: ['FC-007'] }),
      f('trained', 'Who has been trained in it', 'Every person who does the work on every shift — a standard nobody was taught is not one.', { line: true }),
    ],
    Sustain: [
      f('open', 'Open actions to the 30-day check', 'Who owes what, by when. An action nobody owns is the usual failure.', { tools: ['FC-194'] }),
      f('holding', 'Is the gain still holding?', 'The measure at 30 days, against the baseline and the measure after the week.', { tools: ['FC-086'] }),
      f('worth', 'What the week bought', 'The minutes or packs gained a week, in money if the line’s rate is known — and what is being lost back.', { line: true }),
    ],
  };
