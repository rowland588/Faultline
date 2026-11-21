/* WORK IT OUT (10 November, docs/LUNA-NEXT.md L1). Luna's arithmetic done by Faultline's code: a difference, a share, a rate a week, a
 * conversion — an expression of numbers and + − × ÷ and brackets, worked out here and kept on the step, so the figure she then writes is
 * Faultline's and checks. Every number the expression uses is looked for in what the conversation holds (the results it worked out, the
 * steps' sentences, what the person said); a few constants of arithmetic and time are allowed (100, 60, 24, 7, 52, 365, 1,000, 3,600, a
 * whole number under 13). A number found nowhere is named and the answer says it rests on it — and lends nothing to the figure check
 * (data.backed is false), so a figure worked from an invented one is still marked. Pure arithmetic: no record is read or changed.
 *
 * TWO FAULTS PUT RIGHT (21 November, the investigation measured with the real model — docs/LUNA-EVAL.md §6):
 *   the value before rounding is said. A sum is written back rounded ("= 1,636 min" for 1,635.8) and only its sentence is kept on the
 *     turn — so the next sum, using 1,635.8, was told that figure was "found nowhere", and the right answer it gave (£32,389) was marked
 *     Check this. The sentence now carries both: "= 1,636 min — 1,635.8 before rounding".
 *   a sum that rests on a figure nobody gave lends NOTHING afterwards (`lendsNothing`). Its sentence repeats the untraced figure, and
 *     that sentence was read back as the conversation's working — so the very next sum using the same figure passed as traced
 *     (colleague/figureCheck lendsNothing — shared with what earlier answers lend a later one's figure check).
 */
import { checkObject } from './check';
import { anyone } from './access';
import { conversation } from './draftStore';
import { UNTRACED_SAID, lendsNothing, numbersIn } from '../colleague/figureCheck';
import type { CapResult, Capability } from './types';

/* the sum itself is tools/talk/sum — pure, shared with the gateway so Line Talk's sums are worked out by the same code */
import { SumError, evaluate, written } from '../tools/talk/sum';
export { SumError, evaluate, written };

const CONSTANTS = new Set([100, 60, 24, 7, 52, 365, 1000, 3600, 1440, 10080, 168]);
const allowed = (n: number) => CONSTANTS.has(n) || (Number.isInteger(n) && n >= 0 && n <= 12);

interface WorkIn { what: string; expression: string; unit?: string; places?: number }
export const workOut: Capability = {
  name: 'work_out', title: 'Work out a figure', kind: 'local',
  validate: raw => checkObject(raw, {
    what: { kind: 'string', label: 'what the figure is ("the change in minutes", "the Sealer’s share of the loss")', required: true, max: 160 },
    expression: { kind: 'string', label: 'the sum, in numbers only ("1716 - 1376", "264 / 429 * 100")', required: true, max: 400 },
    unit: { kind: 'string', label: 'its unit', max: 30 },
    places: { kind: 'int', label: 'decimal places', min: 0, max: 6 },
  }),
  allowed: anyone,
  async run(ctx, input: WorkIn): Promise<CapResult> {
    let r: { value: number; numbers: number[] };
    try { r = evaluate(input.expression); } catch (e) { return { ok: false, why: e instanceof SumError ? e.message : String(e) }; }
    /* every number it rests on, looked for in the conversation */
    const c = await conversation(ctx);
    const held = new Set<number>();
    if (c.ok) {
      const f = c.s.facts as { turns?: { kind?: string; text?: string; heard?: string; used?: { name?: string; status?: string; says?: string }[] }[]; results?: unknown[] };
      const add = (t: string) => { for (const n of numbersIn(t)) held.add(n); };
      for (const t of f.turns ?? []) {
        if (t.kind !== 'reply') add(`${t.text ?? ''} ${t.heard ?? ''}`);
        for (const u of t.used ?? []) if (u.status === 'done' && u.says && !lendsNothing(u)) add(u.says);
      }
      add(JSON.stringify(f.results ?? []));
    }
    const near = (n: number) => [...held].some(h => Math.abs(h - n) <= 0.5 * 10 ** -((String(n).split('.')[1] ?? '').length) + 1e-9);
    const untraced = [...new Set(r.numbers.filter(n => !allowed(n) && !near(n)))];
    const unit = input.unit?.trim() ? ` ${input.unit.trim()}` : '';
    /* written to the places asked (else sensibly) — and, where that rounding dropped something, the value before it, to two places:
       the next sum may rest on it, and it is the app's own figure either way */
    const shown = written(r.value, input.places);
    const fine = written(r.value, Math.max(2, input.places ?? 0));
    const says = `${input.what}: ${input.expression} = ${shown}${unit}${fine !== shown ? ` — ${fine} before rounding` : ''} (worked out by the app).${untraced.length ? ` It rests on ${untraced.map(n => written(n)).join(', ')}, ${UNTRACED_SAID}'s working or what the person said — say where ${untraced.length === 1 ? 'it comes' : 'they come'} from, or the figure is not to be relied on.` : ''}`;
    return { ok: true, says, refs: [], data: { value: r.value, written: written(r.value, input.places), backed: untraced.length === 0, ...(untraced.length ? { untraced } : {}) } };
  },
};
