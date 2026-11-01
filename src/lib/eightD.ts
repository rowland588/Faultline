/* THE 8D REPORT FORM — D0 to D8 as one form, from the method's answers (docs/METHODS.md §16; lib/methodSheet). The screen's board
 * (project/method/shapes/eight-d) and the paper (lib/report/eightDPaper) both read THIS module, so they cannot part.
 *
 * Source: Ford TOPS (1987), the eight disciplines as the automotive and food-retail customers ask for them: D0 plan and the
 * emergency response, D1 team, D2 describe the problem (is / is not), D3 interim containment, D4 root cause and escape point,
 * D5 choose the permanent corrective action, D6 implement and validate it, D7 prevent recurrence, D8 congratulate the team and close.
 * The project's method sections combine D0–D1 and D5–D6; the form here has all nine, each with its own state.
 *
 * Answers are the method sheet's (field id → words). Beyond the sheet's boxes this module owns: the is / is-not matrix
 * (`is_<k>` / `isnot_<k>` for what, where, when, how much) and the corrective-action list (`act@n`, `actwho@n`, `actdue@n`,
 * `actdone@n`) — many actions, each with who and by when. Pure. */

export type Ans = Readonly<Record<string, string>>;
const has = (a: Ans, id: string): boolean => (a[id] ?? '').trim() !== '';

export const ISNOT_ROWS = [
  { k: 'what', q: 'What', is: 'What is wrong — the product, the defect', isnot: 'What else could have been wrong, but is not' },
  { k: 'where', q: 'Where', is: 'Where it was found — the line, the machine, the lane', isnot: 'Where it could have been found, but was not' },
  { k: 'when', q: 'When', is: 'When it began, which shifts and batches', isnot: 'When it could have begun, but did not' },
  { k: 'much', q: 'How much', is: 'How many, how often, the trend', isnot: 'How many it could have been, but was not' },
] as const;
export const isId = (k: string) => `is_${k}`;
export const isnotId = (k: string) => `isnot_${k}`;

export type DKey = 'D0' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8';
export interface Discipline {
  key: DKey;
  name: string;
  /** The question this discipline answers. */
  asks: string;
  /** The method's section it is drawn under. */
  section: string;
  /** Answers that make it written: sheet fields and the matrix. */
  fields: { id: string; label: string }[];
  /** Tools (app tool keys) whose latest record in the project is shown at this discipline. */
  tools: string[];
}
const F = (id: string, label: string) => ({ id, label });
export const DISCIPLINES: readonly Discipline[] = [
  { key: 'D0', name: 'Symptom and emergency response', asks: 'What happened, and what was done at once to protect the customer?', section: 'D0–D1  Symptom, emergency response, team',
    fields: [F('customer', 'Who raised it'), F('opened', 'Opened, reply due'), F('symptom', 'The symptom'), F('response', 'The emergency response')], tools: [] },
  { key: 'D1', name: 'The team', asks: 'Who is on it, and who leads?', section: 'D0–D1  Symptom, emergency response, team', fields: [F('team', 'The team')], tools: [] },
  { key: 'D2', name: 'Describe the problem', asks: 'What is the problem, and what is it not?', section: 'D2  Describe the problem',
    fields: [F('is', 'What it is'), F('isnot', 'What it is not'), ...ISNOT_ROWS.flatMap(r => [F(isId(r.k), `Is — ${r.q.toLowerCase()}`), F(isnotId(r.k), `Is not — ${r.q.toLowerCase()}`)])], tools: ['capability', 'chart'] },
  { key: 'D3', name: 'Contain', asks: 'Is the customer protected now, and how do we know?', section: 'D3  Contain', fields: [F('contain', 'Containment'), F('worked', 'Checked that it works')], tools: ['logs'] },
  { key: 'D4', name: 'Root cause and escape point', asks: 'Why did it happen, and why was it not caught?', section: 'D4  Root cause and escape point',
    fields: [F('why', 'Why it happened'), F('escape', 'Why it was not caught'), F('verified', 'Verified')], tools: ['analysis', 'reliability'] },
  { key: 'D5', name: 'Choose the corrective action', asks: 'What permanent action was chosen, and why?', section: 'D5–D6  Corrective action, implemented and validated', fields: [F('action', 'The permanent corrective action')], tools: [] },
  { key: 'D6', name: 'Implement and validate', asks: 'Is it in, and does the number prove it?', section: 'D5–D6  Corrective action, implemented and validated', fields: [F('validated', 'Validated on the number')], tools: ['capability', 'analysis'] },
  { key: 'D7', name: 'Prevent recurrence', asks: 'What in the system changed, and which other lines does it apply to?', section: 'D7  Prevent recurrence', fields: [F('system', 'What changed in the system')], tools: ['chart'] },
  { key: 'D8', name: 'Close', asks: 'Is the evidence kept, the team recognised and the report sent?', section: 'D8  Close', fields: [F('evidence', 'Evidence'), F('recognised', 'The team recognised'), F('sent', 'The report sent to')], tools: [] },
];

