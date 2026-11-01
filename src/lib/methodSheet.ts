/* A METHOD'S OWN SHEET — what the method itself asks, written in the project (docs/METHODS.md §16 — Rowland, 1 November 2026:
 * "I asked you to build the method and insert the tools where required"; 31 October: "build methods first … and we simply
 * insert the tools where required").
 *
 * A method is not a list of tools. It is the questions it asks, in its order: PDCA's plan is the number, the gap, the cause
 * suspected, the change and the effect expected, written before; the A3 is its boxes; the 8D is D0 to D8; Kata is the
 * challenge, the current and the target condition and the experiments. This module is those questions, once, for the seven
 * methods that are worked in words (the stage gate keeps its own screens — Install, Commission, Hand over). Each question is a
 * FIELD with the words a person reads, a hint, and — where a tool is what answers it — the tools that fall in there
 * (catalogue ids): the tool is offered at that question, never required, and a question is answered in words whether or not a
 * tool was used.
 *
 * Where it is kept: an answer is a project note whose scope is `method:<method>:<field>` (lib/noteScope, the same place a day's
 * commentary is kept as `day:<date>`), so it is the project's, syncs with it, is read by whoever can read the project and
 * written by whoever can edit it — no new record and no new column. The notes screens do not list it as a meeting note.
 * Pure. */
import type { MethodKey } from './methods';
import { SECTIONS as pdca } from './methodSheets/pdca';
import { SECTIONS as dmaic } from './methodSheets/dmaic';
import { SECTIONS as eight_d } from './methodSheets/eight-d';
import { SECTIONS as a3 } from './methodSheets/a3';
import { SECTIONS as kaizen_event } from './methodSheets/kaizen-event';
import { SECTIONS as kata } from './methodSheets/kata';
import { SECTIONS as toc } from './methodSheets/toc';

export type { SheetField, SheetSections } from './methodSheetKit';
import type { SheetField, SheetSections } from './methodSheetKit';
export { f } from './methodSheetKit';

export const SHEETS: Partial<Record<MethodKey, SheetSections>> = {
  pdca: pdca,
  dmaic: dmaic,
  'eight-d': eight_d,
  a3: a3,
  'kaizen-event': kaizen_event,
  kata: kata,
  toc: toc,
};

/** The fields of a method's section, none when the method keeps its own screens or a section is not here. */
export const fieldsOf = (method: MethodKey, section: string): readonly SheetField[] => SHEETS[method]?.[section] ?? [];

/** Does a method have a sheet of its own to write in? */
export const hasSheet = (method: MethodKey): boolean => !!SHEETS[method];

const PREFIX = 'method:';
/** The scope an answer is kept under (a project note's `testId`). */
export const answerScope = (method: MethodKey, field: string): string => `${PREFIX}${method}:${field}`;
/** Is this note an answer of a method's sheet — never a meeting note. */
export const isMethodAnswer = (testId: string | undefined): boolean => !!testId && testId.startsWith(PREFIX);
/** Which method and field an answer is for. */
export const answerOf = (testId: string): { method: string; field: string } | undefined => {
  if (!isMethodAnswer(testId)) return undefined;
  const [method, ...rest] = testId.slice(PREFIX.length).split(':');
  const field = rest.join(':');
  return method && field ? { method, field } : undefined;
};

export interface SectionState {
  fields: number;
  written: number;
  /** In words — never colour alone. */
  word: 'Not started' | 'Under way' | 'All written';
}
/** How far a section is written, from the answers held (field id → words). A blank answer is not written. */
export function sectionState(method: MethodKey, section: string, answers: Readonly<Record<string, string>>): SectionState {
  const fs = fieldsOf(method, section);
  const written = fs.filter(x => (answers[x.id] ?? '').trim() !== '').length;
  return { fields: fs.length, written, word: !fs.length || written === 0 ? 'Not started' : written === fs.length ? 'All written' : 'Under way' };
}
