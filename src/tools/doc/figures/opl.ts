/* THE ONE-POINT LESSON'S ARITHMETIC — pure (knowledge/specs/FC-224-one-point-lesson.md; knowledge/methods/people/one-point-lesson.md).
 *
 *   coverage = people taught ÷ people who should know, overall and by shift (a blank shift is “Everyone”);
 *   a lesson below full coverage a week after it was written is the team leader’s action (the record). */
export interface Person { name: string; shift: string; taught: boolean }

export interface ShiftCover { shift: string; taught: number; total: number }
export interface Cover { taught: number; total: number; rate: number | undefined; shifts: ShiftCover[] }

export function coverOf(people: readonly Person[]): Cover {
  const by = new Map<string, ShiftCover>();
  for (const p of people) {
    const k = p.shift.trim() || 'Everyone';
    const s = by.get(k) ?? { shift: k, taught: 0, total: 0 };
    s.total++; if (p.taught) s.taught++;
    by.set(k, s);
  }
  const taught = people.filter(p => p.taught).length;
  return { taught, total: people.length, rate: people.length ? taught / people.length : undefined, shifts: [...by.values()] };
}

export const KIND_WORD: Record<string, string> = { basic: 'basic knowledge', trouble: 'trouble case', improvement: 'improvement case' };
