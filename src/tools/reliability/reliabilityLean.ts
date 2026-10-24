/* A RELIABILITY STUDY AS A LEAN PAGE (docs/LEAN-PAGE.md) — the tiles, the
 * trend and the closing line its page (screens/ReliabilityScreen) and its
 * paper say, read from lib/ie/reliability. Nothing is worked out here: the
 * figures are the module's, the money its relCost (lib/cost, the one cost
 * model). The MTBF wears a colour only against an MTBF agreed — green met,
 * amber not yet sure, red short; without one it is grey, the team's to judge. */
import { niceDay } from '../../lib/weeks';
import { since, type LeanTile, type LeanTone, type LeanTrend } from '../../lib/lean';
import { costParts, costWhere, countTitle, dayPoints, perHour, plural, relCost, reliabilitySays, span, worstTone, type RelCost, type RelCostLine, type RelFigures, type RelItem, type RelSays, type RelSubject, type RelWhere } from './reliability';

const gbp = (n: number): string => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;
const TONE: Record<NonNullable<RelFigures['verdict']>, LeanTone> = { met: 'g', 'met-unsure': 'a', 'short-unsure': 'a', short: 'r' };

export function relTiles(a: RelSubject, f: RelFigures, c: RelCost): LeanTile[] {
  const ev = a.event.trim() || 'event', evs = plural(ev);
  const want = a.targetMin && a.targetMin > 0 ? a.targetMin / 60 : undefined;
  /* the latest day watched against every day before it */
  const withN = f.days.filter(d => d.mtbfH !== undefined);
  const last = withN[withN.length - 1];
  const before = withN.slice(0, -1);
  const beforeH = before.reduce((s, d) => s + d.hours, 0), beforeN = before.reduce((s, d) => s + d.n, 0);
  const change = last && beforeN ? since((last.mtbfH as number) * 60, (beforeH / beforeN) * 60, { fmt: x => `${Math.round(x)} min`, higher: true, against: `before ${niceDay(last.day)}` }) : undefined;
  return [
    f.mtbfH !== undefined
      ? { k: 'MTBF', v: span(f.mtbfH), of: `mean time between ${evs} · 90% sure ${span(f.lo ?? 0)}–${span(f.hi ?? 0)}${want ? ` · ${span(want)} wanted` : ''}${f.enough === 'rough' ? ' · rough' : ''}`,
        ...(change ? { change } : {}), ...(f.verdict ? { tone: TONE[f.verdict] } : {}) }
      : { k: 'MTBF', v: f.lo !== undefined ? `≥ ${span(f.lo)}` : '—', of: f.hours > 0 ? `no ${evs} yet — 90% sure it is at least this` : 'start the watch at the machine', ...(f.verdict ? { tone: TONE[f.verdict] } : {}) },
    f.rate !== undefined
      ? { k: 'Failure rate', v: perHour(f.rate), of: `${evs} an hour of watched running · 90% sure ${perHour(f.rateLo ?? 0).replace(' an hour', '')}–${perHour(f.rateHi ?? 0)}` }
      : { k: 'Failure rate', v: '—', of: f.rateHi !== undefined ? `at most ${perHour(f.rateHi)}, 90% sure` : `${evs} an hour, once watched` },
    { k: 'Watched', v: span(f.hours), of: `${f.stretches} stretch${f.stretches === 1 ? '' : 'es'} of the watch over ${f.days.length} day${f.days.length === 1 ? '' : 's'}${f.runningSince ? ' · running now' : ''}` },
    { k: plural(ev, 2).replace(/^./, x => x.toUpperCase()), v: String(f.n), of: [`counted in watched time`, f.struck ? `${f.struck} struck` : '', f.outside ? `${f.outside} while the watch was stopped` : ''].filter(Boolean).join(' · '),
      ...(f.outside ? { tone: 'a' as LeanTone } : {}) },
    /* the two parts, never blended: the labour the value (every machine stands the crew), the contribution beside it where the machine stops the line */
    c.labourPerH !== undefined || c.contributionPerH !== undefined
      ? { k: 'What it costs', v: c.labourPerH !== undefined ? `${gbp(c.labourPerH)} labour` : `${gbp(c.contributionPerH ?? 0)} contribution`,
        of: `an hour of running${c.labourPerH !== undefined && c.contributionPerH !== undefined ? ` · ${gbp(c.contributionPerH)} contribution` : ''}${c.packsPerH !== undefined ? ` (${Math.round(c.packsPerH).toLocaleString('en-GB')} packs ${costWhere(c)})` : !c.stopsLine ? ` — ${costWhere(c)}` : ''}, at ${a.downMin} min a ${ev}` }
      : { k: 'What it costs', v: '—', of: f.rate === undefined ? 'said once there is a rate' : `give ${c.missing[0] ?? 'the line its cost'}` },
  ];
}

/** THE TREND — the MTBF of each day watched, against the MTBF wanted. */
export function relTrend(a: RelSubject, f: RelFigures): LeanTrend | undefined {
  const pts = dayPoints(f);
  if (pts.length < 2) return undefined;
  const want = a.targetMin && a.targetMin > 0 ? a.targetMin : undefined;
  const ps = pts.slice(-8).map((p, i, all) => ({ ...p, label: niceDay(p.label), ...(want ? { target: want } : {}), ...(i === all.length - 1 ? { now: true } : {}) }));
  return { title: 'MTBF, day by day', unit: 'min', points: ps, bar: 'MTBF that day, minutes', ...(want ? { mark: 'MTBF wanted' } : {}) };
}

/** THE CLOSING LINE — the MTBF, the rate and what it costs. */
export function relClosing(a: RelSubject, f: RelFigures, c: RelCost, said: RelSays): { text: string; tone: LeanTone } {
  if (f.mtbfH === undefined) return { text: said.text, tone: said.tone };
  const ev = a.event.trim() || 'event';
  const parts = costParts(c);
  const money = parts ? ` — ${parts} an hour of running` : '';
  const top = f.kinds.find(k => k.kind !== 'not said');
  return { text: `One ${ev} every ${span(f.mtbfH)} of running, ${perHour(f.rate ?? 0)}${money}${top ? `; the most, ${top.kind} (${top.n} of ${f.n})` : ''}.`, tone: said.tone };
}

/** THE CLOSING LINE OF THE STUDY — one count's, or each count's in turn, in
 *  the most abnormal count's tone. */
export function relClosings(items: readonly RelItem[], line?: RelCostLine, where?: RelWhere): { text: string; tone: LeanTone } {
  if (!items.length) return { text: 'Say what is counted, then start the watch at the machine.', tone: 'n' };
  const each = items.map(({ c, f }) => {
    const said = reliabilitySays(c, f);
    return { ...relClosing(c, f, relCost(f, c, line, where), said), title: countTitle(c) };
  });
  if (each.length === 1) return { text: each[0].text, tone: each[0].tone };
  return { text: each.map(x => `${x.title}: ${x.text.charAt(0).toLowerCase()}${x.text.slice(1).replace(/\.$/, '')}`).join('; ') + '.', tone: worstTone(each.map(x => x.tone)) };
}
