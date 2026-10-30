/* PICKING A LINE, OR MAKING ONE WHERE YOU PICK (30 October — Rowland: "we must have tools that are ready and
 * functional"). A tool that belongs to a line (a loss count, a work sampling study, a check log) used to offer
 * "Pick the line…" over an empty list on a device with no line, and a Start that could never be pressed. The picker
 * now offers "＋ A new line…" last; choosing it asks for the name (and the type, as Your factory's Add lines does)
 * and Start makes the line through the one function Your factory uses (lib/lines addLineToFactory) and carries on.
 * This file is the pure part — what the choice is, whether it is ready, what to say — so the picker (ui/LineField)
 * and the three New sheets read one rule. */
import type { Workspace } from '../types';
import { addLineToFactory, nextLineName } from './lines';

/** The picker's value for "a new line…". Never a line's id. */
export const NEW_LINE = '__new_line__';

export interface LineChoice { value: string; newName: string; newType: string }

/** Is a line chosen — an existing one, or a new one with a name? */
export const lineChosen = (c: Pick<LineChoice, 'value' | 'newName'>): boolean => (c.value === NEW_LINE ? !!c.newName.trim() : !!c.value);

/** The existing line chosen, or none (a new line is not a line yet). */
export const existingLine = (value: string): string => (value === NEW_LINE ? '' : value);

/** The line to put the record on: the one chosen, or the one just made. A new line goes at the end of the floor,
 *  with the type typed, exactly as Your factory's Add lines makes it. */
export async function settleLine(c: LineChoice): Promise<string> {
  if (c.value !== NEW_LINE) return c.value;
  return (await addLineToFactory(c.newName.trim(), c.newType.trim() || undefined)).id;
}

/** What the picker says under itself when the factory has no line yet. */
export function noLineWords(belongs: string, canAdd: boolean): string {
  return canAdd
    ? `${belongs} belongs to a line — add yours here.`
    : `${belongs} belongs to a line, and this factory has none yet — the factory’s owner sets them up under Factory.`;
}

/** The name offered for the first new line: the next after the last, or "Line 1". */
export const guessLineName = (lines: readonly Workspace[]): string => nextLineName(lines);
