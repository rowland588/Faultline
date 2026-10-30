/* PASTED READINGS — one parser for every tool that takes readings (the Analysis, the Capability study, the Control chart).
 *
 * Readings are taken at the machine on a pad, but the desk has them in a spreadsheet, a weigher's printout or a
 * message: a number to a line, or several on a line separated by spaces, commas or semicolons. Whatever is not
 * a number is listed, never silently dropped, and the rest is kept — a wild reading is a number and goes in
 * (the tool flags it; it is never removed here). */
export interface Pasted { values: number[]; pairs: [number, number][]; skipped: string[] }

/** More than this in one paste is a mis-selected column, not a study's readings. */
export const MAX_PASTED = 500;

/** Numbers pasted or typed in a box — a number to a line, or spaced or comma separated; with `cols` 2, a pair to a line. Whatever
 *  is not a number is listed in `skipped`, never silently dropped. */
export function parsePasted(text: string, cols: 1 | 2 = 1): Pasted {
  const out: Pasted = { values: [], pairs: [], skipped: [] };
  const num = (t: string): number | undefined => (t !== '' && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : undefined);
  for (const line of text.split(/\r?\n/)) {
    const toks = line.split(/[\s,;]+/).filter(Boolean); if (!toks.length) continue;
    if (cols === 2) {
      const [x, y] = [num(toks[0]), num(toks[1])];
      if (toks.length === 2 && x !== undefined && y !== undefined) out.pairs.push([x, y]); else out.skipped.push(line.trim());
    } else for (const t of toks) { const v = num(t); if (v !== undefined) out.values.push(v); else out.skipped.push(t); }
  }
  return out;
}

/** The subgroup a reading falls in when readings fill subgroups of `m` in the order taken — the 1-based number of the reading at
 *  0-based place `index`. The pad and a paste both use it, so a pasted run continues the subgroup the pad left half full. */
export const subgroupOf = (index: number, m: number): number => Math.floor(index / Math.max(1, m)) + 1;
