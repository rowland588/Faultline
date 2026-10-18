// COPIED FROM src/lib/flow by scripts/sync-assist.mjs — edit the source, then run it.
/* A WORKED-OUT FIELD — arithmetic over a step's own numbers, and nothing
 * else (docs/PLATFORM-REVIEW.md §6.1, "calculations").
 *
 * "packs / minutes", "(made - rejects) / made * 100". Numbers, the step's
 * field keys, + − × ÷ and brackets. No functions, no names from anywhere
 * else, no code: the formula is parsed into a tree here and walked here, so
 * a definition written by a person or proposed by a model can never run
 * anything. A missing number or a division by nought gives no answer — never
 * an invented one. */

export type Expr =
  | { k: 'num'; v: number }
  | { k: 'ref'; name: string }
  | { k: 'neg'; e: Expr }
  | { k: 'bin'; op: '+' | '-' | '*' | '/'; a: Expr; b: Expr };

export class FormulaError extends Error {}

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

const MAX_LEN = 300;

function tokens(src: string): Tok[] {
  if (src.length > MAX_LEN) throw new FormulaError('The formula is too long.');
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+(\.\d*)?|\.\d+)/.exec(src.slice(i));
      if (!m) throw new FormulaError(`"${c}" is not a number.`);
      out.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue;
    }
    if (/[a-z_]/i.test(c)) {
      const word = /^[a-z_][a-z0-9_]*/i.exec(src.slice(i))?.[0] ?? c;
      out.push({ t: 'id', v: word.toLowerCase() }); i += word.length; continue;
    }
    if ('+-*/()×÷'.includes(c)) {
      out.push({ t: 'op', v: c === '×' ? '*' : c === '÷' ? '/' : c }); i++; continue;
    }
    throw new FormulaError(`"${c}" cannot be used in a formula — only numbers, field names, + − × ÷ and brackets.`);
  }
  return out;
}

/** The formula as a tree, or a FormulaError saying what is wrong with it. */
export function parseFormula(src: string): Expr {
  const ts = tokens(src.trim());
  if (!ts.length) throw new FormulaError('The formula is empty.');
  let p = 0;
  const peek = () => ts[p];
  const isOp = (v: string) => { const t = peek(); return t?.t === 'op' && t.v === v; };
  const sum = (): Expr => {
    let e = product();
    while (isOp('+') || isOp('-')) { const op = (ts[p++] as { v: '+' | '-' }).v; e = { k: 'bin', op, a: e, b: product() }; }
    return e;
  };
  const product = (): Expr => {
    let e = unary();
    while (isOp('*') || isOp('/')) { const op = (ts[p++] as { v: '*' | '/' }).v; e = { k: 'bin', op, a: e, b: unary() }; }
    return e;
  };
  const unary = (): Expr => {
    if (isOp('-')) { p++; return { k: 'neg', e: unary() }; }
    if (isOp('+')) { p++; return unary(); }
    return atom();
  };
  const atom = (): Expr => {
    const t = ts[p++];
    if (!t) throw new FormulaError('The formula stops too soon.');
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'id') return { k: 'ref', name: t.v };
    if (t.v === '(') {
      const e = sum();
      if (!isOp(')')) throw new FormulaError('A bracket is not closed.');
      p++;
      return e;
    }
    throw new FormulaError(`"${t.v}" is in the wrong place.`);
  };
  const e = sum();
  if (p < ts.length) throw new FormulaError(`"${(ts[p] as { v: unknown }).v}" is in the wrong place.`);
  return e;
}

/** The field keys a formula reads. */
export function formulaRefs(e: Expr): string[] {
  const out = new Set<string>();
  const walk = (x: Expr): void => {
    if (x.k === 'ref') out.add(x.name);
    else if (x.k === 'neg') walk(x.e);
    else if (x.k === 'bin') { walk(x.a); walk(x.b); }
  };
  walk(e);
  return [...out];
}

/** Worked out from the numbers given, or undefined when one is missing or a
 *  division is by nought. */
export function evalFormula(e: Expr, values: Record<string, number | undefined>): number | undefined {
  switch (e.k) {
    case 'num': return e.v;
    case 'ref': { const v = values[e.name]; return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }
    case 'neg': { const v = evalFormula(e.e, values); return v === undefined ? undefined : -v; }
    case 'bin': {
      const a = evalFormula(e.a, values), b = evalFormula(e.b, values);
      if (a === undefined || b === undefined) return undefined;
      if (e.op === '/' && b === 0) return undefined;
      const r = e.op === '+' ? a + b : e.op === '-' ? a - b : e.op === '*' ? a * b : a / b;
      return Number.isFinite(r) ? r : undefined;
    }
  }
}

/** Parse and work out in one go; a bad formula gives no answer. */
export function calc(src: string, values: Record<string, number | undefined>): number | undefined {
  try { return evalFormula(parseFormula(src), values); } catch { return undefined; }
}
