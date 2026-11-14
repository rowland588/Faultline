/* THE CONDITIONS A WORKBOOK'S REPORTS SUM UNDER (14 November, docs/WORKBOOKS.md — "the rows the reports leave out"). A report cell is
 * usually SUMIFS(the figure, the dates, the window picked, the shift, the shift picked, A FLAG, 0): most of its conditions are whatever
 * the person picked on the report (a cell), and one is a RULE written into the formula (a constant) — "only the rows where the flag is
 * 0". This reads the rules: in SUMIFS · COUNTIFS · AVERAGEIFS · MAXIFS · MINIFS · SUMIF · COUNTIF · AVERAGEIF each pair
 *     a single column of another sheet  →  a constant (a number, "a word", "=x", "<>x")
 * and in SUMPRODUCT the form (Sheet!$E$2:$E$900=0). A condition that is a cell, or is built from one (">="&Control!$F$5), is ignored —
 * it is a choice, not a rule; so is ">5", a wildcard, TRUE/FALSE and an empty string. Pure: the formula's text in, what it holds out. */

export interface Held { sheet: string; letter: string; op: 'eq' | 'ne'; value: string | number }
export interface Criteria {
  /** The other sheets this formula sums or counts under a condition — once each. */
  on: string[];
  /** The columns it holds to a constant — once each a formula. */
  held: Held[];
}

const FN = /\b(SUMIFS|COUNTIFS|AVERAGEIFS|MAXIFS|MINIFS|SUMIF|COUNTIF|AVERAGEIF)\s*\(/gi;
const RANGE = /^\s*(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!\$?([A-Z]{1,3})\$?\d*(?::\$?([A-Z]{1,3})\$?\d*)?\s*$/;
const CONST = /^\s*(-?\d+(?:\.\d+)?|"(?:[^"]|"")*")\s*$/;
const COMPARED = /(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!\$?([A-Z]{1,3})\$?\d*:\$?([A-Z]{1,3})\$?\d*\s*(<>|>=|<=|=|>|<)\s*(-?\d+(?:\.\d+)?|"(?:[^"]|"")*")?/g;

/** The arguments of a call whose "(" has just been passed — split at the commas of its own level; nothing when it never closes. */
function argsFrom(f: string, from: number): string[] | null {
  const out: string[] = [];
  let depth = 0, start = from, dq = false, sq = false;
  for (let i = from; i < f.length; i += 1) {
    const ch = f[i];
    if (dq) { if (ch === '"') { if (f[i + 1] === '"') i += 1; else dq = false; } continue; }
    if (sq) { if (ch === "'") { if (f[i + 1] === "'") i += 1; else sq = false; } continue; }
    if (ch === '"') dq = true;
    else if (ch === "'") sq = true;
    else if (ch === '(') depth += 1;
    else if (ch === ')') { if (depth === 0) { out.push(f.slice(start, i)); return out; } depth -= 1; }
    else if (ch === ',' && depth === 0) { out.push(f.slice(start, i)); start = i + 1; }
  }
  return null;
}

const rangeOf = (arg: string): { sheet: string; letter: string } | null => {
  const m = RANGE.exec(arg);
  if (!m || (m[4] && m[4] !== m[3])) return null;
  return { sheet: (m[1] ?? m[2]).replace(/''/g, "'"), letter: m[3] };
};
/** A constant as a rule: a number is, a word is, "=x" and "<>x" are; a comparison, a wildcard or nothing at all is not. */
function constOf(arg: string | undefined, op: 'eq' | 'ne' = 'eq'): { op: 'eq' | 'ne'; value: string | number } | null {
  const m = arg === undefined ? null : CONST.exec(arg);
  if (!m) return null;
  if (!m[1].startsWith('"')) return { op, value: Number(m[1]) };
  let t = m[1].slice(1, -1).replace(/""/g, '"');
  let o = op;
  if (t.startsWith('<>')) { o = op === 'eq' ? 'ne' : 'eq'; t = t.slice(2); }
  else if (t.startsWith('=')) t = t.slice(1);
  if (!t.trim() || /^[<>]/.test(t) || /[*?]/.test(t)) return null;
  const n = Number(t);
  return { op: o, value: t.trim() !== '' && Number.isFinite(n) ? n : t };
}

export function criteriaOf(f: string): Criteria {
  const on = new Set<string>(), held = new Map<string, Held>();
  const hold = (r: { sheet: string; letter: string }, c: { op: 'eq' | 'ne'; value: string | number }): void => { held.set(`${r.sheet}\u0000${r.letter}\u0000${c.op}\u0000${String(c.value).toLowerCase()}`, { ...r, ...c }); };
  FN.lastIndex = 0;
  for (let m = FN.exec(f); m; m = FN.exec(f)) {
    const args = argsFrom(f, m.index + m[0].length);
    if (!args) continue;
    const name = m[1].toUpperCase();
    /* …IFS(figure, range, criterion, range, criterion …) — COUNTIFS has no figure; the single forms are (range, criterion[, figure]) */
    const pairs: [string, string | undefined][] = [];
    if (name.endsWith('IFS')) for (let i = name === 'COUNTIFS' ? 0 : 1; i < args.length; i += 2) pairs.push([args[i], args[i + 1]]);
    else pairs.push([args[0], args[1]]);
    for (const [range, crit] of pairs) {
      const r = rangeOf(range ?? '');
      if (!r) continue;
      on.add(r.sheet);
      const c = constOf(crit);
      if (c) hold(r, c);
    }
  }
  if (/SUMPRODUCT\s*\(/i.test(f)) {
    COMPARED.lastIndex = 0;
    for (let m = COMPARED.exec(f); m; m = COMPARED.exec(f)) {
      if (m[4] !== m[3]) continue;
      const r = { sheet: (m[1] ?? m[2]).replace(/''/g, "'"), letter: m[3] };
      on.add(r.sheet);
      const c = m[5] === '=' || m[5] === '<>' ? constOf(m[6], m[5] === '=' ? 'eq' : 'ne') : null;
      if (c) hold(r, c);
    }
  }
  return { on: [...on], held: [...held.values()] };
}
