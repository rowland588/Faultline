/* THE KATA STORYBOARD — what the learner's board says, once (docs/METHODS.md §16; knowledge/methods/lean/toyota-kata.md).
 * Rother's storyboard: the challenge, the current condition, the target condition, the obstacles (a parking lot, one at a time),
 * and an experiments record — step, expected, actual, learned, date — of as many rows as the learning takes; and the coach's five
 * questions asked of it daily. Read from the method's answers (lib/methodSheet) by the screen (project/method/shapes/kata) and
 * the paper (lib/report/kataPaper) so the two cannot part. Row 1 keeps the plain field ids (`step`, `prediction`…); row n > 1
 * keeps `step@n` — the answer's scope `method:kata:step@n`. Pure; no AI; a missing answer is named, never invented. */

export const ROW_FIELDS = ['step', 'prediction', 'result', 'learning', 'ran'] as const;
export type RowField = typeof ROW_FIELDS[number];
export const ROW_LABELS: Record<RowField, string> = { step: 'Step', prediction: 'What we expect', result: 'What happened', learning: 'What we learned', ran: 'Day taken' };

/** The answer's field id for row n (1-based). */
export const rowKey = (n: number, f: RowField): string => (n <= 1 ? f : `${f}@${n}`);

export interface KataRow { n: number; step: string; prediction: string; result: string; learning: string; ran: string }

const val = (a: Readonly<Record<string, string>>, k: string) => (a[k] ?? '').trim();

/** How many rows the table holds: the highest row with any answer, and at least one. */
export function rowCount(a: Readonly<Record<string, string>>): number {
  let max = 1;
  for (const k of Object.keys(a)) {
    const m = /^(step|prediction|result|learning|ran)@(\d+)$/.exec(k);
    if (m && val(a, k)) max = Math.max(max, Number(m[2]));
  }
  return max;
}
export function rowsOf(a: Readonly<Record<string, string>>, shown = rowCount(a)): KataRow[] {
  const out: KataRow[] = [];
  for (let n = 1; n <= Math.max(shown, 1); n++) out.push({ n, step: val(a, rowKey(n, 'step')), prediction: val(a, rowKey(n, 'prediction')), result: val(a, rowKey(n, 'result')), learning: val(a, rowKey(n, 'learning')), ran: val(a, rowKey(n, 'ran')) });
  return out;
}
const touched = (r: KataRow) => !!(r.step || r.prediction || r.result || r.learning);
/** A step taken and its result written. */
const done = (r: KataRow) => !!r.step && !!r.result;

/** The routine's pulse in words: experiments run, the open one, and the days since the last step (the routine has stopped at three). */
export function pulse(a: Readonly<Record<string, string>>, todayISO: string): { run: number; open: number; sinceDays?: number; says: string; stopped: boolean } {
  const rows = rowsOf(a).filter(touched);
  const run = rows.filter(done).length;
  const open = rows.filter(r => r.step && !r.result).length;
  const days = rows.map(r => r.ran).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const last = days[days.length - 1];
  const sinceDays = last ? Math.round((Date.parse(todayISO) - Date.parse(last)) / 86_400_000) : undefined;
  const stopped = sinceDays !== undefined && sinceDays >= 3;
  const parts = [`${run} experiment${run === 1 ? '' : 's'} run`, open ? `${open} open (a step with no result yet)` : 'none open'];
  if (sinceDays !== undefined) parts.push(sinceDays <= 0 ? 'last step taken today' : `last step ${sinceDays} day${sinceDays === 1 ? '' : 's'} ago`);
  else if (rows.length) parts.push('no day written for the steps');
  return { run, open, ...(sinceDays !== undefined ? { sinceDays } : {}), says: parts.join(' · ') + (stopped ? ' — no step for three days or more: the routine has stopped.' : '.'), stopped };
}

/** The row the coach's fourth question is about: the first step still open, else the last written. */
export function currentRow(a: Readonly<Record<string, string>>): KataRow | undefined {
  const rows = rowsOf(a).filter(touched);
  return rows.find(r => r.step && !r.result) ?? rows[rows.length - 1];
}

export interface Coaching { n: number; ask: string; said: string[]; missing?: string }
/** The five coaching questions (Rother, Toyota Kata Practice Guide), each answered from the board; one whose answer is not written says so. */
export function coaching(a: Readonly<Record<string, string>>): Coaching[] {
  const row = currentRow(a);
  const q = (n: number, ask: string, said: (string | false | undefined)[], missing: string): Coaching => {
    const s = said.filter((x): x is string => typeof x === 'string' && x !== '');
    return { n, ask, said: s, ...(s.length ? {} : { missing }) };
  };
  return [
    q(1, 'What is the target condition?', [val(a, 'target')], 'The target condition is not written yet.'),
    q(2, 'What is the actual condition now?', [val(a, 'measure') && `Measure: ${val(a, 'measure')}`, val(a, 'current')], 'The current condition is not written yet.'),
    q(3, 'What obstacles are preventing you from reaching the target condition? Which one are you addressing now?',
      [val(a, 'obstacles'), val(a, 'obstacle_now') && `Addressing now: ${val(a, 'obstacle_now')}`], 'No obstacle is written yet.'),
    q(4, 'What is your next step? What do you expect?',
      [row?.step && `Next step: ${row.step}`, row?.prediction && `We expect: ${row.prediction}`], 'No step is written yet.'),
    q(5, 'How quickly can we go and see what we have learned from taking that step?', [val(a, 'see_by')], 'No day and time to go and see is written yet.'),
  ];
}

/** The storyboard's four left-hand cells, in the board's order. */
export function cells(a: Readonly<Record<string, string>>): { key: string; title: string; said: string; missing: string }[] {
  const w = (k: string) => val(a, k);
  return [
    { key: 'challenge', title: 'Challenge', said: [w('challenge'), w('coach') && `Learner and coach: ${w('coach')}`].filter(Boolean).join('\n'), missing: 'The challenge is not written yet.' },
    { key: 'current', title: 'Current condition', said: [w('measure') && `Measure: ${w('measure')}`, w('current')].filter(Boolean).join('\n'), missing: 'The current condition is not written yet.' },
    { key: 'target', title: 'Target condition', said: w('target'), missing: 'The target condition is not written yet.' },
    { key: 'obstacles', title: 'Obstacles', said: [w('obstacles'), w('obstacle_now') && `Addressing now: ${w('obstacle_now')}`].filter(Boolean).join('\n'), missing: 'No obstacle is written yet.' },
  ];
}

/** Everything the paper (and a printed board) says — one list. */
export function storyboard(a: Readonly<Record<string, string>>, todayISO: string) {
  return { cells: cells(a), rows: rowsOf(a).filter(touched), coaching: coaching(a), pulse: pulse(a, todayISO) };
}
