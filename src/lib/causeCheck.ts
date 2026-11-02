/* CHOOSING WHAT TO VERIFY — pure (knowledge/specs/FC-148-why-tree.md, part A).
 *
 * After the fishbone the team picks the few causes worth checking, checks them, and only then drills the ones that
 * hold: brainstorm for breadth, select the most likely, verify with data or by going to see, then the whys (ASQ,
 * Ishikawa 1982; Ohno/Liker's go and see). A vote is a priority, not proof. The rating is the team's own judgement in
 * three plain words each — shown as such — and is NEVER multiplied into a score: the list is ordered by the two words.
 *
 * Nothing here touches the database or React. No AI, no number invented. */
import { dayWords } from './kaizenEvent';
import { KNOWN_WORD, sixmLabel, type Cause, type Explains, type Likely } from './sixm';
import type { PaceTodoRow } from '../db/rows';

export const LIKELY_LEVELS: { key: Likely; label: string }[] = [
  { key: 'unlikely', label: 'Unlikely' }, { key: 'possible', label: 'Possible' }, { key: 'likely', label: 'Likely' },
];
export const EXPLAINS_LEVELS: { key: Explains; label: string }[] = [
  { key: 'little', label: 'A little' }, { key: 'some', label: 'Some' }, { key: 'most', label: 'Most' },
];
const LIKELY_RANK: Record<Likely, number> = { likely: 0, possible: 1, unlikely: 2 };
const EXPLAINS_RANK: Record<Explains, number> = { most: 0, some: 1, little: 2 };

export const likelyWord = (l: Likely) => LIKELY_LEVELS.find(x => x.key === l)?.label ?? l;
export const explainsWord = (e: Explains) => EXPLAINS_LEVELS.find(x => x.key === e)?.label ?? e;

const hasWhys = (c: Pick<Cause, 'whys'>) => (c.whys ?? []).some(w => (w.text ?? '').trim());
const written = (c: Cause) => !!(c.check?.what?.trim() || c.check?.who?.trim() || c.check?.by);

/** Order for the "What to check" step: causes still suspected first — rated before unrated, most likely first, then
 *  the share of the problem, then the order they were added — then those confirmed, then those ruled out. */
export function orderForCheck(causes: Cause[]): Cause[] {
  const group = (c: Cause) => (c.status === 'suspected' ? 0 : c.status === 'confirmed' ? 1 : 2);
  return causes
    .map((c, i) => ({ c, i }))
    .sort((a, b) => group(a.c) - group(b.c)
      || (a.c.likely ? LIKELY_RANK[a.c.likely] : 3) - (b.c.likely ? LIKELY_RANK[b.c.likely] : 3)
      || (a.c.explains ? EXPLAINS_RANK[a.c.explains] : 3) - (b.c.explains ? EXPLAINS_RANK[b.c.explains] : 3)
      || (a.c.at ?? 0) - (b.c.at ?? 0) || a.i - b.i)
    .map(x => x.c);
}

export type CheckKey = 'not-rated' | 'rated' | 'to-check' | 'checking' | 'confirmed' | 'ruled-out' | 'drilled-first';
export interface CheckState { key: CheckKey; word: string; tone: 'r' | 'n'; late: boolean }

/** Where a cause stands: in words, red only for a check whose day has gone. */
export function checkStateOf(c: Cause, today: string): CheckState {
  if (c.status === 'ruled_out') return { key: 'ruled-out', word: 'Ruled out', tone: 'n', late: false };
  if (c.status === 'confirmed') return { key: 'confirmed', word: `Confirmed (${(KNOWN_WORD[c.grade] ?? c.grade).toLowerCase()})`, tone: 'n', late: false };
  if (hasWhys(c)) return { key: 'drilled-first', word: 'Drilled before it was checked', tone: 'n', late: false };
  if (c.tick) {
    if (!written(c)) return { key: 'to-check', word: 'To check — no check written', tone: 'n', late: false };
    const by = c.check?.by;
    if (by && by < today) return { key: 'checking', word: `Checking — past its day (${dayWords(by)})`, tone: 'r', late: true };
    return { key: 'checking', word: by ? `Checking (by ${dayWords(by, true)})` : 'Checking', tone: 'n', late: false };
  }
  if (c.likely || c.explains) return { key: 'rated', word: [c.likely ? likelyWord(c.likely) : '', c.explains ? explainsWord(c.explains) : ''].filter(Boolean).join(' · '), tone: 'n', late: false };
  return { key: 'not-rated', word: 'Not rated', tone: 'n', late: false };
}

/** May the whys be asked? Only on a confirmed cause — and a cause that already has whys is never locked. */
export function canAskWhy(c: Cause): boolean {
  if (c.status === 'confirmed') return true;
  return c.status === 'suspected' && hasWhys(c);
}

