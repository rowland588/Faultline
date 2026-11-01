/* THE THEORY OF CONSTRAINTS' OWN READING OF ITS PROJECT (lib/methodInsight; docs/METHODS.md §17) — what only this method knows needs a
 * look, from what the team wrote alone (the rules that need the line's records are the report's own flags, project/method/report/toc):
 *   · the constraint has moved (a pass says where it went) and the next pass has not been started — go again, from there;
 *   · the constraint has moved and the rule built for the old one (inertia) has not been looked at — Goldratt's warning;
 *   · an option to elevate is written and nothing is written about exploiting the constraint first — spending before finding the free capacity;
 *   · exploiting is written and nothing subordinates the rest to it — the line still runs for itself.
 * Pure; hand-worked in lib/__tests__/methodInsightToc.test.ts. */
import type { MethodInsightFn } from '../methodInsight';
import { nextPass, tocPasses } from '../tocPasses';

export const tocInsight: MethodInsightFn = ({ answers }) => {
  const has = (id: string) => (answers[id] ?? '').trim() !== '';
  const attention: NonNullable<ReturnType<MethodInsightFn>['attention']> = [];
  let next: string | undefined;
  const ps = tocPasses(answers), last = ps[ps.length - 1];
  const again = nextPass(answers);
  if (last && again) {
    attention.push({ kind: 'finding', tone: 'a', text: `The constraint has moved: pass ${last.n} says it is now ${again.constraint}, and pass ${again.n} has not been started — read the line again from there.` });
    next = `Go again: start pass ${again.n} at ${again.constraint} — read Line capacity afresh and find what limits the line now.`;
    if (last.n === 1 && !has('inertia')) attention.push({ kind: 'finding', tone: 'a', text: `The constraint has moved, but no rule built round the old one has been looked at — an old buffer, schedule or habit can become the new constraint.` });
  }
  if (has('option') && !has('exploit')) attention.push({ kind: 'finding', tone: 'a', text: 'An option to spend on the constraint is written, but nothing about getting the most from it first (step 2) — spend only after the free capacity has been found.' });
  if (has('constraint') && has('exploit') && !has('rules') && !has('buffer') && !has('release')) attention.push({ kind: 'finding', tone: 'n', text: 'Ways to lose nothing at the constraint are written, but nothing yet makes the rest of the line work to its pace (step 3).' });
  return { ...(attention.length ? { attention } : {}), ...(next ? { next } : {}) };
};
