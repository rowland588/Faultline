/* THE ANALYTICAL BRAIN, slice B1 — its homework on a line's stops, before anyone asks (12 November, docs/LUNAR-BRAIN.md — Rowland:
 * "Lunar does its homework before the question is asked … explain the events that created the performance, not simply report the
 * performance itself … Never invent a root cause … distinguish the recorded explanation from the evidence-based explanation … recognise
 * when the evidence is insufficient").
 *
 * Pure: the line's stop records (Observation) in, findings out — each with what it rests on (the method, the stops, the period), how sure
 * it is, what it cannot say, and its money from the app's one cost model (lib/problemCost). No AI here and no figure from anywhere but
 * these records. Four questions, each run only when the records can bear it:
 *   where   — where the stop time went over the last 28 days (a Pareto by machine and reason; the vital few)
 *   changed — did the line stop more in the last 7 days than the 21 before (an exact conditional test of two Poisson rates)
 *   recurs  — the same reason on the same machine three or more times in 14 days (a pattern worth a cause, not a one-off)
 *   recorded— time booked to a description ("operator", "other", "unknown") rather than a cause, said as such
 * Days nobody timed look like days with no stops: every finding says so where it matters. */
import type { Observation, Workspace } from '../../types';
import { problemCost, type CostLine } from '../problemCost';
import type { Neck } from '../lineLoss';

export const ENGINE = 'brain-b2';   // b2 (12 November): findings kept as versioned claims in LUNAR's knowledge (docs/LUNAR-KNOWLEDGE.md)
const DAY = 86_400_000;

export type FindingKind = 'where' | 'changed' | 'recurs' | 'recorded';
/** How sure — measured (a count or a sum of what was timed), significant (a test says it is unlikely chance), suggestive (in the
 *  direction, but chance cannot be ruled out), thin (too few records to say). */
export type Sureness = 'measured' | 'significant' | 'suggestive' | 'thin';

export interface Finding {
  /** Stable for the same question on the same scope and window, so a re-run replaces it rather than adding another. */
  id: string;
  kind: FindingKind;
  lineId: string;
  machine?: string;
  reason?: string;
  period: { from: number; to: number };
  /** How it was worked out, in words a reader can check. */
  method: string;
  /** The stops it rests on. */
  n: number;
  figures: Record<string, number>;
  sure: Sureness;
  p?: number;
  /** What it does not say. */
  limits: string[];
  /** £ a day from the one cost model, with what is missing named; absent where no cost applies. */
  money?: { words: string; perDay?: number };
  /** The sentence, written by code — what Luna quotes. */
  says: string;
  engine: string;
}

export interface Homework { lineId: string; at: number; engine: string; inputs: string; findings: Finding[] }

const mins = (o: Observation) => Math.max(0, o.durationMs) / 60_000;
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number) => Math.round(x * 100);
const key = (...xs: (string | undefined)[]) => xs.map(x => (x ?? '').trim().toLowerCase().replace(/\s+/g, '-')).join(':');
const live = (o: Observation) => !o.deletedAt;

