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
  /** The problem it is, when it is one — the Reports screen opens it. */
  id?: string;
}
export interface StatusNext {
  /** The fix — the Reports screen opens it. */
  id?: string;
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
  /** "12 programs · 5 passed · 3 at baseline · 2 failed · 2 to do" — the
   *  programs in one line, under where we are (lib/programsReport); a failed
   *  one is also a DIDN'T PASS line. */
  programs?: string;
  /** THE PROGRAMS' STORY, not only their count. Rowland, 9 October: "we have
   *  numbers but not the story." The ones that need reading — failed, late,
   *  still to do, at baseline — each with its word and what was seen. */
  programLines: { what: string; word: string; tone: string; note?: string }[];
  programMore: number;
  /** The lead's commentary, under where we are (Project.reportNote). */
  commentary?: ClientReport['commentary'];
}

/** What one page holds — enough to be the answer, few enough to be read.
 *  On a very busy job the drawing steps down these until the page is one
 *  (lib/clientReportPdf drawStatusReport); "and N more" says the rest. */
export type StatusLimits = { why: number; next: number; runs: number; waiting: number;
  /** The programs' one line; dropped only on the last step, when nothing else
   *  is left to shorten — Set up's tile still says how many have passed. */
  programs?: boolean;
  /** How many programs are told, under their one line. */
  progLines?: number };
/* The runs are a line per PRODUCT (a performance run is many products), so
   the page holds more of them than it held runs. */
export const STATUS_LIMITS: StatusLimits = { why: 6, next: 6, runs: 6, waiting: 3, progLines: 5 };
/* THE ORDER THE PAGE GIVES WAY IN: the runs and "waiting on" shorten first
   (the full report has every one), the programs' story last — Rowland, 9
   October: "we have numbers but not the story." */
export const STATUS_STEPS: StatusLimits[] = [
  STATUS_LIMITS,
  { why: 5, next: 5, runs: 4, waiting: 2, progLines: 4 },
  { why: 4, next: 4, runs: 3, waiting: 1, progLines: 4 },
  { why: 4, next: 4, runs: 2, waiting: 1, progLines: 3 },
  { why: 3, next: 3, runs: 1, waiting: 1, progLines: 3 },
  { why: 3, next: 3, runs: 1, waiting: 0, progLines: 2 },
  { why: 2, next: 3, runs: 1, waiting: 0, progLines: 2 },
  { why: 2, next: 2, runs: 1, waiting: 0, progLines: 1 },
  { why: 2, next: 2, runs: 0, waiting: 0, progLines: 1 },
  { why: 2, next: 2, runs: 0, waiting: 0, progLines: 0 },
  { why: 2, next: 2, runs: 0, waiting: 0, programs: false, progLines: 0 },
];

/** How much of the lead's commentary the one page holds. */
export const COMMENTARY_MAX = 520;

export function statusReport(r: ClientReport, L: StatusLimits = STATUS_LIMITS): StatusReport {
  const why: StatusWhy[] = [
    ...r.critical.open.map((c): StatusWhy => ({
      kind: 'critical', tag: 'CRITICAL', what: c.what, id: c.id,
      detail: [c.impact, c.state.replace(/^open · /, 'Now: ')].filter(Boolean).join(' — '),
    })),
    ...r.risks.open.map((c): StatusWhy => ({
      kind: 'risk', tag: 'HIGH RISK', what: c.what, id: c.id,
      detail: [c.could, c.impact].filter(Boolean).join(' — ') || undefined,
    })),
    ...r.sections.flatMap(s => s.late.map((l): StatusWhy => (s.gate === 'commission'
      ? { kind: 'failed', tag: 'DIDN’T PASS', what: l }
      : { kind: 'late', tag: 'LATE', what: l }))),
    /* A part said to have failed — a program that did not pass, and what
       was seen (lib/clientReport GateSection.failed). */
    ...r.sections.flatMap(s => (s.failed ?? []).map((l): StatusWhy => ({ kind: 'failed', tag: 'DIDN’T PASS', what: l }))),
    ...r.sections.flatMap(s => s.problems.map((l): StatusWhy => ({ kind: 'problem', tag: 'PROBLEM', what: l }))),
  ];
  /* Late first, then soonest due — the order somebody acts in. */
  const fixes = [...r.fixes.open].sort((a, b) => Number(b.tone === 'late') - Number(a.tone === 'late'));
  const next: StatusNext[] = fixes.map(f => ({
    id: f.id,
    what: [f.machine ? `${f.title} — ${f.machine}` : f.title, f.who].filter(Boolean).join(' · '),
    ...(f.who ? { who: f.who } : {}),
    when: f.when, late: f.tone === 'late',
  }));
  const waiting = r.waiting.filter(w => w.open > 0).map(w =>
    `${w.what} — ${w.open} open${w.late ? `, ${w.late} late` : ''}${w.lateWhose ?? w.whose ? ` · ${w.lateWhose ?? w.whose}` : ''}`);
  /* A product per line; one run again further down is history, and only the
     later row is sent. What fell short leads, then what is still to run. */
  const rank = (x: RunRow) => (x.tone === 'failed' ? 0 : x.tone === 'late' ? 1 : x.tone === 'done' ? 3 : 2);
  const runs = (r.sections.find(s => s.gate === 'commission')?.runs ?? []).filter(x => !x.rerun)
    .map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map(({ x }) => x);
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
    ...((p => (p && L.programs !== false ? { programs: p.says } : {}))(r.sections.find(s => s.gate === 'setup')?.programs)),
    ...(() => {
      /* The programs worth reading: late first, then to do, then at baseline
         — each with what was seen. A failed one is already a DIDN'T PASS
         line above, with its words; a passed one is in the count. */
      const pr = r.sections.find(s => s.gate === 'setup')?.programs;
      const rank: Record<string, number> = { late: 0, open: 1, baseline: 2 };
      const told = (pr?.lines ?? []).filter(l => l.bucket in rank)
        .map((l, i) => ({ l, i })).sort((a, b) => rank[a.l.bucket] - rank[b.l.bucket] || a.i - b.i).map(({ l }) => l);
      const n = L.programs === false ? 0 : (L.progLines ?? 0);
      return {
        programLines: told.slice(0, n).map(l => ({ what: `${l.machine} — ${l.what}`, word: l.word, tone: l.tone, ...(l.note ? { note: l.note } : {}) })),
        programMore: L.programs === false ? 0 : Math.max(0, told.length - n),
      };
    })(),
    /* THE COMMENTARY, on the one page: whole up to a paragraph; a longer one
       is cut at a word and says the rest is in the full report — the page
       is never a cut-down that pretends to be whole. */
    ...(r.commentary ? { commentary: { ...r.commentary, text: r.commentary.text.length <= COMMENTARY_MAX ? r.commentary.text
      : `${r.commentary.text.slice(0, COMMENTARY_MAX).replace(/\s+\S*$/, '')}… (the rest in the full report)` } } : {}),
  };
}
