/* THE STATUS REPORT — one page, the one that gets sent (docs/SIMPLE.md).
 *
 * Rowland, 7 October: "the reports are so detailed ... I can't send that
 * report out. It's too massive ... people want to know the current status of
 * something, the failures of why we're not where we should be, and then what
 * we're going to do about it next."
 *
 * So it answers those three, in that order, and nothing else:
 *
 *   WHERE WE ARE    the verdict (lib/onTarget) and a line per gate
 *   WHY NOT         only the abnormal — critical, high risk, late, didn't
 *                   pass, a problem — each with its cause or cost
 *   WHAT NEXT       the open fixes, late first, whose and by when; and what
 *                   we wait on from whom
 *
 * plus, on a job in Commission, the performance runs — the numbers it is
 * accepted on. A list longer than the page takes says how many more there are
 * and that the full report has them: the one page is never a cut-down that
 * pretends to be whole.
 *
 * Read off the client report's own reading (lib/clientReport), so the one
 * page and the full report cannot disagree. Pure: nothing stored, nothing
 * drawn. */
import type { ClientReport, RunRow } from './clientReport';

export type WhyKind = 'critical' | 'risk' | 'late' | 'failed' | 'problem';
export interface StatusWhy {
  kind: WhyKind;
  /** The tag in words — "CRITICAL", "HIGH RISK", "LATE", "DIDN'T PASS", "PROBLEM". */
  tag: string;
  what: string;
  /** Why it matters or what it cost — "6 h lost", "could cost 100 h (an
   *  estimate)", what it means for the business; and for a critical, what
   *  is being done about it. */
  detail?: string;
}
export interface StatusNext {
  what: string;
  who?: string;
  /** "due Fri 9 Oct" · "was due Mon 5 Oct" — the fix's own words. */
  when: string;
  late: boolean;
}
export interface StatusReport {
  name: string;
  lead?: string;
  printed: string;
  dates?: string;
  verdict: ClientReport['onTarget'];
  gates: ClientReport['gates'];
  why: StatusWhy[];
  /** How many more "why" lines the full report has. */
  whyMore: number;
  next: StatusNext[];
  nextMore: number;
  /** "Fixes — 7 open, 2 late, Ilapak UK's" — what we wait on, a line each. */
  waiting: string[];
  runs: RunRow[];
  runsMore: number;
}

/** What one page holds — enough to be the answer, few enough to be read.
 *  On a very busy job the drawing steps down these until the page is one
 *  (lib/clientReportPdf drawStatusReport); "and N more" says the rest. */
export type StatusLimits = { why: number; next: number; runs: number; waiting: number };
export const STATUS_LIMITS: StatusLimits = { why: 6, next: 6, runs: 4, waiting: 3 };
export const STATUS_STEPS: StatusLimits[] = [
  STATUS_LIMITS,
  { why: 5, next: 5, runs: 3, waiting: 2 },
  { why: 4, next: 4, runs: 2, waiting: 1 },
  { why: 3, next: 3, runs: 1, waiting: 1 },
];

export function statusReport(r: ClientReport, L: StatusLimits = STATUS_LIMITS): StatusReport {
  const why: StatusWhy[] = [
    ...r.critical.open.map((c): StatusWhy => ({
      kind: 'critical', tag: 'CRITICAL', what: c.what,
      detail: [c.impact, c.state.replace(/^open · /, 'Now: ')].filter(Boolean).join(' — '),
    })),
    ...r.risks.open.map((c): StatusWhy => ({
      kind: 'risk', tag: 'HIGH RISK', what: c.what,
      detail: [c.could, c.impact].filter(Boolean).join(' — ') || undefined,
    })),
    ...r.sections.flatMap(s => s.late.map((l): StatusWhy => (s.gate === 'commission'
      ? { kind: 'failed', tag: 'DIDN’T PASS', what: l }
      : { kind: 'late', tag: 'LATE', what: l }))),
    ...r.sections.flatMap(s => s.problems.map((l): StatusWhy => ({ kind: 'problem', tag: 'PROBLEM', what: l }))),
  ];
  /* Late first, then soonest due — the order somebody acts in. */
  const fixes = [...r.fixes.open].sort((a, b) => Number(b.tone === 'late') - Number(a.tone === 'late'));
  const next: StatusNext[] = fixes.map(f => ({
    what: [f.machine ? `${f.title} — ${f.machine}` : f.title, f.who].filter(Boolean).join(' · '),
    ...(f.who ? { who: f.who } : {}),
    when: f.when, late: f.tone === 'late',
  }));
  const waiting = r.waiting.filter(w => w.open > 0).map(w =>
    `${w.what} — ${w.open} open${w.late ? `, ${w.late} late` : ''}${w.lateWhose ?? w.whose ? ` · ${w.lateWhose ?? w.whose}` : ''}`);
  const runs = r.sections.find(s => s.gate === 'commission')?.runs ?? [];
  return {
    name: r.name, ...(r.lead ? { lead: r.lead } : {}), printed: r.printed, ...(r.dates ? { dates: r.dates } : {}),
    /* The verdict and the handover only: the counts and names the full
       verdict goes on to list are the "why" lines under it — said once. */
    verdict: { ...r.onTarget, reason: r.onTarget.reason.split(' · ')[0] },
    gates: r.gates,
    why: why.slice(0, L.why), whyMore: Math.max(0, why.length - L.why),
    next: next.slice(0, L.next), nextMore: Math.max(0, next.length - L.next),
    waiting: waiting.slice(0, L.waiting),
    runs: runs.slice(0, L.runs), runsMore: Math.max(0, runs.length - L.runs),
  };
}
