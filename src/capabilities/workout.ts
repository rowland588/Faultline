/* WORK IT OUT (10 November, docs/LUNA-NEXT.md L1). Luna's arithmetic done by Faultline's code: a difference, a share, a rate a week, a
 * conversion — an expression of numbers and + − × ÷ and brackets, worked out here and kept on the step, so the figure she then writes is
 * Faultline's and checks. Every number the expression uses is looked for in what the conversation holds (the results it worked out, the
 * steps' sentences, what the person said); a few constants of arithmetic and time are allowed (100, 60, 24, 7, 52, 365, 1,000, 3,600, a
 * whole number under 13). A number found nowhere is named and the answer says it rests on it — and lends nothing to the figure check
 * (data.backed is false), so a figure worked from an invented one is still marked. Pure arithmetic: no record is read or changed.
 */
import { checkObject } from './check';
import { anyone } from './access';
import { conversation } from './draftStore';
import { numbersIn } from '../colleague/figureCheck';
import type { CapResult, Capability } from './types';

export class SumError extends Error {}

/** An expression worked out — numbers (1,716 · 12.5 · 40%), + − * / × ÷, brackets. No names, no functions. */
export function evaluate(expression: string): { value: number; numbers: number[] } {
  const src = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/£|\$|€/g, '');
  const toks = src.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\d+(?:\.\d+)?%?|[-+*/()]|\S/g) ?? [];
  const numbers: number[] = [];
  let i = 0;
  const peek = () => toks[i];
  const take = () => toks[i++];
  const expr = (): number => { let v = term(); while (peek() === '+' || peek() === '-') { const op = take(); const r = term(); v = op === '+' ? v + r : v - r; } return v; };
  const term = (): number => {
    let v = unary();
    while (peek() === '*' || peek() === '/') {
      const op = take(); const r = unary();
      if (op === '/' && r === 0) throw new SumError('It divides by zero — there is no answer.');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const unary = (): number => (peek() === '-' ? (take(), -unary()) : peek() === '+' ? (take(), unary()) : atom());
  const atom = (): number => {
    const t = take();
    if (t === undefined) throw new SumError('The expression ends too soon.');
    if (t === '(') { const v = expr(); if (take() !== ')') throw new SumError('A bracket is not closed.'); return v; }
    if (/^[\d]/.test(t)) {
      const pct = t.endsWith('%');
      const n = Number(t.replace(/[,%]/g, ''));
      numbers.push(n);
      return pct ? n / 100 : n;
    }
    throw new SumError(`“${t}” is not a number or + − × ÷ — say the sum in numbers only.`);
  };
  if (!toks.length) throw new SumError('There is no sum to work out.');
  const value = expr();
  if (i < toks.length) throw new SumError(`“${toks[i]}” is left over — say the sum in numbers only.`);
  if (!Number.isFinite(value)) throw new SumError('The sum has no finite answer.');
  return { value, numbers };
}

const CONSTANTS = new Set([100, 60, 24, 7, 52, 365, 1000, 3600, 1440, 10080, 168]);
const allowed = (n: number) => CONSTANTS.has(n) || (Number.isInteger(n) && n >= 0 && n <= 12);

/** A figure as written back: to the places asked, else sensibly. */
export function written(v: number, places?: number): string {
  const p = places ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 2 : 4);
  const r = Number(v.toFixed(p));
  return r.toLocaleString('en-GB', { maximumFractionDigits: p });
}

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
      const f = c.s.facts as { turns?: { kind?: string; text?: string; heard?: string; used?: { status?: string; says?: string }[] }[]; results?: unknown[] };
      const add = (t: string) => { for (const n of numbersIn(t)) held.add(n); };
      for (const t of f.turns ?? []) {
        if (t.kind !== 'reply') add(`${t.text ?? ''} ${t.heard ?? ''}`);
        for (const u of t.used ?? []) if (u.status === 'done' && u.says) add(u.says);
      }
      add(JSON.stringify(f.results ?? []));
    }
    const near = (n: number) => [...held].some(h => Math.abs(h - n) <= 0.5 * 10 ** -((String(n).split('.')[1] ?? '').length) + 1e-9);
    const untraced = [...new Set(r.numbers.filter(n => !allowed(n) && !near(n)))];
    const unit = input.unit?.trim() ? ` ${input.unit.trim()}` : '';
    const says = `${input.what}: ${input.expression} = ${written(r.value, input.places)}${unit} (worked out by the app).${untraced.length ? ` It rests on ${untraced.map(n => written(n)).join(', ')}, found nowhere in this conversation's working or what the person said — say where ${untraced.length === 1 ? 'it comes' : 'they come'} from, or the figure is not to be relied on.` : ''}`;
    return { ok: true, says, refs: [], data: { value: r.value, written: written(r.value, input.places), backed: untraced.length === 0, ...(untraced.length ? { untraced } : {}) } };
  },
};
