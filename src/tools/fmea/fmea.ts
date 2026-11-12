/* THE PROCESS FMEA — what can go wrong, how badly, how often, how well caught (FC-132; knowledge/specs/FC-132-fmea.md; knowledge/methods/quality/fmea.md).
 *
 * A register of failure modes, a card each: the step, the failure mode, its effect, its cause, the controls now in place (prevention and detection),
 * three ratings — severity of the effect, occurrence of the cause, detection by the current control, each 1 to 10 against anchors written for food
 * manufacturing — and an ACTION PRIORITY, High · Medium · Low, read from them. The AIAG-VDA handbook's action-priority table is the handbook's and is
 * NOT reproduced here (it is licensed and could not be read — knowledge/GAPS.md); what is public about it is its principle (severity weighs most,
 * then occurrence, then detection; three levels; High means act or write down why the controls are enough), and this is Faultline's OWN rule built on
 * that principle, shown to the person in full, and overridable row by row by a team that holds the handbook. It is a lookup, never S × O × D: the
 * product (the RPN) hides a severity 10 behind a low number and is not computed, shown or ranked by. Pure; the page and the paper read this module. */
import type { FmeaData, ScoredRow } from '../../lib/study';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredRanked, ScoredResult, ScoredTable } from '../scored/types';
import { niceDay } from '../../lib/weeks';

export type Ap = 'H' | 'M' | 'L';
export const AP_WORD: Record<Ap, string> = { H: 'High', M: 'Medium', L: 'Low' };
export const AP_MEANS: Record<Ap, string> = {
  H: 'needs an action, or a written reason why the controls now in place are enough',
  M: 'should have an action',
  L: 'may have one',
};

/* ------------------------------------------- the anchors (Faultline's own words) ------------------------------------------- */
export const SEVERITY: Record<number, string> = {
  10: 'a consumer could be harmed, or the law broken (an undeclared allergen, a foreign body)',
  9: 'a consumer could be harmed, or a customer’s or regulator’s requirement broken, but it is found before it leaves',
  8: 'the product is unusable — scrapped or rejected by the customer — or the line is stopped for the shift',
  7: 'the product works but its main function is poor (a leaker, a wrong weight) — the customer will complain',
  6: 'a fault the customer would notice and some would return',
  5: 'a fault most customers would put up with',
  4: 'a small fault some customers would notice',
  3: 'slight — only a trained eye sees it; reworked on the line',
  2: 'trivial — no effect on the product, a small delay',
  1: 'no effect',
};
export const OCCURRENCE: Record<number, string> = {
  10: 'more often than 1 in 10 — every shift, with nothing to prevent it',
  9: 'about 1 in 20', 8: 'about 1 in 50', 7: 'about 1 in 100', 6: 'about 1 in 500', 5: 'about 1 in 2,000', 4: 'about 1 in 10,000', 3: 'about 1 in 100,000', 2: 'about 1 in 1,000,000',
  1: 'prevented — the cause cannot happen (error-proofed), or has never been seen',
};
export const DETECTION: Record<number, string> = {
  10: 'nothing checks for it — the customer finds it',
  9: 'an occasional look that would hardly find it',
  8: 'a person looks after the process; easy to miss',
  7: 'a person looks at the machine; relies on attention',
  6: 'a sample is tested after the run',
  5: 'a sample is tested during the run',
  4: 'every item is checked by a person with a gauge',
  3: 'an automatic check raises an alarm — a person must react',
  2: 'an automatic check stops the line or rejects the item',
  1: 'the failure cannot pass — error-proofed',
};

/* ------------------------------------------- the rule ------------------------------------------- */
export type SeverityBand = 'critical' | 'major' | 'moderate' | 'minor';
export type Strength = 'weak' | 'moderate' | 'strong';
/** How bad the effect is: 9–10 critical, 7–8 major, 4–6 moderate, 1–3 minor. */
export const severityBand = (s: number): SeverityBand => (s >= 9 ? 'critical' : s >= 7 ? 'major' : s >= 4 ? 'moderate' : 'minor');
/** How well the failure is held back, from how often the cause happens (O) and how well the control would catch it (D). A cause at 8 or more is weak whatever the detection:
 *  catching what should have been prevented is not a control; otherwise the lookup below (occurrence the rows, detection the columns). */
