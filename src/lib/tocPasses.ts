/* THE PASSES ROUND THE THEORY OF CONSTRAINTS' LOOP (docs/METHODS.md §16–§17) — pure, so the board, its paper, the project report and the
 * dashboard's reading of the method all count a pass the same way. */
/** The passes round the loop: pass 1 is the sheet's own; the answers `constraint@n` and `moved@n` (n ≥ 2) are the later ones. */
export interface TocPass { n: number; constraint: string; moved: string }
export function tocPasses(answers: Readonly<Record<string, string>>): TocPass[] {
  const out: TocPass[] = [{ n: 1, constraint: (answers.constraint ?? '').trim(), moved: (answers.moved ?? '').trim() }];
  for (let n = 2; n < 60; n++) {
    const c = answers[`constraint@${n}`];
    if (c === undefined) break;
    out.push({ n, constraint: c.trim(), moved: (answers[`moved@${n}`] ?? '').trim() });
  }
  return out;
}
/** The next pass starts from where the last one said the constraint is now. Nothing when that is not written. */
export function nextPass(answers: Readonly<Record<string, string>>): { n: number; constraint: string } | undefined {
  const ps = tocPasses(answers), last = ps[ps.length - 1];
  return last.moved ? { n: last.n + 1, constraint: last.moved } : undefined;
}
