/* HOW A TIME IS TYPED ON AN ELEMENT — the floor writes "90 s", "1:30" (a
 * stopwatch's way), "1.5 min" or a bare "5" (minutes). One reader for the
 * element sheet's time and its target; the unit words are the value stream's
 * own (parseDur), the clock form is added here. Seconds out, undefined when it
 * is not a time. */
import { parseDur } from '../valuestream/steps';

export function typedTime(text: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  const clock = /^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/.exec(t);
  if (clock) return clock[3] !== undefined ? +clock[1] * 3600 + +clock[2] * 60 + +clock[3] : +clock[1] * 60 + +clock[2];
  /* a whole answer or nothing: "4 min" yes, "4 min and some" no */
  if (!/^(?:about|around|roughly|~)?\s*\d+(?:[.,]\d+)?\s*[a-z]*$/i.test(t)) return undefined;
  return parseDur(t, 'min');
}