/** A fingerprint of what the homework read, so unchanged records are not worked again (idempotent). */
export function inputsOf(obs: readonly Observation[]): string {
  let h = 2166136261;
  for (const o of [...obs].filter(live).sort((a, b) => a.id.localeCompare(b.id))) {
    for (const c of `${o.id}|${o.updatedAt}|${o.durationMs}|${o.category}|${o.asset}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  }
  return (h >>> 0).toString(36);
}

/** Two-sided exact p for k successes of n at p0, by summing every outcome no more likely than the one seen. */
export function binomTwoSided(k: number, n: number, p0: number): number {
  if (n <= 0) return 1;
  const lg = (x: number) => { let s = 0; for (let i = 2; i <= x; i++) s += Math.log(i); return s; };
  const lp = (i: number) => lg(n) - lg(i) - lg(n - i) + (i ? i * Math.log(p0) : 0) + (n - i ? (n - i) * Math.log(1 - p0) : 0);
  const seen = lp(k);
  let p = 0;
  for (let i = 0; i <= n; i++) { const v = lp(i); if (v <= seen + 1e-9) p += Math.exp(v); }
  return Math.min(1, p);
}

/** Words that describe a stop rather than explain it. */
export const DESCRIPTION_NOT_CAUSE = /\b(operator( error| issue)?|other|unknown|misc(ellaneous)?|general|n\/?a|issue|problem|not known|no reason)\b/i;

export function homework(line: Pick<Workspace, 'id' | 'name'> & Partial<CostLine>, obsAll: readonly Observation[], now: number, neck?: Neck): Homework {
  const name = line.name;
  const obs = obsAll.filter(o => live(o) && o.workspaceId === line.id && o.durationMs > 0);
  const out: Finding[] = [];
  const base = { lineId: line.id, engine: ENGINE } as const;
  const cost = (minutesPerDay: number, machine?: string) => {
    const c = problemCost({ minutesPerDay }, machine, line, neck);
    return c ? { words: c.words, ...(c.labour !== undefined || c.contribution !== undefined ? { perDay: (c.labour ?? 0) + (c.contribution ?? 0) } : {}) } : undefined;
  };
  const timedNote = 'Counts only the stops someone timed — a day nobody timed looks like a day with no stops.';

  /* ---- where the time went, last 28 days */
  const from28 = now - 28 * DAY;
  const w28 = obs.filter(o => o.startedAt >= from28 && o.startedAt <= now);
  const total = w28.reduce((a, o) => a + mins(o), 0);
  if (w28.length > 0 && total > 0) {
    const by = new Map<string, { machine: string; reason: string; m: number; n: number }>();
    for (const o of w28) { const k = key(o.asset, o.category); const g = by.get(k) ?? { machine: o.asset || 'no machine named', reason: o.category || 'no reason', m: 0, n: 0 }; g.m += mins(o); g.n += o.count || 1; by.set(k, g); }
    const ranked = [...by.values()].sort((a, b) => b.m - a.m);
    const top = ranked[0];
    let cum = 0; const vital = ranked.filter(g => { const take = cum < total * 0.8; cum += g.m; return take; });
    const thin = w28.length < 10;
    out.push({
      ...base, id: key('where', line.id), kind: 'where', machine: top.machine, reason: top.reason, period: { from: from28, to: now },
      method: 'Pareto of the timed stop minutes by machine and reason, last 28 days; the vital few cover 80% of the minutes', n: w28.length,
      figures: { minutes: r1(total), stops: w28.length, topMinutes: r1(top.m), topShare: pct(top.m / total), vitalFew: vital.length, groups: ranked.length },
      sure: thin ? 'thin' : 'measured',
      limits: [timedNote, ...(thin ? [`Only ${w28.length} stop${w28.length === 1 ? '' : 's'} timed — too few to rank with confidence.`] : []), 'Where the time went is not why — the reason recorded is what was said at the time.'],
      money: cost(total / 28, top.machine),
      says: `Over the last 28 days ${r1(total)} min of stops were timed on ${name} in ${w28.length} stop${w28.length === 1 ? '' : 's'}; ${top.reason} on the ${top.machine} was ${pct(top.m / total)}% of it (${r1(top.m)} min in ${top.n})${vital.length > 1 ? `, and ${vital.length} machine-and-reason pairs carry 80% of the time` : ''}.${thin ? ' Too few stops to rank with confidence.' : ''}`,
    });
  }

  /* ---- did it change: last 7 days against the 21 before */
  const from7 = now - 7 * DAY;
  const c7 = obs.filter(o => o.startedAt >= from7 && o.startedAt <= now).length;
  const c21 = obs.filter(o => o.startedAt >= from28 && o.startedAt < from7).length;
  if (c7 + c21 >= 1) {
    const rate7 = c7 / 7, rate21 = c21 / 21;
    const n = c7 + c21;
    const p = binomTwoSided(c7, n, 7 / 28);
    const sure: Sureness = n < 5 ? 'thin' : p < 0.05 ? 'significant' : 'suggestive';
    const dir = rate7 > rate21 ? 'more' : rate7 < rate21 ? 'fewer' : 'the same';
    const m7 = obs.filter(o => o.startedAt >= from7 && o.startedAt <= now).reduce((a, o) => a + mins(o), 0) / 7;
    const m21 = obs.filter(o => o.startedAt >= from28 && o.startedAt < from7).reduce((a, o) => a + mins(o), 0) / 21;
    out.push({
      ...base, id: key('changed', line.id), kind: 'changed', period: { from: from28, to: now },
      method: 'Stops a day in the last 7 days against the 21 before, compared as two Poisson rates by the exact conditional (binomial) test', n,
      figures: { lastWeekPerDay: r1(rate7), beforePerDay: r1(rate21), lastWeekMinPerDay: r1(m7), beforeMinPerDay: r1(m21) }, p: Math.round(p * 1000) / 1000, sure,
      limits: [timedNote, ...(n < 5 ? ['Fewer than five stops in the four weeks — nothing can be said about a change.'] : []), 'A change in how much is timed reads exactly like a change in how much the line stops.'],
      ...(dir === 'more' && m7 > m21 ? { money: cost(m7 - m21) } : {}),
      says: n < 5 ? `Too few stops timed on ${name} in four weeks (${n}) to say whether it is stopping more or less.`
        : `${name} stopped ${r1(rate7)} times a day in the last 7 days against ${r1(rate21)} a day in the 21 before (${r1(m7)} against ${r1(m21)} min a day) — ${dir === 'the same' ? 'no change' : `${dir} stops`}; ${sure === 'significant' ? `unlikely to be chance (p = ${Math.round(p * 1000) / 1000})` : `not distinguishable from chance (p = ${Math.round(p * 1000) / 1000})`}.`,
    });
  }

  /* ---- recurring: the same reason on the same machine three or more times in 14 days */
  const from14 = now - 14 * DAY;
  const rec = new Map<string, Observation[]>();
  for (const o of obs.filter(x => x.startedAt >= from14 && x.startedAt <= now)) { const k = key(o.asset, o.category); rec.set(k, [...(rec.get(k) ?? []), o]); }
  for (const [k, os] of rec) {
    if (os.length < 3) continue;
    const m = os.reduce((a, o) => a + mins(o), 0);
    const o0 = os[0];
    const described = DESCRIPTION_NOT_CAUSE.test(o0.category);
    out.push({
      ...base, id: key('recurs', line.id, k), kind: 'recurs', machine: o0.asset, reason: o0.category, period: { from: from14, to: now },
      method: 'The same recorded reason on the same machine counted over 14 days; three or more is a pattern', n: os.length,
      figures: { stops: os.length, minutes: r1(m) }, sure: 'measured',
      limits: [described ? `“${o0.category}” describes the stop; it does not explain it.` : 'The reason is as recorded at the time — a recurring reason is a place to look for a cause, not the cause.'],
      money: cost(m / 14, o0.asset),
      says: `${o0.category} on the ${o0.asset} has come back ${os.length} times in 14 days (${r1(m)} min) — a recurring pattern worth a cause, not a one-off.`,
    });
  }

  /* ---- the recorded reason is a description, not a cause */
  if (w28.length > 0 && total > 0) {
    const desc = w28.filter(o => DESCRIPTION_NOT_CAUSE.test(o.category));
    const dm = desc.reduce((a, o) => a + mins(o), 0);
    if (desc.length >= 2 && dm / total >= 0.2) {
      const words = [...new Set(desc.map(o => o.category))].slice(0, 4);
      out.push({
        ...base, id: key('recorded', line.id), kind: 'recorded', period: { from: from28, to: now },
        method: 'The share of timed stop minutes booked to reasons that describe a stop rather than explain it', n: desc.length,
        figures: { minutes: r1(dm), share: pct(dm / total) }, sure: 'measured',
        limits: ['What lies behind these is not known from the records — training, the machine, the material, the method or the settings could each be it.'],
        says: `${pct(dm / total)}% of the stop time on ${name} in four weeks (${r1(dm)} min) is booked to ${words.map(w => `“${w}”`).join(', ')} — a description, not a cause; what lies behind it has not been found yet.`,
      });
    }
  }

  return { lineId: line.id, at: now, engine: ENGINE, inputs: inputsOf(obs), findings: out };
}
