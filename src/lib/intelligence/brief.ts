/* THE WEEK, TO SEND — a line's capacity brief in a few plain sentences,
 * made from the same facts the panel shows and Ask answers from, so the
 * paragraph sent to the client can never say what the screen does not
 * (docs/upgrade-plan.md, C: "the weekly brief"). No AI: the sentences are the
 * tested functions' own. Pure. */
import type { LineFacts } from './ask';
import { askLine } from './ask';

export function weeklyBrief(f: LineFacts, o: { heat?: string; asOf: string }): string[] {
  const held = askLine('where is the line held', f).text;
  const loss = f.fall.bands.length ? askLine('what is the biggest loss', f).text : '';
  const changed = f.changes.length ? f.changes.slice(0, 2).map(c => c.says).join(' ') : 'Nothing moved enough this week to call a change.';
  return [
    `${f.line} — the week to ${o.asOf}.`,
    f.rates.says,
    held,
    ...(loss ? [`The biggest loss: ${loss}`] : []),
    changed,
    ...(o.heat ? [o.heat] : []),
    ...(f.load.rows.length ? [f.load.says] : []),
  ].filter(Boolean);
}