/** The sentence when the whys are not open yet, so the closed button says why. */
export function whyClosedSays(c: Cause): string {
  if (c.status === 'ruled_out') return 'Ruled out — there is nothing to drill.';
  return c.tick
    ? 'The whys open once the check shows it is real — then mark it confirmed.'
    : 'Check it first: tick it on What to check, say how you will check it, and confirm it. The whys open on a confirmed cause.';
}

/** The sentence at the top of What to check. */
export function stepSays(causes: Cause[], today: string): string {
  const n = causes.length;
  if (!n) return '';
  const ticked = causes.filter(c => c.tick).length;
  const confirmed = causes.filter(c => c.status === 'confirmed').length;
  const ruled = causes.filter(c => c.status === 'ruled_out').length;
  const checking = causes.filter(c => c.tick && c.status === 'suspected');
  const rated = causes.some(c => c.likely || c.explains);
  if (!ticked && !rated && !confirmed && !ruled) return `Nothing rated yet — say how likely each of the ${n} is, then tick the few worth checking.`;
  const bits: string[] = [];
  if (confirmed) bits.push(`${confirmed} confirmed`);
  if (ruled) bits.push(`${ruled} ruled out`);
  if (checking.length) {
    const days = checking.map(c => c.check?.by).filter((d): d is string => !!d).sort();
    const late = days.filter(d => d < today).length;
    const due = days.length ? ` (${late ? `${late} past its day` : days.length === 1 || checking.length === 1 ? `due ${dayWords(days[0], true)}` : `first due ${dayWords(days[0], true)}`})` : '';
    bits.push(`${checking.length} checking${due}`);
  }
  return `${ticked} of ${n} cause${n === 1 ? '' : 's'} ticked to check${bits.length ? ` — ${bits.join(', ')}` : ''}.`;
}

/** What the team rated, checked and found for one cause, in words — the paper's and the card's line. Empty when nothing was. */
export function checkWords(c: Cause): string {
  const said = [c.likely ? likelyWord(c.likely) : '', c.explains ? explainsWord(c.explains) : ''].filter(Boolean);
  const k = c.check ?? {};
  const bits: string[] = [];
  if (said.length) bits.push(`Rated ${said.join(' · ').toLowerCase()} (the team’s judgement)`);
  if (c.tick) bits.push(`ticked to check${k.what?.trim() ? `: ${k.what.trim()}` : ''}${k.who?.trim() ? ` — ${k.who.trim()}` : ''}${k.by ? `, by ${dayWords(k.by)}` : ''}`);
  if (c.found?.trim()) bits.push(`the check found: ${c.found.trim()}`);
  const out = bits.join('; ');
  return out ? `${out.charAt(0).toUpperCase()}${out.slice(1)}.` : '';
}

/** A row a cause for the paper's “causes thought of and checked” table — only when something was rated, ticked or found. */
export function checkRows(causes: Cause[], today: string): { cause: string; bone: string; rating: string; check: string; found: string; state: string }[] {
  return orderForCheck(causes).filter(c => c.likely || c.explains || c.tick || c.found?.trim()).map(c => {
    const k = c.check ?? {};
    return {
      cause: c.text, bone: sixmLabel(c.m),
      rating: [c.likely ? likelyWord(c.likely) : '', c.explains ? explainsWord(c.explains) : ''].filter(Boolean).join(' · ') || 'Not rated',
      check: c.tick ? [k.what?.trim(), k.who?.trim(), k.by ? `by ${dayWords(k.by)}` : ''].filter(Boolean).join(' — ') || 'No check written' : 'Not ticked',
      found: c.found?.trim() || (c.status === 'suspected' ? '—' : 'Nothing written'),
      state: checkStateOf(c, today).word,
    };
  });
}

/** The check as an action on the board: a check is an action — who, by when — never a separate list. It points at no
 *  cause (a cause's own fixes are its countermeasures); the cause keeps the action's id. */
export function checkActionRow(c: Cause, o: { id: string; problemTitle: string; projectId: string; lineId?: string; now: number; existing?: PaceTodoRow }): PaceTodoRow {
  const what = (c.check?.what ?? '').trim();
  return {
    ...(o.existing ?? {}),
    id: o.id, projectId: o.projectId, ...(o.lineId ? { lineId: o.lineId } : {}),
    what: `Check: ${what || c.text}`, where: o.problemTitle, why: `Is “${c.text}” real? The whys open once it is confirmed.`,
    who: (c.check?.who ?? '').trim(), when: c.check?.by ? dayWords(c.check.by) : '', ...(c.check?.by ? { due: c.check.by } : {}),
    state: o.existing?.state ?? 'todo', pillar: c.m, createdAt: o.existing?.createdAt ?? o.now, updatedAt: o.now,
  } as PaceTodoRow;
}