export function controlStrength(o: number, d: number): Strength {
  if (o >= 8) return 'weak';
  const row = o <= 3 ? 0 : o <= 6 ? 1 : 2, col = d <= 3 ? 0 : d <= 6 ? 1 : 2;
  return STRENGTH[row][col];
}
export const STRENGTH: Strength[][] = [['strong', 'strong', 'moderate'], ['strong', 'moderate', 'weak'], ['moderate', 'weak', 'weak']];
/** Severity first, then the strength of the controls. A critical effect is never Low: with strong controls it is Medium — documented, not forgotten. */
export const PRIORITY: Record<SeverityBand, Record<Strength, Ap>> = {
  critical: { weak: 'H', moderate: 'H', strong: 'M' },
  major: { weak: 'H', moderate: 'M', strong: 'L' },
  moderate: { weak: 'M', moderate: 'L', strong: 'L' },
  minor: { weak: 'L', moderate: 'L', strong: 'L' },
};
export const actionPriority = (s: number, o: number, d: number): Ap => PRIORITY[severityBand(s)][controlStrength(o, d)];
const BAND_WORD: Record<SeverityBand, string> = { critical: 'a critical effect (severity 9–10)', major: 'a major effect (7–8)', moderate: 'a moderate effect (4–6)', minor: 'a minor effect (1–3)' };
const STRENGTH_WORD: Record<Strength, string> = { weak: 'weak controls', moderate: 'middling controls', strong: 'strong controls' };
/** "a major effect (7–8) with weak controls → High" */
export const priorityWhy = (s: number, o: number, d: number): string => `${BAND_WORD[severityBand(s)]} with ${STRENGTH_WORD[controlStrength(o, d)]} (occurrence ${o}, detection ${d}) → ${AP_WORD[actionPriority(s, o, d)]}`;

/** The rule, in words, for the page and the paper. */
export const RULE_LINES: string[] = [
  'Step 1 — how bad the effect is: severity 9–10 critical · 7–8 major · 4–6 moderate · 1–3 minor.',
  'Step 2 — how well the failure is held back, from occurrence (how often the cause happens) and detection (how well the control would catch it): an occurrence of 8 or more is weak whatever the detection; below that, occurrence 1–3 with detection 1–6 is strong, with detection 7–10 middling; occurrence 4–6 is strong with detection 1–3, middling with 4–6, weak with 7–10; occurrence 7 is middling with detection 1–3, weak with 4–10.',
  'Step 3 — critical: weak or middling controls High, strong Medium · major: weak High, middling Medium, strong Low · moderate: weak Medium, otherwise Low · minor: always Low.',
  'This is LUNAR’s own rule, built on what is public about the AIAG-VDA action priority (severity weighs most, then occurrence, then detection; three levels). It is not the handbook’s table, which is not reproduced; a team that holds the handbook can set a row’s priority by hand from it. The product of the three ratings (the older RPN) is not used.',
];

/* ------------------------------------------- reading the rows ------------------------------------------- */
const rating = (v: number | undefined): v is number => v !== undefined && Number.isInteger(v) && v >= 1 && v <= 10;
export interface FmeaRead {
  id: string; no: number; mode: string; f: FmeaData; rated: boolean; ap?: Ap; /** the rule's own, before a hand-set priority */ rule?: Ap; byHand: boolean; why?: string;
  /** a High or Medium with an action or a reason, an action late, an action done and re-rated */
  hasAction: boolean; hasReason: boolean; late: boolean; done: boolean; afterAp?: Ap; afterRated: boolean; open: boolean;
}
export function readRow(row: ScoredRow, no: number, today: string): FmeaRead {
  const f = row.fmea ?? {}, mode = row.name.trim();
  const rated = !!mode && rating(f.s) && rating(f.o) && rating(f.d);
  const rule = rated ? actionPriority(f.s as number, f.o as number, f.d as number) : undefined;
  const byHand = rated && (f.ap === 'H' || f.ap === 'M' || f.ap === 'L');
  const ap = rated ? (byHand ? f.ap : rule) : undefined;
  const hasAction = !!f.action?.trim(), done = !!f.done;
  const aS = rating(f.after?.s) ? f.after?.s : f.s, aO = f.after?.o, aD = f.after?.d;
  const afterRated = done && rating(aS) && rating(aO) && rating(aD);
  const afterAp = afterRated ? actionPriority(aS as number, aO as number, aD as number) : undefined;
  return {
    id: row.id, no, mode, f, rated, ...(ap ? { ap } : {}), ...(rule ? { rule } : {}), byHand, ...(rated ? { why: priorityWhy(f.s as number, f.o as number, f.d as number) } : {}),
    hasAction, hasReason: !!f.reason?.trim(), late: hasAction && !done && !!f.due && f.due < today, done, ...(afterAp ? { afterAp } : {}), afterRated, open: hasAction && !done,
  };
}
const ORDER: Record<Ap, number> = { H: 0, M: 1, L: 2 };
/** The rated rows by priority, then severity, occurrence, detection (never their product), then the order typed. */
export function rankRows(reads: FmeaRead[]): FmeaRead[] {
  return reads.filter(r => r.rated).sort((a, b) => ORDER[a.ap as Ap] - ORDER[b.ap as Ap] || (b.f.s as number) - (a.f.s as number) || (b.f.o as number) - (a.f.o as number) || (b.f.d as number) - (a.f.d as number) || a.no - b.no);
}
/** Does this High or Medium row still need something written — an action, or why the controls are enough? */
export const needsAction = (r: FmeaRead): boolean => (r.ap === 'H' || r.ap === 'M') && !r.hasAction && !r.hasReason;

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const gbp = (v: number): string => `£${v.toLocaleString('en-GB', { maximumFractionDigits: v < 100 ? 2 : 0 })}`;

