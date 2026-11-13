// COPIED FROM src/tools/talk by scripts/sync-assist.mjs — edit the source, then run it.
/* THE SUM — arithmetic done by the app's code, never by the model (10 November, docs/LUNA-NEXT.md L1; shared with the gateway since 13
 * November so Line Talk's sums are worked out by the very same function AI Mode's work_out uses). Pure: an expression of numbers with
 * + − × ÷ and brackets in, its value and the numbers it used out. No names, no functions, no records. */
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

/** A figure as written back: to the places asked, else sensibly. */
export function written(v: number, places?: number): string {
  const p = places ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 2 : 4);
  const r = Number(v.toFixed(p));
  return r.toLocaleString('en-GB', { maximumFractionDigits: p });
}

