/* HOW THE ANALYSIS SAYS A NUMBER — the small words every question shares (W3a, moved out of analysis.ts in W3c so the gauge and the
 * shape, which live in ./measure, say a p, a percentage and a count the same way the older questions do). Pure. */
export const pctWord = (c: number): string => `${Math.round(c * 100)}%`;
const decimalsOf = (v: number): number => { const s = String(v); const i = s.indexOf('.'); return i < 0 ? 0 : Math.min(4, s.length - i - 1); };
/** Decimals the person typed — the most any reading has (never more than four). */
export const placesOf = (vs: number[]): number => vs.reduce((m, v) => Math.max(m, decimalsOf(v)), 0);
export const fx = (v: number, dp: number): string => v.toFixed(Math.max(0, dp)).replace('-', '−');
export const big = (n: number): string => Math.round(n).toLocaleString('en-GB');
export const fmtP = (p: number): string => (p < 0.0001 ? '< 0.0001' : p >= 0.1 ? p.toFixed(2) : p >= 0.01 ? p.toFixed(3) : p.toFixed(4));
/** "p = 0.0006" — or "p < 0.0001" when it is smaller than is worth the digits. */
export const pSay = (p: number): string => (p < 0.0001 ? 'p < 0.0001' : `p = ${fmtP(p)}`);
export const pct = (x: number): string => `${(x * 100).toFixed(x * 100 < 1 ? 2 : 1)}%`;
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
