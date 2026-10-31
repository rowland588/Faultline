/* PUGH MATRIX — choosing between solutions (FC-143; sixsigma.selection-matrices; knowledge/specs/FC-143-pugh-matrix.md).
 *
 * Pugh (1991, Total Design): the datum scores 0 on every criterion; each option is marked + (better), S (same) or − (worse)
 * than the datum, criterion by criterion; the marks are counted and, where the criteria are weighted, summed as weight × mark.
 * Pure arithmetic and the words that say it — the page, the paper and the tests read this module and nothing else.
 * Independent cases: scripts/knowledge/cases-pugh.py (a second implementation), held by __tests__/pugh.test.ts.
 *
 * It ranks options against ONE datum by the team's judgement. It is not a measurement, and it says so. */
import type { LeanTile, LeanTone } from '../../lib/lean';

export type PughMark = -1 | 0 | 1;

export interface PughCriterionIn { id: string; name: string; weight?: number }
export interface PughOptionIn { id: string; name: string; scores?: Record<string, number | undefined>; cost?: number }
export interface PughIn { datum?: string; criteria: PughCriterionIn[]; options: PughOptionIn[] }

export const DATUM_DEFAULT = 'Present state';
export const WEIGHT_MIN = 1;
export const WEIGHT_MAX = 5;

export interface PughCriterion { id: string; name: string; weight: number }
export interface PughOption {
  id: string; name: string; marks: PughMark[];
  plus: number; minus: number; same: number;
  /** pluses less minuses */
  net: number;
  /** Σ weight × mark */
  score: number;
  /** 1 + the options scoring strictly more — a tie shares a rank. */
  rank: number;
  beatsDatum: boolean;
  cost?: number;
}
export interface PughFlip { criterion: string; step: 1 | -1; leaders: string[] }
export interface PughBeaten { criterion: string; options: string[] }

export interface PughResult {
  datum: string;
  criteria: PughCriterion[];
  /** In the order they are ranked. */
  ranked: PughOption[];
  /** In the order they were typed (the matrix's columns). */
  inOrder: PughOption[];
  /** Named options left out because a named criterion is not marked, with what is missing. */
  left: { id: string; name: string; missing: string[] }[];
  leaders: string[];
  weighted: boolean;
  /** The leader less the next distinct score; undefined with one option or when every option ties. */
  margin?: number;
  /** Criteria where another option is better than the first-ranked one. */
  beaten: PughBeaten[];
  /** One weight a step either way that changes who leads. */
  flips: PughFlip[];
  anyCost: boolean;
}

export interface PughSummary {
  verdict: string;
  tone: LeanTone;
  sentence: string;
  tiles: LeanTile[];
  closing: string;
  caveats: string[];
  also?: { title: string; lines: string[] };
}

export interface PughTable {
  head: string[];
  rows: string[][];
  foot: string[][];
  /** Column shares of the width, for the paper. */
  shares: number[];
  /** The option of each column after the datum, by id. */
  columnIds: string[];
}

const markOf = (n: number | undefined): PughMark | undefined => (n === 1 || n === 0 || n === -1 ? n : undefined);
const isWeight = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= WEIGHT_MIN && n <= WEIGHT_MAX;
const cleanCost = (n: number | undefined): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined);

