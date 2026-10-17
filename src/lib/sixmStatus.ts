/* THE 6M STATUS — ONE PAGE, the one that gets sent (docs/SIMPLE.md: "Two,
 * from one button, the short one first"; flow audit #17: "Offer the status
 * page and the full report first"). A stage-gate job had its one page; a
 * running line's job had only the whole root cause story.
 *
 * Rowland, 7 October: "people want to know the current status of something,
 * the failures of why we're not where we should be, and then what we're
 * going to do about it next." So, for a 6M job, those three and nothing else:
 *
 *   WHERE WE ARE   where the lines are — the band's sentence and what is
 *                  under way — and each line against its target
 *   WHY NOT        only the abnormal: a line short of its target, a problem
 *                  slipped back, a check that keeps the gain missed or
 *                  coming due, the countermeasures past their day (counted
 *                  here, named once under What next)
 *   WHAT NEXT      each open problem in a line — its phase and its number —
 *                  then the countermeasures still open, late first, whose
 *                  and by when
 *
 * A list longer than the page takes says how many more there are and that
 * the full report has them: the one page never pretends to be whole. Read
 * off the full report's own model (lib/sixmReportPdf sixmReport), so the one
 * page and the full report cannot disagree. Pure: nothing stored, nothing
 * drawn. */
import type { SixMReport, Tone } from './sixmReportPdf';

export type SixMWhyKind = 'short' | 'slipped' | 'missed' | 'due' | 'late';

export interface SixMStatus {
  name: string;
  scope?: string;
  lead?: string;
  printed: string;
  manyLines: boolean;
  /** The band: where the lines are, then the problems and the board. */
  sentence: string;
  slip: string;
  /** Each line against its target, in the full report's own sentence. */
  lines: { line: string; says: string; short?: string }[];
  gapNone?: string;
  /** Only the abnormal — a tag in its colour, what, and its cause or who. */
  why: { kind: SixMWhyKind; tag: string; what: string; detail?: string }[];
  whyMore: number;
  /** The open problems: finding the cause, acting on it, checking it worked. */
  problems: { title: string; phase: string; tone: Tone; number?: string }[];
  problemsMore: number;
  /** The countermeasures still open, late first. */
  next: { what: string; who: string; when: string; late: boolean }[];
  nextMore: number;
}

/** How long each list may run before it says "and N more" — stepped down,
 *  a row at a time, until the page is one page (drawSixMStatus). */
export const SIXM_STATUS_STEPS: { why: number; problems: number; next: number }[] = [
  /* why we are not where we should be gives way last: it is the page's point */
  { why: 7, problems: 6, next: 8 }, { why: 6, problems: 5, next: 6 }, { why: 6, problems: 4, next: 5 },
  { why: 5, problems: 3, next: 4 }, { why: 4, problems: 3, next: 3 }, { why: 3, problems: 2, next: 3 },
  /* the tiles under the band (the lean page, 17 October) took room a busy
     job's long countermeasures needed: the lists give way further, never
     the page's one-page promise */
  { why: 3, problems: 2, next: 2 }, { why: 3, problems: 1, next: 1 }, { why: 2, problems: 1, next: 1 },
];

const WORKED = new Set(['finding', 'acting', 'proving']);
/** Being worked: open, and finding the cause, acting on it or checking it worked. */
const isOpen = (p: SixMReport['problems'][number]) => !p.closed && WORKED.has(p.phase);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const TONE_RANK: Record<Tone, number> = { failed: 0, late: 1, waiting: 2, going: 3, ahead: 4, done: 5 };

export function sixmStatus(r: SixMReport, limits = SIXM_STATUS_STEPS[0]): SixMStatus {
  const rows = r.board.flatMap(b => b.rows);
  const open = rows.filter(x => x.tone !== 'done').sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
  const late = open.filter(x => x.tone === 'late');
  const owners = [...new Set(late.map(x => x.owner.trim() || 'no one named'))];
  const why: SixMStatus['why'] = [
    /* a line short of its target, and what is being done about it: its open
       problems (a problem's meta leads with its line's name) */
    ...r.gaps.filter(g => !!g.short).map(g => {
      const on = r.problems.filter(p => isOpen(p) && (p.meta === g.line || p.meta.startsWith(`${g.line} · `))).map(p => `“${p.title}” — ${p.phaseWord.toLowerCase()}`);
      return { kind: 'short' as const, tag: 'SHORT', what: `${g.line} — ${g.short}`, detail: on.length ? `Being worked: ${on.slice(0, 2).join('; ')}${on.length > 2 ? ` and ${on.length - 2} more` : ''}` : 'No problem open on it yet' };
    }),
    ...r.problems.filter(p => p.phase === 'slipped').map(p => ({ kind: 'slipped' as const, tag: 'SLIPPED BACK', what: p.title, detail: p.worked.says })),
    ...r.problems.flatMap(p => (p.hold && p.phase !== 'slipped' && p.hold.tone === 'late'
      ? [{ kind: 'missed' as const, tag: 'CHECK MISSED', what: `${p.hold.what} — keeps the gain on “${p.title}”`, detail: [p.hold.who, p.hold.due].filter(Boolean).join(' · ') }] : [])),
    ...(late.length ? [{ kind: 'late' as const, tag: 'LATE', what: `${plural(late.length, 'countermeasure')} past ${late.length === 1 ? 'its' : 'their'} day`,
      detail: `Owed by ${owners.slice(0, 4).join(', ')}${owners.length > 4 ? ` and ${owners.length - 4} more` : ''} — under What next` }] : []),
    ...r.problems.flatMap(p => (p.hold && p.phase !== 'slipped' && p.hold.tone === 'waiting'
      ? [{ kind: 'due' as const, tag: 'CHECK DUE', what: `${p.hold.what} — keeps the gain on “${p.title}”`, detail: [p.hold.who, p.hold.due].filter(Boolean).join(' · ') }] : [])),
  ];
  const problems = r.problems.filter(isOpen).map(p => ({ title: p.title, phase: p.phaseWord, tone: p.tone, ...(p.number ? { number: p.number } : {}) }));
  const next = open.map(x => ({ what: x.what, who: x.owner.trim() || 'No one named', when: x.when, late: x.tone === 'late' }));
  return {
    name: r.name, ...(r.scope ? { scope: r.scope } : {}), ...(r.lead ? { lead: r.lead } : {}), printed: r.printed, manyLines: r.manyLines,
    sentence: r.sentence, slip: r.slip,
    lines: r.gaps.map(g => ({ line: g.line, says: g.says, ...(g.short ? { short: g.short } : {}) })),
    ...(r.gapNone ? { gapNone: r.gapNone } : {}),
    why: why.slice(0, limits.why), whyMore: Math.max(0, why.length - limits.why),
    problems: problems.slice(0, limits.problems), problemsMore: Math.max(0, problems.length - limits.problems),
    next: next.slice(0, limits.next), nextMore: Math.max(0, next.length - limits.next),
  };
}
