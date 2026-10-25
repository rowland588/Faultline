/* A SCORED CHECKLIST (knowledge/specs/FC-236-check-logs.md; 5S and audits, FC-013 and FC-177).
 *
 * The same questions each time, each answered on one scale; the score is the share of the maximum, by heading and
 * overall (knowledge/methods/lean/five-s.md: "S score = Σ ÷ (questions × max); area score = Σ all ÷ (all questions
 * × max)"). A question answered "not applicable" is left out of both sides. The value is the trend and the weakest
 * heading, not the number: a fall two audits running is the signal, and a finding that comes back is a repeat.
 *
 * Pure. The answers are kept as they were asked (LogAnswer), so editing the list later never re-scores an old audit. */
import type { LogAnswer, LogCheck, LogResult } from '../../lib/study';
import type { ScoreFigures, ScoreRule, ScoreScale } from './def';

/** The shared rule: the share of the maximum, overall and by heading. */
export const shareOfMax: ScoreRule = (answers, scale, findingBelow) => {
  const max = Math.max(...scale.levels.map(l => l.v));
  const by = new Map<string, { points: number; max: number }>();
  let points = 0, top = 0, answered = 0;
  const findings: string[] = [];
  for (const a of answers) {
    if (a.level === null || !Number.isFinite(a.level)) continue;
    answered++; points += a.level; top += max;
    const g = a.group ?? '';
    const cur = by.get(g) ?? { points: 0, max: 0 };
    cur.points += a.level; cur.max += max; by.set(g, cur);
    if (a.level < findingBelow) findings.push(a.id);
  }
  return {
    points, max: top, answered, of: answers.length, findings,
    ...(top > 0 ? { pct: (points / top) * 100 } : {}),
    groups: [...by.entries()].filter(([g]) => g !== '').map(([name, v]) => ({ name, points: v.points, max: v.max, pct: (v.points / v.max) * 100 })),
  };
};

/** The figures of one result of a scored check. */
export function scoreOf(r: Pick<LogResult, 'answers'>, scale: ScoreScale, rule: ScoreRule = shareOfMax, findingBelow = scale.findingBelow): ScoreFigures | undefined {
  if (!r.answers?.length) return undefined;
  return rule(r.answers.map(a => ({ id: a.id, ...(a.group ? { group: a.group } : {}), level: a.level })), scale, findingBelow);
}

/** The level below which this check calls an answer a finding. */
export const findingBelowOf = (c: Pick<LogCheck, 'findingBelow'>, scale: ScoreScale): number => c.findingBelow ?? scale.findingBelow;

/** Fell this audit against the one before, counted back from the newest: 81, 78, 75, 72, 65 is four falls. */
export function fallsInARow(pcts: readonly number[]): number {
  let n = 0;
  for (let i = pcts.length - 1; i > 0 && pcts[i] < pcts[i - 1]; i--) n++;
  return n;
}

/** Two falls running is the signal (the record: "a fall two audits running is the signal"). */
export const FALLING_FROM = 2;

/** The weakest heading of the newest audit; ties go to the first. */
export function weakest(f: Pick<ScoreFigures, 'groups'>): { name: string; pct: number } | undefined {
  let w: { name: string; pct: number } | undefined;
  for (const g of f.groups) if (!w || g.pct < w.pct) w = { name: g.name, pct: g.pct };
  return w;
}

/** The findings that came back: below the line in this audit and in the audit before it (the same question). */
export function repeatsOf(now: readonly LogAnswer[], before: readonly LogAnswer[] | undefined, scale: ScoreScale, findingBelow = scale.findingBelow): string[] {
  if (!before) return [];
  const was = new Set(before.filter(a => a.level !== null && a.level < findingBelow).map(a => a.id));
  return now.filter(a => a.level !== null && a.level < findingBelow && was.has(a.id)).map(a => a.id);
}

/** The answers a fresh audit starts from: every question, none answered yet. */
export const blankAnswers = (c: Pick<LogCheck, 'items'>): LogAnswer[] =>
  (c.items ?? []).map(i => ({ id: i.id, name: i.name, ...(i.group ? { group: i.group } : {}), level: null }));