export interface FmeaOut { result: ScoredResult; table: ScoredTable; ranked: ScoredRanked[]; reads: FmeaRead[] }
export function fmeaAnalyse(a: { rows: ScoredRow[]; today: string }): { problems: string[] } | FmeaOut {
  const reads = a.rows.map((r, i) => readRow(r, i + 1, a.today)), ranked = rankRows(reads), unrated = reads.filter(r => !r.rated && (r.mode || Object.keys(r.f).length));
  if (!ranked.length) return { problems: ['Rate at least one failure mode — name it, then its severity, occurrence and detection, each 1 to 10.'] };
  const n = { H: ranked.filter(r => r.ap === 'H').length, M: ranked.filter(r => r.ap === 'M').length, L: ranked.filter(r => r.ap === 'L').length };
  const need = ranked.filter(needsAction), late = ranked.filter(r => r.late), hand = ranked.filter(r => r.byHand), haccp = ranked.filter(r => r.f.haccp);
  const sev8 = ranked.filter(r => (r.f.s as number) >= 8);
  const verdict = n.H ? `${n.H} High` : n.M ? `${n.M} Medium` : 'All Low';
  const tone: LeanTone = late.length ? 'r' : n.H && need.some(r => r.ap === 'H') ? 'a' : n.H ? 'n' : 'g';
  const top = ranked.filter(r => r.ap === 'H').slice(0, 3).map(r => `${r.mode} (S ${r.f.s} · O ${r.f.o} · D ${r.f.d})${r.hasAction ? `: ${r.f.action?.trim()}${r.f.owner ? `, ${r.f.owner}` : ''}${r.f.due ? ` by ${niceDay(r.f.due)}` : ''}` : r.hasReason ? ' — controls accepted, reason written' : ' — no action yet'}`);
  const sentence = `${plural(ranked.length, 'failure mode')} rated: ${n.H} High, ${n.M} Medium, ${n.L} Low${unrated.length ? `; ${unrated.length} not rated yet` : ''}.${top.length ? ` High first: ${top.join('; ')}${n.H > top.length ? `; and ${n.H - top.length} more` : ''}.` : ' No failure mode is High.'}${need.length ? ` ${plural(need.length, 'High or Medium mode')} still ${need.length === 1 ? 'has' : 'have'} neither an action nor a written reason.` : ''}${late.length ? ` ${plural(late.length, 'action')} ${late.length === 1 ? 'is' : 'are'} late.` : ''}`;
  const tiles: LeanTile[] = [
    { k: 'Failure modes', v: String(ranked.length), ...(unrated.length ? { of: `${unrated.length} not rated` } : {}) },
    { k: 'High', v: String(n.H), ...(n.H ? { tone: 'a' as LeanTone } : {}) }, { k: 'Medium', v: String(n.M) }, { k: 'Low', v: String(n.L) },
    { k: 'Need an action', v: String(need.length), of: late.length ? `${late.length} late` : 'High and Medium with none', ...(need.length ? { tone: 'a' as LeanTone } : {}) },
  ];
  const priced = ranked.filter(r => r.ap === 'H' && r.f.cost !== undefined && r.f.cost > 0), unpriced = ranked.filter(r => r.ap === 'H' && !(r.f.cost !== undefined && r.f.cost > 0));
  const money: string[] = [];
  if (priced.length) money.push(`Where a cost is known, one occurrence costs: ${priced.map(r => `${r.mode} ${gbp(r.f.cost as number)}`).join('; ')} — said beside the priority, never used to rank it.`);
  if (unpriced.length) money.push(`Give what one occurrence costs on ${unpriced.length === 1 ? 'the High mode' : `each High mode (${unpriced.length} without)`} — the pack lost, the rework, the complaint — to see it in money beside its priority. Nothing waits on it.`);
  const closing = `${verdict} — ${plural(ranked.length, 'failure mode')} rated${need.length ? `, ${need.length} still to act on` : ''}${late.length ? `, ${late.length} late` : ''}.`;
  const caveats = [
    'The priority is LUNAR’s own rule (severity first, then how often the cause happens, then whether it would be caught) — not the AIAG-VDA handbook’s table, which is not reproduced here.' + (hand.length ? ` ${plural(hand.length, 'row')} ${hand.length === 1 ? 'was' : 'were'} set by hand from the handbook, marked “from the handbook”.` : ''),
    'A rating is a judgement made with the scale in front of the team: argue the anchor, not the number. An FMEA written by one person at a desk lists what that person knows — the operator’s failure modes are the ones that happen.',
    'A severity of 9–10 is never Low: with strong controls it is Medium — the control is written down, not forgotten. The product of the three ratings (the RPN) is not used and no threshold is read from it.',
    ...(haccp.length ? [`${plural(haccp.length, 'row')} ${haccp.length === 1 ? 'is' : 'are'} ticked as a food-safety hazard: those belong in the HACCP plan with its legal standing — this register points to it, it does not replace it.`] : ['Food-safety hazards belong in the HACCP plan with its legal standing; tick a row that is one and it is marked as such.']),
    ...(sev8.length ? [`${plural(sev8.length, 'mode')} rated 8 or more for severity ${sev8.length === 1 ? 'belongs' : 'belong'} on the control plan whatever the priority.`] : []),
  ];
  const result: ScoredResult = { verdict, tone, sentence, tiles, closing, caveats, ...(money.length ? { money } : {}), also: { title: 'How the priority is decided', lines: RULE_LINES } };
  const rankedOut: ScoredRanked[] = ranked.map((r, i) => ({ id: r.id, name: r.mode, score: i + 1, class: r.ap as Ap }));
  const table: ScoredTable = {
    head: ['#', 'Step · failure mode', 'Effect · cause', 'Controls now', 'S', 'O', 'D', 'Priority', 'Action · who · by when'],
    rows: ranked.map((r, i) => [String(i + 1), [r.f.step?.trim(), r.mode].filter(Boolean).join(' · '), [r.f.effect?.trim(), r.f.cause?.trim() ? `cause: ${r.f.cause.trim()}` : ''].filter(Boolean).join(' — ') || '—',
      [r.f.prevention?.trim() ? `prevent: ${r.f.prevention.trim()}` : '', r.f.detection?.trim() ? `detect: ${r.f.detection.trim()}` : ''].filter(Boolean).join('; ') || '—',
      String(r.f.s), String(r.f.o), String(r.f.d), `${AP_WORD[r.ap as Ap]}${r.byHand ? ' (handbook)' : ''}${r.f.haccp ? ' · HACCP' : ''}`,
      r.hasAction ? `${r.f.action?.trim()}${r.f.owner ? ` — ${r.f.owner}` : ''}${r.f.due ? ` — by ${niceDay(r.f.due)}` : ''}${r.done ? ` — done ${niceDay(r.f.done)}${r.afterAp ? `, now ${AP_WORD[r.afterAp]}` : ''}` : r.late ? ' — LATE' : ''}` : r.hasReason ? `no action — ${r.f.reason?.trim()}` : (r.ap === 'L' ? '—' : 'none yet')]),
    foot: [], shares: [0.04, 0.16, 0.2, 0.2, 0.035, 0.035, 0.035, 0.085, 0.21], columnIds: [],
  };
  return { result, table, ranked: rankedOut, reads };
}

/** A fresh register: one blank card. */
export const fmeaStart = (uid: () => string): ScoredRow[] => [{ id: uid(), name: '', fmea: {} }];