/* ---- the corrective-action list (many) ---- */
export interface ActionRow { n: number; what: string; who: string; due: string; done: boolean }
/** The rows in order; row 1 is `act@1`. A row with no words is not a row. */
export function actionRows(a: Ans): ActionRow[] {
  const ns = new Set<number>();
  for (const k of Object.keys(a)) { const m = /^act@(\d+)$/.exec(k); if (m && has(a, k)) ns.add(Number(m[1])); }
  return [...ns].sort((x, y) => x - y).map(n => ({ n, what: a[`act@${n}`].trim(), who: (a[`actwho@${n}`] ?? '').trim(), due: (a[`actdue@${n}`] ?? '').trim(), done: (a[`actdone@${n}`] ?? '') === 'yes' }));
}
export const nextActionN = (a: Ans): number => Math.max(0, ...Object.keys(a).map(k => Number(/^act@(\d+)$/.exec(k)?.[1] ?? 0))) + 1;

export type DWord = 'Not started' | 'Under way' | 'All written';
export interface DState { key: DKey; word: DWord; written: number; of: number; says: string }
/** A discipline's state, in words. D2 counts the matrix as its pairs; D6 is not all written while an action in the list is open. */
export function disciplineState(d: Discipline, a: Ans): DState {
  const fields = d.key === 'D2' ? d.fields.filter(f => f.id !== 'is' && f.id !== 'isnot') : d.fields;
  const of = fields.length + (d.key === 'D6' ? 1 : 0);
  const rows = actionRows(a);
  const actionsDone = rows.length > 0 && rows.every(r => r.done);
  let written = fields.filter(f => has(a, f.id)).length + (d.key === 'D6' && actionsDone ? 1 : 0);
  if (d.key === 'D2') {
    /* the summary sentences stand for the matrix when the matrix is not used: either way D2 is written */
    const sumDone = has(a, 'is') && has(a, 'isnot');
    if (sumDone && written === 0) written = of;
  }
  const word: DWord = written === 0 ? 'Not started' : written >= of ? 'All written' : 'Under way';
  const open = d.key === 'D6' ? rows.filter(r => !r.done).length : 0;
  const says = `${word}${word === 'Under way' ? ` — ${written} of ${of}` : ''}${open ? ` · ${open} action${open === 1 ? '' : 's'} open` : ''}`;
  return { key: d.key, word, written, of, says };
}
export const allStates = (a: Ans): DState[] => DISCIPLINES.map(d => disciplineState(d, a));
export function closingLine(a: Ans): string {
  const st = allStates(a), done = st.filter(s => s.word === 'All written').length;
  const next = DISCIPLINES.find((_d, i) => st[i].word !== 'All written');
  return done === 9 ? 'All nine disciplines are written — the report can go.' : `${done} of 9 disciplines written${next ? `; ${next.key} ${next.name} is next` : ''}.`;
}

/** The text of a discipline for the paper and the read-only board: label → words, blank ones named. */
export function disciplineLines(d: Discipline, a: Ans): { label: string; text: string }[] {
  if (d.key === 'D2') return [];
  return d.fields.map(f => ({ label: f.label, text: (a[f.id] ?? '').trim() }));
}
export const isNotPairs = (a: Ans) => ISNOT_ROWS.map(r => ({ q: r.q, is: (a[isId(r.k)] ?? '').trim(), isnot: (a[isnotId(r.k)] ?? '').trim() }));

/* ---- reading the action list against today (the dashboard's insight and the project report both use this) ---- */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** A typed "by when" as a day (YYYY-MM-DD), or '' when it cannot be read as one. Reads 2026-11-07, 7 Nov, 7 November 2026, 7/11/2026
 * (day first). Without a year it is the year of `today`. Never guesses at "next Friday" or "end of month". */
export function dayOf(text: string, today: string): string {
  const t = text.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/, '$1');
  const pad = (n: number) => String(n).padStart(2, '0');
  const valid = (y: number, mo: number, d: number) => { const dt = new Date(Date.UTC(y, mo - 1, d)); return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${y}-${pad(mo)}-${pad(d)}` : ''; };
  const year = Number(today.slice(0, 4));
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?(?:\s+(\d{4}))?$/.exec(t);
  if (m) { const mo = MONTHS.indexOf(m[2]) + 1; return mo ? valid(m[3] ? +m[3] : year, mo, +m[1]) : ''; }
  m = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/.exec(t);
  if (m) return valid(m[3] ? +m[3] : year, +m[2], +m[1]);
  return '';
}
export type ActionState = 'done' | 'late' | 'open';
/** Done, late (not done and its day is before today), or open. A day that cannot be read is never judged late. */
export function actionState(r: ActionRow, today: string): ActionState {
  if (r.done) return 'done';
  const d = dayOf(r.due, today);
  return d && d < today ? 'late' : 'open';
}
/** A cause that stops at a person or a promise is a stopping place, not a root cause (the guide: ask what let it happen). */
export const STOPPING_PLACE = /\b(operator|human|people|staff|worker|colleague)s?\s+(error|mistake|fault|failure)\b|\bnot\s+(following|followed)\s+(the\s+)?(procedure|process|instruction)s?\b|\bnegligen/i;
export const isStoppingPlace = (cause: string): boolean => STOPPING_PLACE.test(cause);
const RETRAIN = /\bre-?train(ed|ing)?\b|\bremind(ed|er)?\b|\bbriefed?\b/i;
export const isOnlyRetraining = (action: string): boolean => RETRAIN.test(action);
