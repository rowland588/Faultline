/* THE REGISTER ON PAPER (FC-135) — the holds as they stand, what was decided and what it cost, why holds happen; the same figures the
 * page draws (hold.ts), laid out by the report engine. The band, the tiles' place, "What it says", the action plan and the closing
 * line are the study paper's (lib/studiesPdf); this is what sits between them. */
import type { ToolStudy } from '../../lib/study';
import { text } from '../../lib/report/blocks';
import { leanHead } from '../../lib/report/lean';
import { INK2, MUTED } from '../../lib/reportKit';
import { table, type RegisterPaper } from '../registers/paperKit';
import { todayISO } from '../../lib/weeks';
import { DISPOSITIONS, dispositionWord, daysHeld, gbp, heldQty, holdClosing, holdFigures, holdMoney, holdSays, label, liveHolds, outcomesOf, qtyWords, tiedUpOf, REPEAT_DAYS, REPEAT_HOLDS, type HoldCtx } from './hold';
import { holdTiles } from './holdLean';

/** The limits the page and the paper both say. */
export const HOLD_LIMITS = [
  'It keeps the record of a hold and states the team’s rules; it never decides what becomes of the product — that is the authority’s, in writing, and not production’s under pressure.',
  'A hold is a record, not a barrier: product that is not physically segregated and labelled with the hold’s number is not on hold.',
  'Tied-up money is money waiting, not money lost; only a decision says what was lost. The cost of a piece, the price lost and the carrying rate are the business’s own figures, typed — none is assumed.',
  'Allergen and food-safety holds have their own rules in the site’s HACCP plan; this register does not replace them. ISO 9001:2015 clause 8.7 and the BRCGS clause for non-conforming product are the requirement; neither text was re-read for this build.',
];

export function holdPaper(s: ToolStudy, ctx: HoldCtx, today: string = todayISO()): RegisterPaper {
  const f = holdFigures(s.facts.holds, today, ctx, s.agreed?.holds);
  const said = holdSays(f);
  const agreed = s.agreed?.holds;
  const body = [];
  body.push(leanHead(`On hold now — ${f.open.length}`));
  body.push(f.open.length
    ? table(['No.', 'Product · lot', 'Held', 'Why', 'Since · days', 'Decides · by', 'Tied up'],
      f.open.map(h => [label(h), [h.product, h.lot ? `lot ${h.lot}` : ''].filter(Boolean).join(' · ') || '—', qtyWords({ [h.unit]: heldQty(h) }), h.reason || '—', `${h.raisedOn} · ${daysHeld(h, today)} d`, `${h.owner?.trim() || 'nobody named'}${h.decideBy ? ` · ${h.decideBy}` : ' · no day set'}`, tiedUpOf(h, ctx) !== undefined ? gbp(tiedUpOf(h, ctx) as number) : '—']),
      [0.07, 0.19, 0.12, 0.2, 0.14, 0.17, 0.11], i => f.late.includes(f.open[i]))
    : text({ text: 'Nothing is on hold.', size: 9, colour: MUTED, after: 4 }));
  const decided = liveHolds(s.facts.holds).filter(h => outcomesOf(h).length);
  body.push(leanHead(`Decided — ${decided.length}`));
  body.push(decided.length
    ? table(['No.', 'Product · lot', 'Fate', 'Decided by · on', 'Grounds'],
      decided.flatMap(h => outcomesOf(h).map(o => [label(h), [h.product, h.lot ? `lot ${h.lot}` : ''].filter(Boolean).join(' · ') || '—', `${o.qty.toLocaleString('en-GB')} ${h.unit} ${dispositionWord(o.disposition)}`, `${o.by || 'not named'} · ${o.on}`, o.grounds || '—'])),
      [0.07, 0.22, 0.22, 0.2, 0.29])
    : text({ text: 'Nothing has been decided yet.', size: 9, colour: MUTED, after: 4 }));
  const fates = f.fates.filter(x => x.holds);
  if (fates.length) {
    body.push(leanHead('By fate'));
    body.push(table(['Fate', 'Holds', 'Quantity', 'Lost', 'Margin not earned'], fates.map(x => [DISPOSITIONS.find(d => d.key === x.disposition)?.word ?? x.disposition, String(x.holds), qtyWords(x.by), x.disposition === 'release' ? '£0' : gbp(x.lost) + (x.missing ? ' + some not given' : ''), x.notEarned > 0 ? gbp(x.notEarned) : '—']), [0.2, 0.12, 0.28, 0.22, 0.18]));
  }
  const money = holdMoney(f, agreed);
  if (money.length) { body.push(leanHead('In money')); for (const m of money) body.push(text({ text: m, size: 8.5, colour: INK2, after: 2 })); }
  if (f.reasons.length) {
    body.push(leanHead('Why holds happen'));
    body.push(table(['Reason', 'Holds', 'Quantity'], f.reasons.map(r => [r.reason, String(r.n), qtyWords(r.qty)]), [0.6, 0.12, 0.28]));
    body.push(text({ text: f.repeat ? `${f.repeat.reason} has held product ${f.repeat.n} times in the last ${REPEAT_DAYS} days — an 8D is the next step.` : `A reason that holds product ${REPEAT_HOLDS} times in ${REPEAT_DAYS} days is a repeat — the next step is an 8D (Luna’s choice of three).`, size: 8.5, colour: INK2, after: 3 }));
  }
  body.push(leanHead('Who decides'));
  body.push(text({ text: agreed?.authority?.length ? `The names that may decide a hold: ${agreed.authority.join(', ')}.${f.unauthorised.length ? ` ${f.unauthorised.length} decision${f.unauthorised.length === 1 ? ' was' : 's were'} made by someone not on the list: ${f.unauthorised.map(u => `${label(u.hold)} by ${u.outcome.by || 'no name'}`).join(', ')}.` : ''}` : 'No names are listed as having the authority to decide a hold — anyone can; list them on the register.', size: 8.5, colour: f.unauthorised.length ? INK2 : MUTED, after: 3 }));
  body.push(leanHead('What this register does not do'));
  for (const l of HOLD_LIMITS) body.push(text({ text: l, size: 8.5, colour: INK2, after: 2, bullet: '•', indent: 10 }));
  return { eyebrow: 'Product on hold', verdict: { text: said.verdict, tone: said.tone }, tiles: holdTiles(f), closing: holdClosing(f), body };
}

/** What a register says of itself — on a list, on the line's page and in the line report: the sentence, a verdict and a tone. */
export function holdStudySays(s: ToolStudy, ctx: HoldCtx, today: string = todayISO()): { text: string; verdict: string; tone: 'r' | 'a' | 'g' | 'n' } {
  return holdSays(holdFigures(s.facts.holds, today, ctx, s.agreed?.holds));
}