/** "+11", "0", "−1" — the real minus, and the sign always. */
export const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
export const markWord = (m: PughMark): string => (m > 0 ? '+' : m < 0 ? '−' : 'S');
const money = (n: number): string => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
const list = (names: string[]): string => (names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

const leadersOf = (scores: { name: string; score: number }[]): string[] => {
  const top = Math.max(...scores.map(s => s.score));
  return scores.filter(s => s.score === top).map(s => s.name);
};

export function pugh(input: PughIn): { ok: PughResult } | { problems: string[] } {
  const datum = input.datum?.trim() || DATUM_DEFAULT;
  const named = input.criteria.filter(c => c.name.trim());
  const problems: string[] = [];
  for (const c of named) {
    if (c.weight !== undefined && !isWeight(c.weight)) problems.push(`“${c.name.trim()}” needs a weight that is a whole number from ${WEIGHT_MIN} to ${WEIGHT_MAX}.`);
  }
  if (!named.length) problems.push('Add at least one criterion — what matters in the choice.');
  const namedOptions = input.options.filter(o => o.name.trim());
  if (!namedOptions.length) problems.push('Add at least one option to set against the datum.');
  if (problems.length) return { problems };

  const criteria: PughCriterion[] = named.map(c => ({ id: c.id, name: c.name.trim(), weight: c.weight ?? WEIGHT_MIN }));
  const left: PughResult['left'] = [];
  const done: PughOption[] = [];
  for (const o of namedOptions) {
    const marks = criteria.map(c => markOf(o.scores?.[c.id]));
    const missing = criteria.filter((_, j) => marks[j] === undefined).map(c => c.name);
    if (missing.length) { left.push({ id: o.id, name: o.name.trim(), missing }); continue; }
    const m = marks as PughMark[];
    const plus = m.filter(x => x > 0).length;
    const minus = m.filter(x => x < 0).length;
    const score = m.reduce<number>((s, x, j) => s + criteria[j].weight * x, 0);
    done.push({ id: o.id, name: o.name.trim(), marks: m, plus, minus, same: m.length - plus - minus, net: plus - minus, score, rank: 0, beatsDatum: score > 0, cost: cleanCost(o.cost) });
  }
  if (!done.length) {
    return { problems: left.map(l => `“${l.name}” isn’t marked on ${list(l.missing)}.`).concat('Mark at least one option on every criterion to rank it.') };
  }
  for (const o of done) o.rank = 1 + done.filter(x => x.score > o.score).length;
  const ranked = [...done].sort((a, b) => b.score - a.score || b.plus - a.plus || a.minus - b.minus || done.indexOf(a) - done.indexOf(b));
  const leaders = leadersOf(done);
  const distinct = [...new Set(done.map(o => o.score))].sort((a, b) => b - a);
  const margin = distinct.length > 1 ? distinct[0] - distinct[1] : undefined;
  const first = ranked[0];

  const beaten: PughBeaten[] = [];
  criteria.forEach((c, j) => {
    const better = done.filter(o => o.marks[j] > first.marks[j]).map(o => o.name);
    if (better.length) beaten.push({ criterion: c.name, options: better });
  });

  const flips: PughFlip[] = [];
  const baseKey = [...leaders].sort().join('|');
  criteria.forEach((c, j) => {
    for (const step of [1, -1] as const) {
      const w = c.weight + step;
      if (w < WEIGHT_MIN || w > WEIGHT_MAX) continue;
      const ws = criteria.map((x, k) => (k === j ? w : x.weight));
      const now = leadersOf(done.map(o => ({ name: o.name, score: o.marks.reduce<number>((s, x, k) => s + ws[k] * x, 0) })));
      if ([...now].sort().join('|') !== baseKey) flips.push({ criterion: c.name, step, leaders: now });
    }
  });

  return {
    ok: {
      datum, criteria, ranked,
      inOrder: done,
      left, leaders,
      weighted: criteria.some(c => c.weight !== WEIGHT_MIN),
      margin, beaten, flips,
      anyCost: done.some(o => o.cost !== undefined),
    },
  };
}

const stepWord = (f: PughFlip): string => `${f.criterion} ${f.step > 0 ? 'counted a step more' : 'counted a step less'}`;

export function summarizePugh(r: PughResult): PughSummary {
  const first = r.ranked[0];
  const beat = r.ranked.filter(o => o.beatsDatum);
  const tie = r.leaders.length > 1;
  const none = first.score <= 0;
  const thin = !tie && !none && r.flips.length > 0;
  const next = r.ranked.find(o => o.score < first.score);

  const verdict = none ? 'None beats the datum' : tie ? (r.leaders.length === 2 ? `${r.leaders[0]} and ${r.leaders[1]} tie` : `${r.leaders.length} options tie`) : `${first.name} leads`;
  const tone: LeanTone = none || tie || thin ? 'a' : 'n';

  const where = r.weighted ? 'weighted ' : '';
  const sentence = none
    ? `No option beats ${r.datum}: the best, ${list(r.leaders)}, scores ${signed(first.score)}.`
    : tie
      ? `${list(r.leaders)} tie for the lead at ${signed(first.score)} against ${r.datum}.`
      : `${first.name} leads: better than ${r.datum} on ${first.plus} ${first.plus === 1 ? 'criterion' : 'criteria'}, worse on ${first.minus === 0 ? 'none' : first.minus} — ${where}${signed(first.score)}.${next ? ` ${next.name} follows at ${signed(next.score)}.` : ''}`;

  const firstFlip = r.flips[0];
  const tiles: LeanTile[] = [
    { k: 'Leads', v: tie ? list(r.leaders) : first.name, of: `${r.weighted ? 'weighted ' : ''}${signed(first.score)} against ${r.datum}`, tone: none ? 'a' : 'n' },
    { k: 'Beat the datum', v: `${beat.length} of ${r.ranked.length}`, of: r.ranked.length === 1 ? 'option' : 'options', tone: beat.length ? 'n' : 'a' },
    { k: 'Margin', v: r.margin === undefined ? (r.ranked.length === 1 ? '—' : 'tied') : signed(r.margin), of: r.margin === undefined ? (r.ranked.length === 1 ? 'one option only' : 'all on the same score') : next ? `over ${next.name}` : undefined, tone: tie ? 'a' : 'n' },
    { k: 'If a weight moves a step', v: r.flips.length ? 'Changes' : 'Holds', of: firstFlip ? `${stepWord(firstFlip)}: ${list(firstFlip.leaders)} lead${firstFlip.leaders.length === 1 ? 's' : ''}` : 'no single weight changes the lead', tone: r.flips.length ? 'a' : 'n' },
  ];
  if (!tie && first.cost !== undefined) tiles.push({ k: 'Leader’s cost', v: money(first.cost), of: 'typed — beside the score, not in it', tone: 'n' });

  const closing = none
    ? `Keep ${r.datum} for now or find a stronger option — none scored better than it.`
    : tie
      ? `Don’t choose yet: ${list(r.leaders)} tie. Look at what separates them on the criteria that matter most, or fold the stronger marks of each into one option and score again.`
      : thin
        ? `The lead is thin: ${stepWord(firstFlip)} and ${list(firstFlip.leaders)} lead${firstFlip.leaders.length === 1 ? 's' : ''}. Agree the weights again before choosing.`
        : `Take ${first.name} forward as the countermeasure to try — the matrix orders the choice; a trial on the number proves it.`;

  const caveats = [
    `It ranks the options against one datum, ${r.datum}; it is not a measurement. Change the datum and the order can change.`,
    'A mark says better, same or worse than the datum — not by how much. The score is a way into the discussion, not the answer.',
    'Criteria and weights should be agreed before the options are scored, and then left alone; weights chosen to pick a favourite defeat it.',
  ];
  if (r.anyCost) caveats.push('The costs typed sit beside the score and are not weighed in it; a capital choice is decided by its payback (FC-191, not built), not by this matrix.');
  if (r.left.length) caveats.push(`Left out until marked on every criterion: ${r.left.map(l => `${l.name} (not marked on ${list(l.missing)})`).join('; ')}.`);

  const lines: string[] = [];
  if (!none) {
    for (const b of r.beaten) lines.push(`On ${b.criterion}: ${list(b.options)} scored better than ${first.name} — worth taking into it.`);
  }
  for (const f of r.flips.slice(0, 4)) lines.push(`If ${stepWord(f)}, ${list(f.leaders)} would lead.`);
  return { verdict, tone, sentence, tiles, closing, caveats, also: lines.length ? { title: 'Before you choose', lines } : undefined };
}

/** The matrix as a table for the page's foot and the paper: criteria down, the datum then every named option across in the order typed. */
export function pughTable(input: PughIn, r: PughResult): PughTable {
  const opts = input.options.filter(o => o.name.trim());
  const by = new Map(r.inOrder.map(o => [o.id, o]));
  const cols = opts.map(o => by.get(o.id));
  const dash = '—';
  const head = ['Criterion', 'Weight', `Datum: ${r.datum}`, ...opts.map(o => o.name.trim())];
  const rows = r.criteria.map(c => [c.name, String(c.weight), 'S', ...opts.map(o => {
    const m = markOf(o.scores?.[c.id]);
    return m === undefined ? dash : markWord(m);
  })]);
  const foot: string[][] = [
    ['Better (+)', '', '', ...cols.map(c => (c ? String(c.plus) : dash))],
    ['Worse (−)', '', '', ...cols.map(c => (c ? String(c.minus) : dash))],
    ['Same (S)', '', '', ...cols.map(c => (c ? String(c.same) : dash))],
    [r.weighted ? 'Weighted score' : 'Score', '', '0', ...cols.map(c => (c ? signed(c.score) : dash))],
    ['Rank', '', '', ...cols.map(c => (c ? `${c.rank}${r.leaders.includes(c.name) && c.rank === 1 ? ' — leads' : ''}` : 'not ranked'))],
  ];
  if (r.anyCost) foot.push(['Cost typed', '', '', ...opts.map(o => { const c = cleanCost(o.cost); return c === undefined ? dash : money(c); })]);
  const nOpt = Math.max(opts.length, 1);
  const rest = 1 - 0.24 - 0.08 - 0.1;
  return { head, rows, foot, shares: [0.24, 0.08, 0.1, ...opts.map(() => rest / nOpt)], columnIds: opts.map(o => o.id) };
}
