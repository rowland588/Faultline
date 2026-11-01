/* KANO — pure (knowledge/specs/FC-141-kano.md; knowledge/methods/sixsigma/voc-ctq.md).
 *
 * Each person is asked every requirement twice — how they would feel if it were there (the functional question) and if it were not
 * (the dysfunctional one) — on five answers. The pair is looked up in the PUBLISHED Kano evaluation table (Kano, Seraku, Takahashi & Tsuji
 * 1984; the 5 × 5 table as Berger et al. 1993 and later guides print it — checked against several guides' descriptions, the papers
 * themselves not read: knowledge/GAPS.md). The table is not Faultline's: nothing here changes a cell.
 *
 *   A attractive · O one-dimensional (performance) · M must-be · I indifferent · R reverse · Q questionable
 *
 * A requirement's class is the most frequent of A, O, M and I among the people asked; R and Q are counted and shown, never classed; a tie
 * is a tie (said, not broken — the order some guides break ties in is secondhand and not used). The better and worse coefficients are
 * the published ones: better = (A + O) ÷ (A + O + M + I), worse = −(O + M) ÷ (A + O + M + I). */

export type Answer = 'like' | 'expect' | 'neutral' | 'livewith' | 'dislike';
export type KanoClass = 'A' | 'O' | 'M' | 'I' | 'R' | 'Q';
export type Mode = 'M' | 'O' | 'A' | 'I';

/** The five answers, as the questions are usually worded. */
export const ANSWERS: { value: Answer; label: string }[] = [
  { value: 'like', label: 'I like it that way' },
  { value: 'expect', label: 'It must be that way' },
  { value: 'neutral', label: 'I am neutral' },
  { value: 'livewith', label: 'I can live with it that way' },
  { value: 'dislike', label: 'I dislike it that way' },
];
const ORDER: Answer[] = ['like', 'expect', 'neutral', 'livewith', 'dislike'];

/** The evaluation table: rows the functional answer, columns the dysfunctional, both in ORDER. */
export const KANO_TABLE: Record<Answer, KanoClass[]> = {
  like: ['Q', 'A', 'A', 'A', 'O'],
  expect: ['R', 'I', 'I', 'I', 'M'],
  neutral: ['R', 'I', 'I', 'I', 'M'],
  livewith: ['R', 'I', 'I', 'I', 'M'],
  dislike: ['R', 'R', 'R', 'R', 'Q'],
};

export const CLASS_WORD: Record<KanoClass, string> = { A: 'attractive', O: 'performance', M: 'must-be', I: 'indifferent', R: 'reverse', Q: 'questionable' };

export const classOf = (functional: Answer, dysfunctional: Answer): KanoClass => KANO_TABLE[functional][ORDER.indexOf(dysfunctional)];

export type Tally = Record<KanoClass, number>;
export const emptyTally = (): Tally => ({ A: 0, O: 0, M: 0, I: 0, R: 0, Q: 0 });

export function tallyOf(pairs: readonly { f: Answer; d: Answer }[], hand?: Partial<Tally>): Tally {
  const t = emptyTally();
  for (const p of pairs) t[classOf(p.f, p.d)]++;
  if (hand) for (const k of Object.keys(t) as KanoClass[]) t[k] += Math.max(0, Math.round(hand[k] ?? 0));
  return t;
}

export const totalOf = (t: Tally): number => t.A + t.O + t.M + t.I + t.R + t.Q;

/** The class — the strictly most frequent of M, O, A, I — or the tied ones, or none when nobody gave a classable answer. */
export function classify(t: Tally): { cls?: Mode; tied: Mode[] } {
  const modes: Mode[] = ['M', 'O', 'A', 'I'];
  const top = Math.max(...modes.map(k => t[k]));
  if (top === 0) return { tied: [] };
  const lead = modes.filter(k => t[k] === top);
  return lead.length === 1 ? { cls: lead[0], tied: [] } : { tied: lead };
}

/** Better and worse — undefined when no answer was classable (nothing to divide). */
export function coefficients(t: Tally): { better: number; worse: number } | undefined {
  const den = t.A + t.O + t.M + t.I;
  return den > 0 ? { better: (t.A + t.O) / den, worse: -(t.O + t.M) / den } : undefined;
}
