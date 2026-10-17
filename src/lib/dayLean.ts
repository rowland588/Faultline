/* THE DAY AS A LEAN PAGE (docs/LEAN-PAGE.md, slice 5c) — the tiles and the
 * closing line the day's page and its paper say, read from the day's own
 * story (lib/day dayOf), so the page, its fold line and its paper say one
 * thing. Nothing is worked out here.
 *
 * The tiles are the story's sections counted: what got done (and where the
 * first gate stood by the end of the day), what was late, what went wrong
 * (didn't pass, or did not happen), what was found (written down) — and the
 * job's money, last, as every stage-gate page ends (lib/useJobMoney: what
 * the slip costs, or what a day late would). The closing line is the day in
 * one sentence, the slip in money when it has run one up. */
import type { Day } from './day';
import type { LeanTile, LeanTone } from './lean';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const n = (d: Pick<Day, 'sections'>, key: Day['sections'][number]['key']) => d.sections.find(s => s.key === key)?.lines.length ?? 0;

export function dayTiles(d: Pick<Day, 'sections' | 'gates'>, money?: LeanTile): LeanTile[] {
  const done = n(d, 'done'), late = n(d, 'late'), wrong = n(d, 'wrong'), found = n(d, 'found'), critical = n(d, 'critical');
  const g = d.gates[0];
  return [
    { k: 'Done', v: String(done), of: g ? `${g.label}: ${g.done} of ${g.total} steps by its end` : done ? 'that day' : 'nothing done that day' },
    { k: 'Late', v: String(late), of: late ? 'past their day' : 'nothing past its day', tone: late ? 'r' : 'n' },
    { k: 'Went wrong', v: String(wrong), of: wrong ? 'didn’t pass, or did not happen' : 'nothing went wrong', tone: wrong ? 'r' : 'n' },
    { k: 'Found', v: String(found), of: found ? `written down${critical ? ` · ${critical} critical open` : ''}` : critical ? `${critical} critical open` : 'nothing written down', ...(critical ? { tone: 'r' as LeanTone } : {}) },
    ...(money ? [money] : []),
  ];
}

/** The day in one sentence — what got done and what did not go to plan;
 *  the slip in money when it is a cost already run up. */
export function dayClosing(d: Pick<Day, 'sections' | 'label' | 'empty'>, money?: LeanTile): { text: string; tone: LeanTone } {
  if (d.empty) return { text: `${d.label}: nothing logged.`, tone: 'n' };
  const done = n(d, 'done'), late = n(d, 'late'), wrong = n(d, 'wrong'), found = n(d, 'found'), critical = n(d, 'critical');
  const bad = [wrong ? `${wrong} went wrong` : '', late ? `${late} late` : '', critical ? `${critical} critical open` : ''].filter(Boolean);
  const said = [found ? `${found} ${plural(found, 'thing')} found` : ''].filter(Boolean);
  return {
    text: `${d.label}: ${done} done${bad.length ? ` — ${and(bad)}` : ', nothing late'}${said.length ? `; ${said.join('')}` : ''}.${money?.tone === 'r' ? ` ${money.k} ${money.v}.` : ''}`,
    tone: wrong || late || critical ? 'r' : done ? 'g' : 'n',
  };
}
