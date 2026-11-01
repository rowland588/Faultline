/* THE SOP'S ARITHMETIC — pure (knowledge/specs/FC-225-sop.md; knowledge/methods/people/twi-job-instruction.md).
 *
 *   a photo belongs to a step by the number its caption starts with — “3 — guide at 2 mm”, “Step 3: guide”, “3. guide” — the one
 *   mechanism the app has for a photo (a caption), so no new kind of storage is made for it;
 *   time           = the sum of the seconds given for the steps — a total only when every step has its seconds, never a guess for the rest;
 *   review overdue = whole days between the review date and today. */
import { andList } from './words';

/** The step number a caption starts with, or undefined. */
export function stepOfCaption(caption: string | undefined): number | undefined {
  const m = /^\s*(?:step\s*)?(\d{1,3})(?![\d.,]*\d)\s*(?:[-–—:.)]|\s|$)/i.exec(caption ?? '');
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 ? n : undefined;
}

/** [1,2,3,5,7] → "1 to 3, 5 and 7": runs of three or more joined by "to", the rest listed. */
export function numberRanges(nums: readonly number[]): string {
  const s = [...new Set(nums)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < s.length;) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    if (j - i >= 2) parts.push(`${s[i]} to ${s[j]}`);
    else for (let k = i; k <= j; k++) parts.push(String(s[k]));
    i = j + 1;
  }
  return andList(parts);
}

/** 350 → "5 min 50 s"; 45 → "45 s"; 3600 → "1 h". */
export function durationSaid(sec: number): string {
  const t = Math.round(sec);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : '', s || (!h && !m) ? `${s} s` : ''].filter(Boolean).join(' ');
}

export interface StepTimes { total: number; given: number; of: number; all: boolean }
export function stepTimes(secs: readonly (number | undefined)[]): StepTimes {
  const given = secs.filter((x): x is number => x !== undefined && x >= 0);
  return { total: given.reduce((a, b) => a + b, 0), given: given.length, of: secs.length, all: secs.length > 0 && given.length === secs.length };
}

/** Which of steps 1..n have a photo, which numbers name a step that is not there, and how many photos name no step at all. */
export function photoMatch(n: number, captions: readonly (string | undefined)[]): { have: number[]; without: number[]; beyond: number[]; unnumbered: number } {
  const have = new Set<number>(), beyond = new Set<number>();
  let unnumbered = 0;
  for (const c of captions) {
    const k = stepOfCaption(c);
    if (k === undefined) unnumbered++;
    else if (k > n) beyond.add(k);
    else have.add(k);
  }
  const all = Array.from({ length: n }, (_, i) => i + 1);
  return { have: all.filter(k => have.has(k)), without: all.filter(k => !have.has(k)), beyond: [...beyond].sort((a, b) => a - b), unnumbered };
}
